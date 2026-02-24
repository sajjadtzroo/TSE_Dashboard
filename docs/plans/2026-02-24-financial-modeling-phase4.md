# Financial Modeling Phase 4 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 CFA tools completing the financial modeling toolkit: `compute_beta` (Hamada), `build_scenario_model` (bear/base/bull), `compute_operating_leverage` (DOL), `compute_pvgo` (PVGO + justified P/E), `compute_eva` (EVA/MVA).

**Architecture:** All tools added to `rag/tools/financial_modeling.py` following the `fn(db: Session, **kwargs) -> str` (JSON) pattern. All are pure-compute (no Excel). Agent updated from 15 → 20 tools. Tests in `tests/unit/test_financial_modeling_tools.py`. Frontend cards in the financial-modeling components.

**Tech Stack:** Python 3.11, FastAPI, React 18, Mantine v7. Tests via Docker (`tse_dashboard-test`). No new dependencies.

---

## Test Command

```bash
docker run --rm \
  -v /Users/cjd/TSE_Dashboard:/app \
  -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest tests/unit/test_financial_modeling_tools.py \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" \
  --tb=short -q
```

---

## Task 1: Add `compute_beta` Tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Test: `tests/unit/test_financial_modeling_tools.py` — add `TestComputeBeta`

### Step 1: Write failing tests

Add `TestComputeBeta` before `class TestToolDefinitions:` in the test file:

```python
class TestComputeBeta:
    def test_unlever_then_relever_same_de_returns_original(self):
        """Unlever then re-lever at same D/E must recover original levered beta."""
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=1.2, debt_to_equity=0.5, tax_rate=0.25,
            target_debt_to_equity=0.5
        ))
        assert result["re_levered_beta"] == pytest.approx(1.2, rel=1e-4)

    def test_unlevered_beta_less_than_levered(self):
        """β_U < β_L when D/E > 0 and T > 0."""
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=1.5, debt_to_equity=0.8, tax_rate=0.25
        ))
        assert result["unlevered_beta"] < 1.5

    def test_bloomberg_adjusted_pulls_toward_one(self):
        """Adjusted beta = 2/3 × raw + 1/3. Beta > 1 should decrease; < 1 should increase."""
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        # High beta: adjusted should be lower than raw
        result_high = json.loads(compute_beta(
            db, levered_beta=1.8, debt_to_equity=0.5, tax_rate=0.25
        ))
        assert result_high["adjusted_beta"] < 1.8
        # Low beta: adjusted should be higher than raw
        result_low = json.loads(compute_beta(
            db, levered_beta=0.6, debt_to_equity=0.5, tax_rate=0.25
        ))
        assert result_low["adjusted_beta"] > 0.6

    def test_zero_debt_unlever_equals_levered(self):
        """Zero D/E: β_U = β_L (no financial risk to unlever)."""
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=1.1, debt_to_equity=0.0, tax_rate=0.25
        ))
        assert result["unlevered_beta"] == pytest.approx(1.1, rel=1e-4)

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=1.2, debt_to_equity=0.5, tax_rate=0.25
        ))
        assert result["model_type"] == "beta"

    def test_output_fields_present(self):
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=1.2, debt_to_equity=0.5, tax_rate=0.25
        ))
        assert "unlevered_beta" in result
        assert "re_levered_beta" in result
        assert "adjusted_beta" in result
```

### Step 2: Run to verify fail

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest "tests/unit/test_financial_modeling_tools.py::TestComputeBeta" \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" -v
```

Expected: `AttributeError` — not defined yet.

### Step 3: Implement `compute_beta`

Add before `# ── Tool Definitions ──` in `rag/tools/financial_modeling.py`:

