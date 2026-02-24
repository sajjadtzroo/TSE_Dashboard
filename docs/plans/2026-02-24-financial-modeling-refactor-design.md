# Financial Modeling Refactor — Design Document
**Date:** 2026-02-24
**Branch:** feature/financial-modeling-refactor
**Status:** Approved

---

## Objective

Refactor the financial modeling module to:
1. Fix confirmed bugs in existing tools (DCF sensitivity, balloon loan, frontend wiring)
2. Add all missing CFA L1/L2 tools (WACC, CAPM, DDM, Residual Income, Multiples, FCFE)
3. Enhance bond model with convexity and DV01
4. Update agent system prompt and registration
5. Add comprehensive unit tests for all CFA formulas

---

## Bug Fixes (4)

| # | Location | Bug | Fix |
|---|----------|-----|-----|
| 1 | `rag/tools/financial_modeling.py:163–175` | DCF sensitivity table reuses base `pv_sum` — PV of explicit FCFFs doesn't change across WACC rows, so prices are all wrong | Cache list of FCFFs, recompute `pv_sum_at_w` at each sensitivity WACC `w` |
| 2 | `rag/tools/financial_modeling.py:471–512` | Balloon loan accepts `balloon_month` parameter but silently ignores it; balloon always occurs at `term_months` | Honour `balloon_month`: regular PMT up to `balloon_month`, pay remaining balance at that month |
| 3 | `frontend/src/features/financial-modeling/components/ModelingLayout.jsx:53` | `<ModelSidebar>` receives no props; `onSelectPrompt` and `onNewChat` are always undefined | Add `handleSelectPrompt` and `handleNewChat` handlers in ModelingLayout, pass them to ModelSidebar |
| 4 | `frontend/src/features/financial-modeling/components/ModelChatArea.jsx:107–116` | `handleSendPrompt` never calls `setInput('')` after sending, so the prompt text remains in the input box | Call `setInput('')` before `sendMessage` in `handleSendPrompt` |

---

## New CFA Tools (6 additions to `rag/tools/financial_modeling.py`)

All tools follow the existing pattern: `fn(db: Session, **kwargs) -> str` (JSON string).

### 1. `compute_wacc`
**CFA source:** CFA L1 Corporate Finance, Reading 33

```
WACC = (E / (E+D)) × Ke + (D / (E+D)) × Kd × (1 − T)
```

**Parameters:** `equity_value`, `debt_value`, `cost_of_equity`, `cost_of_debt`, `tax_rate`
**Returns:** `wacc`, `equity_weight`, `debt_weight`, `after_tax_cost_of_debt`

---

### 2. `compute_capm`
**CFA source:** CFA L1 Portfolio Management, Reading 53

```
Ke = Rf + β × ERP + size_premium + specific_premium
```

**Parameters:** `risk_free_rate`, `beta`, `equity_risk_premium`, `size_premium` (default 0), `specific_premium` (default 0)
**Returns:** `cost_of_equity`, `rf_pct`, `beta`, `erp_pct`, `formula_breakdown`

---

### 3. `build_ddm_model`
**CFA source:** CFA L2 Equity, Readings 26–27

Three sub-models selected via `model_type` parameter:

**Gordon Growth (single-stage):**
```
P₀ = D₁ / (ke − g)    where D₁ = D₀ × (1 + g)
```

**H-model (two-stage with linearly declining growth):**
```
P₀ = D₀ × (1 + g_L) / (ke − g_L)  +  D₀ × H × (g_S − g_L) / (ke − g_L)
```
where H = half-life of the high-growth period.

**Multi-stage (explicit stage + Gordon Growth terminal):**
```
P₀ = Σₜ₌₁ⁿ Dₜ/(1+ke)ᵗ  +  Pₙ/(1+ke)ⁿ
where Pₙ = Dₙ₊₁ / (ke − g_terminal)
```

**Parameters:** `current_dividend`, `discount_rate`, `model_type`, `growth_rate` (Gordon), `short_term_growth` + `long_term_growth` + `half_life` (H-model), `stage_growth_rates` + `terminal_growth` (multi-stage)
**Returns:** `intrinsic_value`, `dividend_schedule`, `model_type`, `pv_dividends`, `pv_terminal`

---

### 4. `build_residual_income_model`
**CFA source:** CFA L2 Equity, Reading 29

```
RIₜ = EPSₜ − (ke × BVPSₜ₋₁)
V₀ = BVPS₀ + Σₜ₌₁ⁿ RIₜ/(1+ke)ᵗ + PV(continuing RI)
```

Continuing RI uses persistence factor ω: `Continuing RI = RIₙ × ω / (ke − g_ri)` when ω < 1.

**Parameters:** `book_value_per_share`, `earnings_per_share_list` (one per year), `cost_of_equity`, `persistence_factor` (default 1.0 = RI fades at ke)
**Returns:** `intrinsic_value`, `ri_schedule` (per year: BV, EPS, RI, PV_RI), `pv_explicit_ri`, `pv_continuing_ri`

---

### 5. `build_multiples_model`
**CFA source:** CFA L1/L2 Equity, Readings 23–25

Peer comps using four multiples: EV/EBITDA, P/E, P/Book, P/Sales.

