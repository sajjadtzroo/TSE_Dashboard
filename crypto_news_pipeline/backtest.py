"""
Backtest sentiment models against historical price data.

Pulls historical news (CryptoPanic API + manual landmark events),
runs through our sentiment pipeline, and compares predictions
against actual price movements from crypto_ohlcv.

Usage:
    python -m crypto_news_pipeline.backtest
    python -m crypto_news_pipeline.backtest --pages 5 --horizons 1,3,7
    python -m crypto_news_pipeline.backtest --events-only
"""

import argparse
import json
import logging
import time
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import requests
from sqlalchemy import create_engine, text

from .config import CRYPTOPANIC_API_KEY, DATABASE_URL
from .cleaner import clean_text, count_tokens, extract_coins
from .sentiment import ModelRouter, aggregate_article, rescale, score_chunks

logger = logging.getLogger(__name__)


# ── Coin ticker → security_id mapping ────────────────────────────────────────

# Farsi symbol → (english ticker, security_id)
COIN_MAP = {
    "BTC":  {"security_id": 1123, "fa": "بیت‌کوین"},
    "ETH":  {"security_id": 1124, "fa": "اتریوم"},
    "BNB":  {"security_id": 1127, "fa": "بایننس کوین"},
    "LTC":  {"security_id": 1146, "fa": "لایت‌کوین"},
    "ADA":  {"security_id": 1133, "fa": "کاردانو"},
    "XRP":  {"security_id": 1126, "fa": "ریپل"},
    "TRX":  {"security_id": 1130, "fa": "ترون"},
    "LINK": {"security_id": 1137, "fa": "چین‌لینک"},
    "DOGE": {"security_id": 1131, "fa": "دوج‌کوین"},
    "DOT":  {"security_id": 1155, "fa": "پولکادات"},
    "SOL":  {"security_id": 1129, "fa": "سولانا"},
    "AVAX": {"security_id": 1148, "fa": "آوالانچ"},
    "UNI":  {"security_id": 1157, "fa": "یونی‌سواپ"},
    "ATOM": {"security_id": 1178, "fa": "کازموس"},
    "NEAR": {"security_id": 1171, "fa": "نیر پروتکل"},
    "FIL":  {"security_id": 1193, "fa": "فایل‌کوین"},
    "INJ":  {"security_id": 1242, "fa": "اینجکتیو"},
    "SHIB": {"security_id": 1149, "fa": "شیبا اینو"},
    "ICP":  {"security_id": 1174, "fa": "اینترنت کامپیوتر"},
    "AAVE": {"security_id": 1160, "fa": "آوه"},
    "MKR":  {"security_id": 4384, "fa": "میکر"},
    "HBAR": {"security_id": 1145, "fa": "هدرا هش‌گراف"},
    "STX":  {"security_id": 1212, "fa": "استاکس"},
}


# ── News categorization ──────────────────────────────────────────────────────

