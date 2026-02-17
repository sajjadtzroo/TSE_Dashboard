# Merge Order Strategy - Persian Loan Dashboard

## Executive Summary

This document defines the optimal order for merging feature branches into the main codebase, along with step-by-step integration procedures.

## Recommended Merge Order

```
1. feature/data-import-ocr      (Independent - No dependencies)
2. feature/payment-reminders    (Independent - No dependencies)
3. feature/testing-suite        (Depends on: 1, 2 for complete coverage)
4. feature/integration-all      (Final integration branch)
```

## Rationale

### Why This Order?

1. **Data Import First**
   - Provides foundational data ingestion capability
   - No dependencies on other new features
   - Self-contained module with clear boundaries
   - Adds OCR and scraping infrastructure

2. **Payment Reminders Second**
   - Independent of data import
   - Adds user-facing functionality
   - May share calculation utilities with calculator
   - Self-contained with clear API boundaries

3. **Testing Suite Last**
   - Tests should cover ALL features
   - Requires other features to be merged first
   - Can identify integration issues
   - Ensures complete test coverage

## Detailed Merge Procedures

### Phase 1: Data Import Module

**Branch:** `feature/data-import-ocr`

**Pre-merge Checklist:**
- [ ] Router implemented at `app/modules/import_data/router.py`
- [ ] Endpoints for file upload, OCR processing, web scraping
- [ ] Error handling for file type validation
- [ ] Frontend page (if included)

**Merge Steps:**
```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Create integration branch
git checkout -b feature/integration-all

# 3. Merge data-import branch
git merge feature/data-import-ocr --no-ff -m "Merge data import module with OCR and web scraping"

# 4. Resolve any conflicts (unlikely for first merge)
# Check main.py, requirements.txt, App.tsx, Sidebar.tsx

# 5. Verify application runs
cd backend && python -c "from app.main import app; print('OK')"
```

**Post-merge Integration:**
```python
# In main.py - Add import router
from app.modules.import_data import router as import_router

app.include_router(
    import_router,
    prefix=f"{settings.api_prefix}/import",
    tags=["Data Import"],
)
```

**Verification:**
```bash
# Start backend and check endpoints
uvicorn app.main:app --reload
# Visit /docs to verify /api/import endpoints
```

---

### Phase 2: Payment Reminders Module

**Branch:** `feature/payment-reminders`

**Pre-merge Checklist:**
- [ ] Router implemented at `app/modules/reminders/router.py`
- [ ] CRUD operations for user loans
- [ ] Payment schedule calculation
- [ ] Alert generation logic
- [ ] Frontend pages (if included)

**Merge Steps:**
```bash
# 1. Ensure integration branch is current
git checkout feature/integration-all

# 2. Merge payment-reminders branch
git merge feature/payment-reminders --no-ff -m "Merge payment reminders module with alert system"

# 3. Resolve any conflicts
# Likely conflicts: main.py, requirements.txt, App.tsx, Sidebar.tsx
```

**Conflict Resolution Guide:**

For `main.py`:
```python
# Keep both imports
from app.modules.import_data import router as import_router
from app.modules.reminders import router as reminders_router

# Keep both routers
app.include_router(
    import_router,
    prefix=f"{settings.api_prefix}/import",
    tags=["Data Import"],
)
app.include_router(
    reminders_router,
    prefix=f"{settings.api_prefix}/reminders",
    tags=["Payment Reminders"],
)
```

For `requirements.txt`:
```txt
# Add new dependencies alphabetically
APScheduler>=3.10.0  # (if used)
jdatetime>=4.1.0
```

For `App.tsx`:
```tsx
// Add both sets of routes
<Route path="import" element={<Import />} />
<Route path="reminders" element={<Reminders />} />
<Route path="reminders/add" element={<AddLoan />} />
```

For `Sidebar.tsx`:
```tsx
// Add both navigation items
{ name: 'ورود داده', href: '/import', icon: FileUp },
{ name: 'یادآور پرداخت', href: '/reminders', icon: Bell },
```

