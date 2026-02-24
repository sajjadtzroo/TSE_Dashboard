# Financial Modeling Phase 4 — Design Document

**Date:** 2026-02-24
**Status:** Approved

---

## Objective

Add 5 remaining CFA tools to complete the financial modeling toolkit:
1. `compute_beta` — Hamada equation for levering/unlevering beta
2. `build_scenario_model` — Bear/base/bull scenario analysis
3. `compute_operating_leverage` — DOL, contribution margin, breakeven
4. `compute_pvgo` — PVGO and justified P/E ratios
5. `compute_eva` — EVA, ROIC, MVA

**Source:** `docs/financial_modeling_guide.md` sections 9, 17, 2, 14, 15.

---

## Tools

### 1. `compute_beta`
**Guide §9 — Beta Estimation**

```
β_U = β_L / [1 + (1−T) × (D/E)]              # Hamada unlever
β_L_target = β_U × [1 + (1−T) × (D/E)_target] # Hamada re-lever
β_adj = (2/3) × β_raw + (1/3) × 1.0           # Bloomberg adjusted
```

Parameters: `levered_beta`, `debt_to_equity`, `tax_rate`, `target_debt_to_equity` (optional, defaults to `debt_to_equity`).
Returns: `unlevered_beta`, `re_levered_beta`, `adjusted_beta`, `formula`.
Use case: agent calls `compute_beta` → feeds `re_levered_beta` into `compute_capm` → feeds into `compute_wacc` → DCF.

---

### 2. `build_scenario_model`
**Guide §17 — Scenario Analysis**

Applies bear/base/bull adjustments to an already-computed base result dict.

```
bear_value[key] = base[key] × (1 + bear_pct)    unless overridden
bull_value[key] = base[key] × (1 + bull_pct)    unless overridden
downside_pct    = (bear_value - base_value) / base_value × 100
upside_pct      = (bull_value - base_value) / base_value × 100
```

Parameters:
- `base_results`: dict of `{metric: value}` — e.g. `{"price_per_share": 100, "enterprise_value": 5000}`
- `bear_pct`: global bear discount decimal (e.g. -0.30)
- `bull_pct`: global bull premium decimal (e.g. +0.25)
- `bear_overrides`: optional per-metric overrides for bear (dict)
- `bull_overrides`: optional per-metric overrides for bull (dict)
- `scenario_labels`: optional `{bear: "...", base: "...", bull: "..."}` — defaults to "Bear"/"Base"/"Bull"

Returns: per-metric scenario table + `upside_pct`, `downside_pct`, `range`.

---

### 3. `compute_operating_leverage`
**Guide §2 — Cost Structure & Operating Leverage**

```
CM            = Revenue − Variable Costs
CM_ratio      = CM / Revenue
EBIT          = CM − Fixed Costs
DOL           = CM / EBIT          (% change in EBIT / % change in Revenue)
Breakeven Rev = Fixed Costs / CM_ratio
Breakeven Units = Fixed Costs / (Price_per_unit − VC_per_unit)   [if units provided]
```

Parameters: `revenue`, `variable_costs`, `fixed_costs`. Optional: `units_sold`, `price_per_unit`.
Returns: `contribution_margin`, `cm_ratio`, `ebit`, `dol`, `breakeven_revenue`, `breakeven_units`.

---

### 4. `compute_pvgo`
**Guide §14 — PVGO and Justified P/E**

```
No-Growth Value  = E₁ / ke
PVGO             = Intrinsic Value − No-Growth Value
PVGO %           = PVGO / Intrinsic Value × 100
Justified P/E (leading)  = (1 − b) / (ke − g)
Justified P/E (trailing) = (1 − b)(1 + g) / (ke − g)
```

Parameters: `intrinsic_value` (per-share value from DDM/DCF), `earnings_per_share` (E₁), `cost_of_equity`, `growth_rate`, `payout_ratio` (b).
Returns: `pvgo`, `pvgo_pct_of_value`, `no_growth_value`, `justified_pe_leading`, `justified_pe_trailing`.

---

### 5. `compute_eva`
**Guide §15 — EVA and MVA**

```
NOPAT         = EBIT × (1 − T)
ROIC          = NOPAT / Invested Capital
EVA           = NOPAT − WACC × Invested Capital
              = (ROIC − WACC) × Invested Capital
EVA Spread    = ROIC − WACC
MVA           = Market Value of Firm − Book Value of Invested Capital   [optional]
```

Parameters: `ebit`, `tax_rate`, `wacc`, `invested_capital`. Optional: `market_value_of_firm`.
Returns: `nopat`, `roic`, `roic_pct`, `eva`, `eva_spread`, `mva` (if applicable).

---

## Agent Update

- **Tool count:** 15 → **20**
- **`max_tool_rounds`:** stays at 8
- **System prompt:** add new section listing tools 16–20 with chain guidance

---

## Tests

| Class | Key Assertions |
|-------|----------------|
| `TestComputeBeta` | Unlever then re-lever at same D/E = original β; β_U < β_L (positive D/E, T>0); Bloomberg adj pulls toward 1.0 |
| `TestScenarioModel` | Bear < base < bull; downside_pct matches bear_pct; per-metric overrides respected; empty base_results error |
| `TestOperatingLeverage` | CM = Rev - VarCosts; DOL = CM/EBIT; breakeven_rev = FC/CM_ratio; zero CM error |
| `TestPVGO` | PVGO + no_growth_value = intrinsic_value; ke <= g returns error; justified P/E leading formula |
| `TestEVA` | EVA = NOPAT - WACC×IC; ROIC = NOPAT/IC; EVA negative when ROIC < WACC; MVA present when market_value provided |

---

## File Inventory

| File | Change |
|------|--------|
| `rag/tools/financial_modeling.py` | Add 5 tools, TOOL_DEFINITIONS (+=5), TOOL_DISPATCH (+=5) |
| `rag/agents/financial_modeling.py` | Update system prompt (15→20 tools) |
| `frontend/.../ModelChatArea.jsx` | Add 5 entries to FM_TOOL_TO_TYPE |
| `frontend/.../ModelResultCard.jsx` | Add MODEL_META for 5 new types |
| `frontend/.../ModelEmptyState.jsx` | Add quick-start for compute_beta |
| `frontend/.../ModelSidebar.jsx` | Add template for compute_beta |
| `tests/unit/test_financial_modeling_tools.py` | Add 5 test classes, update count 15→20 |
| `tests/unit/test_financial_modeling_agent.py` | Update tool count 15→20, name set |
