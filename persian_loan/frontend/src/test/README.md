# Test Infrastructure Documentation

## Overview
This directory contains test setup, utilities, and mock data for the Iranian Banks Dashboard application.

## Structure
```
test/
├── README.md           # This file
├── setup.ts           # Global test configuration
├── utils.tsx          # Test utilities and custom render
└── mocks/            # Mock data for testing
    ├── index.ts      # Mock data exports
    ├── loans.ts      # Loan mock data
    ├── banks.ts      # Bank mock data
    └── users.ts      # User mock data
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test src/components/ui/Button.test.tsx
```

## Writing Tests

### Basic Component Test
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { Button } from './Button';

describe('Button', () => {
  it('renders button text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Test with Providers (Router + React Query)
```typescript
import { renderWithProviders } from '@/test/utils';
import { BankList } from './BankList';

describe('BankList', () => {
  it('renders bank list', () => {
    renderWithProviders(<BankList />, {
      initialRoute: '/banks',
    });
    // assertions...
  });
});
```

### Test with Mock Data
```typescript
import { mockLoan, mockBank } from '@/test/mocks';
import { LoanDetailCard } from './LoanDetailCard';

describe('LoanDetailCard', () => {
  it('renders loan details', () => {
    render(<LoanDetailCard loan={mockLoan} bankNameFA={mockBank.nameFA} />);
    expect(screen.getByText(mockLoan.nameFA)).toBeInTheDocument();
  });
});
```

### Test User Interactions
```typescript
import { userEvent } from '@/test/utils';

describe('Button interactions', () => {
  it('calls onClick handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByText('Click'));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Test Async Operations
```typescript
import { waitFor } from '@/test/utils';

describe('Async data loading', () => {
  it('loads and displays data', async () => {
    render(<DataComponent />);

    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });
  });
});
```

## Test Utilities

### `renderWithProviders(ui, options)`
Custom render function that wraps components with necessary providers:
- `BrowserRouter` for routing
- `QueryClientProvider` for React Query

**Options:**
- `initialRoute`: Set initial browser route (default: '/')
- `queryClient`: Custom QueryClient instance

### `wait(ms)`
Promise-based delay utility for async tests.

### `suppressConsole()`
Suppresses console.error and console.warn in tests.

### `createMockApiResponse<T>(data, delay)`
Creates a mock API response promise.

### `createMockApiError(message, status, delay)`
Creates a mock API error.

## Mock Data

### Loans
- `mockLoan` - Basic interest-free loan
- `mockLoanWithGuarantor` - Loan requiring guarantors
- `mockLoanWithCoefficients` - Deposit-based loan with coefficients
- `mockLoans` - Array of all loan mocks
- `createMockLoan(overrides)` - Create custom loan mock

### Banks
- `mockBank` - Traditional bank
- `mockDigitalBank` - Digital bank with scoring system
- `mockBankWithLoans` - Bank with loan types
- `mockBanks` - Array of all bank mocks
- `createMockBank(overrides)` - Create custom bank mock

### Users
- `mockUser` - Regular user
- `mockAdminUser` - Admin user
- `mockUsers` - Array of all user mocks
- `createMockUser(overrides)` - Create custom user mock

## Global Test Setup

The `setup.ts` file configures:

1. **jest-dom matchers** - Extended assertions (toBeInTheDocument, toHaveClass, etc.)
2. **Automatic cleanup** - React Testing Library cleanup after each test
3. **matchMedia mock** - For responsive component testing
4. **IntersectionObserver mock** - For lazy loading and viewport detection
5. **ResizeObserver mock** - For chart and responsive component testing
6. **scrollTo mock** - For scroll behavior testing

## Coverage Thresholds

Coverage thresholds are configured in `vitest.config.ts`:

- **Lines:** 70%
- **Functions:** 70%
- **Branches:** 70%
- **Statements:** 70%

## Best Practices

### 1. Test User Behavior, Not Implementation
```typescript
// ❌ Bad - tests implementation details
expect(component.state.isOpen).toBe(true);

// ✅ Good - tests user-visible behavior
expect(screen.getByRole('dialog')).toBeVisible();
```

### 2. Use Accessible Queries
```typescript
// ❌ Bad
screen.getByTestId('submit-button');

// ✅ Good
screen.getByRole('button', { name: 'Submit' });
```

### 3. Test Edge Cases
- Empty states
- Loading states
- Error states
- Boundary values

### 4. Keep Tests Fast
- Mock external dependencies (API calls, localStorage, etc.)
- Avoid unnecessary delays
- Use `vi.mock()` for heavy modules

### 5. Descriptive Test Names
```typescript
// ❌ Bad
it('works', () => { /* ... */ });

// ✅ Good
it('displays error message when API call fails', () => { /* ... */ });
```

## Common Testing Patterns

### Testing Forms
```typescript
describe('LoginForm', () => {
  it('submits form with user input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(onSubmit).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123',
    });
  });
});
```

### Testing API Integration
```typescript
describe('BankList API integration', () => {
  it('fetches and displays banks', async () => {
    const queryClient = new QueryClient();

    // Mock API response
    vi.mock('@/services/banks.service', () => ({
      fetchBanks: vi.fn().mockResolvedValue(mockBanks),
    }));

    renderWithProviders(<BankList />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(mockBank.nameFA)).toBeInTheDocument();
    });
  });
});
```

### Testing Error States
```typescript
describe('ErrorBoundary', () => {
  it('displays error message when child throws', () => {
    suppressConsole(); // Suppress expected error logs

    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
```

## Debugging Tests

### View rendered component
```typescript
import { screen, debug } from '@/test/utils';

// Debug entire document
debug();

// Debug specific element
debug(screen.getByRole('button'));
```

### Check available queries
```typescript
screen.logTestingPlaygroundURL();
```

### Run single test
```typescript
it.only('runs only this test', () => {
  // ...
});
```

### Skip test
```typescript
it.skip('skips this test', () => {
  // ...
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)
