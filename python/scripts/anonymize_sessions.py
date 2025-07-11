import json
from pathlib import Path


def _sanitize_session_pk(original: int) -> int:
    """Return a plausibly anonymized PK preserving length."""
    s = str(original)
    return int("1" * max(len(s) - 3, 1) + s[-3:])


def _sanitize_user_pk(original: int) -> int:
    return int("1" * len(str(original)))


def _sanitize_shot_pk(original: int, index: int) -> int:
    s = str(original)
    return int("2" * max(len(s) - 3, 1) + f"{index:03d}")


def anonymize_sessions(path: str):
    session_dir = Path(path)
    files = sorted(session_dir.glob("*.json"))
    for file in files:
        with file.open("r", encoding="utf-8") as f:
            data = json.load(f)
        session = data.get("session", {})
        orig_pk = session.get("pk", 0)
        new_pk = _sanitize_session_pk(orig_pk)
        session["pk"] = new_pk
        session["user_pk"] = _sanitize_user_pk(session.get("user_pk", 0))
        session["username"] = "anon"
        session["stamp"] = f"session{new_pk}"
        shots = session.get("shots", [])
        for i, shot in enumerate(shots, start=1):
            shot["pk"] = _sanitize_shot_pk(shot.get("pk", 0), i)
            shot["session_pk"] = new_pk
        new_name = session_dir / f"{new_pk}.json"
        with new_name.open("w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
            f.write("\n")
        if file != new_name:
            file.unlink()


if __name__ == "__main__":
    anonymize_sessions("samples/sessions")
