# Financial Modeling Phase 2 — Design Document
**Date:** 2026-02-24
**Status:** Approved

---

## Objective

Add 4 operational modeling tools to `rag/tools/financial_modeling.py` that cover the upstream
building blocks of a DCF model. Each tool is a pure-compute function (no Excel dependency)
that the agent chains together to auto-populate a full DCF projection.

**Source:** `docs/financial_modeling_guide.md` sections 1, 4, 5, 7.

---

## New Tools (4)

### 1. `build_revenue_model`
**Guide:** Section 1 — Revenue Modeling

Three `approach` modes:
- `"growth_rates"` — compound `base_revenue` by a list of annual growth rates
- `"top_down"` — `market_size × market_share_pct` per year (market grows at `market_growth_rate`)
- `"bottom_up"` — `units_sold × price_per_unit` with separate volume/price growth

**Parameters:**
```
base_revenue: float          # Year-0 revenue (billion IRR)
years: int                   # Number of forecast years
approach: str                # "growth_rates" | "top_down" | "bottom_up"
# growth_rates approach:
growth_rates: list[float]    # Per-year growth rates (len == years)
# top_down approach:
market_size: float           # Total addressable market (billion IRR)
market_share_pct: float      # Company's market share (decimal, e.g. 0.08)
market_growth_rate: float    # Annual market growth (decimal)
# bottom_up approach:
units_sold: float            # Base units sold
price_per_unit: float        # Base price per unit (IRR)
volume_growth_rate: float    # Annual volume growth
price_growth_rate: float     # Annual price growth
```

**Returns:**
```json
{
  "model_type": "revenue_model",
  "approach": "growth_rates",
  "projections": [
    {"year": 1, "revenue": 1100.0, "growth_pct": 10.0},
    {"year": 2, "revenue": 1265.0, "growth_pct": 15.0}
  ],
  "total_revenue": 2365.0
}
```

---

### 2. `build_wc_model`
**Guide:** Section 4 — Working Capital Model

**Formulas:**
```
AR(t)        = (DSO / 365) × Revenue(t)
Inventory(t) = (DIO / 365) × COGS(t)
AP(t)        = (DPO / 365) × COGS(t)
NWC(t)       = AR(t) + Inventory(t) − AP(t)
ΔWC(t)       = NWC(t) − NWC(t−1)
CCC(t)       = DSO + DIO − DPO
```

**Parameters:**
```
revenue_list: list[float]    # Revenue per year (from build_revenue_model)
cogs_pct: float              # COGS as % of revenue (decimal)
dso: float                   # Days Sales Outstanding
dio: float                   # Days Inventory Outstanding
dpo: float                   # Days Payable Outstanding
opening_nwc: float           # NWC at t=0 (for ΔWC in year 1). Default 0.
```

**Returns:**
```json
{
  "model_type": "wc_model",
  "projections": [
    {"year": 1, "ar": 120.0, "inventory": 80.0, "ap": 60.0,
     "nwc": 140.0, "delta_wc": 20.0, "ccc": 45.0}
  ]
}
```

The `delta_wc` field feeds directly into `build_dcf_model`'s `projections[i]["delta_wc"]`.

---

### 3. `build_capex_schedule`
**Guide:** Sections 3 + 5 — D&A + CapEx Model

**PP&E Roll-Forward:**
```
Gross PP&E(t)  = Gross PP&E(t-1) + CapEx(t) − Disposals(t)
Acc. Dep.(t)   = Acc. Dep.(t-1) + DA(t)
Net PP&E(t)    = Gross PP&E(t) − Acc. Dep.(t)
DA(t)          = Gross PP&E(t-1) / useful_life   (straight-line)
```

**Parameters:**
```
opening_gross_ppe: float          # Gross PP&E at t=0 (billion IRR)
opening_accum_dep: float          # Accumulated depreciation at t=0
useful_life: float                # Asset useful life in years (e.g. 10)
capex_list: list[float]           # CapEx per year OR
capex_pct_revenue: float          # CapEx as % of revenue (used if capex_list absent)
revenue_list: list[float]         # Required if using capex_pct_revenue
years: int                        # Required if using capex_pct_revenue
disposals_list: list[float]       # Optional; defaults to zeros
```

**Returns:**
```json
{
  "model_type": "capex_schedule",
  "projections": [
    {"year": 1, "capex": 80.0, "da": 50.0,
     "gross_ppe": 580.0, "accum_dep": 100.0, "net_ppe": 480.0}
  ]
}
```

The `capex` and `da` arrays feed into `build_dcf_model` projections.