```python
# ── Beta Estimation Tool ──────────────────────────────────────────────────────

def compute_beta(
    db: Session,
    levered_beta: float,
    debt_to_equity: float,
    tax_rate: float,
    target_debt_to_equity: Optional[float] = None,
) -> str:
    """
    Compute unlevered and re-levered beta using the Hamada equation.

    Formulas:
        β_U = β_L / [1 + (1−T) × (D/E)]                    # Hamada unlever
        β_L = β_U × [1 + (1−T) × (D/E)_target]             # Hamada re-lever
        β_adj = (2/3) × β_L + (1/3) × 1.0                  # Bloomberg adjusted

    Args:
        levered_beta: Observed equity beta from regression or market data.
        debt_to_equity: Current D/E ratio (e.g. 0.5 for 50%).
        tax_rate: Corporate tax rate decimal (e.g. 0.25).
        target_debt_to_equity: D/E for re-levering. Defaults to current D/E.

    Returns:
        JSON with unlevered_beta, re_levered_beta, adjusted_beta, and formulas.
    """
    if target_debt_to_equity is None:
        target_debt_to_equity = debt_to_equity

    hamada_factor = 1 + (1 - tax_rate) * debt_to_equity
    unlevered_beta = levered_beta / hamada_factor

    target_hamada_factor = 1 + (1 - tax_rate) * target_debt_to_equity
    re_levered_beta = unlevered_beta * target_hamada_factor

    adjusted_beta = (2 / 3) * levered_beta + (1 / 3) * 1.0

    return json.dumps({
        "model_type": "beta",
        "levered_beta": round(levered_beta, 4),
        "unlevered_beta": round(unlevered_beta, 6),
        "re_levered_beta": round(re_levered_beta, 6),
        "adjusted_beta": round(adjusted_beta, 6),
        "debt_to_equity": debt_to_equity,
        "target_debt_to_equity": target_debt_to_equity,
        "tax_rate": tax_rate,
        "hamada_formula": (
            f"β_U = {levered_beta} / [1 + (1−{tax_rate}) × {debt_to_equity}] = {round(unlevered_beta, 4)}"
        ),
        "bloomberg_formula": (
            f"β_adj = (2/3) × {levered_beta} + (1/3) = {round(adjusted_beta, 4)}"
        ),
    })
```

Add to `TOOL_DEFINITIONS +=` block:

```python
    {
        "type": "function",
        "function": {
            "name": "compute_beta",
            "description": (
                "Compute unlevered and re-levered beta using the Hamada equation. "
                "β_U = β_L / [1 + (1−T)×(D/E)]. "
                "Also computes Bloomberg adjusted beta: β_adj = 2/3×β_L + 1/3. "
                "Feed re_levered_beta into compute_capm."
            ),
            "parameters": {
                "type": "object",
                "required": ["levered_beta", "debt_to_equity", "tax_rate"],
                "properties": {
                    "levered_beta": {"type": "number", "description": "Observed equity beta"},
                    "debt_to_equity": {"type": "number", "description": "Current D/E ratio (e.g. 0.5)"},
                    "tax_rate": {"type": "number", "description": "Corporate tax rate decimal"},
                    "target_debt_to_equity": {"type": "number", "description": "D/E for re-levering. Defaults to current D/E."},
                },
            },
        },
    },
```

Add to `TOOL_DISPATCH`: `"compute_beta": compute_beta,`

### Step 4: Run tests — expect 6 PASS

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add compute_beta (Hamada equation, Bloomberg adjusted)"
```

---

## Task 2: Add `build_scenario_model` Tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Test: `tests/unit/test_financial_modeling_tools.py` — add `TestScenarioModel`

### Step 1: Write failing tests

```python
class TestScenarioModel:
    def _base(self):
        return {"price_per_share": 100.0, "enterprise_value": 5000.0}

    def test_bear_less_than_base_less_than_bull(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results=self._base(), bear_pct=-0.30, bull_pct=0.25
        ))
        for key in self._base():
            assert result["scenarios"]["bear"][key] < result["scenarios"]["base"][key]
            assert result["scenarios"]["base"][key] < result["scenarios"]["bull"][key]

    def test_bear_value_matches_pct(self):
        """Bear value = base × (1 + bear_pct)."""
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0}, bear_pct=-0.30, bull_pct=0.25
        ))
        assert result["scenarios"]["bear"]["price"] == pytest.approx(70.0, rel=1e-4)

    def test_bull_value_matches_pct(self):
        """Bull value = base × (1 + bull_pct)."""
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0}, bear_pct=-0.30, bull_pct=0.25
        ))
        assert result["scenarios"]["bull"]["price"] == pytest.approx(125.0, rel=1e-4)

    def test_per_metric_overrides_respected(self):
        """bear_overrides for a specific key overrides the global bear_pct."""
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0, "ev": 5000.0},
            bear_pct=-0.30, bull_pct=0.25,
            bear_overrides={"price": -0.50}
        ))
        # price uses override -50%, ev uses global -30%
        assert result["scenarios"]["bear"]["price"] == pytest.approx(50.0, rel=1e-4)
        assert result["scenarios"]["bear"]["ev"] == pytest.approx(3500.0, rel=1e-4)

    def test_downside_pct_correct(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0}, bear_pct=-0.30, bull_pct=0.25
        ))
        assert result["summary"]["downside_pct"]["price"] == pytest.approx(-30.0, rel=1e-4)

    def test_upside_pct_correct(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0}, bear_pct=-0.30, bull_pct=0.25
        ))
        assert result["summary"]["upside_pct"]["price"] == pytest.approx(25.0, rel=1e-4)

    def test_empty_base_results_error(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(db, base_results={}, bear_pct=-0.30, bull_pct=0.25))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0}, bear_pct=-0.30, bull_pct=0.25
        ))
        assert result["model_type"] == "scenario_model"
