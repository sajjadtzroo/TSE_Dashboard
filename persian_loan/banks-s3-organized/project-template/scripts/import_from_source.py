"""
Import Bank Data from Source Files
Reads all data.json files from banks-s3-organized and imports to MongoDB
"""

import asyncio
import json
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = "mongodb://admin:securepassword123@localhost:27017"
DATABASE_NAME = "iranian_banks"

# Base path to source data
BASE_PATH = Path(__file__).parent.parent.parent  # banks-s3-organized


def load_source_data():
    """Load all bank data from source data.json files."""
    banks = []

    # Digital banks
    digital_banks_path = BASE_PATH / "digital-banks"
    if digital_banks_path.exists():
        for bank_dir in digital_banks_path.iterdir():
            if bank_dir.is_dir():
                data_file = bank_dir / "data.json"
                if data_file.exists():
                    try:
                        with open(data_file, 'r', encoding='utf-8') as f:
                            bank_data = json.load(f)
                            bank_data['category'] = 'digital-banks'
                            banks.append(bank_data)
                            print(f"Loaded: {bank_data.get('nameFA', bank_dir.name)} (digital)")
                    except Exception as e:
                        print(f"Error loading {data_file}: {e}")

    # Traditional banks
    traditional_banks_path = BASE_PATH / "traditional-banks"
    if traditional_banks_path.exists():
        for bank_dir in traditional_banks_path.iterdir():
            if bank_dir.is_dir():
                data_file = bank_dir / "data.json"
                if data_file.exists():
                    try:
                        with open(data_file, 'r', encoding='utf-8') as f:
                            bank_data = json.load(f)
                            bank_data['category'] = 'traditional-banks'
                            banks.append(bank_data)
                            print(f"Loaded: {bank_data.get('nameFA', bank_dir.name)} (traditional)")
                    except Exception as e:
                        print(f"Error loading {data_file}: {e}")

    return banks


def normalize_bank_data(bank):
    """Normalize bank data structure for consistency."""
    normalized = {
        "id": bank.get("id", ""),
        "nameFA": bank.get("nameFA", ""),
        "nameEN": bank.get("nameEN", ""),
        "category": bank.get("category", ""),
        "type": bank.get("type", ""),
        "website": bank.get("website", ""),
        "description": bank.get("description", ""),
        "descriptionFA": bank.get("descriptionFA", ""),
    }

    # Add optional fields if they exist
    if "parentBank" in bank:
        normalized["parentBank"] = bank["parentBank"]
    if "parentBankFA" in bank:
        normalized["parentBankFA"] = bank["parentBankFA"]
    if "founded" in bank:
        normalized["founded"] = bank["founded"]

    # Handle loan types - can be array or object
    loan_types = bank.get("loanTypes", [])

    # If loanTypes is a dict (like in blue-bank), convert to array
    if isinstance(loan_types, dict):
        converted_loans = []
        for key, value in loan_types.items():
            if isinstance(value, dict):
                loan = {"id": key, **value}
                converted_loans.append(loan)
        loan_types = converted_loans

    # Also check for nitroLoan special case (sepino)
    if "nitroLoan" in bank and isinstance(bank["nitroLoan"], dict):
        nitro = bank["nitroLoan"]
        if not any(lt.get("id") == "nitro" for lt in loan_types):
            loan_types.insert(0, nitro)

    # Handle Bankino special case - has loanDetails and loanTiers instead of loanTypes
    if bank.get("id") == "bankino" and not loan_types:
        main_service = bank.get("mainService", {})
        loan_details = bank.get("loanDetails", {})
        loan_tiers = bank.get("loanTiers", [])

        # Create Vamino monthly loan
        vamino_monthly = {
            "id": "vamino-monthly",
            "nameFA": "وامینو (اعتبار یک ماهه)",
            "nameEN": "Vamino Monthly Credit",
            "category": "instant",
            "categoryFA": "وام فوری",
            "minAmount": loan_details.get("minAmount", "10,000,000"),
            "maxAmount": loan_details.get("maxAmount", "400,000,000"),
            "interestRate": loan_details.get("interestRate", "23%"),
            "repaymentPeriod": "1 ماه",
            "guarantor": False,
            "description": "Monthly revolving credit based on points",
            "descriptionFA": "اعتبار ماهانه گردشی بر اساس امتیاز",
        }
        loan_types.append(vamino_monthly)

        # Create Vamino installment loan
        vamino_installment = {
            "id": "vamino-installment",
            "nameFA": "وامینو اقساطی",
            "nameEN": "Vamino Installment Loan",
            "category": "points-based",
            "categoryFA": "وام امتیازی",
            "minAmount": loan_details.get("minAmount", "10,000,000"),
            "maxAmount": loan_details.get("maxAmount", "400,000,000"),
            "interestRate": loan_details.get("interestRate", "23%"),
            "repaymentPeriod": loan_details.get("repaymentPeriod", "6-24 months"),
            "guarantor": False,
            "description": "Points-based installment loan",
            "descriptionFA": "وام اقساطی بر اساس امتیاز",
            "loanTiers": loan_tiers,
        }
        loan_types.append(vamino_installment)

    # Normalize each loan
    normalized_loans = []
    for loan in loan_types:
        if isinstance(loan, dict):
            normalized_loan = normalize_loan(loan, bank["id"], bank.get("nameFA", ""), bank.get("nameEN", ""))
            normalized_loans.append(normalized_loan)

    normalized["loanTypes"] = normalized_loans
    normalized["loansCount"] = len(normalized_loans)
    normalized["lastUpdated"] = bank.get("lastUpdated", "2026-02-02")

    # Copy any additional fields
    for key in ["generalRequirements", "generalFeatures", "features", "scoringSystem",
                "mainProgram", "terms", "requirements", "creditRatingRequirement",
                "digitalBranch", "stepSystem", "focus", "focusFA", "generalNote",
                "generalNoteEN", "metadata", "dataIntegrity", "loans"]:
        if key in bank:
            normalized[key] = bank[key]

    return normalized