CATEGORIES = {
    "sec_legal": {
        "keywords": [
            "sec ", "securities and exchange", "lawsuit", "sued", "enforcement",
            "investigation", "subpoena", "settlement", "gensler", "complaint",
            "indictment", "guilty", "fraud charge", "class action", "injunction",
            "court ruling", "judge", "verdict",
        ],
        "description": "SEC actions, lawsuits, legal enforcement",
    },
    "regulatory": {
        "keywords": [
            "regulation", "regulatory", "ban", "crackdown", "compliance",
            "kyc", "aml", "sanction", "license", "framework", "legislation",
            "congress", "senate", "bill", "policy", "executive order",
            "stablecoin regulation", "cbdc", "central bank digital",
            "tax", "taxation",
        ],
        "description": "Government regulation and policy",
    },
    "macro_treasury": {
        "keywords": [
            "federal reserve", "fed ", "interest rate", "rate hike", "rate cut",
            "inflation", "cpi", "ppi", "treasury", "bond", "yield",
            "gdp", "unemployment", "jobs report", "fomc", "powell",
            "quantitative", "tightening", "easing", "recession",
            "dollar index", "dxy",
        ],
        "description": "Macro economics, Fed policy, Treasury",
    },
    "hack_security": {
        "keywords": [
            "hack", "hacked", "exploit", "vulnerability", "breach",
            "stolen", "drained", "attack", "phishing", "rug pull",
            "rugpull", "scam", "ponzi", "compromised", "security incident",
            "flash loan attack", "bridge exploit", "oracle manipulation",
        ],
        "description": "Hacks, exploits, security incidents",
    },
    "exchange": {
        "keywords": [
            "exchange", "binance", "coinbase", "kraken", "bybit",
            "delist", "listing", "ipo", "withdrawal", "deposit",
            "trading halt", "insolvency", "bankruptcy", "ftx",
            "celsius", "blockfi", "voyager",
        ],
        "description": "Exchange news, listings, delistings",
    },
    "etf_institutional": {
        "keywords": [
            "etf", "spot etf", "bitcoin etf", "ethereum etf",
            "blackrock", "fidelity", "grayscale", "ark invest",
            "institutional", "pension fund", "sovereign wealth",
            "microstrategy", "saylor", "tesla bitcoin",
        ],
        "description": "ETF filings, institutional adoption",
    },
    "protocol_technical": {
        "keywords": [
            "upgrade", "hard fork", "soft fork", "mainnet", "testnet",
            "merge", "halving", "dencun", "cancun", "shanghai",
            "layer 2", "l2", "rollup", "sharding", "consensus",
            "staking", "validator", "node", "protocol",
        ],
        "description": "Protocol upgrades, technical milestones",
    },
    "adoption": {
        "keywords": [
            "adopt", "adoption", "accept bitcoin", "payment",
            "partnership", "integrate", "integration", "merchant",
            "el salvador", "legal tender", "country",
            "visa", "mastercard", "paypal", "stripe",
        ],
        "description": "Adoption by companies, countries",
    },
    "market_trading": {
        "keywords": [
            "whale", "liquidat", "short squeeze", "long squeeze",
            "funding rate", "open interest", "futures",
            "all-time high", "ath", "rally", "dump", "crash",
            "bull", "bear", "correction", "capitulation",
            "accumulation", "distribution",
        ],
        "description": "Market moves, whale activity, trading",
    },
}


def categorize_article(title: str, text: str) -> list[str]:
    """Classify an article into categories by keyword matching."""
    combined = f"{title} {text}".lower()
    matched = []
    for cat, cfg in CATEGORIES.items():
        for kw in cfg["keywords"]:
            if kw in combined:
                matched.append(cat)
                break
    return matched if matched else ["uncategorized"]


# ── Historical landmark events ───────────────────────────────────────────────

