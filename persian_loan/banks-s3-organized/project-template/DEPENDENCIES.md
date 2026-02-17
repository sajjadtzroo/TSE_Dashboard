# Dependencies Analysis - Persian Loan Dashboard

## Overview

This document maps the dependencies between different modules and features in the Persian Loan Dashboard project.

## Dependency Graph

```
                    ┌─────────────────┐
                    │      main       │
                    │   (App.tsx)     │
                    │   (main.py)     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Data Import    │ │Payment Reminders│ │  Testing Suite  │
│    Module       │ │     Module      │ │                 │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  OCR Service    │ │ Calculation Svc │ │  Mock Database  │
│  Scraper Svc    │ │ Scheduler Svc   │ │  Test Fixtures  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Module Dependencies

### 1. Data Import Module

**Internal Dependencies:**
```
import_data/
├── __init__.py      → router.py
├── schemas.py       → (standalone)
├── ocr_service.py   → schemas.py
├── router.py        → schemas.py, ocr_service.py, scraper_service.py
├── scraper_service.py → schemas.py
└── repository.py    → schemas.py, core/database.py
```

**Core Dependencies:**
- `app/core/database.py` - MongoDB connection
- `app/core/logger.py` - Logging
- `app/core/config.py` - Settings

**External Dependencies:**
```
pytesseract>=0.3.10
Pillow>=10.2.0
pdf2image>=1.17.0
beautifulsoup4>=4.12.0
lxml>=5.1.0
httpx>=0.26.0 (already exists)
```

**System Dependencies:**
- Tesseract OCR binary
- Poppler utils (for PDF)

### 2. Payment Reminders Module

**Internal Dependencies:**
```
reminders/
├── __init__.py      → router.py
├── schemas.py       → (standalone, uses pydantic)
├── router.py        → schemas.py, service.py, repository.py
├── service.py       → schemas.py, repository.py, calculation_service.py
├── repository.py    → schemas.py, core/database.py
└── calculation_service.py → schemas.py
```

**Core Dependencies:**
- `app/core/database.py` - MongoDB connection
- `app/core/logger.py` - Logging
- `app/core/config.py` - Settings

**External Dependencies:**
```
python-dateutil>=2.8.0 (already exists)
jdatetime>=4.1.0 (for Jalali calendar)
APScheduler>=3.10.0 (optional, for background tasks)
```

**Shared with Calculator:**
- Loan calculation logic may overlap with existing calculator
- Consider abstracting shared calculation utilities

### 3. Testing Suite

**Internal Dependencies:**
```
tests/
├── __init__.py      → (standalone)
├── conftest.py      → app/main.py, app/core/database.py
├── test_banks.py    → conftest.py, app/modules/banks/*
├── test_loans.py    → conftest.py, app/modules/loans/*
├── test_analytics.py → conftest.py, app/modules/analytics/*
├── test_import.py   → conftest.py, app/modules/import_data/*
└── test_reminders.py → conftest.py, app/modules/reminders/*
```

**External Dependencies:**
```
pytest>=7.4.0 (already exists)
pytest-asyncio>=0.21.0 (already exists)
mongomock-motor>=0.0.29
httpx>=0.26.0 (already exists)
```

## Cross-Module Dependencies

### Shared Components

| Component | Used By | Type |
|-----------|---------|------|
| `core/database.py` | All modules | Database connection |
| `core/logger.py` | All modules | Logging |
| `core/config.py` | All modules | Configuration |
| `common/exceptions.py` | All modules | Error handling |

### Data Flow Dependencies

```
                Banks Data
                    │
         ┌──────────┴──────────┐
         │                     │
    ┌────▼────┐          ┌────▼────┐
    │ Import  │          │ Display │
    │ Module  │          │ Module  │
    └────┬────┘          └────┬────┘
         │                    │
         │    MongoDB         │
         └────────┬───────────┘
                  │
         ┌────────▼────────┐
         │   Reminders     │
         │    Module       │
         │ (User Loans)    │
         └─────────────────┘
```

### API Dependency Chain

1. **Import Module** writes to `import_logs` collection
2. **Banks/Loans Module** reads from `banks` collection
3. **Reminders Module** writes to `user_loans` and `payment_schedules` collections
4. **Analytics Module** aggregates from all collections

## Frontend Dependencies

### Route Dependencies

```tsx
// App.tsx - Route hierarchy
<Route path="/" element={<MainLayout />}>
  <Route index element={<Dashboard />} />           // Core
  <Route path="banks" element={<Banks />} />        // Core
  <Route path="banks/:id" element={<BankDetail />} /> // Core
  <Route path="loans" element={<Loans />} />        // Core
  <Route path="loans/:bankId/:id" element={<LoanDetail />} /> // Core
  <Route path="calculator" element={<Calculator />} /> // Core
  <Route path="import" element={<Import />} />      // Data Import
  <Route path="reminders" element={<Reminders />} /> // Payment Reminders
  <Route path="reminders/add" element={<AddLoan />} /> // Payment Reminders
</Route>
```

### Service Dependencies

```
services/
├── banks.service.ts     → (core)
├── analytics.service.ts → (core)
├── import.service.ts    → (data import)
└── reminders.service.ts → (payment reminders)
```

### Component Dependencies

| Feature | Components Needed | Shared Components Used |
|---------|-------------------|------------------------|
| Data Import | ImportForm, FileUpload, OCRResult | Card, Button, Loading |
| Payment Reminders | LoanForm, PaymentSchedule, AlertList | Card, Button, Badge |
| Testing | (test utils only) | All components tested |

## Dependency Conflicts

### Potential Conflicts

1. **Database Collections**
   - Ensure unique collection names
   - `banks`, `loans` (existing)
   - `import_logs` (import module)
   - `user_loans`, `payment_schedules`, `alerts` (reminders)

2. **Route Paths**
   - All paths should be unique
   - Use feature-specific prefixes

3. **API Prefixes**
   - `/api/banks` (existing)
   - `/api/loans` (existing)
   - `/api/analytics` (existing)
   - `/api/import` (new - data import)
   - `/api/reminders` (new - payment reminders)

### Resolution Strategy

1. Use namespace prefixes for collections
2. Maintain unique route paths
3. Version API endpoints if needed
4. Isolate test databases

## Installation Order

For clean dependency resolution:

1. **Core dependencies** (already installed)
2. **OCR dependencies** (tesseract, pillow, pdf2image)
3. **Web scraping dependencies** (beautifulsoup4, lxml)
4. **Calendar dependencies** (jdatetime for Jalali dates)
5. **Testing dependencies** (mongomock-motor)
6. **Optional scheduler** (APScheduler)

## Environment Variables

New environment variables needed:

```env
# Data Import
TESSERACT_CMD=/usr/bin/tesseract
UPLOAD_DIR=/tmp/uploads
MAX_UPLOAD_SIZE=10485760  # 10MB

# Reminders
REMINDER_DAYS_BEFORE=7
ALERT_CHECK_INTERVAL=3600  # seconds

# Testing
TEST_DATABASE_URL=mongodb://localhost:27017/test_db
```
