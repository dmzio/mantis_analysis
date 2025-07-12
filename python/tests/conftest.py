import sys
from pathlib import Path

# ensure the python package directory is importable
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