```
Implied EV   = peer_median_EV_EBITDA × company_EBITDA
Implied P    = peer_median_PE × company_EPS
Implied P    = peer_median_PB × company_BVPS
Implied P    = peer_median_PS × company_revenue_per_share
```

**Parameters:** `ebitda`, `net_income`, `book_value`, `revenue`, `shares_outstanding`, `net_debt`, `peer_ev_ebitda`, `peer_pe`, `peer_pb`, `peer_ps`
**Returns:** per-multiple `implied_share_price`, `implied_ev` (where relevant), `enterprise_value_used`, range summary (min/max/median implied price)

---

### 6. `compute_fcfe`
**CFA source:** CFA L2 Corporate Finance, Reading 24

```
FCFE = Net Income + D&A − CapEx − ΔNWC + Net Borrowing
     = FCFF − Interest × (1 − T) + Net Borrowing
```

Both calculation paths accepted.

**Parameters:** `net_income`, `da`, `capex`, `delta_wc`, `net_borrowing`, optionally `fcff` + `interest_expense` + `tax_rate` for FCFF-based path
**Returns:** `fcfe`, `calculation_path` (`direct` or `from_fcff`), formula breakdown

---

## Bond Model Enhancement (existing `build_bond_model`)

Add to response output:

**Convexity:**
```
Convexity = [1 / (P × (1+y)²)] × Σₜ [CFₜ × t × (t+1) / (1+y)ᵗ]
```

**DV01 (Dollar Value of 1 basis point):**
```
DV01 = Modified Duration × Price / 10,000
```

No new tool — just additional fields in the existing JSON response.

---

## Agent Update (`rag/agents/financial_modeling.py`)

- **`max_tool_rounds`:** 4 → 6 (to allow CAPM → WACC → DCF chains)
- **System prompt:** Updated to list all 10 tools with guidance on chaining:
  - "Use `compute_capm` first to derive Ke, then `compute_wacc` to derive discount rate, then `build_dcf_model` or `build_ddm_model`"
- **Tool registration:** 10 tools total

---

## Frontend Changes

### `ModelingLayout.jsx`
- Add `handleSelectPrompt(prompt)` callback → calls down to `ModelChatArea` via ref or lifted state
- Add `handleNewChat()` callback → resets messages in `ModelChatArea`
- Pass both to `<ModelSidebar>`

### `ModelChatArea.jsx`
- Fix `handleSendPrompt`: add `setInput('')` before sending
- Add new tool types to `FM_TOOL_TO_TYPE`:
  - `compute_wacc`, `compute_capm`, `compute_fcfe` → `'calculation'`
  - `build_ddm_model` → `'ddm'`
  - `build_residual_income_model` → `'residual_income'`
  - `build_multiples_model` → `'multiples'`

### `ModelResultCard.jsx`
- Add `MODEL_META` entries for: `ddm`, `residual_income`, `multiples`, `calculation`

### `ModelEmptyState.jsx` + `ModelSidebar.jsx`
- Add quick-start prompts for 2–3 new tools (DDM, WACC/CAPM, Multiples)

---

## Test Plan

Extend `tests/unit/test_financial_modeling_tools.py`:

| Test Class | Key assertions |
|-----------|----------------|
| `TestWACC` | Identity: WACC with 100% equity = Ke; WACC with 0% debt tax shield = weighted avg |
| `TestCAPM` | Zero beta → Ke = Rf; beta=1, ERP=5% → Ke = Rf+5% |
| `TestDDM` | Gordon at par when D₁/P₀ = ke−g; H-model reduces to Gordon when g_S=g_L |
| `TestResidualIncome` | RI=0 when ROE=ke (value = BVPS); positive RI creates premium to book |
| `TestMultiples` | Implied price correct for each multiple; range min/max correct |
| `TestFCFE` | FCFE = FCFF − Int(1−T) + NetBorrowing (algebraic identity); direct path matches |
| `TestBondConvexity` | Convexity positive for straight bond; DV01 = ModDur × Price / 10000 |
| `TestDCFSensitivity` | Sensitivity prices differ across WACC rows (regression of bug fix) |
| `TestBalloonLoan` | Balloon at correct month, not always at term_months |

---

## File Inventory

| File | Change |
|------|--------|
| `rag/tools/financial_modeling.py` | Fix 2 bugs, add 6 tools, bond convexity/DV01, update TOOL_DEFINITIONS + TOOL_DISPATCH |
| `rag/agents/financial_modeling.py` | Update system prompt, max_tool_rounds=6 |
| `frontend/.../ModelingLayout.jsx` | Wire sidebar callbacks |
| `frontend/.../ModelChatArea.jsx` | Fix input clearing, add new tool types to mapping |
| `frontend/.../ModelResultCard.jsx` | Add MODEL_META for new model types |
| `frontend/.../ModelEmptyState.jsx` | Add new quick-start prompts |
| `frontend/.../ModelSidebar.jsx` | Add new template entries |
| `tests/unit/test_financial_modeling_tools.py` | Add 9 new test classes |
| `tests/unit/test_financial_modeling_agent.py` | Update tool count assertions (4→10) |