```

### Step 2: Run to verify fail

### Step 3: Implement `build_scenario_model`

```python
# ── Scenario Analysis Tool ────────────────────────────────────────────────────

def build_scenario_model(
    db: Session,
    base_results: dict,
    bear_pct: float,
    bull_pct: float,
    bear_overrides: Optional[dict] = None,
    bull_overrides: Optional[dict] = None,
    scenario_labels: Optional[dict] = None,
) -> str:
    """
    Apply bear/base/bull scenarios to an already-computed result dict.

    For each metric in base_results:
        bear_value = base × (1 + bear_overrides.get(key, bear_pct))
        bull_value = base × (1 + bull_overrides.get(key, bull_pct))

    Args:
        base_results: Dict of {metric: value} from any upstream model output.
        bear_pct: Global bear adjustment decimal (e.g. -0.30 for -30%).
        bull_pct: Global bull adjustment decimal (e.g. +0.25 for +25%).
        bear_overrides: Per-metric bear overrides dict (takes precedence over bear_pct).
        bull_overrides: Per-metric bull overrides dict (takes precedence over bull_pct).
        scenario_labels: Optional {bear, base, bull} label strings.

    Returns:
        JSON with scenarios (bear/base/bull per metric) and summary (upside/downside %).
    """
    if not base_results:
        return json.dumps({"error": "base_results must not be empty"})

    bear_ov = bear_overrides or {}
    bull_ov = bull_overrides or {}
    labels = scenario_labels or {"bear": "Bear", "base": "Base", "bull": "Bull"}

    bear_scenario = {}
    bull_scenario = {}
    downside_pct = {}
    upside_pct = {}

    for key, base_val in base_results.items():
        if not isinstance(base_val, (int, float)):
            continue
        b_pct = bear_ov.get(key, bear_pct)
        u_pct = bull_ov.get(key, bull_pct)
        bear_val = base_val * (1 + b_pct)
        bull_val = base_val * (1 + u_pct)
        bear_scenario[key] = round(bear_val, 4)
        bull_scenario[key] = round(bull_val, 4)
        downside_pct[key] = round((bear_val / base_val - 1) * 100, 2) if base_val else 0
        upside_pct[key] = round((bull_val / base_val - 1) * 100, 2) if base_val else 0

    return json.dumps({
        "model_type": "scenario_model",
        "scenarios": {
            labels["bear"]: bear_scenario,
            labels["base"]: {k: round(v, 4) for k, v in base_results.items() if isinstance(v, (int, float))},
            labels["bull"]: bull_scenario,
        },
        "summary": {
            "downside_pct": downside_pct,
            "upside_pct": upside_pct,
            "bear_pct_global": round(bear_pct * 100, 2),
            "bull_pct_global": round(bull_pct * 100, 2),
        },
    })
```

Add to `TOOL_DEFINITIONS +=`:

```python
    {
        "type": "function",
        "function": {
            "name": "build_scenario_model",
            "description": (
                "Apply bear/base/bull scenarios to any model output dict. "
                "bear_value = base × (1 + bear_pct). bull_value = base × (1 + bull_pct). "
                "Per-metric overrides supported. Works with any upstream model output."
            ),
            "parameters": {
                "type": "object",
                "required": ["base_results", "bear_pct", "bull_pct"],
                "properties": {
                    "base_results": {"type": "object", "description": "Base-case model outputs e.g. {price_per_share: 100, enterprise_value: 5000}"},
                    "bear_pct": {"type": "number", "description": "Global bear discount decimal (e.g. -0.30 for -30%)"},
                    "bull_pct": {"type": "number", "description": "Global bull premium decimal (e.g. 0.25 for +25%)"},
                    "bear_overrides": {"type": "object", "description": "Per-metric bear overrides (override global bear_pct for specific keys)"},
                    "bull_overrides": {"type": "object", "description": "Per-metric bull overrides"},
                    "scenario_labels": {"type": "object", "description": "Optional labels: {bear, base, bull}. Defaults to Bear/Base/Bull."},
                },
            },
        },
    },
```

Add to `TOOL_DISPATCH`: `"build_scenario_model": build_scenario_model,`

### Step 4: Run tests — expect 8 PASS

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add build_scenario_model (bear/base/bull scenario analysis)"
```

---

## Task 3: Add `compute_operating_leverage` Tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Test: `tests/unit/test_financial_modeling_tools.py` — add `TestOperatingLeverage`

### Step 1: Write failing tests

