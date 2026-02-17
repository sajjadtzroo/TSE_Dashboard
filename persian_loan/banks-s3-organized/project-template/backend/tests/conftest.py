"""
Test Configuration and Fixtures
"""

import asyncio
from typing import AsyncGenerator, Dict, Any

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from mongomock_motor import AsyncMongoMockClient
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.main import create_app
from app.core.database import database


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def mock_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """Create a mock MongoDB database for testing."""
    client = AsyncMongoMockClient()
    db = client["test_db"]

    # Seed test data
    await seed_test_data(db)

    yield db

    # Cleanup
    await client.drop_database("test_db")


async def seed_test_data(db: AsyncIOMotorDatabase) -> None:
    """Seed test database with sample data."""
    # Sample bank data
    test_banks = [
        {
            "id": "bank-melli",
            "nameFA": "بانک ملی",
            "nameEN": "Bank Melli",
            "category": "traditional-banks",
            "type": "traditional",
            "website": "https://bmi.ir",
            "loansCount": 2,
            "calculationMethod": "points-based",
            "loanTypes": [
                {
                    "id": "general-loan",
                    "nameFA": "وام عمومی",
                    "nameEN": "General Loan",
                    "minAmount": "10000000",
                    "maxAmount": "500000000",
                    "interestRate": "18%",
                    "repaymentPeriod": "60 ماه",
                    "guarantor": True,
                },
                {
                    "id": "no-guarantor-loan",
                    "nameFA": "وام بدون ضامن",
                    "nameEN": "No Guarantor Loan",
                    "minAmount": "5000000",
                    "maxAmount": "100000000",
                    "interestRate": "20%",
                    "repaymentPeriod": "36 ماه",
                    "guarantor": False,
                },
            ],
            "requirements": {
                "guarantor": True,
                "check": True,
                "creditRating": ["A", "B"],
            },
        },
        {
            "id": "digikala-finance",
            "nameFA": "دیجی‌کالا فاینانس",
            "nameEN": "Digikala Finance",
            "category": "digital-banks",
            "type": "neobank",
            "website": "https://finance.digikala.com",
            "loansCount": 1,
            "calculationMethod": "deposit-based",
            "loanTypes": [
                {
                    "id": "deposit-loan",
                    "nameFA": "وام ودیعه‌ای",
                    "nameEN": "Deposit Loan",
                    "minAmount": "1000000",
                    "maxAmount": "200000000",
                    "interestRate": "15%",
                    "repaymentPeriod": "24 ماه",
                    "guarantor": False,
                },
            ],
            "requirements": {
                "guarantor": False,
                "check": False,
            },
        },
    ]

    await db["banks"].insert_many(test_banks)


@pytest.fixture
async def app(mock_db: AsyncIOMotorDatabase) -> FastAPI:
    """Create FastAPI test application."""
    # Override database dependency
    database.db = mock_db

    test_app = create_app()

    return test_app


@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for testing."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        follow_redirects=True,
    ) as ac:
        yield ac


@pytest.fixture
def sample_bank() -> Dict[str, Any]:
    """Sample bank data for testing."""
    return {
        "id": "test-bank",
        "nameFA": "بانک تست",
        "nameEN": "Test Bank",
        "category": "traditional-banks",
        "type": "traditional",
        "website": "https://test.com",
        "loansCount": 1,
        "calculationMethod": "points-based",
        "loanTypes": [
            {
                "id": "test-loan",
                "nameFA": "وام تست",
                "nameEN": "Test Loan",
                "minAmount": "1000000",
                "maxAmount": "100000000",
                "interestRate": "18%",
                "repaymentPeriod": "48 ماه",
                "guarantor": True,
            }
        ],
    }


@pytest.fixture
def sample_loan() -> Dict[str, Any]:
    """Sample loan data for testing."""
    return {
        "id": "test-loan",
        "nameFA": "وام تست",
        "nameEN": "Test Loan",
        "category": "general",
        "minAmount": "5000000",
        "maxAmount": "200000000",
        "interestRate": "18%",
        "repaymentPeriod": "60 ماه",
        "guarantor": False,
        "calculationMethod": "points-based",
    }
