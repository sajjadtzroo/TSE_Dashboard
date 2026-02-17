#!/usr/bin/env python3
"""
Apply MongoDB Schema Validation

This script applies JSON Schema validators to MongoDB collections with
validationLevel: "moderate" to ensure data quality without breaking
existing data.

Validation Levels:
- strict: Validates all inserts and updates (can break existing data)
- moderate: Validates new inserts and updates to valid documents (SAFE)
- off: No validation (not recommended)

Usage:
    # Dry run (shows what would be applied)
    python scripts/apply_schema_validation.py --dry-run

    # Apply to all collections
    python scripts/apply_schema_validation.py

    # Apply to specific collection
    python scripts/apply_schema_validation.py --collection banks

    # Backup before applying
    python scripts/apply_schema_validation.py --backup

    # Use strict validation (NOT RECOMMENDED for existing data)
    python scripts/apply_schema_validation.py --level strict
"""

import argparse
import asyncio
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import OperationFailure

from app.core.config import settings
from app.core.validators import VALIDATORS, get_validator


class ValidationApplier:
    """Applies schema validation to MongoDB collections."""

    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        validation_level: str = "moderate",
        validation_action: str = "error"
    ):
        """
        Initialize validator applier.

        Args:
            db: MongoDB database instance
            validation_level: "strict", "moderate", or "off"
            validation_action: "error" or "warn"
        """
        self.db = db
        self.validation_level = validation_level
        self.validation_action = validation_action

    async def backup_collection_info(
        self,
        collection_name: str
    ) -> Optional[Dict]:
        """
        Backup current collection validation rules.

        Args:
            collection_name: Name of collection to backup

        Returns:
            Current collection options or None
        """
        try:
            # Get current collection info
            collections = await self.db.list_collections(
                filter={"name": collection_name}
            )
            collections_list = await collections.to_list(length=1)

            if collections_list:
                return collections_list[0].get("options", {})
            return None

        except Exception as e:
            print(f"  Error backing up {collection_name}: {e}")
            return None

    async def apply_validator(
        self,
        collection_name: str,
        dry_run: bool = False
    ) -> bool:
        """
        Apply validator to a collection.

        Args:
            collection_name: Name of collection
            dry_run: If True, only show what would be applied

        Returns:
            True if successful
        """
        try:
            # Get validator schema
            validator = get_validator(collection_name)

            if dry_run:
                print(f"\n[DRY RUN] Would apply to: {collection_name}")
                print(f"  Validation Level: {self.validation_level}")
                print(f"  Validation Action: {self.validation_action}")
                print(f"  Schema Keys: {list(validator['$jsonSchema']['properties'].keys())[:10]}...")
                return True

            print(f"\nApplying validator to: {collection_name}")

            # Create collection if it doesn't exist
            collection_list = await self.db.list_collection_names()
            if collection_name not in collection_list:
                print(f"  Creating collection: {collection_name}")
                await self.db.create_collection(collection_name)

            # Apply validator using collMod
            result = await self.db.command({
                "collMod": collection_name,
                "validator": validator,
                "validationLevel": self.validation_level,
                "validationAction": self.validation_action
            })

            if result.get("ok") == 1:
                print(f"  ✓ Successfully applied validator")
                print(f"    Level: {self.validation_level}")
                print(f"    Action: {self.validation_action}")
                return True
            else:
                print(f"  ✗ Failed to apply validator: {result}")
                return False

        except OperationFailure as e:
            print(f"  ✗ MongoDB operation failed: {e}")
            return False
        except Exception as e:
            print(f"  ✗ Error applying validator: {e}")
            return False

    async def verify_validator(self, collection_name: str) -> bool:
        """
        Verify that validator was applied correctly.

        Args:
            collection_name: Name of collection to verify

        Returns:
            True if validator is active
        """
        try:
            collections = await self.db.list_collections(
                filter={"name": collection_name}
            )
            collections_list = await collections.to_list(length=1)

            if not collections_list:
                print(f"  ✗ Collection not found: {collection_name}")
                return False

            options = collections_list[0].get("options", {})
            has_validator = "validator" in options
            validation_level = options.get("validationLevel", "off")
            validation_action = options.get("validationAction", "warn")

            print(f"\n  Verification for {collection_name}:")
            print(f"    Has Validator: {has_validator}")
            print(f"    Level: {validation_level}")
            print(f"    Action: {validation_action}")

            return has_validator and validation_level != "off"

        except Exception as e:
            print(f"  ✗ Error verifying validator: {e}")
            return False

    async def list_current_validators(self) -> Dict[str, Dict]:
        """
        List all current validators in the database.

        Returns:
            Dictionary mapping collection names to their validator info
        """
        validators = {}
        try:
            collections = await self.db.list_collections()
            collections_list = await collections.to_list(length=100)

            for coll_info in collections_list:
                name = coll_info["name"]
                options = coll_info.get("options", {})

                if "validator" in options:
                    validators[name] = {
                        "level": options.get("validationLevel", "off"),
                        "action": options.get("validationAction", "warn"),
                        "has_schema": "$jsonSchema" in options.get("validator", {})
                    }

            return validators

        except Exception as e:
            print(f"Error listing validators: {e}")
            return {}