LANDMARK_EVENTS = [
    {
        "title": "SEC Approves Spot Bitcoin ETFs for U.S. Markets",
        "text": (
            "The SEC has approved 11 spot Bitcoin ETFs for trading on U.S. exchanges, "
            "including applications from BlackRock, Fidelity, and Grayscale. This marks "
            "a historic moment for cryptocurrency adoption, giving institutional investors "
            "a regulated vehicle to gain exposure to Bitcoin. Trading begins tomorrow."
        ),
        "date": "2024-01-10",
        "coins": ["BTC"],
        "source": "coindesk",
        "expected_direction": "positive",
        "actual_outcome": "BTC rose ~7% in 24h, then 15% over the week",
    },
    {
        "title": "FTX Files for Bankruptcy After Liquidity Crisis",
        "text": (
            "FTX, the world's second-largest crypto exchange, has filed for Chapter 11 "
            "bankruptcy protection. CEO Sam Bankman-Fried has resigned. Reports indicate "
            "an $8 billion shortfall in customer funds. Alameda Research, FTX's sister "
            "trading firm, is also included in the filing. This is the largest collapse "
            "in crypto history."
        ),
        "date": "2022-11-11",
        "coins": ["BTC", "ETH", "SOL"],
        "source": "cointelegraph",
        "expected_direction": "negative",
        "actual_outcome": "BTC fell ~25% over 7 days, SOL fell ~60%",
    },
    {
        "title": "Terra Luna and UST Stablecoin Collapse",
        "text": (
            "The Terra ecosystem is in freefall. UST has depegged to $0.30, and LUNA "
            "has crashed from $80 to under $1 in three days. The algorithmic stablecoin "
            "death spiral has wiped out $40 billion in market value. Anchor protocol, "
            "which promised 20% yields, is facing mass withdrawals. Do Kwon's recovery "
            "plan has failed."
        ),
        "date": "2022-05-12",
        "coins": ["BTC", "ETH"],
        "source": "theblock",
        "expected_direction": "negative",
        "actual_outcome": "BTC fell from $30k to $26k over 7 days, broad contagion",
    },
    {
        "title": "China Bans All Cryptocurrency Transactions",
        "text": (
            "China's central bank has declared all cryptocurrency transactions illegal, "
            "in the most sweeping crackdown to date. The People's Bank of China said "
            "services offering trading, order matching, token issuance and derivatives "
            "are strictly prohibited. Overseas exchanges providing services to Chinese "
            "residents are also illegal."
        ),
        "date": "2021-09-24",
        "coins": ["BTC", "ETH"],
        "source": "coindesk",
        "expected_direction": "negative",
        "actual_outcome": "BTC dropped ~8% on the day, recovered within 2 weeks",
    },
    {
        "title": "El Salvador Adopts Bitcoin as Legal Tender",
        "text": (
            "El Salvador has become the first country to adopt Bitcoin as legal tender. "
            "President Bukele's Bitcoin Law takes effect today. The government purchased "
            "400 BTC and launched the Chivo wallet app for citizens. The World Bank and "
            "IMF have expressed concerns about the move."
        ),
        "date": "2021-09-07",
        "coins": ["BTC"],
        "source": "cointelegraph",
        "expected_direction": "positive",
        "actual_outcome": "BTC actually dropped ~18% on the day (sell the news)",
    },
    {
        "title": "Ethereum Completes The Merge to Proof of Stake",
        "text": (
            "Ethereum has successfully completed The Merge, transitioning from "
            "proof-of-work to proof-of-stake. This reduces Ethereum's energy "
            "consumption by approximately 99.95%. The upgrade was executed without "
            "any issues. ETH is now deflationary under high network usage conditions."
        ),
        "date": "2022-09-15",
        "coins": ["ETH"],
        "source": "coindesk",
        "expected_direction": "positive",
        "actual_outcome": "ETH dropped ~10% in 7 days (sell the news event)",
    },
    {
        "title": "Federal Reserve Raises Interest Rates by 75 Basis Points",
        "text": (
            "The Federal Reserve raised its benchmark interest rate by 75 basis points "
            "for the fourth consecutive time, bringing the federal funds rate to 3.75-4%. "
            "Chair Powell signaled that rates will need to go higher than previously "
            "expected to tame inflation. Risk assets including crypto sold off sharply."
        ),
        "date": "2022-11-02",
        "coins": ["BTC", "ETH"],
        "source": "messari",
        "expected_direction": "negative",
        "actual_outcome": "BTC flat, then FTX collapse hit 9 days later",
    },
    {
        "title": "Bybit Exchange Hacked for $1.4 Billion in Ethereum",
        "text": (
            "Bybit, one of the largest cryptocurrency exchanges, has been hacked for "
            "approximately $1.4 billion in Ethereum. The attackers exploited a "
            "vulnerability in the exchange's cold wallet infrastructure. This is the "
            "largest exchange hack in crypto history, surpassing the 2014 Mt. Gox hack."
        ),
        "date": "2025-02-21",
        "coins": ["ETH", "BTC"],
        "source": "coindesk",
        "expected_direction": "negative",
        "actual_outcome": "ETH dropped ~3% initially, BTC dipped ~2%, recovered in 48h",
    },
    {
        "title": "Bitcoin Halving Completes — Block Reward Drops to 3.125 BTC",
        "text": (
            "Bitcoin's fourth halving has been completed at block 840,000. The mining "
            "reward has been cut from 6.25 BTC to 3.125 BTC per block. Historically, "
            "halvings have preceded major bull runs in the 12-18 months following. "
            "Hash rate remains strong despite the reward reduction."
        ),
        "date": "2024-04-19",
        "coins": ["BTC"],
        "source": "cointelegraph",
        "expected_direction": "positive",
        "actual_outcome": "BTC consolidated around $64k, rallied to $73k over months",
    },
    {
        "title": "Ripple Wins Partial Victory Against SEC",
        "text": (
            "A federal judge has ruled that Ripple's XRP token is not a security when "
            "sold on exchanges to retail investors. However, institutional sales did "
            "violate securities law. The ruling is a landmark decision for the broader "
            "crypto industry, potentially affecting how other tokens are classified."
        ),
        "date": "2023-07-13",
        "coins": ["XRP", "BTC"],
        "source": "coindesk",
        "expected_direction": "positive",
        "actual_outcome": "XRP surged ~75% in 24h, BTC rose ~4%",
    },
]


# ── Price lookup from DB ─────────────────────────────────────────────────────