```python
class TestOperatingLeverage:
    def test_contribution_margin_formula(self):
        """CM = Revenue - Variable Costs."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        assert result["contribution_margin"] == pytest.approx(400.0, rel=1e-4)

    def test_cm_ratio(self):
        """CM ratio = CM / Revenue."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        assert result["cm_ratio"] == pytest.approx(0.40, rel=1e-4)

    def test_ebit(self):
        """EBIT = CM - Fixed Costs."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        assert result["ebit"] == pytest.approx(200.0, rel=1e-4)

    def test_dol_formula(self):
        """DOL = CM / EBIT."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        # CM=400, EBIT=200 → DOL=2.0
        assert result["dol"] == pytest.approx(2.0, rel=1e-4)

    def test_breakeven_revenue(self):
        """Breakeven Revenue = Fixed Costs / CM Ratio."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        # Breakeven = 200 / 0.40 = 500
        assert result["breakeven_revenue"] == pytest.approx(500.0, rel=1e-4)

    def test_breakeven_units_when_provided(self):
        """Breakeven Units = FC / (Price - VC_per_unit)."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0,
            units_sold=500.0
        ))
        # Price per unit = 1000/500 = 2; VC per unit = 600/500 = 1.2; CM/unit = 0.8
        # Breakeven units = 200 / 0.8 = 250
        assert result["breakeven_units"] == pytest.approx(250.0, rel=1e-4)

    def test_zero_cm_error(self):
        """Revenue = Variable Costs → CM = 0 → error (division by zero)."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=1000.0, fixed_costs=200.0
        ))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        assert result["model_type"] == "operating_leverage"
```

### Step 2: Run to verify fail

### Step 3: Implement `compute_operating_leverage`

```python
# ── Operating Leverage Tool ───────────────────────────────────────────────────

def compute_operating_leverage(
    db: Session,
    revenue: float,
    variable_costs: float,
    fixed_costs: float,
    units_sold: Optional[float] = None,
) -> str:
    """
    Compute operating leverage metrics: DOL, contribution margin, and breakeven.

    Formulas:
        CM            = Revenue − Variable Costs
        CM Ratio      = CM / Revenue
        EBIT          = CM − Fixed Costs
        DOL           = CM / EBIT   (% change in EBIT per % change in Revenue)
        Breakeven Rev = Fixed Costs / CM Ratio
        Breakeven Units = Fixed Costs / (Price/unit − VC/unit)   [if units_sold given]

    Args:
        revenue: Total revenue (billion IRR or any consistent unit).
        variable_costs: Total variable costs (same unit).
        fixed_costs: Total fixed operating costs (same unit).
        units_sold: Units sold; enables per-unit breakeven calculation. Optional.

    Returns:
        JSON with contribution_margin, cm_ratio, ebit, dol, breakeven_revenue,
        breakeven_units (if units_sold provided).
    """
    cm = revenue - variable_costs
    if revenue == 0:
        return json.dumps({"error": "revenue must be positive"})
    cm_ratio = cm / revenue
    if cm_ratio == 0:
        return json.dumps({"error": "Contribution margin is zero — cannot compute DOL or breakeven"})

    ebit = cm - fixed_costs
    if ebit == 0:
        dol = None  # At breakeven DOL is undefined (infinite)
    else:
        dol = cm / ebit

    breakeven_revenue = fixed_costs / cm_ratio

    breakeven_units = None
    if units_sold and units_sold > 0:
        price_per_unit = revenue / units_sold
        vc_per_unit = variable_costs / units_sold
        cm_per_unit = price_per_unit - vc_per_unit
        if cm_per_unit > 0:
            breakeven_units = round(fixed_costs / cm_per_unit, 4)

    result = {
        "model_type": "operating_leverage",
        "revenue": revenue,
        "variable_costs": variable_costs,
        "fixed_costs": fixed_costs,
        "contribution_margin": round(cm, 4),
        "cm_ratio": round(cm_ratio, 6),
        "ebit": round(ebit, 4),
        "dol": round(dol, 4) if dol is not None else None,
        "breakeven_revenue": round(breakeven_revenue, 4),
        "breakeven_units": breakeven_units,
    }
    return json.dumps(result)
```

Add to `TOOL_DEFINITIONS +=`:

```python
    {
        "type": "function",
        "function": {
            "name": "compute_operating_leverage",
            "description": (
                "Compute Degree of Operating Leverage (DOL), contribution margin, and breakeven. "
                "DOL = CM / EBIT. Breakeven Revenue = Fixed Costs / CM Ratio. "
                "Higher DOL = amplified EBIT sensitivity to revenue changes."
            ),
            "parameters": {
                "type": "object",
                "required": ["revenue", "variable_costs", "fixed_costs"],
                "properties": {
                    "revenue": {"type": "number", "description": "Total revenue (billion IRR)"},
                    "variable_costs": {"type": "number", "description": "Total variable costs (same unit)"},
                    "fixed_costs": {"type": "number", "description": "Total fixed operating costs"},
                    "units_sold": {"type": "number", "description": "Units sold for per-unit breakeven. Optional."},
                },
            },
        },
    },
```

