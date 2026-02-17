# Testing Documentation

## Overview

This document describes the comprehensive testing infrastructure for the Iranian Banks Loan Dashboard application.

## Testing Stack

### Backend (FastAPI + MongoDB)
- **pytest**: Testing framework
- **pytest-asyncio**: Async test support
- **pytest-cov**: Coverage reporting
- **httpx**: API client for integration tests
- **mongomock-motor**: MongoDB mocking
- **pytest-mock**: Mocking utilities

### Frontend (React + TypeScript)
- **Vitest**: Fast unit test framework
- **React Testing Library**: Component testing
- **@testing-library/jest-dom**: DOM matchers
- **@testing-library/user-event**: User interaction simulation

## Directory Structure

```
backend/
├── tests/
│   ├── conftest.py              # Test configuration & fixtures
│   ├── test_banks.py            # Bank module tests
│   ├── test_loans.py            # Loan module tests
│   ├── test_analytics.py        # Analytics module tests
│   ├── test_import.py           # Import module tests (placeholder)
│   └── test_reminders.py        # Reminder module tests (placeholder)
├── pytest.ini                   # Pytest configuration
└── .coveragerc                  # Coverage configuration

frontend/
├── src/
│   ├── __tests__/
│   │   ├── components/          # Component tests
│   │   ├── features/            # Feature tests
│   │   ├── utils/               # Utility tests
│   │   └── services/            # Service tests
│   └── test/
│       ├── setup.ts             # Test setup
│       ├── testUtils.tsx        # Testing utilities
│       └── mocks/               # Mock data
├── vitest.config.ts             # Vitest configuration
└── package.json                 # Test scripts

.github/
└── workflows/
    └── test.yml                 # CI/CD pipeline
```

## Running Tests

### Backend Tests

```bash
cd banks-s3-organized/project-template/backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_banks.py

# Run specific test class
pytest tests/test_banks.py::TestBankService

# Run specific test
pytest tests/test_banks.py::TestBankService::test_get_all_banks

# Run with verbose output
pytest -v

# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run tests in parallel (requires pytest-xdist)
pytest -n auto
```

### Frontend Tests

```bash
cd banks-s3-organized/project-template/frontend

# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- BankCard.test.tsx
```

## Test Categories

### Backend

#### Unit Tests (`@pytest.mark.unit`)
- **Repository Tests**: Test database operations with mocked MongoDB
- **Service Tests**: Test business logic layer
- **Schema Tests**: Test Pydantic models and validation

#### Integration Tests (`@pytest.mark.integration`)
- **API Endpoint Tests**: Test complete request/response cycle
- **End-to-End Workflows**: Test multiple modules together

### Frontend

#### Unit Tests
- **Component Tests**: Test individual React components
- **Utility Tests**: Test helper functions
- **Hook Tests**: Test custom React hooks

#### Integration Tests
- **Page Tests**: Test complete page functionality
- **Feature Tests**: Test feature modules
- **API Service Tests**: Test API integration layer

## Coverage Goals

- **Backend**: ≥80% coverage
- **Frontend**: ≥70% coverage

Current coverage can be viewed in HTML reports:
- Backend: `backend/htmlcov/index.html`
- Frontend: `frontend/coverage/index.html`

## Writing Tests

### Backend Test Example

```python
import pytest
from httpx import AsyncClient

@pytest.mark.unit
class TestBankService:
    async def test_get_bank_by_id(self, mock_db):
        """Test getting a bank by ID."""
        service = BankService(mock_db)
        bank = await service.get_bank_by_id("bank-melli")

        assert bank["id"] == "bank-melli"
        assert bank["nameFA"] == "بانک ملی"

@pytest.mark.integration
class TestBanksAPI:
    async def test_get_all_banks(self, client: AsyncClient):
        """Test GET /api/banks/."""
        response = await client.get("/api/banks/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
```

### Frontend Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/testUtils';
import { BankCard } from '../components/cards/BankCard';

describe('BankCard', () => {
  const mockBank = {
    id: 'test-bank',
    nameFA: 'بانک تست',
    nameEN: 'Test Bank',
    category: 'traditional-banks',
    loansCount: 5,
  };

  it('should render bank name', () => {
    render(<BankCard bank={mockBank} />);
    expect(screen.getByText('بانک تست')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<BankCard bank={mockBank} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Test Fixtures

### Backend Fixtures (conftest.py)

- `mock_db`: Mock MongoDB database with test data
- `app`: FastAPI test application
- `client`: Async HTTP client for API testing
- `sample_bank`: Sample bank data
- `sample_loan`: Sample loan data

### Frontend Test Utils

- `render()`: Custom render with all providers
- `mockBanks`: Sample bank data
- `mockLoans`: Sample loan data
- `mockAnalytics`: Sample analytics data

## Continuous Integration

Tests run automatically on:
- **Push** to main, develop, or feature branches
- **Pull requests** to main or develop

### CI Pipeline Steps

1. **Backend Tests**
   - Install Python dependencies
   - Run linter (Ruff, Black)
   - Run tests with coverage
   - Upload coverage to Codecov

2. **Frontend Tests**
   - Install Node dependencies
   - Run ESLint
   - Run TypeScript check
   - Run tests
   - Build application

3. **Integration Tests**
   - Start MongoDB service
   - Start backend server
   - Run health checks
   - Build frontend

4. **Code Quality**
   - Run all linters
   - Check formatting
   - Type checking

## Best Practices

### General
- Write descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Keep tests independent and isolated
- Mock external dependencies
- Test edge cases and error scenarios

### Backend
- Use async/await for all database operations
- Mock MongoDB with mongomock-motor
- Test both success and failure scenarios
- Validate request/response schemas
- Test authentication and authorization (when implemented)

### Frontend
- Test user interactions, not implementation
- Use semantic queries (getByRole, getByLabelText)
- Mock API calls
- Test accessibility
- Test responsive behavior

## Future Testing Plans

### E2E Testing (Planned)
- Setup Playwright or Cypress
- Test critical user flows:
  - Browse banks and loans
  - Use calculator
  - Upload documents (when import feature is ready)
  - Manage reminders (when reminder feature is ready)

### Performance Testing
- Load testing with Locust
- Frontend performance with Lighthouse
- Database query optimization

### Security Testing
- Input validation testing
- XSS/CSRF protection
- Authentication/authorization testing

## Troubleshooting

### Common Issues

**Backend tests fail with MongoDB connection error**
- Solution: Tests use mongomock-motor, no real MongoDB needed
- Check if mongomock-motor is installed

**Frontend tests fail with module not found**
- Solution: Check if all dependencies are installed with `npm ci`
- Clear cache with `npm run test -- --clearCache`

**Coverage below threshold**
- Solution: Add more tests for uncovered code
- Check coverage report: `pytest --cov=app --cov-report=html`

**Tests timeout**
- Solution: Increase timeout in pytest.ini or vitest.config.ts
- Check for infinite loops or unresolved promises

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass locally
3. Maintain coverage above thresholds
4. Update this documentation if needed
5. Include tests in pull requests

---

**Last Updated**: 2026-02-03
**Maintainer**: Testing Agent
