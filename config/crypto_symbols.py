"""
CMC (CoinMarketCap) English ticker ↔ Farsi display name mappings.

Used by the crypto router to translate between the API's English symbols
and the Farsi symbols stored in the Security table.
"""

CMC_TO_FA: dict[str, str] = {
    "BTC": "بیت‌کوین",
    "ETH": "اتریوم",
    "USDT": "تتر",
    "XRP": "ریپل",
    "BNB": "بایننس کوین",
    "SOL": "سولانا",
    "TRX": "ترون",
    "DOGE": "دوج‌کوین",
    "BCH": "بیت‌کوین کش",
    "ADA": "کاردانو",
    "LINK": "چین‌لینک",
    "XLM": "استلار",
    "LTC": "لایت‌کوین",
    "AVAX": "آوالانچ",
    "SHIB": "شیبا اینو",
    "TON": "تون‌کوین",
}

FA_TO_CMC: dict[str, str] = {v: k for k, v in CMC_TO_FA.items()}