Add to `TOOL_DISPATCH`: `"compute_operating_leverage": compute_operating_leverage,`

### Step 4: Run tests — expect 8 PASS

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add compute_operating_leverage (DOL, CM, breakeven)"
```

---

## Task 4: Add `compute_pvgo` Tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Test: `tests/unit/test_financial_modeling_tools.py` — add `TestPVGO`

### Step 1: Write failing tests

```python
class TestPVGO:
    def test_pvgo_plus_no_growth_equals_intrinsic(self):
        """PVGO + E₁/ke = intrinsic_value."""
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.10, growth_rate=0.05, payout_ratio=0.50
        ))
        assert result["pvgo"] + result["no_growth_value"] == pytest.approx(1000.0, rel=1e-4)

    def test_no_growth_value_formula(self):
        """No-growth value = E₁ / ke."""
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.10, growth_rate=0.05, payout_ratio=0.50
        ))
        # E₁/ke = 80/0.10 = 800
        assert result["no_growth_value"] == pytest.approx(800.0, rel=1e-4)

    def test_justified_pe_leading_formula(self):
        """Justified leading P/E = (1-b)/(ke-g)."""
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.10, growth_rate=0.05, payout_ratio=0.50
        ))
        # (1-0.50)/(0.10-0.05) = 0.50/0.05 = 10
        assert result["justified_pe_leading"] == pytest.approx(10.0, rel=1e-4)

    def test_justified_pe_trailing_formula(self):
        """Justified trailing P/E = (1-b)(1+g)/(ke-g)."""
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.10, growth_rate=0.05, payout_ratio=0.50
        ))
        # 0.50 * 1.05 / 0.05 = 10.5
        assert result["justified_pe_trailing"] == pytest.approx(10.5, rel=1e-4)

    def test_ke_lte_g_error(self):
        """ke <= g must return error."""
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.05, growth_rate=0.05, payout_ratio=0.50
        ))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.10, growth_rate=0.05, payout_ratio=0.50
        ))
        assert result["model_type"] == "pvgo"
```

### Step 2: Run to verify fail

### Step 3: Implement `compute_pvgo`

```python
# ── PVGO Tool ─────────────────────────────────────────────────────────────────

def compute_pvgo(
    db: Session,
    intrinsic_value: float,
    earnings_per_share: float,
    cost_of_equity: float,
    growth_rate: float,
    payout_ratio: float,
) -> str:
    """
    Compute Present Value of Growth Opportunities (PVGO) and justified P/E ratios.

    Formulas:
        No-Growth Value  = E₁ / ke
        PVGO             = Intrinsic Value − No-Growth Value
        PVGO %           = PVGO / Intrinsic Value × 100
        Justified P/E (leading)  = (1 − b) / (ke − g)
        Justified P/E (trailing) = (1 − b) × (1 + g) / (ke − g)

    Args:
        intrinsic_value: Per-share intrinsic value (from DDM or DCF equity value / shares).
        earnings_per_share: Forward EPS (E₁).
        cost_of_equity: Required return decimal (ke).
        growth_rate: Long-term sustainable growth rate decimal (g).
        payout_ratio: Dividend payout ratio decimal (b = dividends / EPS).

    Returns:
        JSON with pvgo, no_growth_value, pvgo_pct_of_value, justified_pe_leading,
        justified_pe_trailing.
    """
    if cost_of_equity <= growth_rate:
        return json.dumps({"error": "cost_of_equity must be greater than growth_rate (ke > g)"})
    if cost_of_equity <= 0:
        return json.dumps({"error": "cost_of_equity must be positive"})

    no_growth_value = earnings_per_share / cost_of_equity
    pvgo = intrinsic_value - no_growth_value
    pvgo_pct = (pvgo / intrinsic_value * 100) if intrinsic_value else 0

    justified_pe_leading = (1 - payout_ratio) / (cost_of_equity - growth_rate) if (cost_of_equity - growth_rate) > 0 else None

    # Note: justified P/E leading uses dividend payout, so (1-b)/(ke-g).
    # Trailing P/E = leading × (1+g)
    justified_pe_trailing = justified_pe_leading * (1 + growth_rate) if justified_pe_leading else None

    return json.dumps({
        "model_type": "pvgo",
        "intrinsic_value": round(intrinsic_value, 4),
        "no_growth_value": round(no_growth_value, 4),
        "pvgo": round(pvgo, 4),
        "pvgo_pct_of_value": round(pvgo_pct, 2),
        "earnings_per_share": earnings_per_share,
        "cost_of_equity_pct": round(cost_of_equity * 100, 2),
        "growth_rate_pct": round(growth_rate * 100, 2),
        "payout_ratio": payout_ratio,
        "justified_pe_leading": round(justified_pe_leading, 4) if justified_pe_leading else None,
        "justified_pe_trailing": round(justified_pe_trailing, 4) if justified_pe_trailing else None,
    })
