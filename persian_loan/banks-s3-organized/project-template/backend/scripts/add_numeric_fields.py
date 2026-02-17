#!/usr/bin/env python3
"""
Add Numeric Fields to Loan Data
Adds interestRateNumeric and other numeric fields by parsing string values.
"""

import asyncio
import re
from motor.motor_asyncio import AsyncIOMotorClient
from loguru import logger

# Configuration
MONGODB_URL = "mongodb://admin:securepassword123@localhost:27017"
DATABASE_NAME = "iranian_banks"


def parse_percentage(value: str) -> float | None:
    """Parse percentage string to float."""
    if not value or not isinstance(value, str):
        return None

    # Remove Persian/Arabic numerals and convert to English
    persian_to_english = {
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
        '٪': '%'
    }

    for persian, english in persian_to_english.items():
        value = value.replace(persian, english)

    # Extract numeric value from percentage
    match = re.search(r'([\d.]+)\s*%?', value)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None

    return None


def parse_amount(value: str) -> float | None:
    """Parse amount string to float (in tomans)."""
    if not value or not isinstance(value, str):
        return None

    # Remove Persian/Arabic numerals
    persian_to_english = {
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
        '٬': ',', '،': ','
    }

    for persian, english in persian_to_english.items():
        value = value.replace(persian, english)

    # Remove commas and extract number
    value = value.replace(',', '')

    # Extract numeric value
    match = re.search(r'([\d.]+)', value)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None

    return None


async def add_numeric_fields():
    """Add numeric fields to all loans in the database."""
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    banks_collection = db["banks"]

    logger.info("Processing banks...")

    updated_banks = 0
    updated_loans = 0

    async for bank in banks_collection.find({}):
        bank_updated = False

        if 'loanTypes' in bank and isinstance(bank['loanTypes'], list):
            for loan in bank['loanTypes']:
                loan_updated = False

                # Add interestRateNumeric
                if 'interestRate' in loan and 'interestRateNumeric' not in loan:
                    numeric_rate = parse_percentage(loan['interestRate'])
                    if numeric_rate is not None:
                        loan['interestRateNumeric'] = numeric_rate
                        loan_updated = True

                # Add minAmountNumeric
                if 'minAmount' in loan and 'minAmountNumeric' not in loan:
                    numeric_amount = parse_amount(loan['minAmount'])
                    if numeric_amount is not None:
                        loan['minAmountNumeric'] = numeric_amount
                        loan_updated = True

                # Add maxAmountNumeric
                if 'maxAmount' in loan and 'maxAmountNumeric' not in loan:
                    numeric_amount = parse_amount(loan['maxAmount'])
                    if numeric_amount is not None:
                        loan['maxAmountNumeric'] = numeric_amount
                        loan_updated = True

                if loan_updated:
                    updated_loans += 1
                    bank_updated = True

            if bank_updated:
                # Update the bank document
                await banks_collection.update_one(
                    {'_id': bank['_id']},
                    {'$set': {'loanTypes': bank['loanTypes']}}
                )
                updated_banks += 1
                logger.success(f"Updated bank: {bank.get('nameFA', bank.get('id'))}")

    logger.info(f"Update complete! Updated {updated_banks} banks with {updated_loans} loans")
    client.close()


if __name__ == "__main__":
    asyncio.run(add_numeric_fields())
