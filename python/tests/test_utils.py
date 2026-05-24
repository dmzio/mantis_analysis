from scripts.data_download import _parse_cookie_string


def test_parse_cookie_string():
    raw = "a=1; csrftoken=xyz; foo=bar"
    result = _parse_cookie_string(raw)
    assert result == {"a": "1", "csrftoken": "xyz", "foo": "bar"}
