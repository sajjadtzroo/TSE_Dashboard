#!/usr/bin/env python3
"""
Validate Existing Data Against Schema

This script scans existing MongoDB documents against the defined JSON schemas
and reports violations without modifying any data. Use this to identify
data quality issues before applying schema validation.

Usage:
    # Validate all collections
    python scripts/validate_existing_data.py

    # Validate specific collection
    python scripts/validate_existing_data.py --collection banks

    # Show details of violations
    python scripts/validate_existing_data.py --verbose

    # Generate JSON report
    python scripts/validate_existing_data.py --output report.json

    # Limit number of documents to check
    python scripts/validate_existing_data.py --limit 100
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import OperationFailure

from app.core.config import settings
from app.core.validators import VALIDATORS, get_validator


class DataValidator:
    """Validates existing data against JSON schemas."""

    def __init__(self, db: AsyncIOMotorDatabase, verbose: bool = False):
        """
        Initialize data validator.

        Args:
            db: MongoDB database instance
            verbose: Whether to show detailed violation info
        """
        self.db = db
        self.verbose = verbose

    async def validate_document(
        self,
        document: Dict[str, Any],
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate a single document against a schema.

        Uses MongoDB's $jsonSchema validator for consistent validation.

        Args:
            document: Document to validate
            schema: JSON Schema definition

        Returns:
            Dictionary with validation results
        """
        try:
            # Create a temporary collection for validation
            temp_collection = f"temp_validation_{datetime.now().timestamp()}"

            # Create collection with validator
            await self.db.create_collection(
                temp_collection,
                validator=schema,
                validationLevel="strict"
            )

            try:
                # Try to insert the document
                await self.db[temp_collection].insert_one(document.copy())

                # If successful, document is valid
                return {
                    "valid": True,
                    "violations": []
                }

            except OperationFailure as e:
                # Extract validation error details
                error_msg = str(e)
                violations = []

                # Parse common validation errors
                if "Document failed validation" in error_msg:
                    violations.append({
                        "type": "schema_violation",
                        "message": error_msg
                    })
                else:
                    violations.append({
                        "type": "unknown_error",
                        "message": error_msg
                    })

                return {
                    "valid": False,
                    "violations": violations
                }

            finally:
                # Clean up temporary collection
                await self.db[temp_collection].drop()

        except Exception as e:
            return {
                "valid": False,
                "violations": [{
                    "type": "validation_error",
                    "message": str(e)
                }]
            }

    def check_required_fields(
        self,
        document: Dict[str, Any],
        schema: Dict[str, Any]
    ) -> List[str]:
        """
        Check for missing required fields.

        Args:
            document: Document to check
            schema: JSON Schema definition

        Returns:
            List of missing required field names
        """
        required = schema.get("$jsonSchema", {}).get("required", [])
        missing = []

        for field in required:
            if field not in document:
                missing.append(field)

        return missing

    def check_field_types(
        self,
        document: Dict[str, Any],
        schema: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Check field types against schema.

        Args:
            document: Document to check
            schema: JSON Schema definition

        Returns:
            List of type violations
        """
        properties = schema.get("$jsonSchema", {}).get("properties", {})
        violations = []

        for field_name, field_schema in properties.items():
            if field_name not in document:
                continue

            value = document[field_name]
            expected_type = field_schema.get("bsonType")

            if not expected_type:
                continue

            # Handle list of types (e.g., ["string", "null"])
            if isinstance(expected_type, list):
                if value is None and "null" in expected_type:
                    continue
                expected_type = [t for t in expected_type if t != "null"][0]

            # Type checking
            type_valid = self._check_type(value, expected_type)

            if not type_valid:
                violations.append({
                    "field": field_name,
                    "expected": expected_type,
                    "actual": type(value).__name__,
                    "value": str(value)[:100]  # Truncate long values
                })

        return violations

    def _check_type(self, value: Any, expected_type: str) -> bool:
        """
        Check if value matches expected BSON type.

        Args:
            value: Value to check
            expected_type: Expected BSON type

        Returns:
            True if type matches
        """
        type_map = {
            "string": str,
            "int": int,
            "double": (float, int),
            "bool": bool,
            "array": list,
            "object": dict,
            "date": datetime,
        }

        if expected_type not in type_map:
            return True  # Unknown type, skip check

        expected_python_type = type_map[expected_type]

        if isinstance(expected_python_type, tuple):
            return isinstance(value, expected_python_type)
        else:
            return isinstance(value, expected_python_type)

    def check_enum_values(
        self,
        document: Dict[str, Any],
        schema: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Check enum field values.

        Args:
            document: Document to check
            schema: JSON Schema definition

        Returns:
            List of enum violations
        """
        properties = schema.get("$jsonSchema", {}).get("properties", {})
        violations = []

        for field_name, field_schema in properties.items():
            if field_name not in document:
                continue

            enum_values = field_schema.get("enum")
            if not enum_values:
                continue

            value = document[field_name]

            if value not in enum_values:
                violations.append({
                    "field": field_name,
                    "value": value,
                    "allowed": enum_values
                })

        return violations

    async def validate_collection(
        self,
        collection_name: str,
        limit: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Validate all documents in a collection.

        Args:
            collection_name: Name of collection to validate
            limit: Maximum number of documents to check

        Returns:
            Validation report dictionary
        """
        print(f"\nValidating collection: {collection_name}")

        try:
            # Get validator schema
            schema = get_validator(collection_name)
            collection = self.db[collection_name]

            # Count total documents
            total_docs = await collection.count_documents({})
            print(f"  Total documents: {total_docs}")

            if total_docs == 0:
                return {
                    "collection": collection_name,
                    "total_documents": 0,
                    "checked_documents": 0,
                    "valid_documents": 0,
                    "invalid_documents": 0,
                    "violations": []
                }

            # Get documents
            cursor = collection.find({})
            if limit:
                cursor = cursor.limit(limit)

            documents = await cursor.to_list(length=limit or total_docs)
            checked = len(documents)
            print(f"  Checking: {checked} documents")

            # Validate each document
            violations = []
            valid_count = 0
            invalid_count = 0

            for idx, doc in enumerate(documents, 1):
                doc_id = str(doc.get("_id", "unknown"))

                # Check required fields
                missing_fields = self.check_required_fields(doc, schema)

                # Check field types
                type_violations = self.check_field_types(doc, schema)

                # Check enum values
                enum_violations = self.check_enum_values(doc, schema)

                # Compile violations for this document
                doc_violations = []

                if missing_fields:
                    doc_violations.append({
                        "type": "missing_required_fields",
                        "fields": missing_fields
                    })

                if type_violations:
                    doc_violations.append({
                        "type": "type_mismatch",
                        "details": type_violations
                    })

                if enum_violations:
                    doc_violations.append({
                        "type": "invalid_enum_value",
                        "details": enum_violations
                    })

                if doc_violations:
                    invalid_count += 1
                    violations.append({
                        "document_id": doc_id,
                        "violations": doc_violations
                    })

                    if self.verbose:
                        print(f"    Document {idx}/{checked}: INVALID (ID: {doc_id})")
                        for v in doc_violations:
                            print(f"      - {v['type']}")
                else:
                    valid_count += 1
                    if self.verbose:
                        print(f"    Document {idx}/{checked}: VALID")

            # Summary
            print(f"  Valid: {valid_count}")
            print(f"  Invalid: {invalid_count}")

            return {
                "collection": collection_name,
                "total_documents": total_docs,
                "checked_documents": checked,
                "valid_documents": valid_count,
                "invalid_documents": invalid_count,
                "violations": violations
            }

        except Exception as e:
            print(f"  ✗ Error validating collection: {e}")
            return {
                "collection": collection_name,
                "error": str(e)
            }


async def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description="Validate existing MongoDB data against schemas"
    )
    parser.add_argument(
        "--collection",
        type=str,
        help="Validate specific collection only"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed violation information"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Save report to JSON file"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of documents to check per collection"
    )

    args = parser.parse_args()

    # Connect to MongoDB
    print(f"\nConnecting to MongoDB: {settings.mongodb_url}")
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    try:
        # Test connection
        await db.command("ping")
        print("✓ Connected successfully")

        validator = DataValidator(db=db, verbose=args.verbose)

        # Determine which collections to validate
        if args.collection:
            if args.collection not in VALIDATORS:
                print(f"Error: Unknown collection '{args.collection}'")
                print(f"Available: {list(VALIDATORS.keys())}")
                sys.exit(1)
            collections_to_validate = [args.collection]
        else:
            collections_to_validate = list(VALIDATORS.keys())

        # Validate collections
        print("\n" + "=" * 60)
        print("DATA VALIDATION REPORT")
        print("=" * 60)
        print(f"Timestamp: {datetime.now().isoformat()}")
        print(f"Collections: {len(collections_to_validate)}")
        if args.limit:
            print(f"Document Limit: {args.limit} per collection")

        reports = []
        for collection_name in collections_to_validate:
            report = await validator.validate_collection(
                collection_name,
                limit=args.limit
            )
            reports.append(report)

        # Overall summary
        print("\n" + "=" * 60)
        print("OVERALL SUMMARY")
        print("=" * 60)

        total_checked = sum(r.get("checked_documents", 0) for r in reports)
        total_valid = sum(r.get("valid_documents", 0) for r in reports)
        total_invalid = sum(r.get("invalid_documents", 0) for r in reports)

        print(f"Total Documents Checked: {total_checked}")
        print(f"Valid: {total_valid}")
        print(f"Invalid: {total_invalid}")

        if total_checked > 0:
            validity_percent = (total_valid / total_checked) * 100
            print(f"Validity Rate: {validity_percent:.1f}%")

        # Save report if requested
        if args.output:
            report_data = {
                "timestamp": datetime.now().isoformat(),
                "summary": {
                    "total_checked": total_checked,
                    "total_valid": total_valid,
                    "total_invalid": total_invalid,
                    "validity_percent": validity_percent if total_checked > 0 else 0
                },
                "collections": reports
            }

            output_path = Path(args.output)
            output_path.write_text(json.dumps(report_data, indent=2))
            print(f"\n✓ Report saved to: {output_path}")

        # Exit with error code if there are violations
        if total_invalid > 0:
            print("\n⚠ Data quality issues detected!")
            print("Run with --verbose to see detailed violations")
            sys.exit(1)
        else:
            print("\n✓ All checked documents are valid!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
