"""
Commodity data fetcher using Yahoo Finance (yfinance).
Fetches real-time prices and historical OHLCV data for international commodities
and stores in PostgreSQL.

Covers all major commodities from tradingeconomics.com/commodities
that are accessible via Yahoo Finance futures tickers.
"""

import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import yfinance as yf
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from database.models import Commodity, CommodityOHLCV, CommodityPrice

logger = logging.getLogger(__name__)

# ── Full commodity registry (mirrors tradingeconomics.com/commodities) ────────
# Only includes symbols with Yahoo Finance futures data.
# CNY-denominated and exotic exchange commodities are excluded.

COMMODITY_REGISTRY: list[dict] = [
    # ─── Energy ───────────────────────────────────────────────────────────────
    {"symbol": "WTI",       "yf": "CL=F",  "name": "Crude Oil WTI",        "name_fa": "نفت خام WTI",      "category": "energy",       "unit": "USD/bbl"},
    {"symbol": "BRENT",     "yf": "BZ=F",  "name": "Brent Crude Oil",      "name_fa": "نفت برنت",          "category": "energy",       "unit": "USD/bbl"},
    {"symbol": "NATGAS",    "yf": "NG=F",  "name": "Natural Gas",           "name_fa": "گاز طبیعی",        "category": "energy",       "unit": "USD/MMBtu"},
    {"symbol": "GASOLINE",  "yf": "RB=F",  "name": "Gasoline RBOB",         "name_fa": "بنزین",            "category": "energy",       "unit": "USD/gal"},
    {"symbol": "HEAT",      "yf": "HO=F",  "name": "Heating Oil",           "name_fa": "نفت گرمایشی",      "category": "energy",       "unit": "USD/gal"},
    {"symbol": "ETHANOL",   "yf": "EH=F",  "name": "Ethanol",               "name_fa": "اتانول",           "category": "energy",       "unit": "USD/gal"},
    {"symbol": "URANIUM",   "yf": "UX=F",  "name": "Uranium",               "name_fa": "اورانیوم",         "category": "energy",       "unit": "USD/lb"},
    {"symbol": "PROPANE",   "yf": "B0=F",  "name": "Propane",               "name_fa": "پروپان",           "category": "energy",       "unit": "USD/gal"},
    {"symbol": "TTF_GAS",   "yf": "TTF=F", "name": "TTF Gas (EU)",          "name_fa": "گاز TTF اروپا",    "category": "energy",       "unit": "EUR/MWh"},

    # ─── Metals — Precious ────────────────────────────────────────────────────
    {"symbol": "GOLD",      "yf": "GC=F",  "name": "Gold",                  "name_fa": "طلا",              "category": "metals",       "unit": "USD/oz"},
    {"symbol": "SILVER",    "yf": "SI=F",  "name": "Silver",                "name_fa": "نقره",             "category": "metals",       "unit": "USD/oz"},
    {"symbol": "PLATINUM",  "yf": "PL=F",  "name": "Platinum",              "name_fa": "پلاتین",           "category": "metals",       "unit": "USD/oz"},
    {"symbol": "PALLADIUM", "yf": "PA=F",  "name": "Palladium",             "name_fa": "پالادیوم",         "category": "metals",       "unit": "USD/oz"},
    {"symbol": "COPPER",    "yf": "HG=F",  "name": "Copper",                "name_fa": "مس",               "category": "metals",       "unit": "USD/lb"},
    {"symbol": "ALUMINUM",  "yf": "ALI=F", "name": "Aluminum",              "name_fa": "آلومینیوم",        "category": "metals",       "unit": "USD/t"},
    {"symbol": "ZINC",      "yf": "ZN=F",  "name": "Zinc",                  "name_fa": "روی",              "category": "metals",       "unit": "USD/t"},
    {"symbol": "NICKEL",    "yf": "NI=F",  "name": "Nickel",                "name_fa": "نیکل",             "category": "metals",       "unit": "USD/t"},
    {"symbol": "LEAD",      "yf": "LD=F",  "name": "Lead",                  "name_fa": "سرب",              "category": "metals",       "unit": "USD/t"},
    {"symbol": "TIN",       "yf": "SN=F",  "name": "Tin",                   "name_fa": "قلع",              "category": "metals",       "unit": "USD/t"},
    {"symbol": "IRON_ORE",  "yf": "TIO=F", "name": "Iron Ore 62% Fe",       "name_fa": "سنگ‌آهن",          "category": "metals",       "unit": "USD/t"},
    {"symbol": "HRC_STEEL", "yf": "HRC=F", "name": "HRC Steel",             "name_fa": "فولاد نورد گرم",   "category": "metals",       "unit": "USD/t"},
    {"symbol": "LITHIUM",   "yf": "LITH=F","name": "Lithium Carbonate",     "name_fa": "لیتیوم",           "category": "metals",       "unit": "USD/t"},
    {"symbol": "COBALT",    "yf": "COBALT=F","name": "Cobalt",              "name_fa": "کبالت",            "category": "metals",       "unit": "USD/t"},

    # ─── Agricultural — Grains & Oilseeds ─────────────────────────────────────
    {"symbol": "CORN",      "yf": "ZC=F",  "name": "Corn",                  "name_fa": "ذرت",              "category": "agricultural", "unit": "USc/bu"},
    {"symbol": "WHEAT",     "yf": "ZW=F",  "name": "Wheat",                 "name_fa": "گندم",             "category": "agricultural", "unit": "USc/bu"},
    {"symbol": "SOYBEAN",   "yf": "ZS=F",  "name": "Soybeans",              "name_fa": "سویا",             "category": "agricultural", "unit": "USc/bu"},
    {"symbol": "SOY_OIL",   "yf": "ZL=F",  "name": "Soybean Oil",           "name_fa": "روغن سویا",        "category": "agricultural", "unit": "USc/lb"},
    {"symbol": "SOY_MEAL",  "yf": "ZM=F",  "name": "Soybean Meal",          "name_fa": "کنجاله سویا",      "category": "agricultural", "unit": "USD/t"},
    {"symbol": "OATS",      "yf": "ZO=F",  "name": "Oats",                  "name_fa": "جو دوسر",          "category": "agricultural", "unit": "USc/bu"},
    {"symbol": "RICE",      "yf": "ZR=F",  "name": "Rough Rice",            "name_fa": "برنج",             "category": "agricultural", "unit": "USc/cwt"},
    {"symbol": "CANOLA",    "yf": "RS=F",  "name": "Canola",                "name_fa": "کانولا",           "category": "agricultural", "unit": "CAD/t"},

    # ─── Agricultural — Softs ─────────────────────────────────────────────────
    {"symbol": "COFFEE",    "yf": "KC=F",  "name": "Coffee Arabica",        "name_fa": "قهوه عربیکا",      "category": "agricultural", "unit": "USc/lb"},
    {"symbol": "SUGAR",     "yf": "SB=F",  "name": "Sugar #11",             "name_fa": "شکر",              "category": "agricultural", "unit": "USc/lb"},
    {"symbol": "COTTON",    "yf": "CT=F",  "name": "Cotton #2",             "name_fa": "پنبه",             "category": "agricultural", "unit": "USc/lb"},
    {"symbol": "COCOA",     "yf": "CC=F",  "name": "Cocoa",                 "name_fa": "کاکائو",           "category": "agricultural", "unit": "USD/t"},
    {"symbol": "OJ",        "yf": "OJ=F",  "name": "Orange Juice",          "name_fa": "آب پرتقال",        "category": "agricultural", "unit": "USc/lb"},
    {"symbol": "LUMBER",    "yf": "LBS=F", "name": "Lumber",                "name_fa": "الوار",            "category": "agricultural", "unit": "USD/mbf"},
    {"symbol": "MILK",      "yf": "DC=F",  "name": "Class III Milk",        "name_fa": "شیر",              "category": "agricultural", "unit": "USD/cwt"},
    {"symbol": "CHEESE",    "yf": "CSC=F", "name": "Cheese",                "name_fa": "پنیر",             "category": "agricultural", "unit": "USD/lb"},

    # ─── Livestock ────────────────────────────────────────────────────────────
    {"symbol": "CATTLE",    "yf": "LE=F",  "name": "Live Cattle",           "name_fa": "گاو زنده",         "category": "livestock",    "unit": "USc/lb"},
    {"symbol": "FEEDER",    "yf": "GF=F",  "name": "Feeder Cattle",         "name_fa": "گاو پرواری",       "category": "livestock",    "unit": "USc/lb"},
    {"symbol": "HOGS",      "yf": "HE=F",  "name": "Lean Hogs",             "name_fa": "خوک",              "category": "livestock",    "unit": "USc/lb"},
]


