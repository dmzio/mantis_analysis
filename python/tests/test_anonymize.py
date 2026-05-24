from scripts.anonymize_sessions import (
    _sanitize_session_pk,
    _sanitize_shot_pk,
    _sanitize_user_pk,
)


def test_sanitize_session_pk():
    assert _sanitize_session_pk(1234567) == 1111567


def test_sanitize_user_pk():
    assert _sanitize_user_pk(98765) == 11111


def test_sanitize_shot_pk():
    assert _sanitize_shot_pk(555555, 8) == 222008
