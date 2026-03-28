"""
Sync Persian Loan product data into pgvector loan_chunks table.

Reads JSON files from a local clone of the Persian_Loan repo, builds a
bilingual text chunk per loan product, embeds with OpenAI text-embedding-3-small,
and upserts into the loan_chunks table (truncate + re-insert — only 43 rows).

Prerequisites:
1. Clone the Persian_Loan repo locally:
       git clone https://github.com/sajjadtzroo/Persian_Loan ../Persian_Loan
2. Set PERSIAN_LOAN_REPO_PATH in .env  (e.g. ../Persian_Loan)
3. Run alembic upgrade head  (migration 029 creates loan_chunks)
4. Ensure OPENROUTER_API_KEY is set in .env

Usage:
    python scripts/sync_persian_loan_vectors.py
    python scripts/sync_persian_loan_vectors.py --dry-run
    python scripts/sync_persian_loan_vectors.py --repo-path /path/to/Persian_Loan
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s")
logger = logging.getLogger(__name__)

# ── Credit rating → numeric score mapping ────────────────────────────────────
# Based on the 9-tier system: A1/A2/A3 (700-900), B1/B2/B3 (550-700),
#                             C1/C2 (400-550), D (<400)
CREDIT_SCORE_MAP = {
    "A":  (700, 900),
    "A1": (800, 900),
    "A2": (750, 800),
    "A3": (700, 750),
    "B":  (550, 700),
    "B1": (650, 700),
    "B2": (600, 650),
    "B3": (550, 600),
    "C":  (400, 550),
    "C1": (500, 550),
    "C2": (400, 500),
    "D":  (0,   399),
}

# Expand group letters to all their sub-tiers
GROUP_TO_SUBTIERS = {
    "A": ["A1", "A2", "A3"],
    "B": ["B1", "B2", "B3"],
    "C": ["C1", "C2"],
    "D": ["D"],
}


def score_to_subtier(score: int) -> str:
    """Map a numeric score (400-900) to its sub-tier label."""
    if score >= 800:
        return "A1"
    if score >= 750:
        return "A2"
    if score >= 700:
        return "A3"
    if score >= 650:
        return "B1"
    if score >= 600:
        return "B2"
    if score >= 550:
        return "B3"
    if score >= 500:
        return "C1"
    if score >= 400:
        return "C2"
    return "D"


def expand_credit_ratings(ratings: list[str]) -> tuple[list[str], int]:
    """
    Expand group letters to sub-tiers and compute min_credit_score.
    Returns (expanded_ratings, min_credit_score).
    """
    expanded = set()
    for r in ratings:
        r = r.strip().upper()
        if r in GROUP_TO_SUBTIERS:
            expanded.update(GROUP_TO_SUBTIERS[r])
        elif r in CREDIT_SCORE_MAP:
            expanded.add(r)

    if not expanded:
        # Default: accept all A and B (conservative fallback)
        expanded = {"A1", "A2", "A3", "B1", "B2", "B3"}

    min_score = min(CREDIT_SCORE_MAP[r][0] for r in expanded)
    return sorted(expanded), min_score


def _parse_amount_million_toman(s: str) -> float | None:
    """Parse amount strings like '1,000,000,000 تومان' → million toman float."""
    import re
    digits = re.sub(r"[^\d.]", "", s.replace(",", ""))
    if not digits:
        return None
    try:
        val = float(digits)
        # Heuristic: if > 1_000_000 assume it's in Rials, convert to million Toman
        if val > 1_000_000:
            return round(val / 10_000_000, 2)  # Rials → million Toman
        if val > 1_000:
            return round(val / 10, 2)  # Thousand Toman → million Toman
        return round(val, 2)  # already million Toman
    except ValueError:
        return None


def _parse_rate_pct(s: str) -> float | None:
    """Parse rate strings like '8%', '۸ درصد', '0%' → float."""
    import re
    # Normalize Persian digits
    s = s.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def build_chunk_text(bank: dict, loan: dict) -> str:
    """Build a bilingual ~400-token text chunk for a loan product."""
    bank_fa = bank.get("nameFA", bank.get("name", ""))
    bank_en = bank.get("nameEN", bank.get("name_en", ""))
    loan_fa = loan.get("nameFA", loan.get("name", ""))
    loan_en = loan.get("nameEN", loan.get("name_en", ""))

    fp = loan.get("financialParameters", {})
    max_amt_raw = fp.get("maxAmount", loan.get("maxAmount", ""))
    max_amt_m = _parse_amount_million_toman(str(max_amt_raw)) if max_amt_raw else None
    max_amt = f"{max_amt_m}" if max_amt_m else ""
    rate_raw = fp.get("interestRate", loan.get("interestRate", ""))
    rate_pct = _parse_rate_pct(str(rate_raw)) if rate_raw else None
    rate = f"{rate_pct}" if rate_pct is not None else ""
    periods = fp.get("repaymentPeriods", loan.get("repaymentPeriods", []))
    multiplier = fp.get("loanMultiplier", "")

    reqs = loan.get("requirements", {})
    guarantor = reqs.get("guarantor", loan.get("guarantorRequired", True))
    collateral = reqs.get("collateral", False)
    credit_ratings = reqs.get("creditRatings", loan.get("acceptedCreditRatings", ["A", "B"]))

    features = loan.get("features", [])
    if isinstance(features, list):
        features_text = "، ".join(str(f) for f in features[:6])
    else:
        features_text = str(features)

    desc_fa = ""
    desc = loan.get("description", {})
    if isinstance(desc, dict):
        desc_fa = desc.get("fa", desc.get("en", ""))
    elif isinstance(desc, str):
        desc_fa = desc

    method = loan.get("calculationMethod", loan.get("calculation_method", ""))

    periods_text = ""
    if isinstance(periods, list):
        periods_text = "، ".join(str(p) for p in periods[:6])
    elif periods:
        periods_text = str(periods)

    lines = [
        f"{bank_fa} ({bank_en}) — {loan_fa} ({loan_en})",
        f"حداکثر مبلغ وام: {max_amt} میلیون تومان" if max_amt else "",
        f"نرخ سود: {rate}٪" if rate else "",
        f"دوره‌های بازپرداخت: {periods_text} ماه" if periods_text else "",
        f"ضریب وام: {multiplier}%" if multiplier else "",
        f"رتبه‌های اعتباری قابل قبول: {', '.join(str(r) for r in credit_ratings)}",
        f"ضامن: {'لازم است' if guarantor else 'نیاز نیست'}",
        f"وثیقه: {'لازم است' if collateral else 'نیاز نیست'}",
        f"روش محاسبه: {method}" if method else "",
        f"ویژگی‌ها: {features_text}" if features_text else "",
        desc_fa[:400] if desc_fa else "",
    ]
    return "\n".join(line for line in lines if line.strip())


def load_loan_products(repo_path: Path) -> list[dict]:
    """
    Load all bank+loan data from the local Persian_Loan repo.

    Structure:
      banks-s3-organized/{traditional,digital}-banks/{bank}/data.json
        → bank info + loans = [slug, slug, ...]
      banks-s3-organized/{traditional,digital}-banks/{bank}/loans/{slug}/data.json
        → detailed loan info (only exists for a subset)
    """
    products = []
    banks_dir = repo_path / "banks-s3-organized"

    for section in ["traditional-banks", "digital-banks"]:
        section_dir = banks_dir / section
        if not section_dir.exists():
            logger.warning("Directory not found: %s", section_dir)
            continue

        for bank_dir in sorted(section_dir.iterdir()):
            if not bank_dir.is_dir():
                continue
            data_file = bank_dir / "data.json"
            if not data_file.exists():
                continue

            try:
                with open(data_file, encoding="utf-8") as f:
                    bank_data = json.load(f)
            except Exception as e:
                logger.error("Failed to read %s: %s", data_file, e)
                continue

            bank_info = {
                "nameFA": bank_data.get("nameFA", bank_dir.name),
                "nameEN": bank_data.get("nameEN", bank_dir.name),
                "slug": bank_data.get("id", bank_dir.name),
                "category": bank_data.get("category", section),
                "description": bank_data.get("descriptionFA", bank_data.get("description", "")),
            }

            loan_slugs = bank_data.get("loans", [])
            if not loan_slugs:
                continue

            for slug in loan_slugs:
                if not isinstance(slug, str):
                    continue

                # Try detailed loan JSON first
                detail_file = bank_dir / "loans" / slug / "data.json"
                if detail_file.exists():
                    try:
                        with open(detail_file, encoding="utf-8") as f:
                            loan = json.load(f)
                    except Exception as e:
                        logger.warning("Failed to read %s: %s", detail_file, e)
                        loan = {}
                else:
                    loan = {}

                # Normalize: merge bank-level description for loans without detail
                loan.setdefault("id", slug)
                loan.setdefault("nameFA", slug.replace("-", " ").title())
                loan.setdefault("nameEN", slug.replace("-", " ").title())
                loan.setdefault("bankId", bank_info["slug"])

                # Flatten terms/requirements for build_chunk_text compatibility
                terms = loan.pop("terms", {}) or {}
                reqs  = loan.pop("requirements", {}) or {}

                loan["maxAmount"] = terms.get("maxAmount", "")
                loan["interestRate"] = terms.get("interestRate", "")
                loan["calculationMethod"] = terms.get("averagePeriod", "")
                loan["guarantorRequired"] = reqs.get("guarantor", True)

                # Features
                feat = loan.get("features", {})
                if isinstance(feat, dict):
                    loan["features"] = [v.get("descriptionFA", str(v)) if isinstance(v, dict) else str(v)
                                        for v in feat.values()]

                # Description
                loan["descriptionFA"] = loan.get("descriptionFA", loan.get("description", ""))

                loan["_bank"] = bank_info
                loan["_bank_dir"] = bank_dir.name
                loan["_slug"] = slug
                products.append(loan)
                logger.debug("  loaded: %s / %s", bank_info["nameFA"], loan.get("nameFA", slug))

    logger.info("Loaded %d loan products from %d banks", len(products),
                len(set(p["_bank"]["slug"] for p in products)))
    return products


def main():
    parser = argparse.ArgumentParser(description="Sync Persian Loan products into pgvector")
    parser.add_argument("--dry-run", action="store_true", help="Parse + embed but do not write to DB")
    parser.add_argument("--repo-path", metavar="PATH", help="Path to local Persian_Loan repo clone")
    args = parser.parse_args()

    # Determine repo path
    repo_path_str = args.repo_path or os.getenv("PERSIAN_LOAN_REPO_PATH")
    if not repo_path_str:
        logger.error(
            "PERSIAN_LOAN_REPO_PATH not set. "
            "Clone the repo and set the env var or pass --repo-path."
        )
        sys.exit(1)

    repo_path = Path(repo_path_str).expanduser().resolve()
    if not repo_path.exists():
        logger.error("Persian_Loan repo path does not exist: %s", repo_path)
        sys.exit(1)

    logger.info("Reading from repo: %s", repo_path)

    # Load data
    products = load_loan_products(repo_path)
    if not products:
        logger.error("No loan products found. Check the repo structure.")
        sys.exit(1)
    logger.info("Found %d loan products", len(products))

    # Build chunk texts
    chunks = []
    for loan in products:
        bank = loan["_bank"]
        loan_id = loan.get("id", loan.get("_slug", "unknown"))
        slug = f"{bank['slug']}__{loan_id}"

        text = build_chunk_text(bank, loan)

        # Credit ratings — default to A+B if not specified
        raw_ratings = loan.get("acceptedCreditRatings", loan.get("creditRatings", ["A", "B"]))
        if isinstance(raw_ratings, str):
            raw_ratings = [raw_ratings]
        expanded_ratings, min_score = expand_credit_ratings(raw_ratings)

        # Amount: parse strings like "1,000,000,000 تومان" → million toman
        max_amt_raw = loan.get("maxAmount", "")
        max_amt = _parse_amount_million_toman(max_amt_raw) if max_amt_raw else None

        # Interest rate: parse "8%" → 8.0
        rate_raw = loan.get("interestRate", "")
        rate = _parse_rate_pct(rate_raw) if rate_raw else None

        guarantor = loan.get("guarantorRequired", True)
        method = loan.get("calculationMethod") or None

        chunks.append({
            "loan_slug": slug[:100],
            "chunk_text": text,
            "credit_ratings": expanded_ratings,
            "min_credit_score": min_score,
            "max_amount": max_amt,
            "interest_rate": rate,
            "has_guarantor": bool(guarantor),
            "calculation_method": str(method)[:50] if method else None,
            "bank_name_fa": bank["nameFA"][:150],
            "loan_name_fa": loan.get("nameFA", loan_id)[:250],
            "extra_meta": {
                "bank_en": bank["nameEN"],
                "loan_en": loan.get("nameEN", ""),
                "features": loan.get("features", [])[:10],
                "category": bank.get("category", ""),
                "description_fa": str(loan.get("descriptionFA", ""))[:500],
            },
        })

    if args.dry_run:
        logger.info("DRY RUN — showing first 3 chunks:")
        for c in chunks[:3]:
            logger.info("  [%s] %s / %s", c["loan_slug"], c["bank_name_fa"], c["loan_name_fa"])
            logger.info("  ratings=%s  min_score=%s  max_amt=%s  guarantor=%s",
                        c["credit_ratings"], c["min_credit_score"], c["max_amount"], c["has_guarantor"])
            logger.info("  text preview: %s", c["chunk_text"][:200])
        logger.info("DRY RUN complete — %d chunks would be embedded and stored.", len(chunks))
        return

    # Embed
    logger.info("Embedding %d chunks...", len(chunks))
    from rag.embedder import embed_texts
    texts = [c["chunk_text"] for c in chunks]
    embeddings = embed_texts(texts)  # shape (N, 1536)
    logger.info("Embeddings generated: shape %s", embeddings.shape)

    # Upsert into DB
    from config.settings import DATABASE_URL
    from database.connection import get_db_manager
    from database.models import LoanChunk
    from sqlalchemy.dialects.postgresql import insert

    db_manager = get_db_manager(DATABASE_URL)
    with db_manager.get_session() as session:
        # Truncate existing data for clean re-sync
        session.query(LoanChunk).delete()
        session.flush()

        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            row = LoanChunk(
                chunk_text=chunk["chunk_text"],
                embedding=emb.tolist(),
                credit_ratings=chunk["credit_ratings"],
                min_credit_score=chunk["min_credit_score"],
                max_amount=chunk["max_amount"],
                interest_rate=chunk["interest_rate"],
                has_guarantor=chunk["has_guarantor"],
                calculation_method=chunk["calculation_method"],
                bank_name_fa=chunk["bank_name_fa"],
                loan_name_fa=chunk["loan_name_fa"],
                loan_slug=chunk["loan_slug"],
                extra_meta=chunk["extra_meta"],
            )
            session.add(row)

        session.commit()
        count = session.query(LoanChunk).count()

    logger.info("Done. %d loan chunks stored in loan_chunks table.", count)


if __name__ == "__main__":
    main()
