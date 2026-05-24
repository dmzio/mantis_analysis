#!/usr/bin/env python3
"""data_download.py  (v5.0)
================================
*Full‑fidelity* MantisX downloader ─ every field in the `/get-session` payload
(now parsed + type‑checked) is represented in our Pydantic models.

Changes vs v4.3
---------------
1. **SessionDetail** – enumerates *all* documented top‑level attributes **and**
   contains a typed `shots: List[Shot]` list.
2. **Shot**, **Firearm**, *etc.* added so nested structures are validated.
3. The rest of the script (cookies, CSRF, file‑saving) is unchanged.
"""

from __future__ import annotations

import calendar
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import requests
from pydantic import BaseModel, ConfigDict, Field, field_validator

# ---------------------------------------------------------------------------
# End‑user configuration
# ---------------------------------------------------------------------------


DEFAULT_HISTORY_MONTHS = 6
DEFAULT_WINDOW_MONTHS = 2


class Config(BaseModel):
    """Secrets + runtime overrides (env fallbacks supported)."""

    model_config = ConfigDict(extra="ignore")

    user_pk: int
    user_secret_key: Optional[str] = Field(None, description="API auth secret", validate_default=True)

    username: Optional[str] = Field(None, validate_default=True)
    password: Optional[str] = Field(None, validate_default=True)

    csrftoken: Optional[str] = Field(None, validate_default=True)  # manual override
    cookie: Optional[str] = Field(None, validate_default=True)  # raw Cookie header string
    history_start: Optional[datetime] = Field(
        default=None,
        description="Earliest UTC timestamp to request when walking history",
    )
    history_months: int = Field(
        default=DEFAULT_HISTORY_MONTHS,
        ge=1,
        le=120,
        description="Total number of months of history to retrieve when no explicit start date is provided",
    )
    history_window_months: int = Field(
        default=DEFAULT_WINDOW_MONTHS,
        ge=1,
        le=12,
        description="Number of calendar months included in each history request window",
    )

    # env fallbacks -------------------------------------------------
    @field_validator("user_secret_key", mode="before")
    def _secret_env(cls, v):
        return v or os.getenv("MANTISX_SECRET_KEY")

    @field_validator("username", mode="before")
    def _username_env(cls, v):
        return v or os.getenv("MANTISX_USERNAME")

    @field_validator("password", mode="before")
    def _password_env(cls, v):
        return v or os.getenv("MANTISX_PASSWORD")

    @field_validator("csrftoken", mode="before")
    def _csrf_env(cls, v):
        return v or os.getenv("MANTISX_CSRF_TOKEN")

    @field_validator("cookie", mode="before")
    def _cookie_env(cls, v):
        return v or os.getenv("MANTISX_COOKIE")


# ---------------------------------------------------------------------------
# Pydantic schemas – FULL session structure
# ---------------------------------------------------------------------------


class Shot(BaseModel):
    pk: int
    score: str
    angle: str
    session_pk: int
    problem: str
    pitch: List[float]
    yaw: List[float]
    absolute_pitch: List[float]
    absolute_roll: List[float]
    bullseye: bool
    trigger_hold: str
    trigger_pull: str
    deleted: bool
    split: str
    hold_index: int
    pull_index: int
    shot_index: int
    sample_rate: int

    # everything else (extras, absolute_pitch, etc.)
    model_config = ConfigDict(extra="allow")


class Firearm(BaseModel):
    make: Optional[str]
    model: Optional[str]
    caliber: Optional[str]

    model_config = ConfigDict(extra="allow")


class SessionDetail(BaseModel):
    # --- canonical / numeric --------------------------------------
    pk: int
    date: datetime
    user_pk: int
    time_stamp: float
    right_handed: bool
    fire_type: int
    gun_type: int
    average_score: float
    drill_id: Optional[int]
    shot_count: int
    manual_score: Optional[int]
    course_number: Optional[int]

    # --- strings ---------------------------------------------------
    username: Optional[str]
    right_handed_display: Optional[str]
    fire_type_display: Optional[str]
    gun_type_display: Optional[str]
    stamp: Optional[str]
    drill_name: Optional[str]
    time_display: Optional[str]
    notes: Optional[str]
    gun_display: Optional[str]

    # --- flags / misc ----------------------------------------------
    score_bars: Optional[int]
    time_bars: Optional[int]
    deleted: Optional[bool]

    # --- nested ----------------------------------------------------
    extras: Optional[dict]
    comments: Optional[list]
    firearm: Optional[Firearm]
    shots: List[Shot]

    model_config = ConfigDict(extra="allow")


