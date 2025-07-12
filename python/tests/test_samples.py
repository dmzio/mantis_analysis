import json
from pathlib import Path

from scripts.data_download import SessionResponse

SAMPLE = Path("samples/sessions/11111027.json")


def test_sample_parses():
    data = json.loads(SAMPLE.read_text())
    SessionResponse.model_validate(data)
