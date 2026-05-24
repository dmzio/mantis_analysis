from datetime import datetime, timezone

import pytest

from scripts.data_download import (
    Config,
    _existing,
    _missing_session_ids,
    _subtract_months,
    collect_session_ids,
    download_session,
)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def test_collect_session_ids_walks_windows(monkeypatch):
    fixtures = [
        {
            "pk": 501,
            "date": datetime(2024, 4, 10, 12, tzinfo=timezone.utc),
            "fire_type": 1,
            "average_score": 95.0,
            "right_handed": True,
            "drill_name": "Cadence",
            "shot_count": 10,
        },
        {
            "pk": 401,
            "date": datetime(2024, 2, 1, 9, tzinfo=timezone.utc),
            "fire_type": 1,
            "average_score": 90.0,
            "right_handed": True,
            "drill_name": "Bill",
            "shot_count": 12,
        },
        {
            "pk": 301,
            "date": datetime(2023, 12, 25, 18, tzinfo=timezone.utc),
            "fire_type": 1,
            "average_score": 89.0,
            "right_handed": False,
            "drill_name": "Dot",
            "shot_count": 8,
        },
    ]

    def fake_post(sess, url, body):
        start = datetime.fromisoformat(body["start_date"].replace("Z", "+00:00"))
        end = datetime.fromisoformat(body["end_date"].replace("Z", "+00:00"))
        matches = []
        for item in fixtures:
            if start <= item["date"] < end:
                payload = {k: v for k, v in item.items() if k != "date"}
                payload["date"] = _iso(item["date"])
                matches.append(payload)
        return {"success": True, "sessions": matches}

    monkeypatch.setattr("scripts.data_download._post", fake_post)

    cfg = Config.model_validate(
        {
            "user_pk": 1,
            "user_secret_key": "sek",
            "history_window_months": 2,
        }
    )

    start_marker = datetime(2023, 10, 1, tzinfo=timezone.utc)
    end_marker = datetime(2024, 5, 1, tzinfo=timezone.utc)
    result = collect_session_ids(object(), cfg, start_date=start_marker, end_date=end_marker)

    # The ids should be ordered newest -> oldest with no duplicates.
    assert result == ["501", "401", "301"]


def test_collect_session_ids_defaults_to_six_months(monkeypatch):
    fixtures = [
        {
            "pk": 999,
            "date": datetime(2023, 9, 15, tzinfo=timezone.utc),
            "fire_type": 1,
            "average_score": 80.0,
            "right_handed": True,
            "drill_name": "Legacy",
            "shot_count": 5,
        },
        {
            "pk": 502,
            "date": datetime(2024, 3, 5, tzinfo=timezone.utc),
            "fire_type": 1,
            "average_score": 94.0,
            "right_handed": True,
            "drill_name": "Warmup",
            "shot_count": 11,
        },
    ]

    windows = []

    def fake_post(sess, url, body):
        start = datetime.fromisoformat(body["start_date"].replace("Z", "+00:00"))
        end = datetime.fromisoformat(body["end_date"].replace("Z", "+00:00"))
        windows.append((start, end))
        matches = []
        for item in fixtures:
            if start <= item["date"] < end:
                payload = {k: v for k, v in item.items() if k != "date"}
                payload["date"] = _iso(item["date"])
                matches.append(payload)
        return {"success": True, "sessions": matches}

    monkeypatch.setattr("scripts.data_download._post", fake_post)

    cfg = Config.model_validate(
        {
            "user_pk": 1,
            "user_secret_key": "sek",
            "history_window_months": 2,
        }
    )

    end_marker = datetime(2024, 5, 1, tzinfo=timezone.utc)
    result = collect_session_ids(object(), cfg, end_date=end_marker)

    # Only the recent entry should be returned; the 2023 session is older than 6 months.
    assert result == ["502"]

    lower_bound = _subtract_months(end_marker, cfg.history_months)
    assert all(start >= lower_bound for start, _ in windows)


def test_existing_excludes_session_with_missing_shots(monkeypatch, tmp_path):
    session_dir = tmp_path / "sessions"
    session_dir.mkdir()
    monkeypatch.setattr("scripts.data_download.SESSION_DIR", session_dir)

    (session_dir / "100.json").write_text(
        '{"session": {"pk": 100, "shot_count": 3, "shots": []}}',
        encoding="utf-8",
    )
    (session_dir / "200.json").write_text(
        '{"session": {"pk": 200, "shot_count": 0, "shots": []}}',
        encoding="utf-8",
    )
    (session_dir / "300.json").write_text(
        '{"session": {"pk": 300, "shot_count": 1, "shots": [{"pk": 1}]}}',
        encoding="utf-8",
    )

    assert _existing() == {"200", "300"}


def test_download_session_rejects_missing_shots(monkeypatch, tmp_path):
    session_dir = tmp_path / "sessions"
    photo_dir = session_dir / "session_photo"
    session_dir.mkdir()
    photo_dir.mkdir()
    monkeypatch.setattr("scripts.data_download.SESSION_DIR", session_dir)
    monkeypatch.setattr("scripts.data_download.PHOTO_DIR", photo_dir)

    def fake_post(sess, url, body):
        return {
            "session": {
                "pk": 900001,
                "date": "2024-05-12T14:15:28Z",
                "user_pk": 100001,
                "time_stamp": 1715523328,
                "right_handed": True,
                "fire_type": 2,
                "gun_type": 0,
                "average_score": 96.61,
                "drill_id": 0,
                "shot_count": 65,
                "manual_score": 0,
                "course_number": -1,
                "username": "sample-user",
                "right_handed_display": "right",
                "fire_type_display": "dry practice",
                "gun_type_display": "pistol",
                "stamp": "sample-session-900001",
                "drill_name": "Open Training",
                "time_display": "2621.s",
                "notes": "",
                "gun_display": "Training Pistol 4.5mm",
                "score_bars": 0,
                "time_bars": 0,
                "deleted": False,
                "extras": {},
                "comments": [],
                "firearm": {"make": "Sample", "model": "Training Pistol", "caliber": "4.5mm"},
                "shots": [],
            }
        }

    monkeypatch.setattr("scripts.data_download._post", fake_post)
    cfg = Config.model_validate({"user_pk": 100001, "user_secret_key": "sek"})

    with pytest.raises(RuntimeError, match="missing shot detail"):
        download_session(object(), "900001", cfg)

    assert not (session_dir / "900001.json").exists()


def test_missing_session_ids_uses_existing_inventory_once(monkeypatch):
    calls = 0

    def fake_existing():
        nonlocal calls
        calls += 1
        return {"10", "30"}

    monkeypatch.setattr("scripts.data_download._existing", fake_existing)

    assert _missing_session_ids(["10", "20", "30", "40"]) == ["20", "40"]
    assert calls == 1