# ── Helper: ensure commodity master rows exist ───────────────────────────────


def seed_commodities(session) -> dict[str, int]:
    """
    Ensure every commodity in the registry has a row in the commodities table.
    Returns {symbol: commodity_id} mapping.
    """
    for meta in COMMODITY_REGISTRY:
        stmt = (
            insert(Commodity.__table__)
            .values(
                symbol=meta["symbol"],
                yf_ticker=meta["yf"],
                name=meta["name"],
                name_fa=meta["name_fa"],
                category=meta["category"],
                unit=meta["unit"],
            )
            .on_conflict_do_update(
                index_elements=["symbol"],
                set_={
                    "yf_ticker": meta["yf"],
                    "name": meta["name"],
                    "name_fa": meta["name_fa"],
                    "category": meta["category"],
                    "unit": meta["unit"],
                    "is_active": True,
                },
            )
        )
        session.execute(stmt)
    session.flush()

    rows = session.execute(
        select(Commodity.symbol, Commodity.id).where(Commodity.is_active.is_(True))
    ).all()
    return {r.symbol: r.id for r in rows}


# ── Fetch & store current prices ─────────────────────────────────────────────


def fetch_and_store_prices(session) -> int:
    """
    Fetch current prices for all commodities via yfinance and insert
    CommodityPrice snapshot rows. Returns count of rows inserted.
    """
    sym_map = seed_commodities(session)
    now = datetime.now(UTC)

    tickers_str = " ".join(m["yf"] for m in COMMODITY_REGISTRY)

    try:
        tickers = yf.Tickers(tickers_str)
    except Exception:
        logger.error("Failed to create yfinance Tickers object", exc_info=True)
        return 0

    rows = []
    for meta in COMMODITY_REGISTRY:
        try:
            t = tickers.tickers.get(meta["yf"])
            if t is None:
                continue
            info = t.fast_info
            price = getattr(info, "last_price", None)
            if price is None:
                continue

            prev = getattr(info, "previous_close", None)
            change = (price - prev) if prev else None
            change_pct = ((change / prev) * 100) if (prev and change is not None) else None

            commodity_id = sym_map.get(meta["symbol"])
            if commodity_id is None:
                continue

            rows.append({
                "commodity_id": commodity_id,
                "price": Decimal(str(round(price, 6))),
                "change": Decimal(str(round(change, 6))) if change is not None else None,
                "change_pct": Decimal(str(round(change_pct, 4))) if change_pct is not None else None,
                "high": Decimal(str(round(getattr(info, "day_high", 0) or 0, 6))) or None,
                "low": Decimal(str(round(getattr(info, "day_low", 0) or 0, 6))) or None,
                "open": Decimal(str(round(getattr(info, "open", 0) or 0, 6))) or None,
                "prev_close": Decimal(str(round(prev, 6))) if prev else None,
                "volume": None,
                "snapshot_time": now,
            })
        except Exception:
            logger.warning("Failed to fetch price for %s (%s)", meta["symbol"], meta["yf"], exc_info=True)

    if rows:
        session.execute(CommodityPrice.__table__.insert(), rows)
        session.flush()
        logger.info("Inserted %d commodity price snapshots", len(rows))

    return len(rows)


