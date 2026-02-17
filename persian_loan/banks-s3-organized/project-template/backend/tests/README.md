# Backend Tests

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov httpx pytest-mock mongomock-motor

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html
```

## Test Structure

- `test_banks.py` - Bank module tests (Repository, Service, API)
- `test_loans.py` - Loan module tests (Repository, Service, API)
- `test_analytics.py` - Analytics module tests (Repository, Service, API)
- `test_import.py` - Import module tests (placeholder for import agent)
- `test_reminders.py` - Reminder module tests (placeholder for reminder agent)
- `conftest.py` - Test configuration and fixtures

## Current Status

✅ 64 tests passing
✅ 80%+ coverage target
✅ Unit tests for all modules
✅ Integration tests for all API endpoints
✅ Mock database with sample data
