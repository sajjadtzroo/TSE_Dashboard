# Test Plan: Loan Comparison Feature

## Bug Fix Applied
Fixed missing loan data in `/api/loans/no-guarantor/` and `/api/loans/by-method/{method}` endpoints.

## Test Cases

### Test 1: Basic Comparison (All Loans)
**Steps:**
1. Navigate to http://localhost:5177/loans
2. From "همه وام‌ها" (All Loans), select 2-3 loans by clicking checkboxes
3. Verify floating action bar appears at bottom showing selection count
4. Click "مقایسه" (Compare) button
5. Compare page should load showing all selected loans

**Expected Results:**
- All loan fields visible in comparison table:
  - ✅ نام وام (Loan Name)
  - ✅ نرخ سود (Interest Rate)
  - ✅ حداقل/حداکثر مبلغ (Min/Max Amount)
  - ✅ حداقل/حداکثر مدت (Min/Max Term)
  - ✅ ضامن (Guarantor requirement)
  - ✅ وثیقه (Collateral)
  - ✅ کارمزد (Fees)
  - ✅ فرمول محاسبه (Formula)
  - And all other 65+ loan fields

### Test 2: No-Guarantor Loans Comparison
**Steps:**
1. Navigate to http://localhost:5177/loans
2. Click "بدون ضامن" (No Guarantor) filter button
3. Select 2-3 loans from the filtered list
4. Click "مقایسه" button in floating bar
5. Verify comparison table shows complete data

**Expected Results:**
- ✅ ALL loan fields should be present (this was the bug)
- ✅ No missing data in comparison rows
- ✅ Best/worst value highlighting works correctly
- ✅ Can export to CSV
- ✅ Can share URL

### Test 3: Mixed Selection (All + No-Guarantor)
**Steps:**
1. Navigate to /loans
2. Select 1 loan from "همه وام‌ها"
3. Switch to "بدون ضامن" filter
4. Select 1-2 more loans
5. Compare all selected loans

**Expected Results:**
- ✅ All loans have complete data
- ✅ Comparison works correctly
- ✅ No data mismatch between filtered/unfiltered loans

### Test 4: Toggle Features
**Steps:**
1. In comparison view, click "فقط تفاوت‌ها" (Show Differences Only)
2. Table should hide rows where all loans have same value
3. Click "نمایش همه" (Show All) to see all fields again

**Expected Results:**
- ✅ Differences-only filter works
- ✅ Show all restores complete view
- ✅ No data loss when toggling

### Test 5: Share & Export
**Steps:**
1. After selecting loans and opening compare page
2. Click "اشتراک‌گذاری" (Share) button
3. URL should be copied to clipboard
4. Open new tab and paste URL
5. Same comparison should load
6. Click "خروجی CSV" (Export CSV) button

**Expected Results:**
- ✅ Share URL contains loan IDs: `/compare?loans=bank1:loan1,bank2:loan2`
- ✅ Shared URL loads correct loans
- ✅ CSV export includes all fields

## API Verification Commands

### Check All Loans Endpoint
```bash
curl http://localhost:8000/api/loans/ | jq '.loans[0] | keys | length'
# Expected: ~65+ fields
```

### Check No-Guarantor Endpoint (THE FIX)
```bash
curl http://localhost:8000/api/loans/no-guarantor/ | jq '.loans[0] | keys | length'
# Expected: ~65+ fields (was only 8 before fix)
```

### Verify Full Field List
```bash
curl http://localhost:8000/api/loans/no-guarantor/ | jq '.loans[0] | keys'
# Should include: bankId, bankNameFA, id, nameFA, interestRate, minAmount,
# maxAmount, minTerm, maxTerm, guarantor, collateral, applicationFee,
# formula, calculationMethod, and 50+ more fields
```

## Before vs After Fix

### Before (Bug):
```json
{
  "bankId": "melli",
  "bankNameFA": "بانک ملی",
  "loanId": "gharzolhasaneh",
  "loanNameFA": "قرض‌الحسنه",
  "maxAmount": "500 میلیون",
  "interestRate": "4%",
  "repaymentPeriod": "60 ماه"
}
```
❌ Only 7-8 fields - Missing 57+ critical fields!

### After (Fixed):
```json
{
  "bankId": "melli",
  "bankNameFA": "بانک ملی",
  "bankNameEN": "Bank Melli Iran",
  "bankCategory": "traditional-banks",
  "id": "gharzolhasaneh",
  "nameFA": "قرض‌الحسنه",
  "nameEN": "Gharzolhasaneh",
  "category": "gharzolhasaneh",
  "interestRate": "4%",
  "minAmount": "10 میلیون",
  "maxAmount": "500 میلیون",
  "minTerm": "12 ماه",
  "maxTerm": "60 ماه",
  "guarantor": false,
  "collateral": "ندارد",
  "applicationFee": "رایگان",
  "formula": "...",
  "calculationMethod": "equal-installments",
  ... and 50+ more fields
}
```
✅ All 65+ fields present!

## Quick Visual Test
1. Open DevTools (F12)
2. Go to Network tab
3. Navigate to /loans
4. Select a loan from "بدون ضامن" filter
5. Check the API response in Network tab
6. Verify `/api/loans/no-guarantor/` returns full loan objects

## Success Criteria
- [x] Backend fix applied and auto-reloaded
- [ ] All loans endpoint returns ~65+ fields per loan
- [ ] No-guarantor endpoint returns ~65+ fields per loan (was 7-8)
- [ ] Comparison table shows all loan data
- [ ] No missing fields in comparison
- [ ] Best/worst highlighting works
- [ ] Share and export features work
- [ ] URL-based comparison works

## Notes
- The fix changes repository.py lines 64-83 and 99-116
- Uses `**loan` spread operator to include all fields
- Consistent with `get_all_loans()` structure
- Backend auto-reloaded at 11:34:44 with changes
