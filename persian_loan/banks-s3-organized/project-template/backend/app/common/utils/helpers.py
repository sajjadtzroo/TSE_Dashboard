"""
Helper Utilities
"""

import re


def to_camel_case(string: str) -> str:
    """Convert snake_case to camelCase."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def format_amount(amount: int, locale: str = "fa") -> str:
    """Format amount with locale."""
    if locale == "fa":
        if amount >= 1_000_000_000:
            return f"{amount // 1_000_000_000:,} میلیارد تومان"
        elif amount >= 1_000_000:
            return f"{amount // 1_000_000:,} میلیون تومان"
        return f"{amount:,} تومان"
    else:
        if amount >= 1_000_000_000:
            return f"{amount / 1_000_000_000:.1f} Billion Toman"
        elif amount >= 1_000_000:
            return f"{amount / 1_000_000:.0f} Million Toman"
        return f"{amount:,} Toman"


def parse_amount(amount_str: str) -> int | None:
    """Parse amount string to integer."""
    if not amount_str:
        return None

    # Remove Persian/Arabic numerals and convert
    persian_nums = "۰۱۲۳۴۵۶۷۸۹"
    arabic_nums = "٠١٢٣٤٥٦٧٨٩"

    for i, (p, a) in enumerate(zip(persian_nums, arabic_nums)):
        amount_str = amount_str.replace(p, str(i)).replace(a, str(i))

    # Extract numbers
    numbers = re.findall(r"\d+", amount_str.replace(",", ""))
    if not numbers:
        return None

    amount = int("".join(numbers))

    # Handle multipliers
    if "میلیارد" in amount_str or "billion" in amount_str.lower():
        amount *= 1_000_000_000
    elif "میلیون" in amount_str or "million" in amount_str.lower():
        amount *= 1_000_000

    return amount