class PriceLookup:
    """Query historical OHLCV data from PostgreSQL."""

    def __init__(self, database_url: str | None = None):
        url = database_url or DATABASE_URL
        if not url:
            raise ValueError("DATABASE_URL required")
        self._engine = create_engine(url)

    def get_price_at(self, security_id: int, date_str: str) -> dict | None:
        """Get OHLCV candle for a specific date."""
        with self._engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT open_time, open, high, low, close, volume
                    FROM crypto_ohlcv
                    WHERE security_id = :sid AND interval = '1day'
                      AND open_time::date = :dt
                    LIMIT 1
                """),
                {"sid": security_id, "dt": date_str},
            ).fetchone()
            if result:
                return {
                    "date": str(result[0]),
                    "open": float(result[1]),
                    "high": float(result[2]),
                    "low": float(result[3]),
                    "close": float(result[4]),
                    "volume": float(result[5]),
                }
        return None

    def get_price_change(
        self, security_id: int, from_date: str, horizon_days: int
    ) -> dict | None:
        """
        Get price at from_date and from_date + horizon_days.
        Returns pct change and direction.
        """
        with self._engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT open_time::date as dt, close
                    FROM crypto_ohlcv
                    WHERE security_id = :sid AND interval = '1day'
                      AND open_time::date >= :from_dt
                    ORDER BY open_time
                    LIMIT :limit
                """),
                {"sid": security_id, "from_dt": from_date, "limit": horizon_days + 1},
            ).fetchall()

        if len(rows) < 2:
            return None

        start_price = float(rows[0][1])
        # Get the row closest to our horizon
        end_idx = min(horizon_days, len(rows) - 1)
        end_price = float(rows[end_idx][1])
        end_date = str(rows[end_idx][0])

        pct_change = ((end_price - start_price) / start_price) * 100

        return {
            "start_date": from_date,
            "end_date": end_date,
            "start_price": start_price,
            "end_price": end_price,
            "pct_change": round(pct_change, 2),
            "direction": "up" if pct_change > 0.5 else ("down" if pct_change < -0.5 else "flat"),
            "horizon_days": end_idx,
        }

    def close(self):
        self._engine.dispose()


# ── CryptoPanic historical fetch ─────────────────────────────────────────────


def fetch_cryptopanic_history(pages: int = 3) -> list[dict]:
    """Paginate backwards through CryptoPanic API."""
    if not CRYPTOPANIC_API_KEY:
        logger.warning("CRYPTOPANIC_API_KEY not set — skipping CryptoPanic history")
        return []

    articles = []
    url = (
        f"https://cryptopanic.com/api/v1/posts/"
        f"?auth_token={CRYPTOPANIC_API_KEY}"
        f"&kind=news&public=true"
    )

    for page in range(pages):
        try:
            resp = requests.get(url, timeout=20)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            logger.error(f"CryptoPanic page {page} failed: {exc}")
            break

        for post in data.get("results", []):
            title = post.get("title", "")
            post_url = post.get("url", "")
            published = post.get("published_at", "")

            try:
                pub_dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pub_dt = datetime.now(UTC)

            # Determine source from domain
            domain = ""
            if post.get("domain"):
                domain = post["domain"].lower()

            source = "cryptopanic"
            if "coindesk" in domain:
                source = "coindesk"
            elif "cointelegraph" in domain:
                source = "cointelegraph"
            elif "decrypt" in domain:
                source = "decrypt"
            elif "theblock" in domain:
                source = "theblock"

            # Extract coin currencies
            coins = []
            for currency in post.get("currencies", []):
                code = currency.get("code", "").upper()
                if code in COIN_MAP:
                    coins.append(code)

            articles.append({
                "title": title,
                "text": title,  # CryptoPanic free tier only gives titles
                "date": pub_dt.strftime("%Y-%m-%d"),
                "datetime": pub_dt,
                "coins": coins,
                "source": source,
                "url": post_url,
            })

        # Get next page
        next_url = data.get("next")
        if not next_url:
            break
        url = next_url
        time.sleep(1)  # Rate limit courtesy

    logger.info(f"Fetched {len(articles)} articles from CryptoPanic ({pages} pages)")
    return articles


# ── Backtest engine ──────────────────────────────────────────────────────────


