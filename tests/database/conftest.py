"""Conftest for database model tests — ensures project root is on sys.path."""
import sys
from pathlib import Path

# Project root is two levels up from this file (tests/database/conftest.py)
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))
