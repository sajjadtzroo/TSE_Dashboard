#!/usr/bin/env python3
"""
MongoDB Coefficient Data Migration Script

Purpose:
- Read all JSON files from banks-s3-organized/ directory
- Extract coefficient tables from loan types
- Populate MongoDB with complete deposit/rate data
- Validate all 72 loans have proper structure

Usage:
    python scripts/populate_coefficients.py [--dry-run] [--force]
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
from app.core.config import settings


class CoefficientMigration:
    """Handle migration of coefficient tables to MongoDB"""

    def __init__(self, dry_run: bool = False, force: bool = False):
        self.dry_run = dry_run
        self.force = force
        self.stats = {
            "banks_processed": 0,
            "banks_updated": 0,
            "loans_processed": 0,
            "loans_with_coefficients": 0,
            "loans_without_coefficients": 0,
            "errors": []
        }
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None

    async def connect_db(self):
        """Connect to MongoDB"""
        mongo_url = getattr(settings, 'MONGODB_URL', 'mongodb://admin:securepassword123@localhost:27017')
        db_name = getattr(settings, 'MONGODB_DB', 'iranian_banks')

        print(f"Connecting to MongoDB: {mongo_url}")
        self.client = AsyncIOMotorClient(mongo_url)
        self.db = self.client[db_name]

        # Test connection
        await self.client.admin.command('ping')
        print(f"✓ Connected to database: {db_name}")

    async def close_db(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            print("✓ Closed database connection")

    def find_json_files(self, base_path: str) -> List[Path]:
        """Find all data.json files in the directory structure"""
        base = Path(base_path)
        json_files = []

        # Look in both digital-banks and traditional-banks
        for category in ['digital-banks', 'traditional-banks']:
            category_path = base / category
            if category_path.exists():
                # Find all data.json files
                json_files.extend(category_path.glob('*/data.json'))

        return sorted(json_files)

    def load_json_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Load and parse JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data
        except json.JSONDecodeError as e:
            self.stats["errors"].append(f"JSON parse error in {file_path}: {e}")
            return None
        except Exception as e:
            self.stats["errors"].append(f"Error reading {file_path}: {e}")
            return None

    def validate_coefficient_table(self, loan_type: Dict[str, Any]) -> bool:
        """Validate if loan type has a proper coefficient table"""
        if "coefficientTable" not in loan_type:
            return False

        table = loan_type["coefficientTable"]
        if not isinstance(table, list) or len(table) == 0:
            return False

        # Check if table has valid structure
        for row in table:
            if not isinstance(row, dict):
                return False
            # Should have at least one of: depositMonths, avgMonths
            if "depositMonths" not in row and "avgMonths" not in row:
                return False

        return True

    def extract_coefficient_data(self, bank_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract coefficient tables and relevant data from bank JSON"""
        extracted = {
            "bank_id": bank_data.get("id"),
            "bank_name": bank_data.get("nameFA"),
            "category": bank_data.get("category"),
            "loans": []
        }

        loan_types = bank_data.get("loanTypes", [])

        for loan in loan_types:
            loan_id = loan.get("id")
            self.stats["loans_processed"] += 1

            loan_data = {
                "loan_id": loan_id,
                "loan_name": loan.get("nameFA"),
                "has_coefficient_table": self.validate_coefficient_table(loan)
            }

            if loan_data["has_coefficient_table"]:
                self.stats["loans_with_coefficients"] += 1
                loan_data["coefficient_table"] = loan.get("coefficientTable")

                # Extract related fields
                loan_data["interest_rate"] = loan.get("interestRate")
                loan_data["interest_rate_numeric"] = loan.get("interestRateNumeric")
                loan_data["loan_multiplier"] = loan.get("loanMultiplier")
                loan_data["deposit_to_facility_ratio"] = loan.get("depositToFacilityRatio")
                loan_data["calculation_method"] = loan.get("calculationMethod")
                loan_data["average_balance_required"] = loan.get("averageBalanceRequired")
            else:
                self.stats["loans_without_coefficients"] += 1
                loan_data["reason"] = "No coefficient table or invalid structure"

            extracted["loans"].append(loan_data)

        return extracted

    async def update_bank_in_mongodb(self, bank_data: Dict[str, Any]) -> bool:
        """Update bank document in MongoDB with coefficient data"""
        bank_id = bank_data.get("id")

        if not bank_id:
            self.stats["errors"].append(f"Bank missing ID: {bank_data.get('nameFA', 'Unknown')}")
            return False

        if self.dry_run:
            print(f"  [DRY RUN] Would update bank: {bank_id}")
            return True

        try:
            # Check if bank exists
            existing = await self.db.banks.find_one({"id": bank_id})

            if not existing and not self.force:
                self.stats["errors"].append(f"Bank {bank_id} not found in database (use --force to insert)")
                return False

            # Prepare update document
            update_doc = {
                "$set": {
                    "loanTypes": bank_data.get("loanTypes", []),
                    "generalFeatures": bank_data.get("generalFeatures", {}),
                    "loansCount": bank_data.get("loansCount", 0),
                    "lastUpdated": bank_data.get("lastUpdated", datetime.now().strftime("%Y-%m-%d"))
                }
            }

            # Upsert (update or insert)
            result = await self.db.banks.update_one(
                {"id": bank_id},
                update_doc,
                upsert=self.force
            )

            if result.modified_count > 0 or result.upserted_id:
                return True
            else:
                return False

        except Exception as e:
            self.stats["errors"].append(f"Error updating bank {bank_id}: {e}")
            return False

    async def migrate_all_banks(self, base_path: str):
        """Main migration process"""
        print("\n" + "="*60)
        print("Starting Coefficient Data Migration")
        print("="*60 + "\n")

        if self.dry_run:
            print("⚠️  DRY RUN MODE - No changes will be made\n")

        # Find all JSON files
        json_files = self.find_json_files(base_path)
        print(f"Found {len(json_files)} bank data files\n")

        # Process each bank
        for json_file in json_files:
            bank_name = json_file.parent.name
            print(f"Processing: {bank_name} ({json_file.parent.parent.name})")

            # Load JSON
            bank_data = self.load_json_file(json_file)
            if not bank_data:
                continue

            self.stats["banks_processed"] += 1

            # Extract coefficient data
            extracted = self.extract_coefficient_data(bank_data)

            # Print summary
            loans_with_coeff = sum(1 for loan in extracted["loans"] if loan["has_coefficient_table"])
            total_loans = len(extracted["loans"])
            print(f"  Loans: {total_loans} total, {loans_with_coeff} with coefficients")

            # Update MongoDB
            updated = await self.update_bank_in_mongodb(bank_data)
            if updated:
                self.stats["banks_updated"] += 1
                print(f"  ✓ Updated in MongoDB")
            else:
                print(f"  ⚠ Not updated")

            print()

        # Print final statistics
        self.print_statistics()

    def print_statistics(self):
        """Print migration statistics"""
        print("\n" + "="*60)
        print("Migration Statistics")
        print("="*60 + "\n")

        print(f"Banks processed:              {self.stats['banks_processed']}")
        print(f"Banks updated in MongoDB:     {self.stats['banks_updated']}")
        print(f"Total loans processed:        {self.stats['loans_processed']}")
        print(f"Loans with coefficients:      {self.stats['loans_with_coefficients']}")
        print(f"Loans without coefficients:   {self.stats['loans_without_coefficients']}")

        if self.stats["errors"]:
            print(f"\n⚠️  Errors encountered:         {len(self.stats['errors'])}")
            print("\nError details:")
            for error in self.stats["errors"][:10]:  # Show first 10 errors
                print(f"  - {error}")
            if len(self.stats["errors"]) > 10:
                print(f"  ... and {len(self.stats['errors']) - 10} more")
        else:
            print("\n✓ No errors encountered")

        print("\n" + "="*60 + "\n")

    async def verify_migration(self):
        """Verify the migration was successful"""
        print("Verifying migration...\n")

        # Count banks in database
        bank_count = await self.db.banks.count_documents({})
        print(f"Total banks in database: {bank_count}")

        # Count loans with coefficient tables
        pipeline = [
            {"$unwind": "$loanTypes"},
            {"$match": {"loanTypes.coefficientTable": {"$exists": True, "$ne": []}}},
            {"$count": "total"}
        ]

        result = list(await self.db.banks.aggregate(pipeline).to_list(length=1))
        loans_with_coeffs = result[0]["total"] if result else 0

        print(f"Loans with coefficient tables: {loans_with_coeffs}")

        # Sample verification - check a specific bank
        sample_bank = await self.db.banks.find_one({"id": "sepino"})
        if sample_bank:
            print(f"\nSample verification (Sepino):")
            loan_types = sample_bank.get("loanTypes", [])
            print(f"  Loan types: {len(loan_types)}")
            for loan in loan_types:
                has_coeff = "coefficientTable" in loan and len(loan.get("coefficientTable", [])) > 0
                print(f"    - {loan.get('nameFA')}: {'✓' if has_coeff else '✗'} coefficient table")

        print("\n✓ Verification complete")


async def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Migrate coefficient data to MongoDB")
    parser.add_argument("--dry-run", action="store_true", help="Run without making changes")
    parser.add_argument("--force", action="store_true", help="Insert banks if they don't exist")
    parser.add_argument("--verify-only", action="store_true", help="Only verify existing data")
    parser.add_argument("--base-path", default="/workspaces/Persian_Loan/banks-s3-organized",
                       help="Base path to banks data")

    args = parser.parse_args()

    migration = CoefficientMigration(dry_run=args.dry_run, force=args.force)

    try:
        await migration.connect_db()

        if args.verify_only:
            await migration.verify_migration()
        else:
            await migration.migrate_all_banks(args.base_path)

            if not args.dry_run:
                await migration.verify_migration()

    except KeyboardInterrupt:
        print("\n\nMigration interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await migration.close_db()


if __name__ == "__main__":
    asyncio.run(main())