---

### 4. `build_debt_schedule`
**Guide:** Section 7 — Debt Schedule & Interest Modeling

Supports multiple tranches (revolver, TLA, TLB, senior notes, etc.).

**Roll-Forward per tranche:**
```
Ending Balance(t) = Opening Balance(t) − Mandatory Amortization(t)
Interest(t)       = ((Opening(t) + Ending(t)) / 2) × rate   # avg balance method
Net Debt(t)       = Total Debt(t) − Cash(t)
```

**Parameters:**
```
tranches: list[{
  name: str,
  opening_balance: float,
  annual_rate: float,          # Fixed rate (decimal)
  amortization_pct: float,     # % of opening balance repaid per year
  is_revolver: bool            # If true, balance can be drawn/repaid
}]
years: int
cash_list: list[float]         # Cash balance per year (for net debt). Default zeros.
```

**Returns:**
```json
{
  "model_type": "debt_schedule",
  "projections": [
    {"year": 1, "total_debt": 800.0, "interest_expense": 88.0, "net_debt": 750.0}
  ],
  "tranches": [
    {"name": "TLA", "opening": 500.0, "ending": 450.0, "interest": 50.0}
  ]
}
```

The `interest_expense` array feeds into `build_pl_model`; `net_debt[-1]` feeds into `build_dcf_model`.

---

## Agent Integration

Update `rag/agents/financial_modeling.py`:

- **`max_tool_rounds`:** 6 → **8** (full upstream chain = 4 tools + PL + DCF = 6 calls; +2 buffer)
- **Tool count:** 10 → **14**
- **System prompt:** add section describing the upstream chain:

```
## Full Bottom-Up DCF Chain
1. build_revenue_model   → revenue projections
2. build_wc_model        → delta_wc per year (needs revenue)
3. build_capex_schedule  → capex + da per year
4. build_debt_schedule   → interest_expense + net_debt
5. build_pl_model        → EBIT per year (needs revenue + margins)
6. build_dcf_model       → assemble projections from above outputs
```

---

## Frontend Changes

**`ModelChatArea.jsx`** — add to `FM_TOOL_TO_TYPE`:
```js
build_revenue_model: 'revenue_model',
build_wc_model: 'wc_model',
build_capex_schedule: 'capex_schedule',
build_debt_schedule: 'debt_schedule',
```

**`ModelResultCard.jsx`** — add `MODEL_META` entries for 4 new types.

**`ModelEmptyState.jsx` + `ModelSidebar.jsx`** — add 1 new quick-start:
```
"یک DCF کامل از پایه بساز: ابتدا مدل درآمد، سپس سرمایه در گردش، CapEx و برنامه بدهی"
```

---

## Test Plan

Extend `tests/unit/test_financial_modeling_tools.py`:

| Test Class | Key Assertions |
|-----------|----------------|
| `TestRevenueModel` | Growth compounding correct; top-down = market×share; bottom-up = units×price; wrong approach returns error |
| `TestWCModel` | AR = DSO/365×Rev; ΔWC sign correct (increase = outflow); CCC = DSO+DIO−DPO; year-1 ΔWC uses opening_nwc |
| `TestCapexSchedule` | Net PP&E = Gross − AccumDep; DA = opening_gross/useful_life; accum_dep never exceeds gross; capex_pct_revenue path works |
| `TestDebtSchedule` | Ending = opening − amort; interest = avg_balance × rate; net_debt = total_debt − cash; multi-tranche sums correctly |

Update `TestToolDefinitions` count assertions: 10 → 14.
Update `TestFinancialModelingAgent`: `test_ten_tools` → `test_fourteen_tools`, tool name set updated.

---

## File Inventory

| File | Change |
|------|--------|
| `rag/tools/financial_modeling.py` | Add 4 tools, update TOOL_DEFINITIONS (+=4), TOOL_DISPATCH (+=4) |
| `rag/agents/financial_modeling.py` | Update system prompt, max_tool_rounds=8 |
| `frontend/.../ModelChatArea.jsx` | Add 4 entries to FM_TOOL_TO_TYPE |
| `frontend/.../ModelResultCard.jsx` | Add MODEL_META for 4 new types |
| `frontend/.../ModelEmptyState.jsx` | Add 1 new quick-start prompt |
| `frontend/.../ModelSidebar.jsx` | Add 1 new template |
| `tests/unit/test_financial_modeling_tools.py` | Add 4 test classes, update count assertions |
| `tests/unit/test_financial_modeling_agent.py` | Update tool count assertions (10→14) |