class SessionResponse(BaseModel):
    session: SessionDetail


class SessionBaseInfo(BaseModel):
    pk: int
    date: datetime
    fire_type: int
    average_score: float
    right_handed: bool
    drill_name: str
    shot_count: int

    model_config = ConfigDict(extra="ignore")


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE = "https://train.mantisx.com"
API_LIST_URL = f"{BASE}/session-history"
API_DETAIL_URL = f"{BASE}/get-session"
COOKIE_DOMAIN = "train.mantisx.com"

DEFAULT_HEADERS: Dict[str, str] = {
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Content-Type": "application/json",
    "User-Agent": "MantisXDataDownloader",
    "Origin": BASE,
    "Referer": f"{BASE}/",
}

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logger = logging.getLogger("mantisx_dl")
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------


def _parse_cookie_string(raw: str) -> Dict[str, str]:
    return {k.strip(): v for k, _, v in (p.partition("=") for p in raw.split(";")) if k and v}


def _inject_cookies(sess: requests.Session, cfg: Config) -> None:
    if cfg.cookie:
        for k, v in _parse_cookie_string(cfg.cookie).items():
            sess.cookies.set(k, v, domain=COOKIE_DOMAIN, path="/")

    if cfg.csrftoken:
        sess.cookies.set("csrftoken", cfg.csrftoken, domain=COOKIE_DOMAIN, path="/")

    token = sess.cookies.get("csrftoken")
    if token:
        sess.headers["X-CSRFToken"] = token


