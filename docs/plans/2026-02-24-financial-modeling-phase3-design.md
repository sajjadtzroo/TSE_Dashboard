# Financial Modeling Phase 3 — Three Financial Statements Model

**Date:** 2026-02-24
**Status:** Approved

---

## Objective

Add `build_three_statement_model` — a single integrated tool that links the Income Statement, Balance Sheet, and Cash Flow Statement using outputs from the Phase 2 operational tools (revenue, P&L, WC, CapEx, debt).

**Source:** `docs/financial_modeling_guide.md` section 18.

---

## Tool: `build_three_statement_model`

### Input Approach: Chain from Phase 2 Tools

The agent calls upstream tools first (build_revenue_model → build_pl_model → build_wc_model → build_capex_schedule → build_debt_schedule), then passes their output arrays into this tool.

### Function Signature

```python
def build_three_statement_model(
    db: Session,
    # From build_pl_model
    revenue_list: list,              # Revenue per year [float]
    ebit_list: list,                 # EBIT per year [float]
    interest_expense_list: list,     # Interest expense per year (from build_debt_schedule)
    tax_rate: float,                 # Corporate tax rate (decimal)
    # From build_capex_schedule
    da_list: list,                   # D&A per year [float]
    capex_list: list,                # CapEx per year [float]
    # From build_wc_model
    delta_wc_list: list,             # ΔWC per year (positive = cash outflow)
    ar_list: list,                   # AR per year [float]
    inventory_list: list,            # Inventory per year [float]
    ap_list: list,                   # AP per year [float]
    # From build_debt_schedule
    total_debt_list: list,           # Total debt per year [float]
    net_borrowing_list: list,        # Net new debt per year (positive = drawdown)
    # Opening Balance Sheet (t=0)
    opening_bs: dict,                # {cash, ppe_net, other_assets, other_liabilities, equity}
    # Dividend policy
    dividend_payout_ratio: float = 0.0,  # Fraction of NI paid as dividends
) -> str:
```

### Three Statements Built Per Year

**Income Statement:**
```
Revenue
− EBIT (given)
= EBIT
− Interest Expense
= EBT
− Tax (EBT × tax_rate, if EBT > 0)
= Net Income
```

**Cash Flow Statement:**
```
Operating CF  = Net Income + D&A − ΔWC
Investing CF  = −CapEx
Financing CF  = Net Borrowing − Dividends
Net Change in Cash = Operating CF + Investing CF + Financing CF
```

**Balance Sheet:**
```
Assets:
  Cash            = Cash(t-1) + Net Change in Cash
  AR              = from ar_list
  Inventory       = from inventory_list
  PP&E (net)      = PP&E(t-1) + CapEx − D&A
  Other Assets    = opening_bs["other_assets"] (constant unless specified)
  Total Assets    = sum of above

Liabilities:
  AP              = from ap_list
  Total Debt      = from total_debt_list
  Other Liabilities = opening_bs["other_liabilities"] (constant)
  Total Liabilities = sum of above

Equity:
  Equity(t) = Equity(t-1) + Net Income − Dividends
  Total L+E = Total Liabilities + Equity

Balance Check: Total Assets == Total L+E (within rounding tolerance)
```

### Return Structure

```json
{
  "model_type": "three_statement_model",
  "years": [
    {
      "year": 1,
      "income_statement": {
        "revenue": 1100.0,
        "ebit": 220.0,
        "interest_expense": 76.0,
        "ebt": 144.0,
        "tax": 36.0,
        "net_income": 108.0,
        "dividends": 0.0,
        "retained_earnings_addition": 108.0
      },
      "cash_flow_statement": {
        "operating_cf": 158.0,
        "investing_cf": -80.0,
        "financing_cf": -50.0,
        "net_change_in_cash": 28.0
      },
      "balance_sheet": {
        "cash": 128.0,
        "ar": 90.4,
        "inventory": 74.0,
        "ppe_net": 450.0,
        "other_assets": 50.0,
        "total_assets": 792.4,
        "ap": 32.9,
        "total_debt": 900.0,
        "other_liabilities": 0.0,
        "total_liabilities": 932.9,
        "equity": 859.5,
        "total_liabilities_and_equity": 792.4,
        "balance_check_passed": true,
        "balance_error": 0.0
      }
    }
  ]
}
```

---

## Validation

- Balance check tolerance: `abs(total_assets - total_liabilities_and_equity) < 0.01`
- All lists must have equal length; return error if mismatched
- EBT < 0 → tax = 0 (no tax on losses)
- Dividends = NI × dividend_payout_ratio (capped at 0 if NI < 0)

---

## Agent Update

- **Tool count:** 14 → **15**
- **`max_tool_rounds`:** stays at 8 (full chain: revenue → pl → wc → capex → debt → 3-statement = 6 calls)
- **System prompt:** add `build_three_statement_model` to tool list with chain guidance

---

## Frontend Update

- `FM_TOOL_TO_TYPE`: add `build_three_statement_model: 'three_statement'`
- `MODEL_META`: add `three_statement` entry with color `teal` and metrics `[]` (too many to display as cards)
- `ModelEmptyState` + `ModelSidebar`: add one new template for the full integrated model

---

## Tests

New class `TestThreeStatementModel` in `tests/unit/test_financial_modeling_tools.py`:

| Test | Assertion |
|------|-----------|
| `test_balance_sheet_balances` | Assets == L+E (balance check passed) |
| `test_cash_rolls_forward` | Cash(t) = Cash(t-1) + net_change_in_cash |
| `test_ppe_rolls_forward` | PP&E(t) = PP&E(t-1) + CapEx − DA |
| `test_equity_rolls_forward` | Equity(t) = Equity(t-1) + NI − Dividends |
| `test_operating_cf_formula` | Operating CF = NI + DA − ΔWC |
| `test_net_income_formula` | NI = (EBIT − interest) × (1 − tax_rate) |
| `test_tax_zero_when_ebt_negative` | Loss year → tax = 0 |
| `test_schedule_length` | len(years) == len(revenue_list) |
| `test_model_type` | model_type == "three_statement_model" |
| `test_mismatched_list_length_error` | Returns error if list lengths differ |

---

## File Inventory

| File | Change |
|------|--------|
| `rag/tools/financial_modeling.py` | Add `build_three_statement_model`, update TOOL_DEFINITIONS (+=1), TOOL_DISPATCH (+=1) |
| `rag/agents/financial_modeling.py` | Add tool to system prompt (14→15 tools) |
| `frontend/.../ModelChatArea.jsx` | Add to FM_TOOL_TO_TYPE |
| `frontend/.../ModelResultCard.jsx` | Add MODEL_META entry |
| `frontend/.../ModelEmptyState.jsx` | Add quick-start prompt |
| `frontend/.../ModelSidebar.jsx` | Add template |
| `tests/unit/test_financial_modeling_tools.py` | Add TestThreeStatementModel (10 tests), update count 14→15 |
| `tests/unit/test_financial_modeling_agent.py` | Update tool count 14→15, add to tool name set |
