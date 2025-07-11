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

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set

import requests
from pydantic import BaseModel, Extra, Field, validator

# ---------------------------------------------------------------------------
# End‑user configuration
# ---------------------------------------------------------------------------


class Config(BaseModel):
    """Secrets + runtime overrides (env fallbacks supported)."""

    user_pk: int
    user_secret_key: Optional[str] = Field(None, description="API auth secret")

    csrftoken: Optional[str] = None  # manual override
    cookie: Optional[str] = None  # raw Cookie header string

    # env fallbacks -------------------------------------------------
    @validator("user_secret_key", pre=True, always=True)
    def _secret_env(cls, v):
        return v or os.getenv("MANTISX_SECRET_KEY")

    @validator("csrftoken", pre=True, always=True)
    def _csrf_env(cls, v):
        return v or os.getenv("MANTISX_CSRF_TOKEN")

    @validator("cookie", pre=True, always=True)
    def _cookie_env(cls, v):
        return v or os.getenv("MANTISX_COOKIE")

    class Config:
        extra = Extra.ignore


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
    class Config:
        extra = Extra.allow


class Firearm(BaseModel):
    make: Optional[str]
    model: Optional[str]
    caliber: Optional[str]

    class Config:
        extra = Extra.allow


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

    class Config:
        extra = Extra.allow


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

    class Config:
        extra = Extra.ignore


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


def get_session_list(sess: requests.Session, cfg: Config) -> List[str]:
    body = {
        "user_pk": cfg.user_pk,
        "user_secret_key": cfg.user_secret_key,
        "profiled_user_pk": cfg.user_pk,
        "highlights": True,
        "type": "pistol",
    }
    data = _post(sess, API_LIST_URL, body)
    if not data.get("success"):
        raise RuntimeError(f"API list error: {data}")
    return [str(SessionBaseInfo(**s).pk) for s in data["sessions"]]


def download_session(sess: requests.Session, sid: str, cfg: Config):
    body = {
        "user_pk": cfg.user_pk,
        "user_secret_key": cfg.user_secret_key,
        "session_pk": int(sid),
    }
    data = _post(sess, API_DETAIL_URL, body)
    sess_resp = SessionResponse(**data)  # full validation 🎉
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
    return {p.stem for p in SESSION_DIR.glob("*.json") if p.stem.isdigit()}


# ---------------------------------------------------------------------------
# main()
# ---------------------------------------------------------------------------


def main():
    cfg = Config.parse_obj(json.loads(CONFIG_PATH.read_text()))

    sess = requests.Session()
    sess.headers.update(DEFAULT_HEADERS)
    _inject_cookies(sess, cfg)

    remote = get_session_list(sess, cfg)
    missing = [sid for sid in remote if sid not in _existing()]
    logger.info("remote=%d, missing=%d", len(remote), len(missing))

    for sid in missing:
        try:
            download_session(sess, sid, cfg)
        except Exception as exc:
            logger.error("%s failed: %s", sid, exc)


if __name__ == "__main__":
    main()
