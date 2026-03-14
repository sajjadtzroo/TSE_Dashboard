"""
Shared parser for Telegram end-of-day USD/IRR summary messages.

Message format (فردایی / forward):
    پایان معاملات، خسته نباشید💐
    🗓 امروز سه‌شنبه ‌‌‌1404.12.05
    ⭕️ 164,000 اولـین مـعامله فردایی
    🔽 163,800 کف‌ 🔼164,200 سقف
    ❌ 164,000 آخرین‌ معامله فردایی☑️

Spot (نقدی) messages follow the same structure but say نقدی instead of فردایی.
"""

import re

import jdatetime

# ── Constants ──────────────────────────────────────────────────────────────────

EOD_MARKER = "پایان معاملات"

# Invisible Unicode chars that appear in channel messages
_INVISIBLE = re.compile(r"[\u200c\u200d\u200b\u00ad\u0640]+")

_PERSIAN_DIGITS = str.maketrans(
    "٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹",
    "01234567890123456789",
)

# Date: 1404.12.05 or 1404/12/05
_DATE_RE  = re.compile(r"(\d{4})[./](\d{1,2})[./](\d{1,2})")
# OHLC — emojis followed by digits/commas/Persian digits
_OPEN_RE  = re.compile(r"⭕[️\ufe0f]?\s*([\d,٠-٩۰-۹٬]+)")
_LOW_RE   = re.compile(r"🔽\s*([\d,٠-٩۰-۹٬]+)")
_HIGH_RE  = re.compile(r"🔼\s*([\d,٠-٩۰-۹٬]+)")
_CLOSE_RE = re.compile(r"❌\s*([\d,٠-٩۰-۹٬]+)")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _clean(text: str) -> str:
    """Strip invisible / decorative chars, normalise Persian digits."""
    return _INVISIBLE.sub("", text).translate(_PERSIAN_DIGITS)


def _parse_price(raw: str) -> int | None:
    """Convert a raw matched price string to int, or None if invalid."""
    val = raw.replace(",", "").replace("٬", "")
    try:
        n = int(val)
        return n if n > 10_000 else None
    except ValueError:
        return None


def is_eod_message(text: str) -> bool:
    """Return True if the message is an end-of-day summary."""
    return EOD_MARKER in text


def parse_eod(text: str) -> dict | None:
    """
    Parse an EOD summary message.

    Returns a dict with keys:
        trade_date  : datetime.date  (Gregorian)
        rate_type   : 'forward' | 'spot'
        open        : int | None
        high        : int | None
        low         : int | None
        close       : int | None

    Returns None if the message doesn't match the expected format.
    """
    if not is_eod_message(text):
        return None

    cleaned = _clean(text)

    # ── Date ──────────────────────────────────────────────────────────────────
    m = _DATE_RE.search(cleaned)
    if not m:
        return None
    try:
        jy, jm, jd = int(m.group(1)), int(m.group(2)), int(m.group(3))
        trade_date = jdatetime.date(jy, jm, jd).togregorian()
    except (ValueError, AttributeError):
        return None

    # ── Rate type ─────────────────────────────────────────────────────────────
    if "فردا" in text:
        rate_type = "forward"
    elif "نقد" in text:
        rate_type = "spot"
    else:
        # Can't determine type — still save as unknown rather than drop
        rate_type = "unknown"

    # ── OHLC ──────────────────────────────────────────────────────────────────
    def _extract(pattern):
        hit = pattern.search(cleaned)
        return _parse_price(hit.group(1)) if hit else None

    open_  = _extract(_OPEN_RE)
    low    = _extract(_LOW_RE)
    high   = _extract(_HIGH_RE)
    close  = _extract(_CLOSE_RE)

    # Need at least close to be useful
    if close is None:
        return None

    return {
        "trade_date": trade_date,
        "rate_type":  rate_type,
        "open":       open_,
        "high":       high,
        "low":        low,
        "close":      close,
    }
