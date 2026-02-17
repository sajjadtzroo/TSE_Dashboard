# Integration Tests - Critical User Flows

> Iranian Banks Loan Dashboard - Manual & E2E Integration Test Plan
> Generated: 2026-02-05

---

## Overview

This document defines the critical user flows that must be verified through manual testing or end-to-end (E2E) automation before any production deployment. Each flow includes preconditions, step-by-step verification instructions, and expected outcomes.

---

## 1. User Registration and Login

### 1.1 User Registration

**Preconditions:** Application is running, database is connected.

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Navigate to registration page | Registration form displays with username, email, password fields |
| 2 | Submit empty form | Validation errors appear for all required fields |
| 3 | Enter invalid email format | Email validation error displays |
| 4 | Enter password shorter than minimum | Password strength validation error displays |
| 5 | Submit valid registration data | Account created, success message displayed |
| 6 | Try registering same email again | "Email already exists" error returned (HTTP 409) |

**Verification:**
- [ ] POST `/api/auth/register` returns 201 with valid data
- [ ] Duplicate email returns 409 Conflict
- [ ] Password is hashed (not stored in plaintext)
- [ ] Input validation rejects malformed data

### 1.2 User Login

**Preconditions:** User account exists in database.

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Navigate to login page | Login form displays with username/email and password fields |
| 2 | Submit invalid credentials | "Invalid credentials" error displayed |
| 3 | Submit valid credentials | JWT access token and refresh token returned |
| 4 | Access protected endpoint with token | Request succeeds (HTTP 200) |
| 5 | Access protected endpoint without token | Request rejected (HTTP 401) |
| 6 | Use expired token | Request rejected (HTTP 401), refresh flow triggered |

**Verification:**
- [ ] POST `/api/auth/login` returns JWT tokens with valid credentials
- [ ] Access token expires after configured duration (15 minutes default)
- [ ] Refresh token can be used to obtain new access token
- [ ] Rate limiting is enforced on login endpoint (5/minute)

---

## 2. Browse Banks and Loans

### 2.1 Bank Listing

**Preconditions:** Bank data is seeded in MongoDB.

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Navigate to Banks page | All banks displayed in card/grid layout |
| 2 | Verify bank card content | Each card shows: Persian name, English name, loan count, category badge |
| 3 | Filter by "Traditional Banks" | Only traditional banks shown |
| 4 | Filter by "Digital Banks" | Only digital banks shown |
| 5 | Verify pagination | Pagination controls appear when banks exceed page size |
| 6 | Click on a bank card | Navigates to bank detail page |

**Verification:**
- [ ] GET `/api/banks` returns paginated list with `meta.pagination`
- [ ] GET `/api/banks?category=traditional-banks` filters correctly
- [ ] GET `/api/banks?category=digital-banks` filters correctly
- [ ] Response includes `success: true` and proper API response envelope
- [ ] Persian text renders correctly with Vazirmatn font

### 2.2 Bank Detail View

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Click on a specific bank | Bank detail page loads with full information |
| 2 | View bank loans list | All loans for selected bank displayed |
| 3 | View loan details (interest rate, amount range, repayment period) | Data displayed correctly in Persian format |
| 4 | Navigate back to banks list | Returns to banks listing with state preserved |

**Verification:**
- [ ] GET `/api/banks/{bankId}` returns complete bank data
- [ ] Loans embedded in bank detail are accurate
- [ ] Persian number formatting is correct
- [ ] RTL layout renders properly

---

## 3. Loan Optimizer with Filters

### 3.1 Optimizer Interface

**Preconditions:** Loan data available in database.

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Navigate to Loan Optimizer page | Optimizer form displays with all filter controls |
| 2 | Set loan amount range | Min/max amount sliders/inputs function correctly |
| 3 | Set interest rate filter | Interest rate range filter works |
| 4 | Toggle "No Guarantor" filter | Filters loans that don't require a guarantor |
| 5 | Select bank category filter | Filters by traditional/digital bank category |
| 6 | Click "Optimize" / apply filters | Results table updates with matching loans |
| 7 | Verify results sorting | Results sorted by optimal criteria (lowest rate, best terms) |

**Verification:**
- [ ] Filter combinations produce correct result sets
- [ ] Empty results show appropriate "No results" message
- [ ] Filters persist during session
- [ ] Results table is sortable and responsive
- [ ] Persian number formatting in results

### 3.2 Optimizer Results

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | View optimizer results table | Columns: Bank, Loan Name, Rate, Amount, Period, Guarantor |
| 2 | Click on a result row | Navigates to loan detail page |
| 3 | Sort by interest rate | Results re-order by rate ascending/descending |
| 4 | Modify filters | Results update dynamically |

---

## 4. Compare Loans

### 4.1 Loan Comparison Flow

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Navigate to Compare page | Comparison interface displays |
| 2 | Select first loan for comparison | Loan added to comparison panel |
| 3 | Select second loan for comparison | Second loan added side-by-side |
| 4 | View comparison table | Side-by-side comparison of: rate, amount, period, guarantor requirements |
| 5 | Remove a loan from comparison | Loan removed, layout adjusts |
| 6 | Select loans from different banks | Cross-bank comparison works correctly |

**Verification:**
- [ ] POST `/api/loans/compare` with loan IDs returns comparison data
- [ ] Comparison highlights differences between loans
- [ ] Maximum comparison limit enforced (if applicable)
- [ ] Invalid loan IDs handled gracefully