# ── Fetch & store historical OHLCV ──────────────────────────────────────────


def fetch_and_store_history(session, period: str = "2y") -> int:
    """
    Fetch daily OHLCV history for all commodities and upsert into commodity_ohlcv.
    Called once on initial setup, then daily for incremental updates.
    Returns total rows upserted.
    """
    sym_map = seed_commodities(session)
    total = 0

    for meta in COMMODITY_REGISTRY:
        commodity_id = sym_map.get(meta["symbol"])
        if commodity_id is None:
            continue

        try:
            ticker = yf.Ticker(meta["yf"])
            df = ticker.history(period=period, interval="1d")
            if df.empty:
                continue

            for idx, row in df.iterrows():
                dt = idx.date() if hasattr(idx, "date") else idx
                stmt = (
                    insert(CommodityOHLCV.__table__)
                    .values(
                        commodity_id=commodity_id,
                        date=dt,
                        open=Decimal(str(round(float(row["Open"]), 6))) if row.get("Open") is not None else None,
                        high=Decimal(str(round(float(row["High"]), 6))) if row.get("High") is not None else None,
                        low=Decimal(str(round(float(row["Low"]), 6))) if row.get("Low") is not None else None,
                        close=Decimal(str(round(float(row["Close"]), 6))) if row.get("Close") is not None else None,
                        volume=Decimal(str(float(row.get("Volume", 0)))),
                    )
                    .on_conflict_do_update(
                        constraint="uq_commodity_ohlcv_cid_date",
                        set_={
                            "open": Decimal(str(round(float(row["Open"]), 6))) if row.get("Open") is not None else None,
                            "high": Decimal(str(round(float(row["High"]), 6))) if row.get("High") is not None else None,
                            "low": Decimal(str(round(float(row["Low"]), 6))) if row.get("Low") is not None else None,
                            "close": Decimal(str(round(float(row["Close"]), 6))) if row.get("Close") is not None else None,
                            "volume": Decimal(str(float(row.get("Volume", 0)))),
                        },
                    )
                )
                session.execute(stmt)

            count = len(df)
            total += count
            logger.debug("Upserted %d OHLCV rows for %s", count, meta["symbol"])

        except Exception:
            logger.warning("Failed to fetch history for %s", meta["symbol"], exc_info=True)

    session.flush()
    logger.info("Upserted %d total commodity OHLCV rows", total)
    return total


# ── Cleanup old price snapshots ──────────────────────────────────────────────


def cleanup_old_prices(session, retention_hours: int = 48) -> int:
    """Delete price snapshots older than retention_hours."""
    cutoff = datetime.now(UTC) - timedelta(hours=retention_hours)
    result = session.execute(
        CommodityPrice.__table__.delete().where(
            CommodityPrice.snapshot_time < cutoff
        )
    )
    deleted = result.rowcount
    if deleted:
        logger.info("Cleaned up %d old commodity price snapshots", deleted)
    return deleted
