#!/usr/bin/env python3
"""
Download real SVG bank logos from zegond/logos-per-banks GitHub repo.

Saves to frontend/public/bank-logos/{bank_slug}.svg so Vite serves them
as static assets at /bank-logos/{slug}.svg.

Usage:
    python scripts/download_bank_logos.py
"""

import sys
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# Map bank slug → SVG filename in the GitHub repo
LOGO_MAP = {
    # Traditional banks
    "bank-meli": "Melli.svg",
    "bank-saderat": "Saderat.svg",
    "bank-pasargad": "Pasargad.svg",
    "bank-parsian": "Parsian.svg",
    "bank-karafarin": "Karafarin.svg",
    "bank-iran-zamin": "Iran_Zamin.svg",
    "bank-day": "Dey.svg",
    "bank-tosee-saderat": "Tosee_Saderat.svg",
    # Digital banks → parent bank logos
    "weepod": "Pasargad.svg",       # Bank Pasargad
    "sepino": "Saderat.svg",        # Bank Saderat
    "neshan-bank": "Melli.svg",     # Bank Meli
    "blue-bank": "Saman.svg",       # Bank Saman
    "bankino": "Khavar_Mianeh.svg", # Bank Khavarmianeh
    "qbank": "Mehr_Iran.svg",       # Bank Mehr Iran
    # hi-bank: no logo available — skipped
}

BASE_URL = (
    "https://raw.githubusercontent.com/zegond/logos-per-banks"
    "/master/SVG%20Assets/Bank/Color"
)

OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "bank-logos"


def download_logos():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    success = 0
    failed = 0

    for slug, filename in LOGO_MAP.items():
        url = f"{BASE_URL}/{filename}"
        dest = OUTPUT_DIR / f"{slug}.svg"

        try:
            req = Request(url, headers={"User-Agent": "TSE-Dashboard/1.0"})
            with urlopen(req, timeout=15) as resp:
                data = resp.read()
            dest.write_bytes(data)
            print(f"  OK  {slug}.svg  ({len(data):,} bytes)")
            success += 1
        except (HTTPError, URLError, OSError) as e:
            print(f"  FAIL  {slug}.svg  — {e}")
            failed += 1

    print(f"\nDone: {success} downloaded, {failed} failed")
    return failed == 0


if __name__ == "__main__":
    ok = download_logos()
    sys.exit(0 if ok else 1)