def run_backtest(
    articles: list[dict],
    horizons: list[int],
    price_lookup: PriceLookup,
) -> list[dict]:
    """
    Run sentiment scoring on articles and compare against actual prices.

    Returns list of result dicts with predictions vs actuals.
    """
    # Prepare chunks for sentiment scoring
    chunks_by_article = {}
    all_chunks = []

    for i, article in enumerate(articles):
        text_content = f"{article['title']}. {article.get('text', '')}"
        cleaned = clean_text(text_content)
        if not cleaned or count_tokens(cleaned) < 20:
            continue

        chunk = {
            "chunk_text": cleaned[:2000],  # Cap at ~512 tokens worth
            "chunk_index": 0,
            "total_chunks": 1,
            "url": article.get("url", f"event_{i}"),
            "url_hash": f"backtest_{i}",
            "title": article["title"],
            "source": article["source"],
            "source_tier": 1,
            "published_at": article.get("datetime", datetime.now(UTC)),
            "coins_mentioned": article.get("coins", []),
            "cryptopanic_sentiment": None,
        }
        chunks_by_article[i] = chunk
        all_chunks.append(chunk)

    if not all_chunks:
        return []

    # Score all chunks
    logger.info(f"Scoring {len(all_chunks)} article chunks...")
    scored = score_chunks(all_chunks)

    # Compare against actual prices
    results = []
    for i, article in enumerate(articles):
        if i not in chunks_by_article:
            continue

        chunk = chunks_by_article[i]
        categories = categorize_article(article["title"], article.get("text", ""))
        sentiment_score = chunk.get("sentiment_score", 0.0)
        confidence = chunk.get("confidence", 0.0)
        model_used = chunk.get("model_used", "unknown")

        # Predicted direction from sentiment
        if sentiment_score > 0.05:
            predicted = "up"
        elif sentiment_score < -0.05:
            predicted = "down"
        else:
            predicted = "flat"

        # Check against each coin and horizon
        for coin in article.get("coins", []):
            if coin not in COIN_MAP:
                continue

            sid = COIN_MAP[coin]["security_id"]

            for horizon in horizons:
                price_data = price_lookup.get_price_change(
                    sid, article["date"], horizon
                )

                if price_data is None:
                    continue

                actual = price_data["direction"]
                correct = (predicted == actual) or (predicted == "flat" and abs(price_data["pct_change"]) < 1.0)

                results.append({
                    "article_idx": i,
                    "title": article["title"][:80],
                    "date": article["date"],
                    "coin": coin,
                    "source": article["source"],
                    "categories": categories,
                    "model_used": model_used,
                    "sentiment_score": round(sentiment_score, 4),
                    "confidence": round(confidence, 4),
                    "predicted": predicted,
                    "actual": actual,
                    "pct_change": price_data["pct_change"],
                    "horizon_days": horizon,
                    "correct": correct,
                    "expected_direction": article.get("expected_direction"),
                    "actual_outcome": article.get("actual_outcome"),
                })

    return results


# ── Report generation ────────────────────────────────────────────────────────


