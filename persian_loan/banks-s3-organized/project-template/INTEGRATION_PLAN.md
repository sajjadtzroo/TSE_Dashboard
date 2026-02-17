# Integration Plan - Persian Loan Dashboard

## Overview

This document outlines the integration strategy for merging all feature branches into the main codebase. The project consists of three parallel feature developments:

1. **Data Import (OCR + Web Scraping)** - `feature/data-import-ocr`
2. **Payment Reminders (Alert System)** - `feature/payment-reminders`
3. **Testing Suite** - `feature/testing-suite`

## Current Architecture

### Backend Structure (`/backend/app/`)
```
app/
├── main.py              # FastAPI application entry point
├── core/
│   ├── config.py        # Application settings
│   ├── database.py      # MongoDB connection
│   └── logger.py        # Logging configuration
├── modules/
│   ├── banks/           # Bank-related endpoints
│   ├── loans/           # Loan-related endpoints
│   ├── analytics/       # Analytics endpoints
│   ├── import_data/     # [NEW] OCR + Web scraping
│   └── reminders/       # [NEW] Payment alerts
├── common/
│   ├── exceptions/      # Custom exception handlers
│   ├── middleware/      # Request/Response middleware
│   └── utils/           # Helper utilities
└── tests/               # Test suite
```

### Frontend Structure (`/frontend/src/`)
```
src/
├── App.tsx              # Route definitions
├── components/
│   ├── layout/          # MainLayout, Header, Sidebar
│   ├── ui/              # Reusable UI components
│   ├── cards/           # Card components
│   ├── charts/          # Chart components
│   └── tables/          # Table components
├── features/
│   ├── banks/           # Bank feature components
│   ├── loans/           # Loan feature components
│   ├── analytics/       # Analytics feature
│   └── calculator/      # Financial calculator
├── pages/               # Page components
├── services/            # API service layers
└── hooks/               # Custom React hooks
```

## Feature Integration Points

### 1. Data Import Module (`feature/data-import-ocr`)

**Backend Integration:**
- New router: `app/modules/import_data/router.py`
- Add to `main.py`:
  ```python
  from app.modules.import_data import router as import_router

  app.include_router(
      import_router,
      prefix=f"{settings.api_prefix}/import",
      tags=["Data Import"],
  )
  ```

**Frontend Integration:**
- New page: `src/pages/Import.tsx`
- Add route in `App.tsx`:
  ```tsx
  <Route path="import" element={<Import />} />
  ```
- Add navigation in `Sidebar.tsx`:
  ```tsx
  { name: 'ورود داده', href: '/import', icon: FileUp },
  ```

**Dependencies:**
- `requirements.txt`: pytesseract, Pillow, pdf2image, beautifulsoup4
- External: Tesseract OCR, poppler-utils

### 2. Payment Reminders Module (`feature/payment-reminders`)

**Backend Integration:**
- New router: `app/modules/reminders/router.py`
- Add to `main.py`:
  ```python
  from app.modules.reminders import router as reminders_router

  app.include_router(
      reminders_router,
      prefix=f"{settings.api_prefix}/reminders",
      tags=["Payment Reminders"],
  )
  ```
- Background scheduler for notifications (optional APScheduler)

**Frontend Integration:**
- New pages:
  - `src/pages/Reminders.tsx` - List user loans/reminders
  - `src/pages/AddLoan.tsx` - Add new loan for tracking
- Add routes in `App.tsx`:
  ```tsx
  <Route path="reminders" element={<Reminders />} />
  <Route path="reminders/add" element={<AddLoan />} />
  <Route path="reminders/:loanId" element={<ReminderDetail />} />
  ```
- Add navigation in `Sidebar.tsx`:
  ```tsx
  { name: 'یادآور پرداخت', href: '/reminders', icon: Bell },
  ```

**Dependencies:**
- `requirements.txt`: APScheduler (if background tasks needed)
- `package.json`: date-fns for date handling (may already exist)

### 3. Testing Suite (`feature/testing-suite`)

**Backend Integration:**
- Test files in `/backend/tests/`
- pytest configuration in `pytest.ini` or `pyproject.toml`
- Test utilities in `tests/conftest.py`

**Frontend Integration:**
- Test files alongside components (`*.test.tsx`)
- Vitest configuration in `vite.config.ts`
- Test utilities in `src/test/`

**Dependencies:**
- `requirements.txt`: pytest, pytest-asyncio, mongomock-motor
- `package.json`: vitest, @testing-library/react, msw

## Integration Checklist

### Pre-Integration
- [ ] All feature branches have green CI (if applicable)
- [ ] Each feature has been reviewed for code quality
- [ ] No breaking changes to existing functionality
- [ ] All new dependencies documented

### Backend Integration Steps
1. [ ] Create integration branch from main
2. [ ] Merge data-import-ocr (independent)
3. [ ] Merge payment-reminders (independent)
4. [ ] Update `main.py` with all new routers
5. [ ] Merge testing-suite
6. [ ] Run full test suite
7. [ ] Fix any integration issues

### Frontend Integration Steps
1. [ ] Merge corresponding frontend components
2. [ ] Update `App.tsx` with new routes
3. [ ] Update `Sidebar.tsx` with new navigation
4. [ ] Add new service layers for API calls
5. [ ] Run frontend tests
6. [ ] Visual testing of new pages

### Post-Integration
- [ ] Full integration test
- [ ] Performance check
- [ ] Documentation update
- [ ] Create PR with comprehensive description

## Conflict Resolution

### Likely Conflict Points

1. **`main.py`** - Multiple routers being added
   - Resolution: Sequential additions, order alphabetically

2. **`App.tsx`** - Multiple routes being added
   - Resolution: Group by feature, maintain consistent structure

3. **`Sidebar.tsx`** - Multiple navigation items
   - Resolution: Logical grouping, consider sub-menus

4. **`requirements.txt`** - Multiple dependencies
   - Resolution: Alphabetical order, version ranges

5. **`package.json`** - Multiple dependencies
   - Resolution: Use `npm install` to handle versions

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Module import conflicts | Medium | Low | Clear naming conventions |
| Database schema conflicts | High | Low | Separate collections |
| Frontend route conflicts | Medium | Low | Unique route paths |
| Test interference | Low | Low | Isolated test databases |
| Performance regression | Medium | Medium | Load testing |

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Feature completion | 2-4 hours | All agents |
| Code review | 1 hour | Orchestrator |
| Integration | 1-2 hours | Review complete |
| Testing | 1 hour | Integration complete |
| Final PR | 30 mins | All tests pass |

## Notes

- The data import and payment reminders modules are independent and can be merged in any order
- Testing suite should be merged last to include tests for all features
- Backend and frontend changes should be coordinated to ensure API compatibility