**Verification:**
```bash
# Check application imports cleanly
python -c "from app.main import app; print('OK')"

# Start and verify all endpoints
uvicorn app.main:app --reload
```

---

### Phase 3: Testing Suite

**Branch:** `feature/testing-suite`

**Pre-merge Checklist:**
- [ ] conftest.py with all fixtures
- [ ] Tests for banks module
- [ ] Tests for loans module
- [ ] Tests for analytics module
- [ ] Tests for import module (if exists)
- [ ] Tests for reminders module (if exists)
- [ ] All tests passing on branch

**Merge Steps:**
```bash
# 1. Ensure integration branch has both features
git checkout feature/integration-all

# 2. Merge testing-suite branch
git merge feature/testing-suite --no-ff -m "Merge testing suite with comprehensive test coverage"

# 3. Resolve any conflicts
# Likely conflicts: conftest.py, requirements.txt
```

**Verification:**
```bash
# Run full test suite
cd backend
pytest -v

# Check coverage
pytest --cov=app --cov-report=html
```

---

### Phase 4: Final Integration

**Integration Checklist:**

1. **Backend Verification:**
   - [ ] All routers registered in main.py
   - [ ] All dependencies in requirements.txt
   - [ ] Database connections working
   - [ ] Health check endpoint responding
   - [ ] API documentation complete (/docs)

2. **Frontend Verification:**
   - [ ] All routes defined in App.tsx
   - [ ] Navigation links in Sidebar.tsx
   - [ ] All pages rendering correctly
   - [ ] API calls working
   - [ ] TypeScript compiling without errors

3. **Testing Verification:**
   - [ ] All unit tests passing
   - [ ] All integration tests passing
   - [ ] No regressions in existing functionality
   - [ ] Coverage meets requirements

4. **Documentation:**
   - [ ] README updated (if needed)
   - [ ] API documentation complete
   - [ ] Environment variables documented

---

## Rollback Procedures

### If Phase 1 Fails:
```bash
git checkout main
git branch -D feature/integration-all
# Fix issues on feature/data-import-ocr
```

### If Phase 2 Fails:
```bash
git checkout feature/integration-all
git reset --hard HEAD~1
# Fix issues on feature/payment-reminders
```

### If Phase 3 Fails:
```bash
git checkout feature/integration-all
git reset --hard HEAD~1
# Fix issues on feature/testing-suite
```

---

## Final PR Creation

**Branch:** `feature/integration-all` -> `main`

**PR Title:**
```
feat: Complete integration of Data Import, Payment Reminders, and Testing Suite
```

**PR Description Template:**
```markdown
## Summary
This PR integrates all parallel development features into the main codebase.

## Features Added
- **Data Import Module**: OCR processing and web scraping for loan data
- **Payment Reminders Module**: User loan tracking and payment alerts
- **Testing Suite**: Comprehensive test coverage for all modules

## Changes
### Backend
- Added `/api/import` endpoints for data import
- Added `/api/reminders` endpoints for payment tracking
- Added comprehensive test suite in `/tests`

### Frontend
- Added Import page for data upload
- Added Reminders page for loan tracking
- Updated navigation with new links

## Testing
- All unit tests passing
- Integration tests passing
- Manual testing completed

## Breaking Changes
None

## Checklist
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] No sensitive data committed
```

---

## Timing Considerations

| Phase | Estimated Time | Blocking Factor |
|-------|----------------|-----------------|
| Phase 1 | 30 mins | Feature completion |
| Phase 2 | 30 mins | Feature completion |
| Phase 3 | 30 mins | Phases 1 & 2 complete |
| Phase 4 | 1 hour | Phase 3 complete |
| **Total** | **~2.5 hours** | All agents complete |

---

## Communication Protocol

1. **Before Each Merge:**
   - Notify team of merge starting
   - Ensure no active work on target branch

2. **During Merge:**
   - Document any conflicts encountered
   - Note any manual changes required

3. **After Each Merge:**
   - Notify team of merge completion
   - Report any issues found
   - Update task status

4. **Final Integration:**
   - Create detailed PR
   - Request reviews from all agents
   - Coordinate deployment timing