def normalize_loan(loan, bank_id, bank_name_fa, bank_name_en):
    """Normalize loan data structure."""
    normalized = {
        "id": loan.get("id", ""),
        "nameFA": loan.get("nameFA", ""),
        "nameEN": loan.get("nameEN", ""),
        "bankId": bank_id,
        "bankNameFA": bank_name_fa,
        "bankNameEN": bank_name_en,
    }

    # Copy all other loan fields
    for key in ["category", "categoryFA", "minAmount", "maxAmount", "minAmountNumeric",
                "maxAmountNumeric", "interestRate", "interestRateNumeric", "interestRateFA",
                "repaymentPeriod", "minTerm", "maxTerm", "guarantor", "guarantorFA",
                "guarantorNote", "description", "descriptionFA", "requirements", "requirementsFA",
                "processingTime", "check", "promissoryNote", "collateral", "collateralFA",
                "mechanism", "pointsRequired", "amounts", "creditRatingRequired", "creditRating",
                "calculationMethod", "targetAudience", "targetAudienceFA", "fees",
                "minWaitPeriod", "loanMultiplier", "maxAmountFA", "maxAmountSpecial", "link",
                "note", "sources"]:
        if key in loan:
            normalized[key] = loan[key]

    # Set guarantor default
    if "guarantor" not in normalized:
        normalized["guarantor"] = True  # Default for traditional banks

    return normalized


def create_loans_collection(banks):
    """Create separate loans collection from bank data."""
    all_loans = []

    for bank in banks:
        for loan in bank.get("loanTypes", []):
            loan_doc = {
                **loan,
                "bankId": bank["id"],
                "bankNameFA": bank["nameFA"],
                "bankNameEN": bank["nameEN"],
                "bankCategory": bank["category"],
            }
            all_loans.append(loan_doc)

    return all_loans


async def import_data():
    """Import all data to MongoDB."""
    print("=" * 60)
    print("Loading source data from banks-s3-organized...")
    print("=" * 60)

    # Load source data
    source_banks = load_source_data()
    print(f"\nLoaded {len(source_banks)} banks from source files")

    # Normalize data
    print("\nNormalizing bank data...")
    normalized_banks = [normalize_bank_data(bank) for bank in source_banks]

    # Create loans collection
    print("Creating loans collection...")
    all_loans = create_loans_collection(normalized_banks)

    print(f"\nTotal banks: {len(normalized_banks)}")
    print(f"Total loans: {len(all_loans)}")

    # Connect to MongoDB
    print("\n" + "=" * 60)
    print("Connecting to MongoDB...")
    print("=" * 60)

    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    banks_collection = db["banks"]
    loans_collection = db["loans"]

    # Clear existing data
    await banks_collection.delete_many({})
    await loans_collection.delete_many({})
    print("Cleared existing data")

    # Insert banks
    print("\nInserting banks...")
    for bank in normalized_banks:
        await banks_collection.insert_one(bank)
        print(f"  Inserted bank: {bank['nameFA']} ({bank['id']}) - {bank['loansCount']} loans")

    # Insert loans
    print("\nInserting loans...")
    if all_loans:
        await loans_collection.insert_many(all_loans)
        print(f"  Inserted {len(all_loans)} loans")

    # Print summary by category
    print("\n" + "=" * 60)
    print("IMPORT SUMMARY")
    print("=" * 60)

    digital_count = len([b for b in normalized_banks if b['category'] == 'digital-banks'])
    traditional_count = len([b for b in normalized_banks if b['category'] == 'traditional-banks'])
    digital_loans = len([l for l in all_loans if l['bankCategory'] == 'digital-banks'])
    traditional_loans = len([l for l in all_loans if l['bankCategory'] == 'traditional-banks'])

    print(f"Digital Banks: {digital_count} banks, {digital_loans} loans")
    print(f"Traditional Banks: {traditional_count} banks, {traditional_loans} loans")
    print(f"Total: {len(normalized_banks)} banks, {len(all_loans)} loans")

    # List all banks
    print("\n" + "=" * 60)
    print("ALL BANKS:")
    print("=" * 60)
    for bank in sorted(normalized_banks, key=lambda x: (x['category'], x['nameFA'])):
        print(f"  [{bank['category'][:3]}] {bank['nameFA']} ({bank['id']}): {bank['loansCount']} loans")

    client.close()
    print("\nImport completed successfully!")


if __name__ == "__main__":
    asyncio.run(import_data())
