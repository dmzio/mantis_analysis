from scripts.data_download import Config


def test_env_fallback(monkeypatch):
    monkeypatch.setenv("MANTISX_SECRET_KEY", "abc")
    cfg = Config.model_validate({"user_pk": 1})
    assert cfg.user_secret_key == "abc"
