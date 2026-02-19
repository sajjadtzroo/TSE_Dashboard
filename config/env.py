"""
Environment variable parsing helpers.
"""

import os


def parse_bool_env(key: str, default: str = "false") -> bool:
    """Parse a boolean environment variable (case-insensitive 'true'/'false')."""
    return os.getenv(key, default).lower() == "true"
