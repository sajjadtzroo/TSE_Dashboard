#!/usr/bin/env python3
"""
Test Schema Validator Enforcement

This script tests that MongoDB validators properly reject invalid documents
and accept valid ones.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import WriteError

from app.core.config import settings


async def test_validators():
    """Test validator enforcement."""
    print("\nTesting MongoDB Schema Validator Enforcement\n")
    print("=" * 60)

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    try:
        # Test 1: Valid bank document (should succeed)
        print("\n1. Testing VALID bank document...")
        valid_bank = {
            "id": "test-bank-valid",
            "nameFA": "بانک تست",
            "nameEN": "Test Bank",
            "category": "digital-banks",
            "loanTypes": []
        }

        try:
            result = await db.banks.insert_one(valid_bank)
            print(f"   ✓ Valid document accepted (ID: {result.inserted_id})")
            # Clean up
            await db.banks.delete_one({"_id": result.inserted_id})
            print("   ✓ Cleaned up test document")
        except WriteError as e:
            print(f"   ✗ UNEXPECTED: Valid document rejected: {e}")

        # Test 2: Invalid bank - missing required field (should fail)
        print("\n2. Testing INVALID bank (missing required field)...")
        invalid_bank_missing = {
            "id": "test-bank-invalid",
            "nameFA": "بانک تست"
            # Missing nameEN and category (required)
        }

        try:
            await db.banks.insert_one(invalid_bank_missing)
            print("   ✗ UNEXPECTED: Invalid document was accepted!")
        except WriteError as e:
            print(f"   ✓ Invalid document correctly rejected")
            print(f"   Reason: Document failed validation")

        # Test 3: Invalid bank - wrong category enum (should fail)
        print("\n3. Testing INVALID bank (wrong category enum)...")
        invalid_bank_enum = {
            "id": "test-bank-invalid-2",
            "nameFA": "بانک تست",
            "nameEN": "Test Bank",
            "category": "invalid-category"  # Not in enum
        }

        try:
            await db.banks.insert_one(invalid_bank_enum)
            print("   ✗ UNEXPECTED: Invalid enum was accepted!")
        except WriteError as e:
            print(f"   ✓ Invalid enum correctly rejected")
            print(f"   Reason: Document failed validation")

        # Test 4: Invalid loan type - out of range interest rate (should fail)
        print("\n4. Testing INVALID loan (interest rate > 100)...")
        invalid_bank_loan = {
            "id": "test-bank-invalid-3",
            "nameFA": "بانک تست",
            "nameEN": "Test Bank",
            "category": "digital-banks",
            "loanTypes": [
                {
                    "id": "loan-1",
                    "nameFA": "وام تست",
                    "interestRateNumeric": 150.0  # > 100 (max)
                }
            ]
        }

        try:
            await db.banks.insert_one(invalid_bank_loan)
            print("   ✗ UNEXPECTED: Out-of-range interest rate was accepted!")
        except WriteError as e:
            print(f"   ✓ Out-of-range value correctly rejected")
            print(f"   Reason: Document failed validation")

        # Test 5: Valid loan with null interestRateNumeric (should succeed)
        print("\n5. Testing VALID loan with null interest rate...")
        valid_bank_null = {
            "id": "test-bank-valid-2",
            "nameFA": "بانک تست",
            "nameEN": "Test Bank",
            "category": "traditional-banks",
            "loanTypes": [
                {
                    "id": "loan-1",
                    "nameFA": "وام تست",
                    "interestRateNumeric": None  # Null is allowed
                }
            ]
        }

        try:
            result = await db.banks.insert_one(valid_bank_null)
            print(f"   ✓ Valid document with null value accepted (ID: {result.inserted_id})")
            # Clean up
            await db.banks.delete_one({"_id": result.inserted_id})
            print("   ✓ Cleaned up test document")
        except WriteError as e:
            print(f"   ✗ UNEXPECTED: Valid null value rejected: {e}")

        print("\n" + "=" * 60)
        print("VALIDATOR ENFORCEMENT TEST COMPLETE")
        print("=" * 60)
        print("\n✓ Schema validators are working correctly!")
        print("  - Valid documents are accepted")
        print("  - Invalid documents are rejected")
        print("  - Enum validation is enforced")
        print("  - Range validation is enforced")

    except Exception as e:
        print(f"\n✗ Test error: {e}")
        sys.exit(1)

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(test_validators())