```

Add to `TOOL_DEFINITIONS +=`:

```python
    {
        "type": "function",
        "function": {
            "name": "compute_pvgo",
            "description": (
                "Compute PVGO (Present Value of Growth Opportunities) and justified P/E ratios. "
                "PVGO = Intrinsic Value − E₁/ke. "
                "Justified Leading P/E = (1−b)/(ke−g). CFA Level 2 equity valuation."
            ),
            "parameters": {
                "type": "object",
                "required": ["intrinsic_value", "earnings_per_share", "cost_of_equity", "growth_rate", "payout_ratio"],
                "properties": {
                    "intrinsic_value": {"type": "number", "description": "Per-share intrinsic value (from DDM or DCF)"},
                    "earnings_per_share": {"type": "number", "description": "Forward EPS (E₁)"},
                    "cost_of_equity": {"type": "number", "description": "Required return decimal (ke)"},
                    "growth_rate": {"type": "number", "description": "Long-term sustainable growth rate decimal (g)"},
                    "payout_ratio": {"type": "number", "description": "Dividend payout ratio decimal (b = D/EPS)"},
                },
            },
        },
    },
```

Add to `TOOL_DISPATCH`: `"compute_pvgo": compute_pvgo,`

### Step 4: Run tests — expect 6 PASS

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add compute_pvgo (PVGO, justified P/E leading and trailing)"
```

---

## Task 5: Add `compute_eva` Tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Test: `tests/unit/test_financial_modeling_tools.py` — add `TestEVA`

### Step 1: Write failing tests

```python
class TestEVA:
    def test_nopat_formula(self):
        """NOPAT = EBIT × (1 - tax_rate)."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        assert result["nopat"] == pytest.approx(150.0, rel=1e-4)

    def test_roic_formula(self):
        """ROIC = NOPAT / Invested Capital."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        # NOPAT=150, IC=1000 → ROIC=0.15
        assert result["roic"] == pytest.approx(0.15, rel=1e-4)

    def test_eva_formula(self):
        """EVA = NOPAT - WACC × Invested Capital."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        # EVA = 150 - 0.12×1000 = 150 - 120 = 30
        assert result["eva"] == pytest.approx(30.0, rel=1e-4)

    def test_negative_eva_when_roic_lt_wacc(self):
        """EVA < 0 when ROIC < WACC (value destruction)."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=100.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        # NOPAT=75, capital charge=120 → EVA=-45
        assert result["eva"] < 0

    def test_eva_spread_formula(self):
        """EVA spread = ROIC - WACC."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        # ROIC=0.15, WACC=0.12 → spread=0.03
        assert result["eva_spread"] == pytest.approx(0.03, rel=1e-4)

    def test_mva_when_market_value_provided(self):
        """MVA = Market Value - Book Value of IC."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0,
            market_value_of_firm=1500.0
        ))
        assert result["mva"] == pytest.approx(500.0, rel=1e-4)

    def test_mva_none_when_not_provided(self):
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        assert result["mva"] is None

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        assert result["model_type"] == "eva"
```

### Step 2: Run to verify fail

### Step 3: Implement `compute_eva`

```python
# ── EVA Tool ──────────────────────────────────────────────────────────────────

def compute_eva(
    db: Session,
    ebit: float,
    tax_rate: float,
    wacc: float,
    invested_capital: float,
    market_value_of_firm: Optional[float] = None,
) -> str:
    """
    Compute Economic Value Added (EVA) and Market Value Added (MVA).

    Formulas:
        NOPAT      = EBIT × (1 − T)
        ROIC       = NOPAT / Invested Capital
        EVA        = NOPAT − WACC × Invested Capital = (ROIC − WACC) × IC
        EVA Spread = ROIC − WACC
        MVA        = Market Value of Firm − Book Value of Invested Capital

    Args:
        ebit: Earnings Before Interest and Taxes (billion IRR).
        tax_rate: Corporate tax rate decimal (e.g. 0.25).
        wacc: Weighted Average Cost of Capital decimal.
        invested_capital: Total invested capital = Total Debt + Equity (book value).
        market_value_of_firm: Market cap + market value of debt. Optional; enables MVA.

    Returns:
        JSON with nopat, roic, eva, eva_spread, mva (null if market_value not provided).
    """
    if invested_capital <= 0:
        return json.dumps({"error": "invested_capital must be positive"})

    nopat = ebit * (1 - tax_rate)
    roic = nopat / invested_capital
    capital_charge = wacc * invested_capital
    eva = nopat - capital_charge
    eva_spread = roic - wacc

    mva = (market_value_of_firm - invested_capital) if market_value_of_firm is not None else None

    return json.dumps({
        "model_type": "eva",
        "ebit": ebit,
        "tax_rate": tax_rate,
        "nopat": round(nopat, 4),
        "invested_capital": invested_capital,
        "wacc_pct": round(wacc * 100, 2),
        "capital_charge": round(capital_charge, 4),
        "roic": round(roic, 6),
        "roic_pct": round(roic * 100, 4),
        "eva": round(eva, 4),
        "eva_spread": round(eva_spread, 6),
        "eva_spread_pct": round(eva_spread * 100, 4),
        "mva": round(mva, 4) if mva is not None else None,
        "value_creation": "positive" if eva > 0 else "negative" if eva < 0 else "neutral",
    })
```