async def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description="Apply MongoDB schema validation to collections"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be applied without making changes"
    )
    parser.add_argument(
        "--collection",
        type=str,
        help="Apply to specific collection only"
    )
    parser.add_argument(
        "--level",
        type=str,
        choices=["strict", "moderate", "off"],
        default="moderate",
        help="Validation level (default: moderate)"
    )
    parser.add_argument(
        "--action",
        type=str,
        choices=["error", "warn"],
        default="error",
        help="Validation action (default: error)"
    )
    parser.add_argument(
        "--backup",
        action="store_true",
        help="Show current validators before applying (recommended)"
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify validators after applying"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List current validators and exit"
    )

    args = parser.parse_args()

    # Connect to MongoDB
    print(f"\nConnecting to MongoDB: {settings.mongodb_url}")
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    try:
        # Test connection
        await db.command("ping")
        print("✓ Connected successfully\n")

        applier = ValidationApplier(
            db=db,
            validation_level=args.level,
            validation_action=args.action
        )

        # List current validators if requested
        if args.list or args.backup:
            print("Current validators in database:")
            current = await applier.list_current_validators()

            if not current:
                print("  No validators currently applied")
            else:
                for name, info in current.items():
                    print(f"\n  {name}:")
                    print(f"    Level: {info['level']}")
                    print(f"    Action: {info['action']}")
                    print(f"    Has JSON Schema: {info['has_schema']}")

            if args.list:
                return

            print("\n" + "=" * 60)

        # Determine which collections to process
        if args.collection:
            if args.collection not in VALIDATORS:
                print(f"Error: Unknown collection '{args.collection}'")
                print(f"Available: {list(VALIDATORS.keys())}")
                sys.exit(1)
            collections_to_process = [args.collection]
        else:
            collections_to_process = list(VALIDATORS.keys())

        # Show summary
        if args.dry_run:
            print("\n" + "=" * 60)
            print("DRY RUN MODE - No changes will be made")
            print("=" * 60)
        else:
            print("\n" + "=" * 60)
            print("APPLYING VALIDATORS")
            print("=" * 60)
            print(f"Validation Level: {args.level}")
            print(f"Validation Action: {args.action}")
            print(f"Collections: {len(collections_to_process)}")

        # Apply validators
        success_count = 0
        failed_collections = []

        for collection_name in collections_to_process:
            success = await applier.apply_validator(
                collection_name,
                dry_run=args.dry_run
            )

            if success:
                success_count += 1

                # Verify if requested and not dry run
                if args.verify and not args.dry_run:
                    await applier.verify_validator(collection_name)
            else:
                failed_collections.append(collection_name)

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total Collections: {len(collections_to_process)}")
        print(f"Successful: {success_count}")
        print(f"Failed: {len(failed_collections)}")

        if failed_collections:
            print(f"\nFailed collections: {', '.join(failed_collections)}")

        if args.dry_run:
            print("\n*** This was a dry run. Use without --dry-run to apply. ***")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
