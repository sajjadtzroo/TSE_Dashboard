# Integration and E2E Testing Plan
**Persian Loan Dashboard - Comprehensive Testing Strategy**

**Date Created:** 2026-02-05
**Status:** Planning Phase
**Task ID:** #17

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Integration Testing Strategy](#integration-testing-strategy)
4. [E2E Testing Strategy](#e2e-testing-strategy)
5. [Critical User Flows](#critical-user-flows)
6. [Test Infrastructure Setup](#test-infrastructure-setup)
7. [File Structure](#file-structure)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Success Metrics](#success-metrics)
10. [Appendix](#appendix)

---

## Executive Summary

### Overview
This document outlines a comprehensive testing strategy for the Persian Loan Dashboard, focusing on integration and end-to-end (E2E) testing to complement the existing unit and component test coverage.

### Current Testing Coverage
- **Unit Tests**: ✅ Implemented (utilities, calculations, Persian number formatting)
- **Component Tests**: ⚠️ Partial (input components, cards, service layer)
- **Integration Tests**: ❌ Not implemented
- **E2E Tests**: ❌ Not implemented

### Recommended Approach
- **Integration Testing**: Vitest + React Testing Library + MSW (Mock Service Worker)
- **E2E Testing**: Playwright (over Cypress due to better TypeScript support, faster execution, and multi-browser testing)

### Estimated Test Count
- **Integration Tests**: ~45 tests across 12 test suites
- **E2E Tests**: ~20 tests covering 8 critical user journeys
- **Total New Tests**: ~65 tests

---

## Current State Analysis

### Existing Test Infrastructure

#### Test Framework Setup
```typescript
// vitest.config.ts - Current Configuration
- Framework: Vitest 4.0.18
- Environment: jsdom
- Coverage: V8 provider (70% threshold)
- Test Utils: @testing-library/react 16.3.2
```

#### Current Test Coverage
Based on codebase analysis:

**✅ Well Tested:**
- Financial calculations (`utils/advancedFinancial.test.ts`, `utils/timeValueOfMoney.test.ts`)
- Privilege analysis (`utils/privilegeAnalysis.test.ts`)
- Persian number formatting (`utils/persianNumber.test.ts`)
- API services (`services/loans.service.test.ts`, `services/banks.service.test.ts`)
- Comparison logic (`features/compare/utils/comparisonLogic.test.ts`)
- UI components (Currency/Percentage inputs, Cards, Badges, Buttons)

**⚠️ Partially Tested:**
- Complex components (OptimizerResultsTable, PersianDatePicker)
- Service layer (only loans and banks services)

**❌ Not Tested:**
- React Query hooks integration
- Context providers (LoanSelectionContext, SidebarContext)
- Multi-component user flows
- API error handling and retry logic
- Form validation workflows
- Chart components
- Navigation and routing
- Full page components

### Application Architecture

#### Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **State Management**: React Query (TanStack Query 5.18), Context API
- **Routing**: React Router v6.22
- **UI**: Material-UI 7.3, Tailwind CSS
- **Data Fetching**: Axios + React Query
- **Backend**: FastAPI + MongoDB (separate service)

#### Key Features to Test
1. **Loan Search & Browse** - Main loans listing with filtering
2. **Loan Comparison** - Multi-loan selection and side-by-side comparison
3. **Loan Optimizer** - Complex financial analysis with privilege purchase scenarios
4. **Financial Calculators** - 7+ calculator types with real-time calculations
5. **Analytics Dashboard** - Summary stats and charts
6. **Bank Browsing** - Bank listing and detail views
7. **My Loans** - User's saved loans with reminders
8. **Data Import** - CSV/Excel import functionality

---

## Integration Testing Strategy

### What Should Be Integration Tested vs Unit Tested?

#### Unit Tests (Already Implemented)
- Pure functions (financial calculations, formatters)
- Individual components in isolation
- Service methods with mocked axios
- Utility functions
- Type guards and validators

#### Integration Tests (To Be Implemented)
- **React Query + API Integration**
  - Hook behavior with actual query client
  - Cache invalidation and refetching
  - Loading, error, and success states
  - Optimistic updates

- **Context + Components**
  - LoanSelectionContext with LoanCard interactions
  - Multi-component selection workflows
  - localStorage persistence

- **Multi-Component Flows**
  - Form submission → API call → UI update
  - Filter changes → API request → data display
  - Navigation → data prefetching

- **Complex Feature Modules**
  - Loan Optimizer with all its subcomponents
  - Comparison view with selection bar + table
  - Analytics dashboard with multiple chart components

### Integration Testing Approach

#### Tools & Libraries
```json
{
  "msw": "^2.0.0",              // API mocking
  "@tanstack/react-query": "^5.18.1", // Already installed
  "fake-indexeddb": "^5.0.0"   // IndexedDB mock for persistence tests
}
```

#### Mock Service Worker (MSW) Setup
MSW will intercept network requests at the browser level, providing realistic API mocking:

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { mockLoansWithBank, mockBanks } from './index';

export const handlers = [
  // Loans endpoints
  http.get('/api/loans/', ({ request }) => {
    const url = new URL(request.url);
    const noGuarantor = url.searchParams.get('no_guarantor');

    let loans = mockLoansWithBank;
    if (noGuarantor === 'true') {
      loans = loans.filter(loan => !loan.guarantor);
    }

    return HttpResponse.json({
      items: loans,
      total: loans.length
    });
  }),

  // Banks endpoints
  http.get('/api/banks/', () => {
    return HttpResponse.json({
      items: mockBanks,
      total: mockBanks.length
    });
  }),

  // Error scenarios
  http.get('/api/loans/error-test/', () => {
    return new HttpResponse(null, { status: 500 });
  })
];
```

#### Test Organization Strategy

**1. React Query Integration Tests**
- Test hooks with real QueryClient
- Verify caching behavior
- Test error handling and retries
- Test dependent queries

**2. Context Integration Tests**
- Test context providers with consuming components
- Test state updates across component tree
- Test localStorage persistence
- Test max selection limits

**3. Feature Module Integration Tests**
- Test complete features (optimizer, comparison)
- Test data flow through multiple components
- Test complex user interactions

---

## E2E Testing Strategy

### Why Playwright Over Cypress?

#### Playwright Advantages
1. **Better TypeScript Support** - First-class TS support, better type inference
2. **Multi-Browser Testing** - Chrome, Firefox, Safari (WebKit) out of the box
3. **Faster Execution** - Parallel execution, better performance
4. **Auto-Wait** - Smart waiting for elements, more reliable tests
5. **Modern API** - Cleaner, more intuitive API
6. **Better DevTools** - Inspector, trace viewer, codegen
7. **API Testing** - Built-in API testing capabilities

#### Playwright Setup
```json
{
  "@playwright/test": "^1.40.0",
  "@axe-core/playwright": "^4.8.0"  // Accessibility testing
}
```

### E2E Test Scope

#### What to Test E2E
- **Critical User Journeys** - Complete workflows from start to finish
- **Cross-Feature Flows** - Navigation between features
- **Real Backend Integration** - Actual API calls (with test database)
- **Browser-Specific Behavior** - RTL support, animations, responsive design
- **Accessibility** - A11y compliance, keyboard navigation
- **Performance** - Load times, LCP, CLS

#### What NOT to Test E2E
- Business logic (unit tests)
- Individual component behavior (component tests)
- Edge cases (integration/unit tests)
- All permutations (combinatorial explosion)

### E2E Test Categories

#### 1. Authentication & Setup (if implemented in future)
- Login flow
- Session persistence
- Logout

#### 2. Loan Discovery Flow
- Browse loans
- Filter by criteria
- View loan details
- Select for comparison

#### 3. Loan Comparison Flow
- Select multiple loans
- Navigate to comparison view
- Compare side-by-side
- Clear selection

#### 4. Loan Optimizer Flow
- Enter user parameters
- View optimization results
- Change parameters
- Export results

#### 5. Calculator Flow
- Select calculator type
- Input values
- View calculations
- Switch calculators

#### 6. Analytics Flow
- View dashboard
- Navigate between tabs
- Filter data
- View charts

#### 7. Data Import Flow
- Upload file
- Validate data
- Review errors
- Confirm import

#### 8. Navigation & Routing
- Deep linking
- Browser back/forward
- Sidebar navigation
- Breadcrumbs

---

## Critical User Flows

### Priority 1 (Must Test)

#### Flow 1: Loan Search to Comparison
**User Story:** As a user, I want to find and compare loans to make an informed decision.

**Steps:**
1. Land on dashboard
2. Navigate to Loans page
3. Apply filters (no guarantor, max amount)
4. View filtered results
5. Select 2-4 loans
6. Click "Compare"
7. View comparison table
8. Verify all loan details displayed
9. Clear selection

**Expected Outcome:** User can successfully filter, select, and compare loans

**Test Type:** E2E (with integration tests for sub-flows)

---

#### Flow 2: Loan Optimizer with Privilege Analysis
**User Story:** As a user, I want to find the optimal loan considering privilege purchase.

**Steps:**
1. Navigate to Loan Optimizer
2. Enter deposit amount (e.g., 100M Toman)
3. Enter deposit months (e.g., 12)
4. Enter required loan amount (e.g., 500M Toman)
5. Enable "Consider Privilege Purchase"
6. Enter privilege price (e.g., 50M Toman)
7. Select risk tolerance (medium)
8. Submit form
9. View results table sorted by NPV
10. Check scenario comparison
11. Review recommendations

**Expected Outcome:** Accurate optimization results with privilege analysis

**Test Type:** E2E + Integration (optimizer hook, form validation, results display)

---

#### Flow 3: Financial Calculator Usage
**User Story:** As a user, I want to calculate loan affordability.

**Steps:**
1. Navigate to Calculators
2. Select "Affordability Calculator"
3. Enter monthly income
4. Enter monthly expenses
5. Enter desired loan amount
6. View affordability result
7. Adjust income
8. See real-time update
9. Switch to different calculator
10. Verify state reset

**Expected Outcome:** Accurate calculations with real-time updates

**Test Type:** Integration (form + calculation engine)

---

### Priority 2 (Should Test)

#### Flow 4: Analytics Dashboard Interaction
**Steps:**
1. Navigate to Analytics
2. View summary cards
3. Switch between tabs (Overview, Interest Rates, etc.)
4. Interact with charts (hover, click)
5. Verify data consistency

**Test Type:** E2E (visual + interaction)

---

#### Flow 5: Bank Detail Exploration
**Steps:**
1. Navigate to Banks
2. Click on bank card
3. View bank details
4. View loans from this bank
5. Select loan for comparison
6. Navigate back to banks

**Test Type:** E2E (navigation flow)

---

#### Flow 6: Data Import Workflow
**Steps:**
1. Navigate to Import page
2. Upload CSV file
3. View validation results
4. Fix errors
5. Confirm import
6. Verify data appears in loans list

**Test Type:** E2E (file upload + API interaction)

---

### Priority 3 (Nice to Have)

#### Flow 7: My Loans Management
**Steps:**
1. Navigate to My Loans
2. Add a loan
3. Set reminder
4. View alerts
5. Edit loan
6. Delete loan

**Test Type:** Integration (form + API + localStorage)

---

#### Flow 8: Responsive Design & RTL
**Steps:**
1. Test on mobile viewport
2. Verify RTL text rendering
3. Test sidebar collapse
4. Test table horizontal scroll
5. Test modal responsiveness

**Test Type:** E2E (visual regression)

---

## Test Infrastructure Setup

### Integration Tests Setup

#### 1. MSW Configuration

**File:** `/workspaces/Persian_Loan/frontend/src/test/mocks/server.ts`
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**File:** `/workspaces/Persian_Loan/frontend/src/test/setup-integration.ts`
```typescript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

#### 2. React Query Test Utils

**File:** `/workspaces/Persian_Loan/frontend/src/test/utils/query-wrapper.tsx`
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        cacheTime: Infinity,
        staleTime: Infinity,
      },
    },
  });
}

export function createQueryWrapper() {
  const testQueryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

#### 3. Full App Wrapper for Integration Tests

**File:** `/workspaces/Persian_Loan/frontend/src/test/utils/test-wrapper.tsx`
```typescript
import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { RTLProvider } from '@/theme/RTLProvider';
import { LoanSelectionProvider } from '@/context/LoanSelectionContext';
import { createTestQueryClient } from './query-wrapper';

export function TestWrapper({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <RTLProvider>
      <QueryClientProvider client={queryClient}>
        <LoanSelectionProvider>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </LoanSelectionProvider>
      </QueryClientProvider>
    </RTLProvider>
  );
}
```

### E2E Tests Setup

#### 1. Playwright Configuration

**File:** `/workspaces/Persian_Loan/frontend/playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 2. Playwright Test Helpers

**File:** `/workspaces/Persian_Loan/frontend/e2e/helpers/navigation.ts`
```typescript
import { Page } from '@playwright/test';

export class Navigation {
  constructor(private page: Page) {}

  async goToLoans() {
    await this.page.goto('/loans');
    await this.page.waitForLoadState('networkidle');
  }

  async goToCompare() {
    await this.page.goto('/compare');
    await this.page.waitForLoadState('networkidle');
  }

  async goToOptimizer() {
    await this.page.goto('/loan-optimizer');
    await this.page.waitForLoadState('networkidle');
  }
}
```

**File:** `/workspaces/Persian_Loan/frontend/e2e/helpers/loan-helpers.ts`
```typescript
import { Page, expect } from '@playwright/test';

export async function selectLoan(page: Page, loanIndex: number) {
  const loanCards = page.locator('[data-testid="loan-card"]');
  const checkbox = loanCards.nth(loanIndex).locator('input[type="checkbox"]');
  await checkbox.check();
  await expect(checkbox).toBeChecked();
}

export async function waitForLoansToLoad(page: Page) {
  await page.waitForSelector('[data-testid="loan-card"]', { timeout: 10000 });
}
```

#### 3. Package.json Updates

```json
{
  "scripts": {
    "test": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "npm run test:run && npm run test:integration && npm run test:e2e"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@axe-core/playwright": "^4.8.0",
    "msw": "^2.0.0",
    "fake-indexeddb": "^5.0.0"
  }
}
```

---

## File Structure

### Integration Tests Structure

```
frontend/
├── src/
│   ├── test/
│   │   ├── setup.ts                    # Existing unit test setup
│   │   ├── setup-integration.ts        # NEW: MSW setup
│   │   ├── utils/
│   │   │   ├── query-wrapper.tsx       # NEW: React Query wrapper
│   │   │   ├── test-wrapper.tsx        # NEW: Full app wrapper
│   │   │   └── test-helpers.ts         # NEW: Common test utilities
│   │   └── mocks/
│   │       ├── server.ts               # NEW: MSW server setup
│   │       ├── handlers.ts             # NEW: MSW request handlers
│   │       ├── index.ts                # Existing mock exports
│   │       ├── loans.ts                # Existing loan mocks
│   │       ├── banks.ts                # Existing bank mocks
│   │       └── analytics.ts            # NEW: Analytics mocks
│   │
│   ├── hooks/
│   │   └── __tests__/
│   │       ├── useLoans.integration.test.tsx        # NEW
│   │       ├── useBanks.integration.test.tsx        # NEW
│   │       └── useAnalytics.integration.test.tsx    # NEW
│   │
│   ├── context/
│   │   └── __tests__/
│   │       ├── LoanSelectionContext.integration.test.tsx  # NEW
│   │       └── SidebarContext.integration.test.tsx        # NEW
│   │
│   ├── features/
│   │   ├── loan-optimizer/
│   │   │   └── __tests__/
│   │   │       ├── LoanOptimizerPage.integration.test.tsx  # NEW
│   │   │       └── useLoanOptimizer.integration.test.tsx   # NEW
│   │   │
│   │   ├── compare/
│   │   │   └── __tests__/
│   │   │       ├── ComparisonView.integration.test.tsx     # NEW
│   │   │       └── LoanSelection.integration.test.tsx      # NEW
│   │   │
│   │   ├── calculator/
│   │   │   └── __tests__/
│   │   │       └── FinancialCalculator.integration.test.tsx # NEW
│   │   │
│   │   └── analytics/
│   │       └── __tests__/
│   │           └── AnalyticsDashboard.integration.test.tsx  # NEW
│   │
│   └── pages/
│       └── __tests__/
│           ├── Loans.integration.test.tsx           # NEW
│           ├── Dashboard.integration.test.tsx       # NEW
│           └── Import.integration.test.tsx          # NEW
│
└── vitest.integration.config.ts                     # NEW
```

### E2E Tests Structure

```
frontend/
├── e2e/
│   ├── helpers/
│   │   ├── navigation.ts               # Navigation helpers
│   │   ├── loan-helpers.ts             # Loan-specific helpers
│   │   ├── form-helpers.ts             # Form interaction helpers
│   │   └── assertions.ts               # Custom assertions
│   │
│   ├── fixtures/
│   │   ├── test-data.json              # Test data for imports
│   │   └── screenshots/                # Visual regression baselines
│   │
│   ├── flows/
│   │   ├── 01-loan-search-compare.spec.ts      # Priority 1
│   │   ├── 02-loan-optimizer.spec.ts           # Priority 1
│   │   ├── 03-calculator-usage.spec.ts         # Priority 1
│   │   ├── 04-analytics-dashboard.spec.ts      # Priority 2
│   │   ├── 05-bank-exploration.spec.ts         # Priority 2
│   │   ├── 06-data-import.spec.ts              # Priority 2
│   │   ├── 07-my-loans-management.spec.ts      # Priority 3
│   │   └── 08-responsive-rtl.spec.ts           # Priority 3
│   │
│   ├── accessibility/
│   │   └── a11y.spec.ts                        # Accessibility tests
│   │
│   └── performance/
│       └── performance.spec.ts                  # Performance tests
│
└── playwright.config.ts                         # Playwright config
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal:** Set up testing infrastructure

#### Tasks
1. **Install Dependencies**
   ```bash
   npm install -D msw@2.0.0 @playwright/test@1.40.0 @axe-core/playwright@4.8.0 fake-indexeddb@5.0.0
   ```

2. **Create MSW Setup**
   - [ ] Create `src/test/mocks/server.ts`
   - [ ] Create `src/test/mocks/handlers.ts`
   - [ ] Create `src/test/setup-integration.ts`
   - [ ] Add handlers for all API endpoints

3. **Create Test Utilities**
   - [ ] Create `src/test/utils/query-wrapper.tsx`
   - [ ] Create `src/test/utils/test-wrapper.tsx`
   - [ ] Create `src/test/utils/test-helpers.ts`

4. **Create Playwright Config**
   - [ ] Create `playwright.config.ts`
   - [ ] Create E2E helpers in `e2e/helpers/`
   - [ ] Add test data fixtures

5. **Update Scripts**
   - [ ] Add integration test script
   - [ ] Add E2E test scripts
   - [ ] Update CI configuration (if applicable)

**Deliverable:** Working test infrastructure with 1 sample integration test and 1 sample E2E test

---

### Phase 2: Integration Tests - Core Hooks (Week 2)
**Goal:** Test React Query hooks with API integration

#### Tasks
1. **useLoans Hook Tests** (`src/hooks/__tests__/useLoans.integration.test.tsx`)
   - [ ] Test successful data fetching
   - [ ] Test with filters (no_guarantor, max_amount)
   - [ ] Test error handling
   - [ ] Test loading states
   - [ ] Test cache invalidation
   - [ ] Test refetch behavior

2. **useBanks Hook Tests** (`src/hooks/__tests__/useBanks.integration.test.tsx`)
   - [ ] Test successful data fetching
   - [ ] Test error handling
   - [ ] Test caching

3. **useAnalytics Hook Tests** (`src/hooks/__tests__/useAnalytics.integration.test.tsx`)
   - [ ] Test analytics data fetching
   - [ ] Test different tab data

**Estimated Tests:** 12 tests

---

### Phase 3: Integration Tests - Context (Week 2)
**Goal:** Test context providers with component integration

#### Tasks
1. **LoanSelectionContext Tests** (`src/context/__tests__/LoanSelectionContext.integration.test.tsx`)
   - [ ] Test loan selection/deselection
   - [ ] Test max selection limit
   - [ ] Test localStorage persistence
   - [ ] Test context with consuming components
   - [ ] Test clear selection
   - [ ] Test selection count

2. **SidebarContext Tests** (`src/context/__tests__/SidebarContext.integration.test.tsx`)
   - [ ] Test sidebar toggle
   - [ ] Test state persistence

**Estimated Tests:** 8 tests

---

### Phase 4: Integration Tests - Feature Modules (Week 3)
**Goal:** Test complete feature workflows

#### Tasks
1. **Loan Optimizer Tests** (`src/features/loan-optimizer/__tests__/`)
   - [ ] Test optimizer hook with API data
   - [ ] Test form submission
   - [ ] Test results calculation
   - [ ] Test privilege analysis
   - [ ] Test scenario comparison
   - [ ] Test parameter changes

2. **Comparison View Tests** (`src/features/compare/__tests__/`)
   - [ ] Test loan selection flow
   - [ ] Test comparison table rendering
   - [ ] Test show differences toggle
   - [ ] Test clear selection
   - [ ] Test URL-based comparison

3. **Calculator Tests** (`src/features/calculator/__tests__/`)
   - [ ] Test calculator form
   - [ ] Test real-time calculations
   - [ ] Test calculator switching
   - [ ] Test validation

4. **Analytics Dashboard Tests** (`src/features/analytics/__tests__/`)
   - [ ] Test dashboard rendering
   - [ ] Test tab switching
   - [ ] Test data aggregation

**Estimated Tests:** 20 tests

---

### Phase 5: Integration Tests - Pages (Week 3)
**Goal:** Test page-level integration

#### Tasks
1. **Loans Page Tests** (`src/pages/__tests__/Loans.integration.test.tsx`)
   - [ ] Test loans list rendering
   - [ ] Test filtering
   - [ ] Test pagination (if implemented)

2. **Dashboard Page Tests** (`src/pages/__tests__/Dashboard.integration.test.tsx`)
   - [ ] Test summary cards
   - [ ] Test charts rendering

3. **Import Page Tests** (`src/pages/__tests__/Import.integration.test.tsx`)
   - [ ] Test file upload
   - [ ] Test validation
   - [ ] Test import confirmation

**Estimated Tests:** 5 tests

---

### Phase 6: E2E Tests - Priority 1 Flows (Week 4)
**Goal:** Implement critical user journeys

#### Tasks
1. **Loan Search to Comparison** (`e2e/flows/01-loan-search-compare.spec.ts`)
   - [ ] Test complete flow
   - [ ] Test on multiple browsers

2. **Loan Optimizer** (`e2e/flows/02-loan-optimizer.spec.ts`)
   - [ ] Test optimizer with privilege analysis
   - [ ] Test result validation

3. **Calculator Usage** (`e2e/flows/03-calculator-usage.spec.ts`)
   - [ ] Test calculator interaction
   - [ ] Test real-time updates

**Estimated Tests:** 6 tests

---

### Phase 7: E2E Tests - Priority 2 & 3 (Week 5)
**Goal:** Complete remaining E2E coverage

#### Tasks
1. **Analytics Dashboard** (`e2e/flows/04-analytics-dashboard.spec.ts`)
2. **Bank Exploration** (`e2e/flows/05-bank-exploration.spec.ts`)
3. **Data Import** (`e2e/flows/06-data-import.spec.ts`)
4. **My Loans** (`e2e/flows/07-my-loans-management.spec.ts`)
5. **Responsive & RTL** (`e2e/flows/08-responsive-rtl.spec.ts`)

**Estimated Tests:** 10 tests

---

### Phase 8: Accessibility & Performance (Week 6)
**Goal:** Ensure quality standards

#### Tasks
1. **Accessibility Tests** (`e2e/accessibility/a11y.spec.ts`)
   - [ ] Test keyboard navigation
   - [ ] Test screen reader compatibility
   - [ ] Test ARIA labels
   - [ ] Run axe-core on all pages

2. **Performance Tests** (`e2e/performance/performance.spec.ts`)
   - [ ] Measure LCP (Largest Contentful Paint)
   - [ ] Measure CLS (Cumulative Layout Shift)
   - [ ] Measure page load times

**Estimated Tests:** 4 tests

---

### Phase 9: CI/CD Integration (Week 6)
**Goal:** Automate testing in CI pipeline

#### Tasks
1. **GitHub Actions Workflow**
   ```yaml
   # .github/workflows/test.yml
   name: Tests
   on: [push, pull_request]
   jobs:
     unit-tests:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npm run test:run

     integration-tests:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npm run test:integration

     e2e-tests:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npx playwright install --with-deps
         - run: npm run test:e2e
         - uses: actions/upload-artifact@v3
           if: always()
           with:
             name: playwright-report
             path: playwright-report/
   ```

2. **Pre-commit Hooks** (optional)
   ```json
   {
     "husky": {
       "hooks": {
         "pre-commit": "npm run test:run",
         "pre-push": "npm run test:all"
       }
     }
   }
   ```

---

## Success Metrics

### Coverage Targets

#### Integration Tests
- **Hooks Coverage**: 100% of custom hooks
- **Context Coverage**: 100% of contexts
- **Feature Modules**: 80% coverage of critical paths
- **API Integration**: All endpoints tested with success/error scenarios

#### E2E Tests
- **Critical Flows**: 100% of Priority 1 flows
- **User Journeys**: 80% of Priority 2 flows
- **Edge Cases**: 50% of Priority 3 flows

### Quality Metrics

#### Reliability
- **Flakiness Rate**: < 2% (tests should pass consistently)
- **False Positives**: < 1%
- **Test Execution Time**: < 10 minutes for full suite

#### Maintainability
- **Test Code Duplication**: < 10%
- **Helper Functions**: Reusable across tests
- **Clear Naming**: All tests have descriptive names

#### Performance
- **Unit Tests**: < 30 seconds
- **Integration Tests**: < 2 minutes
- **E2E Tests**: < 8 minutes

---

## Appendix

### A. Sample Integration Test

**File:** `src/hooks/__tests__/useLoans.integration.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useLoans } from '../useLoans';
import { createQueryWrapper } from '@/test/utils/query-wrapper';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import '@/test/setup-integration';

describe('useLoans - Integration', () => {
  it('should fetch loans successfully', async () => {
    const { result } = renderHook(() => useLoans(), {
      wrapper: createQueryWrapper(),
    });

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify data
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBeGreaterThan(0);
    expect(result.current.data?.[0]).toHaveProperty('nameFA');
  });

  it('should filter loans by no_guarantor', async () => {
    const { result } = renderHook(
      () => useLoans({ no_guarantor: true }),
      { wrapper: createQueryWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // All loans should have guarantor: false
    result.current.data?.forEach((loan) => {
      expect(loan.guarantor).toBe(false);
    });
  });

  it('should handle API errors', async () => {
    // Override handler to return error
    server.use(
      http.get('/api/loans/', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useLoans(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should cache results', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper();

    // First render
    const { result: result1 } = renderHook(() => useLoans(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));

    // Second render should use cache
    const { result: result2 } = renderHook(() => useLoans(), { wrapper });

    // Should be immediately available from cache
    expect(result2.current.data).toEqual(result1.current.data);
  });
});
```

### B. Sample E2E Test

**File:** `e2e/flows/01-loan-search-compare.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { Navigation } from '../helpers/navigation';
import { selectLoan, waitForLoansToLoad } from '../helpers/loan-helpers';

test.describe('Loan Search to Comparison Flow', () => {
  test('should allow user to search, filter, and compare loans', async ({ page }) => {
    const nav = new Navigation(page);

    // Navigate to loans page
    await nav.goToLoans();

    // Wait for loans to load
    await waitForLoansToLoad(page);

    // Verify loans are displayed
    const loanCards = page.locator('[data-testid="loan-card"]');
    await expect(loanCards).toHaveCount(await loanCards.count());

    // Apply "no guarantor" filter
    const noGuarantorCheckbox = page.getByLabel('بدون ضامن');
    await noGuarantorCheckbox.check();

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // Select first 2 loans
    await selectLoan(page, 0);
    await selectLoan(page, 1);

    // Verify selection counter
    const selectionCounter = page.getByText(/۲ وام انتخاب شده/);
    await expect(selectionCounter).toBeVisible();

    // Navigate to comparison
    const compareButton = page.getByRole('button', { name: /مقایسه/ });
    await compareButton.click();

    // Wait for comparison page
    await page.waitForURL('/compare');

    // Verify comparison table is displayed
    const comparisonTable = page.getByTestId('comparison-table');
    await expect(comparisonTable).toBeVisible();

    // Verify 2 loans are being compared
    const loanColumns = comparisonTable.locator('[data-testid="loan-column"]');
    await expect(loanColumns).toHaveCount(2);

    // Verify loan details are shown
    const loanNames = comparisonTable.locator('[data-testid="loan-name"]');
    await expect(loanNames.first()).toBeVisible();

    // Clear selection
    const clearButton = page.getByRole('button', { name: /پاک کردن همه/ });
    await clearButton.click();

    // Should redirect to loans page
    await page.waitForURL('/loans');
  });
});
```

### C. Test Data Attributes Strategy

To make E2E tests more reliable, add `data-testid` attributes to key components:

```tsx
// Example: LoanCard component
<div data-testid="loan-card" data-loan-id={loan.id}>
  <h3 data-testid="loan-name">{loan.nameFA}</h3>
  <input
    type="checkbox"
    data-testid="loan-checkbox"
    checked={isSelected}
  />
</div>
```

**Components to Add Test IDs:**
- Loan cards
- Comparison table
- Form inputs
- Buttons
- Navigation links
- Charts
- Modals

### D. Common Test Patterns

#### Pattern 1: Testing Forms with Validation
```typescript
it('should validate required fields', async () => {
  render(<OptimizerForm />, { wrapper: TestWrapper });

  const submitButton = screen.getByRole('button', { name: /محاسبه/ });
  await userEvent.click(submitButton);

  // Verify error messages
  expect(screen.getByText(/لطفاً مبلغ سپرده را وارد کنید/)).toBeInTheDocument();
});
```

#### Pattern 2: Testing API Error Handling
```typescript
it('should show error toast on API failure', async () => {
  server.use(
    http.get('/api/loans/', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  render(<LoansList />, { wrapper: TestWrapper });

  await waitFor(() => {
    expect(screen.getByText(/خطا در دریافت اطلاعات/)).toBeInTheDocument();
  });
});
```

#### Pattern 3: Testing Context Updates
```typescript
it('should update context when loan is selected', async () => {
  const { result } = renderHook(() => useLoanSelection(), {
    wrapper: LoanSelectionProvider,
  });

  expect(result.current.selectedLoans).toHaveLength(0);

  act(() => {
    result.current.toggleLoan(mockLoan);
  });

  expect(result.current.selectedLoans).toHaveLength(1);
  expect(result.current.selectedLoans[0].id).toBe(mockLoan.id);
});
```

### E. Troubleshooting Guide

#### Common Issues

**Issue 1: MSW Handlers Not Matching**
- **Symptom**: Tests fail with "unhandled request" errors
- **Solution**: Check handler URL paths, ensure they match exactly (including trailing slashes)

**Issue 2: React Query Tests Timeout**
- **Symptom**: Tests timeout waiting for query results
- **Solution**: Disable retries in test QueryClient, check MSW handlers are registered

**Issue 3: Playwright Can't Find Elements**
- **Symptom**: E2E tests fail with "element not found"
- **Solution**: Add data-testid attributes, use more specific selectors, add waitFor statements

**Issue 4: RTL Issues in Tests**
- **Symptom**: Text selectors don't work in RTL mode
- **Solution**: Use data-testid instead of text selectors, or use RTL-aware selectors

### F. Resources & References

#### Official Documentation
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW](https://mswjs.io/)
- [Playwright](https://playwright.dev/)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)

#### Best Practices
- [Testing Best Practices by Kent C. Dodds](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

---

## Next Steps

1. **Review & Approval**: Get team feedback on this plan
2. **Install Dependencies**: Set up testing infrastructure (Phase 1)
3. **Start Phase 2**: Begin with integration tests for hooks
4. **Iterate**: Adjust plan based on learnings from initial tests

---

**Document Version:** 1.0
**Last Updated:** 2026-02-05
**Author:** Claude Sonnet 4.5 (AI Assistant)
**Status:** Ready for Review
