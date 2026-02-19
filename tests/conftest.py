"""
Shared pytest fixtures and configuration for TSE Dashboard tests.
"""

import sys
from collections.abc import Generator
from datetime import date, datetime
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import Session

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# ─── Database Fixtures ───────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def test_database_url() -> str:
    """
    Test database URL. Can be overridden with TEST_DATABASE_URL env var.
    Uses testcontainers in integration tests.
    """
    import os

    return os.getenv(
        "TEST_DATABASE_URL", "postgresql://test:test@localhost:5433/test_tsetmc"
    )


@pytest.fixture(scope="function")
def db_session(test_database_url: str) -> Generator:
    """
    Provides a clean database session for each test.
    Automatically rolls back changes after test completes.
    """
    from database.connection import DatabaseManager

    db_manager = DatabaseManager(test_database_url)
    db_manager.create_tables()

    session = db_manager.get_session()
    try:
        yield session
        session.rollback()
    finally:
        session.close()


@pytest.fixture(scope="function")
def db_with_test_data(db_session):
    """
    Database session pre-populated with test data.
    """
    from tests.fixtures.sample_data import (
        create_test_ohlcv_data,
        create_test_securities,
    )

    # Create sample securities
    securities = create_test_securities(db_session)

    # Create sample OHLCV data
    ohlcv_records = create_test_ohlcv_data(db_session, securities)

    db_session.commit()

    return {
        "session": db_session,
        "securities": securities,
        "ohlcv": ohlcv_records,
    }


# ─── Mock Fixtures ───────────────────────────────────────────────────────────


@pytest.fixture
def mock_settings(monkeypatch):
    """
    Mock settings for testing without requiring real API keys.
    """
    monkeypatch.setenv("BRSAPI_KEY", "test_api_key_12345")
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql://test:test@localhost:5433/test_tsetmc"
    )
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    monkeypatch.setenv("SCHEDULER_ENABLED", "false")


@pytest.fixture
def mock_brsapi_response():
    """
    Mock successful BrsApi.ir API response.
    """
    return {
        "code_http": 200,
        "successful": True,
        "data": [
            {
                "symbol": "TEST1",
                "name": "Test Company 1",
                "close": 1000,
                "volume": 1000000,
            }
        ],
    }


@pytest.fixture
def mock_brsapi_error_response():
    """
    Mock failed BrsApi.ir API response.
    """
    return {
        "code_http": 400,
        "successful": False,
        "message_error": "Invalid API key",
        "data": [],
    }


# ─── Sample Data Fixtures ────────────────────────────────────────────────────


@pytest.fixture
def sample_security():
    """Sample security object for testing."""
    from database.models import Security

    return Security(
        security_id=1,
        ins_code="12345678901234567",
        symbol="TEST",
        name_fa="شرکت تست",
        name_en="Test Company",
        type="stock",
        sector_name_fa="فناوری اطلاعات",
        market_type="stock_exchange",
        is_active=True,
    )


@pytest.fixture
def sample_daily_ohlcv():
    """Sample OHLCV data for testing."""
    from database.models import DailyOHLCV

    return DailyOHLCV(
        security_id=1,
        date=date(2026, 2, 16),
        open=1000.0,
        high=1100.0,
        low=950.0,
        close=1050.0,
        last=1050.0,
        close_change=50.0,
        close_change_pct=5.0,
        volume=1000000,
        value=1050000000,
        trades=5000,
    )


@pytest.fixture
def today() -> date:
    """Current date for testing."""
    return date.today()


@pytest.fixture
def now() -> datetime:
    """Current datetime for testing."""
    return datetime.now()


# ─── Spider Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture
def scrapy_settings():
    """Scrapy settings for testing spiders."""
    return {
        "ITEM_PIPELINES": {},  # Disable pipelines for unit tests
        "BRSAPI_KEY": "test_api_key",
        "LOG_LEVEL": "ERROR",  # Reduce noise in test output
    }


# ─── Mock User Fixtures ──────────────────────────────────────────────────────


@pytest.fixture
def mock_db():
    """Mock DB session for unit tests (no real DB)."""
    return MagicMock(spec=Session)


@pytest.fixture
def mock_viewer_user():
    """Mock user with 'viewer' role."""
    user = MagicMock()
    user.id = 1
    user.username = "viewer"
    user.role = "viewer"
    user.is_active = True
    return user


@pytest.fixture
def mock_analyst_user():
    """Mock user with 'analyst' role."""
    user = MagicMock()
    user.id = 2
    user.username = "analyst"
    user.role = "analyst"
    user.is_active = True
    return user


@pytest.fixture
def mock_admin_user():
    """Mock user with 'admin' role."""
    user = MagicMock()
    user.id = 3
    user.username = "admin"
    user.role = "admin"
    user.is_active = True
    return user


@pytest.fixture
def authed_client(mock_viewer_user, mock_db):
    """TestClient with auth + DB overridden (viewer role, no real services)."""
    from fastapi.testclient import TestClient

    from api.auth import get_current_user
    from api.deps import get_db
    from api.main import app

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_viewer_user
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def analyst_client(mock_analyst_user, mock_db):
    """TestClient with auth + DB overridden (analyst role, no real services)."""
    from fastapi.testclient import TestClient

    from api.auth import get_current_user
    from api.deps import get_db
    from api.main import app

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_analyst_user
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def unauthed_client():
    """TestClient with NO auth override (requests are unauthenticated)."""
    from fastapi.testclient import TestClient

    from api.main import app

    app.dependency_overrides.clear()
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ─── API Fixtures ────────────────────────────────────────────────────────────


@pytest.fixture
def test_client():
    """
    FastAPI test client for integration testing.
    """
    from fastapi.testclient import TestClient

    from api.main import app

    return TestClient(app)


# ─── Helpers ─────────────────────────────────────────────────────────────────


def pytest_configure(config):
    """
    Custom pytest configuration.
    """
    # Set up test environment
    import os

    os.environ["TESTING"] = "true"


def pytest_collection_modifyitems(config, items):
    """
    Auto-mark tests based on their location.
    """
    for item in items:
        # Auto-mark tests based on directory
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "e2e" in str(item.fspath):
            item.add_marker(pytest.mark.e2e)
        elif "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)

        # Auto-mark tests that use certain fixtures
        if (
            "db_session" in item.fixturenames
            or "db_with_test_data" in item.fixturenames
        ):
            item.add_marker(pytest.mark.requires_db)