Add to `TOOL_DEFINITIONS +=`:

```python
    {
        "type": "function",
        "function": {
            "name": "compute_eva",
            "description": (
                "Compute EVA (Economic Value Added) and MVA. "
                "EVA = NOPAT − WACC × Invested Capital = (ROIC − WACC) × IC. "
                "Positive EVA = value creation; negative = value destruction. "
                "CFA Level 2 residual income extension."
            ),
            "parameters": {
                "type": "object",
                "required": ["ebit", "tax_rate", "wacc", "invested_capital"],
                "properties": {
                    "ebit": {"type": "number", "description": "EBIT (billion IRR)"},
                    "tax_rate": {"type": "number", "description": "Corporate tax rate decimal"},
                    "wacc": {"type": "number", "description": "WACC decimal (from compute_wacc)"},
                    "invested_capital": {"type": "number", "description": "Total invested capital = Total Debt + Equity (book value)"},
                    "market_value_of_firm": {"type": "number", "description": "Market cap + market debt value. Optional — enables MVA = Market Value − Book IC."},
                },
            },
        },
    },
```

Add to `TOOL_DISPATCH`: `"compute_eva": compute_eva,`

### Step 4: Run tests — expect 8 PASS

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add compute_eva (EVA, ROIC, EVA spread, MVA)"
```

---

## Task 6: Update Tool Count Assertions + Agent Config (15 → 20)

**Files:**
- Modify: `tests/unit/test_financial_modeling_tools.py` — update `TestToolDefinitions`
- Modify: `tests/unit/test_financial_modeling_agent.py` — update assertions
- Modify: `rag/agents/financial_modeling.py` — update system prompt

### Step 1: Update `TestToolDefinitions`

```python
class TestToolDefinitions:
    def test_tool_definitions_count(self):
        from rag.tools.financial_modeling import TOOL_DEFINITIONS
        assert len(TOOL_DEFINITIONS) == 20   # was 15

    def test_tool_dispatch_count(self):
        from rag.tools.financial_modeling import TOOL_DISPATCH
        assert len(TOOL_DISPATCH) == 20   # was 15
