# Frontend Tests

## Quick Start

```bash
# Install dependencies
npm ci

# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

## Test Structure

- `components/` - Component unit tests
  - `BankCard.test.tsx`
  - `Button.test.tsx`
- `features/` - Feature module tests
  - `calculatorEngine.test.ts`
- `utils/` - Utility function tests
  - `financialCalculations.test.ts`
- `services/` - API service tests (to be added)

## Current Status

✅ Vitest configured
✅ React Testing Library setup
✅ Test utilities and mocks
✅ Sample tests for components and utilities
✅ 70%+ coverage target