def print_report(results: list[dict]):
    """Print a structured accuracy report from backtest results."""
    if not results:
        print("No results to report.")
        return

    total = len(results)
    correct = sum(1 for r in results if r["correct"])
    print(f"\n{'=' * 70}")
    print(f"BACKTEST REPORT -- {total} predictions, {correct} correct ({correct/total*100:.1f}%)")
    print(f"{'=' * 70}")

    # By horizon
    print(f"\n{'-' * 50}")
    print("BY TIME HORIZON")
    print(f"{'-' * 50}")
    by_horizon = defaultdict(list)
    for r in results:
        by_horizon[r["horizon_days"]].append(r)

    for horizon in sorted(by_horizon):
        items = by_horizon[horizon]
        acc = sum(1 for x in items if x["correct"]) / len(items) * 100
        avg_conf = sum(x["confidence"] for x in items) / len(items)
        print(f"  +{horizon}d: {acc:5.1f}% accuracy ({len(items):3d} predictions, avg conf={avg_conf:.2f})")

    # By category
    print(f"\n{'-' * 50}")
    print("BY CATEGORY")
    print(f"{'-' * 50}")
    by_cat = defaultdict(list)
    for r in results:
        for cat in r["categories"]:
            by_cat[cat].append(r)

    for cat in sorted(by_cat, key=lambda c: -len(by_cat[c])):
        items = by_cat[cat]
        acc = sum(1 for x in items if x["correct"]) / len(items) * 100
        n = len(items)
        desc = CATEGORIES.get(cat, {}).get("description", cat)
        print(f"  {cat:22s}: {acc:5.1f}% ({n:3d} preds) — {desc}")

    # By model
    print(f"\n{'-' * 50}")
    print("BY MODEL")
    print(f"{'-' * 50}")
    by_model = defaultdict(list)
    for r in results:
        by_model[r["model_used"]].append(r)

    for model in sorted(by_model):
        items = by_model[model]
        acc = sum(1 for x in items if x["correct"]) / len(items) * 100
        print(f"  {model:15s}: {acc:5.1f}% ({len(items)} predictions)")

    # By coin
    print(f"\n{'-' * 50}")
    print("BY COIN")
    print(f"{'-' * 50}")
    by_coin = defaultdict(list)
    for r in results:
        by_coin[r["coin"]].append(r)

    for coin in sorted(by_coin, key=lambda c: -len(by_coin[c])):
        items = by_coin[coin]
        acc = sum(1 for x in items if x["correct"]) / len(items) * 100
        print(f"  {coin:6s}: {acc:5.1f}% ({len(items):3d} predictions)")

    # By confidence bucket
    print(f"\n{'-' * 50}")
    print("BY CONFIDENCE LEVEL")
    print(f"{'-' * 50}")
    buckets = {"high (>0.7)": [], "medium (0.4-0.7)": [], "low (<0.4)": []}
    for r in results:
        c = r["confidence"]
        if c > 0.7:
            buckets["high (>0.7)"].append(r)
        elif c > 0.4:
            buckets["medium (0.4-0.7)"].append(r)
        else:
            buckets["low (<0.4)"].append(r)

    for bucket, items in buckets.items():
        if items:
            acc = sum(1 for x in items if x["correct"]) / len(items) * 100
            print(f"  {bucket:20s}: {acc:5.1f}% ({len(items)} predictions)")

    # Detailed event results
    print(f"\n{'-' * 50}")
    print("DETAILED RESULTS (landmark events)")
    print(f"{'-' * 50}")
    seen_titles = set()
    for r in results:
        if r.get("expected_direction") and r["title"] not in seen_titles:
            seen_titles.add(r["title"])
            match = "MATCH" if r["correct"] else "MISS"
            print(f"\n  [{r['date']}] {r['title']}")
            print(f"    Sentiment: {r['sentiment_score']:+.3f} (conf={r['confidence']:.2f}, {r['model_used']})")
            print(f"    Predicted: {r['predicted']:5s} | Actual ({r['coin']} +{r['horizon_days']}d): {r['actual']} ({r['pct_change']:+.1f}%) -> {match}")
            if r.get("actual_outcome"):
                print(f"    Context: {r['actual_outcome']}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Backtest sentiment models")
    parser.add_argument("--pages", type=int, default=3, help="CryptoPanic pages to fetch")
    parser.add_argument("--horizons", default="1,3,7", help="Comma-separated day horizons")
    parser.add_argument("--events-only", action="store_true", help="Only test landmark events")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    horizons = [int(h.strip()) for h in args.horizons.split(",")]

    # Initialize
    logger.info("Initializing price lookup...")
    price_lookup = PriceLookup()

    # Collect articles
    articles = []

    # Always include landmark events
    logger.info(f"Loading {len(LANDMARK_EVENTS)} landmark events...")
    for event in LANDMARK_EVENTS:
        event["datetime"] = datetime.fromisoformat(event["date"] + "T12:00:00+00:00")
    articles.extend(LANDMARK_EVENTS)

    # Optionally fetch CryptoPanic history
    if not args.events_only:
        logger.info(f"Fetching CryptoPanic history ({args.pages} pages)...")
        cp_articles = fetch_cryptopanic_history(pages=args.pages)
        articles.extend(cp_articles)

    logger.info(f"Total articles to backtest: {len(articles)}")

    # Run backtest
    results = run_backtest(articles, horizons, price_lookup)

    # Print report
    print_report(results)

    # Save raw results
    output_path = "data/backtest_results.json"
    serializable = []
    for r in results:
        row = dict(r)
        row.pop("actual_outcome", None)
        row.pop("expected_direction", None)
        serializable.append(row)

    with open(output_path, "w") as f:
        json.dump(serializable, f, indent=2, default=str)
    print(f"\nRaw results saved to {output_path}")

    price_lookup.close()


if __name__ == "__main__":
    main()