---

## 5. Financial Calculators (WACC, NPV, IRR)

### 5.1 WACC Calculator

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Navigate to Calculators page | Calculator selection displayed |
| 2 | Select WACC calculator | WACC input form displays |
| 3 | Enter equity value and cost of equity | Fields accept numeric input |
| 4 | Enter debt value and cost of debt | Fields accept numeric input |
| 5 | Enter tax rate | Percentage input field works |
| 6 | Calculate | WACC result displayed with formula breakdown |
| 7 | Enter invalid values (negative, non-numeric) | Validation errors displayed |

**Verification:**
- [ ] WACC formula: WACC = (E/V * Re) + (D/V * Rd * (1 - Tc))
- [ ] Result matches manual calculation
- [ ] Edge cases: zero values, 100% equity, 100% debt

### 5.2 NPV Calculator

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Select NPV calculator | NPV input form displays |
| 2 | Enter initial investment | Negative cash flow accepted |
| 3 | Enter discount rate | Percentage input works |
| 4 | Add cash flow periods | Dynamic form allows adding/removing periods |
| 5 | Calculate NPV | Result shows present value of all cash flows |
| 6 | Interpret result | Positive NPV highlighted as favorable |

**Verification:**
- [ ] NPV formula: NPV = Sum of [Ct / (1+r)^t] for all periods
- [ ] Multiple cash flow periods calculated correctly
- [ ] Negative NPV displays warning/different styling

### 5.3 IRR Calculator

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Select IRR calculator | IRR input form displays |
| 2 | Enter initial investment and cash flows | All periods entered |
| 3 | Calculate IRR | Internal Rate of Return displayed as percentage |
| 4 | Compare IRR with required rate | Comparison guidance displayed |

**Verification:**
- [ ] IRR is the rate where NPV = 0
- [ ] Iterative calculation converges correctly
- [ ] Edge case: no real IRR solution handled gracefully

---

## 6. View Loan Details

### 6.1 Loan Detail Page

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Navigate to a specific loan | Loan detail page loads |
| 2 | View loan information | Displays: name (FA/EN), interest rate, amount range, repayment period |
| 3 | View guarantor requirement | Clearly indicates if guarantor is needed |
| 4 | View calculation method | Shows loan calculation method (if available) |
| 5 | View parent bank information | Bank name and link displayed |
| 6 | Navigate to parent bank | Clicking bank name navigates to bank detail |

**Verification:**
- [ ] GET `/api/banks/{bankId}` contains loan details
- [ ] All loan fields rendered correctly
- [ ] Persian text and numbers formatted properly
- [ ] Breadcrumb navigation works
- [ ] Responsive layout on mobile

---

## 7. Analytics Dashboard

### 7.1 Dashboard Overview

| Step | Action | Expected Behavior |
|------|--------|-------------------|
| 1 | Navigate to Analytics/Dashboard page | Dashboard loads with summary cards |
| 2 | View summary statistics | Total banks, total loans, average rates displayed |
| 3 | View category distribution chart | Traditional vs Digital bank distribution shown |
| 4 | View interest rate analysis | Rate distribution chart/table displayed |
| 5 | View loan amount analysis | Amount range distribution displayed |
| 6 | View requirements matrix | Guarantor requirement breakdown shown |

**Verification:**
- [ ] GET `/api/analytics/summary` returns aggregate data
- [ ] GET `/api/analytics/by-category` returns category breakdown
- [ ] GET `/api/analytics/interest-rates` returns rate analysis
- [ ] GET `/api/analytics/loan-amounts` returns amount analysis
- [ ] Charts render correctly with Persian labels
- [ ] Data refreshes when filters change
- [ ] Cached responses served with appropriate TTL

---

## Cross-Cutting Verification

### Performance
- [ ] Initial page load under 3 seconds
- [ ] API responses under 500ms (cached under 100ms)
- [ ] No unnecessary re-renders (React DevTools Profiler)
- [ ] Code splitting working (lazy-loaded routes)

### Security
- [ ] Protected endpoints reject unauthenticated requests
- [ ] Rate limiting active (check X-RateLimit headers)
- [ ] CORS properly configured (no wildcard in production)
- [ ] XSS inputs are sanitized
- [ ] SQL/NoSQL injection attempts rejected

### Accessibility & i18n
- [ ] RTL layout renders correctly throughout
- [ ] Persian (Farsi) text displays with Vazirmatn font
- [ ] Persian numbers display where appropriate
- [ ] Keyboard navigation works on all interactive elements
- [ ] Color contrast meets WCAG AA standards

### Error Handling
- [ ] Network errors show user-friendly messages
- [ ] 404 pages display correctly
- [ ] API errors show appropriate error messages
- [ ] Form validation errors are clear and specific
- [ ] Loading states display while data is fetching

---

## E2E Test Automation Notes

For automated E2E testing, consider using:
- **Playwright** or **Cypress** for browser-based E2E tests
- **pytest + httpx** for API integration tests

### Recommended E2E Test Priority:
1. Login flow (critical path)
2. Bank listing and filtering
3. Loan optimizer with filters
4. Calculator accuracy
5. Loan comparison
6. Analytics dashboard data accuracy

### Test Data Requirements:
- Minimum 2 traditional banks with 3+ loans each
- Minimum 1 digital bank with 2+ loans
- At least 1 no-guarantor loan
- Loans with varying interest rates (15-25%)
- Loans with varying amounts and repayment periods
