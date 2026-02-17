"""
Import bank data from JSON files to MongoDB.

Usage:
    python scripts/import_data.py --data-dir ../../../banks-s3-organized
"""

import asyncio
import json
from pathlib import Path

from loguru import logger
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration
MONGODB_URL = "mongodb://admin:securepassword123@localhost:27017"
DATABASE_NAME = "iranian_banks"


async def import_data(data_dir: Path):
    """Import all bank data to MongoDB."""
    logger.info(f"Importing data from: {data_dir}")

    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    banks_collection = db["banks"]

    # Clear existing data
    await banks_collection.delete_many({})
    logger.info("Cleared existing data")

    imported_count = 0

    # Import digital banks
    digital_banks_dir = data_dir / "digital-banks"
    if digital_banks_dir.exists():
        for bank_dir in digital_banks_dir.iterdir():
            if bank_dir.is_dir():
                data_file = bank_dir / "data.json"
                if data_file.exists():
                    with open(data_file, encoding="utf-8") as f:
                        bank_data = json.load(f)
                        bank_data["calculationMethod"] = get_calculation_method(
                            bank_data.get("id", "")
                        )
                        await banks_collection.insert_one(bank_data)
                        logger.success(f"Imported: {bank_data.get('nameFA', bank_dir.name)}")
                        imported_count += 1

    # Import traditional banks
    traditional_banks_dir = data_dir / "traditional-banks"
    if traditional_banks_dir.exists():
        for bank_dir in traditional_banks_dir.iterdir():
            if bank_dir.is_dir():
                data_file = bank_dir / "data.json"
                if data_file.exists():
                    with open(data_file, encoding="utf-8") as f:
                        bank_data = json.load(f)
                        await banks_collection.insert_one(bank_data)
                        logger.success(f"Imported: {bank_data.get('nameFA', bank_dir.name)}")
                        imported_count += 1

    logger.info(f"Import complete. Total banks: {imported_count}")

    # Create indexes
    await banks_collection.create_index("id", unique=True)
    await banks_collection.create_index("category")
    await banks_collection.create_index("type")
    logger.info("Created indexes")

    client.close()


def get_calculation_method(bank_id: str) -> str:
    """Get calculation method for a bank."""
    methods = {
        "bankino": "points-based",
        "blue-bank": "average-based",
        "sepino": "deposit-based",
        "weepod": "step-based",
        "qbank": "average-based",
        "hi-bank": "step-based",
        "neshan-bank": "collateral-based",
    }
    return methods.get(bank_id, "average-based")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Import bank data to MongoDB")
    parser.add_argument(
        "--data-dir",
        type=str,
        default="../../../banks-s3-organized",
        help="Path to data directory",
    )
    args = parser.parse_args()

    data_path = Path(args.data_dir).resolve()

    if not data_path.exists():
        logger.error(f"Data directory not found: {data_path}")
        exit(1)

    asyncio.run(import_data(data_path))
