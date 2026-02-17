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
from pathlib import Path
from argparse import ArgumentParser

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import get_db_manager
from config.settings import DATABASE_URL
from database.models import (
    LoanBank, LoanProduct, LoanCoefficient, LoanRequirement,
    BankCategory, LoanCalculationMethod, LoanRequirementType,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Base path for bank data
BANKS_DIR = Path(__file__).parent.parent / "persian_loan" / "banks-s3-organized"


def parse_amount_to_rials(amount_str: str) -> int | None:
    """Convert Persian amount string to Rials (Toman * 10)."""
    if not amount_str:
        return None
    # Extract numbers from string like "300,000,000 تومان"
    nums = re.findall(r'[\d,]+', amount_str.replace('٬', ','))
    if not nums:
        return None
    try:
        toman = int(nums[0].replace(',', ''))
        return toman * 10  # Convert Toman to Rials
    except (ValueError, IndexError):
        return None


def parse_interest_rate(rate_str: str) -> tuple[float | None, float | None]:
    """Parse interest rate string into min/max floats."""
    if not rate_str or rate_str in ("0%", "بدون سود"):
        return 0.0, 0.0
    if rate_str == "متغیر":
        return None, None
    nums = re.findall(r'[\d.]+', rate_str)
    if len(nums) >= 2:
        return float(nums[0]), float(nums[1])
    elif len(nums) == 1:
        return float(nums[0]), float(nums[0])
    return None, None


def parse_fee(fee_str: str) -> tuple[float | None, float | None]:
    """Parse fee string into min/max."""
    if not fee_str:
        return None, None
    nums = re.findall(r'[\d.]+', fee_str)
    if len(nums) >= 2:
        return float(nums[0]), float(nums[1])
    elif len(nums) == 1:
        return float(nums[0]), float(nums[0])
    return None, None


def parse_repayment(period_str: str) -> tuple[int | None, int | None]:
    """Parse repayment period string to min/max months."""
    if not period_str:
        return None, None
    nums = re.findall(r'\d+', period_str)
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


def load_bank_data(bank_dir: Path, category: str) -> dict | None:
    """Load and parse a bank's data.json file."""
    data_file = bank_dir / "data.json"
    if not data_file.exists():
        logger.warning(f"No data.json in {bank_dir}")
        return None
    try:
        with open(data_file, encoding="utf-8") as f:
            data = json.load(f)
        data["_category"] = category
        data["_dir"] = str(bank_dir)
        return data
    except (json.JSONDecodeError, IOError) as e:
        logger.error(f"Error reading {data_file}: {e}")
        return None


def seed_bank(db, bank_data: dict, dry_run: bool = False) -> tuple[int, int]:
    """Seed a single bank and its products. Returns (products_count, coefficients_count)."""
    bank_slug = bank_data.get("id", "")
    category_str = bank_data.get("_category", "traditional-banks")
    cat = BankCategory.traditional if "traditional" in category_str else BankCategory.digital

    # Upsert bank
    existing = db.query(LoanBank).filter(LoanBank.bank_slug == bank_slug).first()
    if existing:
        bank = existing
        bank.name_fa = bank_data.get("nameFA", "")
        bank.name_en = bank_data.get("nameEN", "")
        bank.category = cat
        bank.bank_type = bank_data.get("type")
        bank.website = bank_data.get("website")
        bank.description = bank_data.get("description")
        bank.description_fa = bank_data.get("descriptionFA")
        bank.digital_branch = bank_data.get("digitalBranch")
        logger.info(f"  Updated bank: {bank_slug}")
    else:
        bank = LoanBank(
            bank_slug=bank_slug,
            name_fa=bank_data.get("nameFA", ""),
            name_en=bank_data.get("nameEN", ""),
            category=cat,
            bank_type=bank_data.get("type"),
            website=bank_data.get("website"),
            description=bank_data.get("description"),
            description_fa=bank_data.get("descriptionFA"),
            digital_branch=bank_data.get("digitalBranch"),
        )
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

        # Collect extra_data (everything that doesn't map to a column)
        extra_keys = {
            "loanOptions", "tiers", "creditRatingRequirements",
            "borrowerCreditRating", "guarantorCreditRating",
            "depositAmountOneMonth", "depositAmountThreeMonths",
            "depositAmountSixMonths", "minimumCreditScore",
            "pointSystem", "note", "link", "feeByDuration",
            "averageBalanceRequired", "averagePeriod",
            "subTypes", "creditRatingRules",
        }
        extra_data = {k: v for k, v in loan.items() if k in extra_keys and v}

        # Upsert product
        existing_prod = (
            db.query(LoanProduct)
            .filter(LoanProduct.bank_id == bank.id, LoanProduct.loan_slug == loan_slug)
            .first()
        )
        if existing_prod:
            prod = existing_prod
            prod.name_fa = loan.get("nameFA", "")
            prod.name_en = loan.get("nameEN", "")
            prod.category = loan.get("category")
            prod.category_fa = loan.get("categoryFA")
            prod.calculation_method = guess_calculation_method(loan)
            prod.interest_rate_min = rate_min
            prod.interest_rate_max = rate_max
            prod.fee_min = fee_min
            prod.fee_max = fee_max
            prod.max_amount = max_amount
            prod.max_amount_display = loan.get("maxAmount")
            prod.loan_multiplier = loan.get("loanMultiplier")
            prod.deposit_to_facility_ratio = loan.get("depositToFacilityRatio")
            prod.repayment_period_min = rep_min
            prod.repayment_period_max = rep_max
            prod.guarantor_required = loan.get("guarantor", False)
            prod.guarantor_description = loan.get("guarantorFA")
            prod.description = loan.get("description")
            prod.description_fa = loan.get("descriptionFA")
            prod.extra_data = extra_data or None
        else:
            prod = LoanProduct(
                bank_id=bank.id,
                loan_slug=loan_slug,
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
                guarantor_required=loan.get("guarantor", False),
                guarantor_description=loan.get("guarantorFA"),
                description=loan.get("description"),
                description_fa=loan.get("descriptionFA"),
                extra_data=extra_data or None,
            )
            db.add(prod)
            db.flush()

        products_count += 1

        # Seed coefficient tables
        coeff_tables = loan.get("coefficientTables", {})
        for table_name, table_data in coeff_tables.items():
            fee_pct = table_data.get("feePercent", 0)
            for example in table_data.get("examples", []):
                existing_coeff = (
                    db.query(LoanCoefficient)
                    .filter(
                        LoanCoefficient.product_id == prod.id,
                        LoanCoefficient.fee_percent == fee_pct,
                        LoanCoefficient.deposit_months == example.get("depositMonths", 0),
                        LoanCoefficient.repayment_months == example.get("repaymentMonths", 0),
                    )
                    .first()
                )
                if not existing_coeff:
                    db.add(LoanCoefficient(
                        product_id=prod.id,
                        fee_percent=fee_pct,
                        deposit_months=example.get("depositMonths", 0),
                        repayment_months=example.get("repaymentMonths", 0),
                        ratio_percent=example.get("ratio", ""),
                        description=table_data.get("description"),
                    ))
                    coefficients_count += 1

        # Seed requirements
        for req_text in loan.get("requirements", []):
            existing_req = (
                db.query(LoanRequirement)
                .filter(
                    LoanRequirement.product_id == prod.id,
                    LoanRequirement.description_fa == req_text,
                )
                .first()
            )
            if not existing_req:
                db.add(LoanRequirement(
                    product_id=prod.id,
                    requirement_type=LoanRequirementType.other,
                    description=req_text,
                    description_fa=req_text,
                    is_mandatory=True,
                ))

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

    logger.info(f"Database counts:")
    logger.info(f"  loan_banks: {banks}")
    logger.info(f"  loan_products: {products}")
    logger.info(f"  loan_coefficients: {coefficients}")
    logger.info(f"  loan_requirements: {requirements}")


if __name__ == "__main__":
    parser = ArgumentParser(description="Seed loan data into PostgreSQL")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--verify", action="store_true", help="Verify counts only")
    args = parser.parse_args()

    if args.verify:
        verify_counts()
    else:
        run_seed(dry_run=args.dry_run)