```

### Step 2: Update `TestFinancialModelingAgent`

```python
    def test_twenty_tools(self):   # was test_fifteen_tools
        from rag.agents.financial_modeling import build_config
        config = build_config()
        assert len(config.tool_definitions) == 20

    def test_tool_names(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        names = {d["function"]["name"] for d in config.tool_definitions}
        assert names == {
            "build_dcf_model", "build_pl_model", "build_loan_amortization", "build_bond_model",
            "compute_wacc", "compute_capm", "build_ddm_model",
            "build_residual_income_model", "build_multiples_model", "compute_fcfe",
            "build_revenue_model", "build_wc_model", "build_capex_schedule", "build_debt_schedule",
            "build_three_statement_model",
            "compute_beta", "build_scenario_model", "compute_operating_leverage",
            "compute_pvgo", "compute_eva",
        }
```

Also update `TestToolsRegistry._ALL_FM_TOOLS` to add the 5 new tools.

### Step 3: Update `rag/agents/financial_modeling.py`

Add to SYSTEM_PROMPT under a new section **Risk & Advanced Valuation (tools 16–20):**

```
**Risk & Advanced Valuation:**
16. `compute_beta`              — Hamada unlever/re-lever beta; Bloomberg adjusted beta
17. `build_scenario_model`      — Bear/base/bull scenarios on any model output
18. `compute_operating_leverage` — DOL, contribution margin, operating breakeven
19. `compute_pvgo`              — PVGO, justified leading P/E, justified trailing P/E
20. `compute_eva`               — EVA = (ROIC−WACC)×IC; MVA optional
```

Update header: "20 tools" (was "15 tools"). `max_tool_rounds` stays 8.

### Step 4: Run all financial modeling tests

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest tests/unit/test_financial_modeling_tools.py tests/unit/test_financial_modeling_agent.py \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" -v
```

Expected: All PASS (~160 tests).

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py rag/agents/financial_modeling.py \
  tests/unit/test_financial_modeling_tools.py tests/unit/test_financial_modeling_agent.py
git commit -m "feat(financial-modeling): update agent to 20 tools, add Phase 4 to system prompt"
```

---

## Task 7: Frontend + Final Verification + Push

**Files:**
- Modify: `frontend/src/features/financial-modeling/components/ModelChatArea.jsx`
- Modify: `frontend/src/features/financial-modeling/components/ModelResultCard.jsx`
- Modify: `frontend/src/features/financial-modeling/components/ModelEmptyState.jsx`
- Modify: `frontend/src/features/financial-modeling/components/ModelSidebar.jsx`

### Step 1: `ModelChatArea.jsx` — add to `FM_TOOL_TO_TYPE`

```js
compute_beta: 'beta',
build_scenario_model: 'scenario_model',
compute_operating_leverage: 'operating_leverage',
compute_pvgo: 'pvgo',
compute_eva: 'eva',
```

### Step 2: `ModelResultCard.jsx` — add to `MODEL_META`

```js
beta: { label: 'بتا (هامادا)', color: 'gray', metrics: ['unlevered_beta', 're_levered_beta', 'adjusted_beta'] },
scenario_model: { label: 'تحلیل سناریو', color: 'yellow', metrics: [] },
operating_leverage: { label: 'اهرم عملیاتی', color: 'orange', metrics: ['dol', 'breakeven_revenue', 'cm_ratio'] },
pvgo: { label: 'PVGO', color: 'cyan', metrics: ['pvgo', 'pvgo_pct_of_value', 'justified_pe_leading'] },
eva: { label: 'EVA', color: 'green', metrics: ['eva', 'roic_pct', 'eva_spread_pct'] },
```

Also add to `METRIC_LABELS`:
```js
unlevered_beta: 'بتای غیراهرمی',
re_levered_beta: 'بتای اهرم‌شده',
adjusted_beta: 'بتای تعدیل‌شده',
dol: 'اهرم عملیاتی (DOL)',
breakeven_revenue: 'درآمد سربه‌سر',
cm_ratio: 'نسبت حاشیه مشارکت',
pvgo_pct_of_value: 'PVGO (٪ ارزش)',
justified_pe_leading: 'P/E توجیه‌پذیر پیشرو',
roic_pct: 'ROIC (%)',
eva_spread_pct: 'اسپرد EVA (%)',
```

### Step 3: `ModelEmptyState.jsx` — add quick-start

```js
  {
    label: 'Beta + WACC + DCF',
    prompt: 'برای شرکتی با بتای مشاهده‌شده ۱.۵ و D/E=۰.۸، ابتدا بتا را با معادله هامادا غیراهرم کن، سپس WACC با نرخ بدون ریسک ۲۰٪ محاسبه کن',
    icon: IconChartBar,
    color: '#64748B',
    bg: 'rgba(100, 116, 139, 0.08)',
    border: 'rgba(100, 116, 139, 0.2)',
  },
```

### Step 4: `ModelSidebar.jsx` — add template

```js
  {
    label: 'Beta + WACC + DCF',
    icon: IconChartBar,
    color: '#64748B',
    prompt: 'برای شرکتی با بتای مشاهده‌شده ۱.۵ و D/E=۰.۸، ابتدا بتا را با معادله هامادا غیراهرم کن، سپس WACC با نرخ بدون ریسک ۲۰٪ محاسبه کن',
  },
```

### Step 5: Verify frontend builds

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | tail -5
```

Expected: `✓ built` exit 0.

### Step 6: Run full unit suite (regression)

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest tests/unit/ \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" \
  --tb=short -q
```

Expected: Pass (pre-existing failures only: `test_websocket.py::TestWebSocketAuth` ×2).

### Step 7: Commit and push

```bash
git add frontend/src/features/financial-modeling/components/
git commit -m "feat(financial-modeling): add Phase 4 frontend cards (beta, scenario, DOL, PVGO, EVA)"
git push origin develop
```

---

## Summary

| Task | Tool | Tests |
|------|------|-------|
| 1 | `compute_beta` (Hamada, Bloomberg adj) | 6 |
| 2 | `build_scenario_model` (bear/base/bull) | 8 |
| 3 | `compute_operating_leverage` (DOL, breakeven) | 8 |
| 4 | `compute_pvgo` (PVGO, justified P/E) | 6 |
| 5 | `compute_eva` (EVA, ROIC, MVA) | 8 |
| 6 | Agent: 20 tools, count assertions | — |
| 7 | Frontend + full regression + push | — |

If you need specific details from before exiting plan mode (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/cjd/.claude/projects/-Users-cjd-TSE-Dashboard/0be04709-75a1-444f-a95d-f072c896a7ed.jsonl
