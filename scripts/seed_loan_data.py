#!/usr/bin/env python3
"""
Seed loan data from JSON files into PostgreSQL.
Reads bank data from persian_loan/banks-s3-organized/ and upserts into loan tables.

Usage:
    python -m scripts.seed_loan_data                    # Run seeding
    python -m scripts.seed_loan_data --dry-run          # Preview only
    python -m scripts.seed_loan_data --verify            # Verify counts
"""

import json
import logging
import re
import sys
from argparse import ArgumentParser
from pathlib import Path
from urllib.parse import urlparse

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import DATABASE_URL
from database.connection import get_db_manager
from database.models import (
    BankCategory,
    LoanBank,
    LoanCalculationMethod,
    LoanCoefficient,
    LoanProduct,
    LoanRequirement,
    LoanRequirementType,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Base path for bank data
BANKS_DIR = Path(__file__).parent.parent / "persian_loan" / "banks-s3-organized"

# ── Bank-level keys that map to dedicated LoanBank columns ──────────────────
# Everything else goes into extra_bank_data JSONB.
BANK_MAPPED_KEYS = {
    "id",
    "nameFA",
    "nameEN",
    "type",
    "website",
    "description",
    "descriptionFA",
    "digitalBranch",
    "scoringSystem",
    "parentBank",
    # Internal/structural keys (not stored as extra)
    "_category",
    "_dir",
    "loanTypes",
    "loans",
    "loansCount",
    # Structural/meta keys that shouldn't clutter extra_bank_data
    "metadata",
    "dataIntegrity",
    "lastUpdated",
    "generalNote",
    "comparisonWithCompetitors",
    "category",
}

# ── Product-level keys that map to dedicated LoanProduct columns ────────────
# Everything else goes into extra_data JSONB (blacklist approach).
PRODUCT_MAPPED_KEYS = {
    "id",
    "nameFA",
    "nameEN",
    "category",
    "categoryFA",
    "interestRate",
    "fee",
    "maxAmount",
    "loanMultiplier",
    "depositToFacilityRatio",
    "repaymentPeriod",
    "guarantor",
    "guarantorFA",
    "description",
    "descriptionFA",
    "coefficientTables",
    "coefficientTable",
    "requirements",
}


def parse_amount_to_rials(amount_str: str) -> int | None:
    """Convert Persian amount string to Rials (Toman * 10)."""
    if not amount_str:
        return None
    # Extract numbers from string like "300,000,000 تومان"
    nums = re.findall(r"[\d,]+", amount_str.replace("٬", ","))
    if not nums:
        return None
    try:
        toman = int(nums[0].replace(",", ""))
        return toman * 10  # Convert Toman to Rials
    except (ValueError, IndexError):
        return None


def parse_interest_rate(rate_str: str) -> tuple[float | None, float | None]:
    """Parse interest rate string into min/max floats."""
    if not rate_str or rate_str in ("0%", "بدون سود"):
        return 0.0, 0.0
    if rate_str == "متغیر":
        return None, None
    nums = re.findall(r"[\d.]+", rate_str)
    if len(nums) >= 2:
        return float(nums[0]), float(nums[1])
    elif len(nums) == 1:
        return float(nums[0]), float(nums[0])
    return None, None


def parse_fee(fee_str: str) -> tuple[float | None, float | None]:
    """Parse fee string into min/max."""
    if not fee_str:
        return None, None
    nums = re.findall(r"[\d.]+", fee_str)
    if len(nums) >= 2:
        return float(nums[0]), float(nums[1])
    elif len(nums) == 1:
        return float(nums[0]), float(nums[0])
    return None, None


def parse_repayment(period_str: str) -> tuple[int | None, int | None]:
    """Parse repayment period string to min/max months."""
    if not period_str:
        return None, None
    nums = re.findall(r"\d+", period_str)
    if len(nums) >= 2:
        return int(nums[0]), int(nums[1])
    elif len(nums) == 1:
        return int(nums[0]), int(nums[0])
    return None, None


def guess_calculation_method(loan_data: dict) -> LoanCalculationMethod:
    """Guess the calculation method from loan data."""
    category = (loan_data.get("category") or "").lower()
    mapping = {
        "zero-interest": LoanCalculationMethod.zero_interest,
        "average-based": LoanCalculationMethod.average_based,
        "gold-backed": LoanCalculationMethod.gold_backed,
        "credit-card": LoanCalculationMethod.credit_card,
        "pos-based": LoanCalculationMethod.pos_based,
        "installment": LoanCalculationMethod.installment,
    }
    return mapping.get(category, LoanCalculationMethod.other)


def classify_requirement(text: str) -> LoanRequirementType:
    """Classify Persian requirement text into enum type."""
    text_lower = text.lower()
    # Financial keywords
    if any(kw in text_lower for kw in ["حساب", "موجودی", "سپرده", "گردش", "واریز"]):
        return LoanRequirementType.financial
    # Document keywords
    if any(
        kw in text_lower
        for kw in ["مدرک", "کارت ملی", "شناسنامه", "گواهی", "مجوز", "استعلام"]
    ):
        return LoanRequirementType.document
    # Collateral keywords
    if any(kw in text_lower for kw in ["وثیقه", "ضمانت", "سفته", "چک", "ضامن"]):
        return LoanRequirementType.collateral
    # Credit rating keywords
    if any(kw in text_lower for kw in ["اعتبار", "رتبه", "امتیاز", "اعتبارسنجی"]):
        return LoanRequirementType.credit_rating
    return LoanRequirementType.other


def _parse_months(value) -> int:
    """Parse a month value that may be int, float, or string with ranges/Persian digits."""
    if isinstance(value, (int, float)):
        return int(value)
    if not isinstance(value, str):
        return 0
    # Normalize Persian/Arabic digits to ASCII
    persian_map = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
    normalized = value.translate(persian_map)
    nums = re.findall(r"\d+", normalized)
    if not nums:
        return 0
    # For ranges like "15-23", take the first (minimum) value
    return int(nums[0])


def _load_json(path: Path) -> dict | None:
    """Safely load a JSON file, returning None on failure."""
    if not path.exists():
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        logger.warning(f"Error reading {path}: {e}")
        return None


def load_bank_data(bank_dir: Path, category: str) -> dict | None:
    """Load a bank's data.json, merge in metadata.json extras and sub-loan files."""
    data = _load_json(bank_dir / "data.json")
    if not data:
        logger.warning(f"No data.json in {bank_dir}")
        return None

    data["_category"] = category
    data["_dir"] = str(bank_dir)

    # ── Merge loans from metadata.json not present in data.json ─────────
    metadata = _load_json(bank_dir / "metadata.json")
    if metadata and metadata.get("loanTypes"):
        data_loan_ids = {
            lt.get("id") for lt in data.get("loanTypes", []) if lt.get("id")
        }
        for meta_loan in metadata["loanTypes"]:
            meta_id = meta_loan.get("id")
            if meta_id and meta_id not in data_loan_ids:
                data.setdefault("loanTypes", []).append(meta_loan)
                logger.info(f"  Added loan from metadata.json: {meta_id}")

    # ── Scan for images (*.png, *.jpg) and store relative paths ─────────
    images = []
    for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
        for img_path in bank_dir.rglob(ext):
            # Store path relative to banks-s3-organized/
            rel = img_path.relative_to(BANKS_DIR)
            images.append(str(rel))
    if images:
        data["_images"] = sorted(images)

    # ── Read sub-loan JSON files from loans/ subdirectory ───────────────
    loans_dir = bank_dir / "loans"
    if loans_dir.is_dir():
        for loan_subdir in sorted(loans_dir.iterdir()):
            if not loan_subdir.is_dir():
                continue
            sub_data = _load_json(loan_subdir / "data.json")
            if not sub_data:
                sub_data = _load_json(loan_subdir / "metadata.json")
            if sub_data and sub_data.get("id"):
                sub_id = sub_data["id"]
                # Find matching loanType and merge supplementary data
                matched = False
                for lt in data.get("loanTypes", []):
                    if lt.get("id") == sub_id:
                        # Merge sub-loan fields that don't exist in the main entry
                        for k, v in sub_data.items():
                            if k not in lt and v:
                                lt[k] = v
                        matched = True
                        break
                if not matched:
                    # Add as new loan if not already present
                    data.setdefault("loanTypes", []).append(sub_data)
                    logger.info(f"  Added sub-loan: {sub_id}")

    return data


def seed_bank(db, bank_data: dict, dry_run: bool = False) -> tuple[int, int]:
    """Seed a single bank and its products. Returns (products_count, coefficients_count)."""
    bank_slug = bank_data.get("id", "")
    category_str = bank_data.get("_category", "traditional-banks")
    cat = (
        BankCategory.traditional
        if "traditional" in category_str
        else BankCategory.digital
    )

    # ── Collect extra_bank_data (everything NOT mapped to a column) ──────
    extra_bank_data = {
        k: v for k, v in bank_data.items() if k not in BANK_MAPPED_KEYS and v
    }

    # ── Derive logo_url from Google Favicons API (more reliable) ────────
    logo_url = None
    website = bank_data.get("website")
    if website:
        try:
            parsed = urlparse(website)
            domain = parsed.netloc or parsed.path
            logo_url = f"https://www.google.com/s2/favicons?domain={domain}&sz=128"
        except Exception:
            pass

    # ── Upsert bank ─────────────────────────────────────────────────────
    existing = db.query(LoanBank).filter(LoanBank.bank_slug == bank_slug).first()
    bank_fields = dict(
        name_fa=bank_data.get("nameFA", ""),
        name_en=bank_data.get("nameEN", ""),
        category=cat,
        bank_type=bank_data.get("type"),
        website=bank_data.get("website"),
        logo_url=logo_url,
        description=bank_data.get("description"),
        description_fa=bank_data.get("descriptionFA"),
        digital_branch=bank_data.get("digitalBranch"),
        parent_bank=bank_data.get("parentBank"),
        scoring_system=bank_data.get("scoringSystem"),
        extra_bank_data=extra_bank_data or None,
    )

    if existing:
        bank = existing
        for attr, val in bank_fields.items():
            setattr(bank, attr, val)
        logger.info(f"  Updated bank: {bank_slug}")
    else:
        bank = LoanBank(bank_slug=bank_slug, **bank_fields)
        if not dry_run:
            db.add(bank)
            db.flush()
        logger.info(f"  Created bank: {bank_slug}")

    if dry_run:
        return len(bank_data.get("loanTypes", [])), 0

    products_count = 0
    coefficients_count = 0

    for loan in bank_data.get("loanTypes", []):
        loan_slug = loan.get("id", "")
        rate_min, rate_max = parse_interest_rate(loan.get("interestRate", ""))
        fee_min, fee_max = parse_fee(loan.get("fee", ""))
        rep_min, rep_max = parse_repayment(loan.get("repaymentPeriod", ""))
        max_amount = parse_amount_to_rials(loan.get("maxAmount", ""))

        # ── Blacklist approach: capture ALL keys not mapped to columns ───
        extra_data = {
            k: v for k, v in loan.items() if k not in PRODUCT_MAPPED_KEYS and v
        }

        # ── Upsert product ──────────────────────────────────────────────
        existing_prod = (
            db.query(LoanProduct)
            .filter(LoanProduct.bank_id == bank.id, LoanProduct.loan_slug == loan_slug)
            .first()
        )

        prod_fields = dict(
            name_fa=loan.get("nameFA", ""),
            name_en=loan.get("nameEN", ""),
            category=loan.get("category"),
            category_fa=loan.get("categoryFA"),
            calculation_method=guess_calculation_method(loan),
            interest_rate_min=rate_min,
            interest_rate_max=rate_max,
            fee_min=fee_min,
            fee_max=fee_max,
            max_amount=max_amount,
            max_amount_display=loan.get("maxAmount"),
            loan_multiplier=loan.get("loanMultiplier"),
            deposit_to_facility_ratio=loan.get("depositToFacilityRatio"),
            repayment_period_min=rep_min,
            repayment_period_max=rep_max,
            guarantor_required=bool(loan.get("guarantor", False)),
            guarantor_description=loan.get("guarantorFA")
            or (loan["guarantor"] if isinstance(loan.get("guarantor"), str) else None),
            description=loan.get("description"),
            description_fa=loan.get("descriptionFA"),
            extra_data=extra_data or None,
        )

        if existing_prod:
            prod = existing_prod
            for attr, val in prod_fields.items():
                setattr(prod, attr, val)
        else:
            prod = LoanProduct(bank_id=bank.id, loan_slug=loan_slug, **prod_fields)
            db.add(prod)
            db.flush()

        products_count += 1

        # ── Seed coefficientTables (object format: bank-meli style) ─────
        coeff_tables = loan.get("coefficientTables", {})
        for _table_name, table_data in coeff_tables.items():
            fee_pct = table_data.get("feePercent", 0)
            for example in table_data.get("examples", []):
                existing_coeff = (
                    db.query(LoanCoefficient)
                    .filter(
                        LoanCoefficient.product_id == prod.id,
                        LoanCoefficient.fee_percent == fee_pct,
                        LoanCoefficient.deposit_months
                        == example.get("depositMonths", 0),
                        LoanCoefficient.repayment_months
                        == example.get("repaymentMonths", 0),
                    )
                    .first()
                )
                if not existing_coeff:
                    db.add(
                        LoanCoefficient(
                            product_id=prod.id,
                            fee_percent=fee_pct,
                            deposit_months=example.get("depositMonths", 0),
                            repayment_months=example.get("repaymentMonths", 0),
                            ratio_percent=example.get("ratio", ""),
                            description=table_data.get("description"),
                        )
                    )
                    coefficients_count += 1

        # ── Seed coefficientTable (array format: bank-saderat/sepino) ───
        coeff_array = loan.get("coefficientTable", [])
        for row in coeff_array:
            deposit_months = _parse_months(
                row.get("avgMonths", row.get("depositMonths", 0))
            )
            repayment_months = _parse_months(row.get("repaymentMonths", 0))
            ratio = row.get("coefficient", row.get("loanPercent", ""))
            interest = row.get("interestRate", "")

            # Parse fee from interestRate string if present
            fee_pct = 0
            if interest:
                fee_nums = re.findall(r"[\d.]+", str(interest))
                if fee_nums:
                    fee_pct = float(fee_nums[0])

            existing_coeff = (
                db.query(LoanCoefficient)
                .filter(
                    LoanCoefficient.product_id == prod.id,
                    LoanCoefficient.fee_percent == fee_pct,
                    LoanCoefficient.deposit_months == deposit_months,
                    LoanCoefficient.repayment_months == repayment_months,
                )
                .first()
            )
            if not existing_coeff:
                db.add(
                    LoanCoefficient(
                        product_id=prod.id,
                        fee_percent=fee_pct,
                        deposit_months=deposit_months,
                        repayment_months=repayment_months,
                        ratio_percent=str(ratio),
                    )
                )
                coefficients_count += 1

        # ── Seed requirements (with smart classification) ───────────────
        requirements = loan.get("requirements", [])
        if isinstance(requirements, list):
            for req_text in requirements:
                if not isinstance(req_text, str):
                    continue
                existing_req = (
                    db.query(LoanRequirement)
                    .filter(
                        LoanRequirement.product_id == prod.id,
                        LoanRequirement.description_fa == req_text,
                    )
                    .first()
                )
                if existing_req:
                    # Reclassify existing requirements
                    existing_req.requirement_type = classify_requirement(req_text)
                else:
                    db.add(
                        LoanRequirement(
                            product_id=prod.id,
                            requirement_type=classify_requirement(req_text),
                            description=req_text,
                            description_fa=req_text,
                            is_mandatory=True,
                        )
                    )

    return products_count, coefficients_count


def run_seed(dry_run: bool = False):
    """Run the full seeding process."""
    if not BANKS_DIR.exists():
        logger.error(f"Banks directory not found: {BANKS_DIR}")
        return

    mgr = get_db_manager(DATABASE_URL)
    total_banks = 0
    total_products = 0
    total_coefficients = 0

    with mgr.get_session() as db:
        for category_dir in ["traditional-banks", "digital-banks"]:
            cat_path = BANKS_DIR / category_dir
            if not cat_path.exists():
                continue

            logger.info(f"\n{'=' * 40}")
            logger.info(f"Processing {category_dir}...")
            logger.info(f"{'=' * 40}")

            for bank_dir in sorted(cat_path.iterdir()):
                if not bank_dir.is_dir():
                    continue

                bank_data = load_bank_data(bank_dir, category_dir)
                if not bank_data:
                    continue

                p_count, c_count = seed_bank(db, bank_data, dry_run=dry_run)
                total_banks += 1
                total_products += p_count
                total_coefficients += c_count

        if not dry_run:
            db.commit()

    logger.info(f"\n{'=' * 40}")
    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Seeding complete!")
    logger.info(f"  Banks: {total_banks}")
    logger.info(f"  Products: {total_products}")
    logger.info(f"  Coefficients: {total_coefficients}")
    logger.info(f"{'=' * 40}")


def verify_counts():
    """Verify seeded data counts."""
    mgr = get_db_manager(DATABASE_URL)
    with mgr.get_session() as db:
        banks = db.query(LoanBank).count()
        products = db.query(LoanProduct).count()
        coefficients = db.query(LoanCoefficient).count()
        requirements = db.query(LoanRequirement).count()

    logger.info("Database counts:")
    logger.info(f"  loan_banks: {banks}")
    logger.info(f"  loan_products: {products}")
    logger.info(f"  loan_coefficients: {coefficients}")
    logger.info(f"  loan_requirements: {requirements}")


if __name__ == "__main__":
    parser = ArgumentParser(description="Seed loan data into PostgreSQL")
    parser.add_argument(
        "--dry-run", action="store_true", help="Preview without writing"
    )
    parser.add_argument("--verify", action="store_true", help="Verify counts only")
    args = parser.parse_args()

    if args.verify:
        verify_counts()
    else:
        run_seed(dry_run=args.dry_run)