def _login(sess: requests.Session, cfg: Config) -> None:
    """Authenticate using provided credentials and populate cookies."""
    if not (cfg.username and cfg.password):
        return

    if "csrftoken" not in sess.cookies:
        try:
            sess.get(f"{BASE}/login/", timeout=60)
        except Exception as exc:  # noqa: BLE001
            logger.error("login page failed: %s", exc)
    token = sess.cookies.get("csrftoken")
    if token:
        sess.headers["X-CSRFToken"] = token

    payload = {"username": cfg.username, "password": cfg.password}
    resp = sess.post(f"{BASE}/verify", json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(f"login failed: {data}")

    token = sess.cookies.get("csrftoken")
    if token:
        sess.headers["X-CSRFToken"] = token


# ---------------------------------------------------------------------------
# HTTP wrappers
# ---------------------------------------------------------------------------


def _post(sess: requests.Session, url: str, body: dict):
    r = sess.post(url, json=body, timeout=60)
    r.raise_for_status()
    return r.json()


def _maybe_save_image(sess: requests.Session, extras: Optional[dict], sid: str) -> None:
    """Download a session image if `server_image_uri` is present."""
    if not extras:
        return
    url = extras.get("server_image_uri")
    if not url:
        return
    ext = Path(url).suffix or ".png"
    out = PHOTO_DIR / f"{sid}{ext}"
    if out.exists():
        return
    try:
        resp = sess.get(url, timeout=60)
        resp.raise_for_status()
        out.write_bytes(resp.content)
        logger.info("saved photo %s", out.name)
    except Exception as exc:  # noqa: BLE001
        logger.error("photo for %s failed: %s", sid, exc)


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _format_api_datetime(dt: datetime) -> str:
    return _ensure_utc(dt).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _subtract_months(dt: datetime, months: int) -> datetime:
    if months < 0:
        raise ValueError("months must be non-negative")
    if months == 0:
        return dt
    total_months = dt.year * 12 + (dt.month - 1) - months
    if total_months < 0:
        total_months = 0
    new_year, new_month_index = divmod(total_months, 12)
    new_month = new_month_index + 1
    last_day = calendar.monthrange(new_year, new_month)[1]
    new_day = min(dt.day, last_day)
    return dt.replace(year=new_year, month=new_month, day=new_day)


def get_session_list(
    sess: requests.Session, cfg: Config, start: datetime, end: datetime
) -> List[SessionBaseInfo]:
    body = {
        "user_pk": cfg.user_pk,
        "user_secret_key": cfg.user_secret_key,
        "profiled_user_pk": cfg.user_pk,
        "highlights": False,
        "type": "pistol",
        "start_date": _format_api_datetime(start),
        "end_date": _format_api_datetime(end),
    }
    data = _post(sess, API_LIST_URL, body)
    if not data.get("success"):
        raise RuntimeError(f"API list error: {data}")
    return [SessionBaseInfo(**s) for s in data.get("sessions", [])]


def collect_session_ids(
    sess: requests.Session,
    cfg: Config,
    *,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[str]:
    """Walk the session history timeline using the API's date filters."""

    current_end = _ensure_utc(end_date) if end_date else datetime.now(timezone.utc)
    window_months = cfg.history_window_months
    if window_months <= 0:
        raise ValueError("history_window_months must be positive")

    if start_date:
        lower_bound = _ensure_utc(start_date)
    elif cfg.history_start:
        lower_bound = _ensure_utc(cfg.history_start)
    else:
        lower_bound = _subtract_months(current_end, cfg.history_months)

    if current_end <= lower_bound:
        current_end = lower_bound + timedelta(days=1)

    seen: Set[str] = set()
    ordered: List[str] = []

    while current_end > lower_bound:
        current_start = _subtract_months(current_end, window_months)
        if current_start < lower_bound:
            current_start = lower_bound

        sessions = get_session_list(sess, cfg, current_start, current_end)

        if not sessions:
            if current_start == lower_bound:
                break
            current_end = current_start
            continue

        for info in sorted(sessions, key=lambda item: item.date, reverse=True):
            sid = str(info.pk)
            if sid not in seen:
                ordered.append(sid)
                seen.add(sid)

        earliest_in_batch = min(_ensure_utc(info.date) for info in sessions)
        current_end = min(current_start, earliest_in_batch)

    return ordered


def download_session(sess: requests.Session, sid: str, cfg: Config):
    body = {
        "user_pk": cfg.user_pk,
        "user_secret_key": cfg.user_secret_key,
        "session_pk": int(sid),
    }
    data = _post(sess, API_DETAIL_URL, body)
    sess_resp = SessionResponse(**data)  # full validation 🎉
    if not _has_expected_shot_detail(sess_resp.session):
        raise RuntimeError(
            f"{sid} missing shot detail: shot_count={sess_resp.session.shot_count}, "
            f"shots={len(sess_resp.session.shots)}"
        )
    out = SESSION_DIR / f"{sid}.json"
    out.write_text(sess_resp.model_dump_json(indent=2, exclude_none=True))
    _maybe_save_image(sess, sess_resp.session.extras, sid)
    logger.info("saved %s (%s shots)", sid, len(sess_resp.session.shots))


# ---------------------------------------------------------------------------
# File paths
# ---------------------------------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT_DIR / "python" / "config.json"
# store downloaded data in the project root, separate from source code
SESSION_DIR = ROOT_DIR / "data" / "sessions"
SESSION_DIR.mkdir(parents=True, exist_ok=True)
PHOTO_DIR = SESSION_DIR / "session_photo"
PHOTO_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------


def _existing() -> Set[str]:
    return {p.stem for p in SESSION_DIR.glob("*.json") if p.stem.isdigit() and _session_file_complete(p)}


def _missing_session_ids(remote: List[str]) -> List[str]:
    existing = _existing()
    return [sid for sid in remote if sid not in existing]


def _get_field(obj: Any, key: str) -> Any:
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def _has_expected_shot_detail(session: Any) -> bool:
    shot_count = _get_field(session, "shot_count") or 0
    shots = _get_field(session, "shots")
    return shot_count <= 0 or bool(shots)


def _session_file_complete(path: Path) -> bool:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("ignoring unreadable session file %s: %s", path.name, exc)
        return False

    session = data.get("session", data) if isinstance(data, dict) else {}
    if _has_expected_shot_detail(session):
        return True

    logger.warning("redownloading %s because shot detail is missing", path.name)
    return False


# ---------------------------------------------------------------------------
# main()
# ---------------------------------------------------------------------------


def main():
    cfg = Config.model_validate_json(CONFIG_PATH.read_text())

    sess = requests.Session()
    sess.headers.update(DEFAULT_HEADERS)
    _inject_cookies(sess, cfg)
    if "csrftoken" not in sess.cookies:
        _login(sess, cfg)

    now_utc = datetime.now(timezone.utc)

    if cfg.history_start:
        logger.info("history_start override from config: %s", _ensure_utc(cfg.history_start).isoformat())
    else:
        logger.info(
            "limiting history to last %s months (since %s)",
            cfg.history_months,
            _subtract_months(now_utc, cfg.history_months).isoformat(),
        )

    remote = collect_session_ids(sess, cfg)
    missing = _missing_session_ids(remote)
    logger.info("remote=%d, missing=%d", len(remote), len(missing))

    for sid in missing:
        try:
            download_session(sess, sid, cfg)
        except Exception as exc:
            logger.error("%s failed: %s", sid, exc)


if __name__ == "__main__":
    main()
