# Financial Modeling Phase 2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 4 operational modeling tools (`build_revenue_model`, `build_wc_model`, `build_capex_schedule`, `build_debt_schedule`) that feed into the existing DCF pipeline, update the agent to 14 tools with `max_tool_rounds=8`, and wire new model types in the frontend.

**Architecture:** All tools live in `rag/tools/financial_modeling.py` following the existing `fn(db: Session, **kwargs) -> str` (JSON) pattern. No Excel dependency — these are pure-compute tools. The agent chains them: revenue → WC + CapEx → debt → PL → DCF. Tests in `tests/unit/test_financial_modeling_tools.py`. Frontend cards in `frontend/src/features/financial-modeling/components/`.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, React 18, Mantine v7. Tests via Docker (`tse_dashboard-test` image). No new dependencies.

---

## Test Command (all financial modeling tests)

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

## Task 1: Add `build_revenue_model` Tool

**Files:**
- Modify: `rag/tools/financial_modeling.py` — add function, TOOL_DEFINITIONS entry, TOOL_DISPATCH entry
- Test: `tests/unit/test_financial_modeling_tools.py` — add `TestRevenueModel` class

### Step 1: Write failing tests

Add `TestRevenueModel` class to `tests/unit/test_financial_modeling_tools.py` (before `TestToolDefinitions`):

```python
class TestRevenueModel:
    def test_growth_rates_compounding(self):
        """Revenue compounds correctly year over year."""
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=3,
            approach="growth_rates", growth_rates=[0.10, 0.20, 0.15]
        ))
        projs = result["projections"]
        assert projs[0]["revenue"] == pytest.approx(1100.0, rel=1e-4)
        assert projs[1]["revenue"] == pytest.approx(1320.0, rel=1e-4)
        assert projs[2]["revenue"] == pytest.approx(1518.0, rel=1e-4)

    def test_growth_rates_pct_field(self):
        """growth_pct field is the rate × 100."""
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=2,
            approach="growth_rates", growth_rates=[0.10, 0.20]
        ))
        assert result["projections"][0]["growth_pct"] == pytest.approx(10.0, rel=1e-4)
        assert result["projections"][1]["growth_pct"] == pytest.approx(20.0, rel=1e-4)

    def test_top_down_revenue(self):
        """top_down: revenue = market_size × (1+g)^t × share."""
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=0.0, years=2, approach="top_down",
            market_size=10000.0, market_share_pct=0.05,
            market_growth_rate=0.10
        ))
        projs = result["projections"]
        # Year 1: 10000 * 1.10 * 0.05 = 550
        assert projs[0]["revenue"] == pytest.approx(550.0, rel=1e-4)
        # Year 2: 10000 * 1.10^2 * 0.05 = 605
        assert projs[1]["revenue"] == pytest.approx(605.0, rel=1e-4)

    def test_bottom_up_revenue(self):
        """bottom_up: revenue = units × price, both growing."""
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=0.0, years=2, approach="bottom_up",
            units_sold=1000.0, price_per_unit=100.0,
            volume_growth_rate=0.10, price_growth_rate=0.05
        ))
        projs = result["projections"]
        # Year 1: 1000*1.10 × 100*1.05 = 1100 × 105 = 115500
        assert projs[0]["revenue"] == pytest.approx(115500.0, rel=1e-4)

    def test_wrong_growth_rates_length_error(self):
        """growth_rates list shorter than years must return error."""
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=3,
            approach="growth_rates", growth_rates=[0.10, 0.20]  # only 2 for 3 years
        ))
        assert "error" in result

    def test_unknown_approach_error(self):
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=2, approach="magic"
        ))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=2,
            approach="growth_rates", growth_rates=[0.10, 0.10]
        ))
        assert result["model_type"] == "revenue_model"

    def test_schedule_length(self):
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=5,
            approach="growth_rates", growth_rates=[0.10]*5
        ))
        assert len(result["projections"]) == 5
```

### Step 2: Run to verify tests fail

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest "tests/unit/test_financial_modeling_tools.py::TestRevenueModel" \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" -v
```

Expected: ImportError / AttributeError (function not defined yet).

### Step 3: Implement `build_revenue_model`

Add after the FCFE tool section and before `# ── Tool Definitions ──` in `rag/tools/financial_modeling.py`:

```python
# ── Revenue Modeling Tool ─────────────────────────────────────────────────────

def build_revenue_model(
    db: Session,
    base_revenue: float,
    years: int,
    approach: str = "growth_rates",
    growth_rates: Optional[list] = None,
    market_size: Optional[float] = None,
    market_share_pct: Optional[float] = None,
    market_growth_rate: float = 0.0,
    units_sold: Optional[float] = None,
    price_per_unit: Optional[float] = None,
    volume_growth_rate: float = 0.0,
    price_growth_rate: float = 0.0,
) -> str:
    """
    Build a multi-year revenue projection.

    Three approaches:
    - 'growth_rates': apply a list of annual growth rates to compound base_revenue.
    - 'top_down': revenue = market_size × (1+market_growth_rate)^t × market_share_pct.
    - 'bottom_up': revenue = units_sold×(1+vol_g)^t × price_per_unit×(1+price_g)^t.

    Returns projections list suitable for feeding into build_pl_model or build_dcf_model.
    """
    if years <= 0:
        return json.dumps({"error": "years must be positive"})

    projections = []

    if approach == "growth_rates":
        if not growth_rates:
            return json.dumps({"error": "growth_rates required for growth_rates approach"})
        if len(growth_rates) < years:
            return json.dumps({"error": f"growth_rates has {len(growth_rates)} items but years={years}"})
        revenue = base_revenue
        for t in range(years):
            g = growth_rates[t]
            revenue = revenue * (1 + g)
            projections.append({
                "year": t + 1,
                "revenue": round(revenue, 4),
                "growth_pct": round(g * 100, 4),
                "method": "growth_rates",
            })

    elif approach == "top_down":
        if market_size is None or market_share_pct is None:
            return json.dumps({"error": "market_size and market_share_pct required for top_down approach"})
        for t in range(1, years + 1):
            market = market_size * (1 + market_growth_rate) ** t
            revenue = market * market_share_pct
            prev_revenue = market_size * (1 + market_growth_rate) ** (t - 1) * market_share_pct
            growth_pct = (revenue / prev_revenue - 1) * 100 if prev_revenue else 0
            projections.append({
                "year": t,
                "revenue": round(revenue, 4),
                "market_size": round(market, 4),
                "growth_pct": round(growth_pct, 4),
                "method": "top_down",
            })

    elif approach == "bottom_up":
        if units_sold is None or price_per_unit is None:
            return json.dumps({"error": "units_sold and price_per_unit required for bottom_up approach"})
        for t in range(1, years + 1):
            units = units_sold * (1 + volume_growth_rate) ** t
            price = price_per_unit * (1 + price_growth_rate) ** t
            revenue = units * price
            prev_revenue = (
                units_sold * (1 + volume_growth_rate) ** (t - 1) *
                price_per_unit * (1 + price_growth_rate) ** (t - 1)
            )
            growth_pct = (revenue / prev_revenue - 1) * 100 if prev_revenue else 0
            projections.append({
                "year": t,
                "revenue": round(revenue, 4),
                "units": round(units, 4),
                "price": round(price, 4),
                "growth_pct": round(growth_pct, 4),
                "method": "bottom_up",
            })

    else:
        return json.dumps({"error": f"Unknown approach '{approach}'. Use 'growth_rates', 'top_down', or 'bottom_up'"})

    total_revenue = sum(p["revenue"] for p in projections)
    return json.dumps({
        "model_type": "revenue_model",
        "approach": approach,
        "projections": projections,
        "total_revenue": round(total_revenue, 4),
    })
```

Also add to `TOOL_DEFINITIONS` (append to the `TOOL_DEFINITIONS +=` block):

```python
    {
        "type": "function",
        "function": {
            "name": "build_revenue_model",
            "description": (
                "Build a multi-year revenue projection. Three approaches: "
                "'growth_rates' (compound by annual rates), "
                "'top_down' (market_size × market_share), "
                "'bottom_up' (units × price). "
                "Output feeds into build_pl_model or build_dcf_model."
            ),
            "parameters": {
                "type": "object",
                "required": ["base_revenue", "years"],
                "properties": {
                    "base_revenue": {"type": "number", "description": "Year-0 revenue (billion IRR). Used for growth_rates approach."},
                    "years": {"type": "integer", "description": "Number of forecast years"},
                    "approach": {"type": "string", "enum": ["growth_rates", "top_down", "bottom_up"], "description": "Projection method. Default: growth_rates"},
                    "growth_rates": {"type": "array", "items": {"type": "number"}, "description": "Per-year growth rates (growth_rates approach). Length must equal years."},
                    "market_size": {"type": "number", "description": "Total addressable market (top_down)"},
                    "market_share_pct": {"type": "number", "description": "Market share decimal, e.g. 0.05 (top_down)"},
                    "market_growth_rate": {"type": "number", "description": "Annual market growth decimal (top_down). Default 0."},
                    "units_sold": {"type": "number", "description": "Base units sold (bottom_up)"},
                    "price_per_unit": {"type": "number", "description": "Base price per unit in IRR (bottom_up)"},
                    "volume_growth_rate": {"type": "number", "description": "Annual volume growth decimal (bottom_up). Default 0."},
                    "price_growth_rate": {"type": "number", "description": "Annual price growth decimal (bottom_up). Default 0."},
                },
            },
        },
    },
```

Add to `TOOL_DISPATCH`: `"build_revenue_model": build_revenue_model,`

### Step 4: Run tests — expect all 8 PASS

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add build_revenue_model tool (growth_rates, top-down, bottom-up)"
```

---

## Task 2: Add `build_wc_model` Tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Test: `tests/unit/test_financial_modeling_tools.py` — add `TestWCModel` class

### Step 1: Write failing tests

```python
class TestWCModel:
    def test_ar_formula(self):
        """AR = (DSO / 365) × Revenue."""
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0], cogs_pct=0.60,
            dso=30.0, dio=45.0, dpo=20.0
        ))
        expected_ar = (30 / 365) * 1000.0
        assert result["projections"][0]["ar"] == pytest.approx(expected_ar, rel=1e-4)

    def test_ccc_formula(self):
        """CCC = DSO + DIO - DPO."""
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0], cogs_pct=0.60,
            dso=30.0, dio=45.0, dpo=20.0
        ))
        assert result["projections"][0]["ccc"] == pytest.approx(55.0, rel=1e-4)

    def test_delta_wc_year1_uses_opening_nwc(self):
        """Year 1 ΔWC = NWC(1) - opening_nwc."""
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0], cogs_pct=0.60,
            dso=30.0, dio=45.0, dpo=20.0, opening_nwc=0.0
        ))
        p = result["projections"][0]
        expected_nwc = p["ar"] + p["inventory"] - p["ap"]
        assert p["delta_wc"] == pytest.approx(expected_nwc - 0.0, rel=1e-4)

    def test_delta_wc_positive_means_cash_outflow(self):
        """When NWC increases, ΔWC > 0 (cash outflow for FCFF)."""
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0, 1200.0], cogs_pct=0.60,
            dso=30.0, dio=45.0, dpo=20.0, opening_nwc=0.0
        ))
        # Both years have increasing revenue → NWC increases → delta_wc > 0
        assert result["projections"][0]["delta_wc"] > 0
        assert result["projections"][1]["delta_wc"] > 0

    def test_inventory_formula(self):
        """Inventory = (DIO / 365) × COGS."""
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0], cogs_pct=0.60,
            dso=30.0, dio=45.0, dpo=20.0
        ))
        cogs = 1000.0 * 0.60
        expected_inv = (45 / 365) * cogs
        assert result["projections"][0]["inventory"] == pytest.approx(expected_inv, rel=1e-4)

    def test_model_type(self):
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0], cogs_pct=0.60,
            dso=30.0, dio=45.0, dpo=20.0
        ))
        assert result["model_type"] == "wc_model"

    def test_schedule_length(self):
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0, 1100.0, 1200.0], cogs_pct=0.60,
            dso=30.0, dio=45.0, dpo=20.0
        ))
        assert len(result["projections"]) == 3
```

### Step 2: Run to verify tests fail

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest "tests/unit/test_financial_modeling_tools.py::TestWCModel" \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" -v
```

Expected: AttributeError (not defined yet).

### Step 3: Implement `build_wc_model`

Add to `rag/tools/financial_modeling.py`:

```python
# ── Working Capital Tool ──────────────────────────────────────────────────────

def build_wc_model(
    db: Session,
    revenue_list: list,
    cogs_pct: float,
    dso: float,
    dio: float,
    dpo: float,
    opening_nwc: float = 0.0,
) -> str:
    """
    Build a Working Capital model from revenue and day-metrics.

    Formulas:
        AR(t)        = (DSO / 365) × Revenue(t)
        Inventory(t) = (DIO / 365) × COGS(t)       where COGS = Revenue × cogs_pct
        AP(t)        = (DPO / 365) × COGS(t)
        NWC(t)       = AR(t) + Inventory(t) - AP(t)
        ΔWC(t)       = NWC(t) - NWC(t-1)           (positive = cash outflow)
        CCC          = DSO + DIO - DPO              (constant across years)

    Args:
        revenue_list: Revenue per year (from build_revenue_model or manual).
        cogs_pct: COGS as fraction of revenue (e.g. 0.60 for 60%).
        dso: Days Sales Outstanding.
        dio: Days Inventory Outstanding.
        dpo: Days Payable Outstanding.
        opening_nwc: NWC at t=0 for computing ΔWC in year 1. Default 0.

    Returns:
        JSON with projections list (ar, inventory, ap, nwc, delta_wc, ccc per year).
        delta_wc feeds directly into build_dcf_model projections[i]["delta_wc"].
    """
    if not revenue_list:
        return json.dumps({"error": "revenue_list must not be empty"})
    if not (0 < cogs_pct <= 1):
        return json.dumps({"error": "cogs_pct must be between 0 and 1"})
    if dso < 0 or dio < 0 or dpo < 0:
        return json.dumps({"error": "dso, dio, dpo must be non-negative"})

    ccc = dso + dio - dpo
    projections = []
    prev_nwc = opening_nwc

    for t, revenue in enumerate(revenue_list, start=1):
        cogs = revenue * cogs_pct
        ar = (dso / 365) * revenue
        inventory = (dio / 365) * cogs
        ap = (dpo / 365) * cogs
        nwc = ar + inventory - ap
        delta_wc = nwc - prev_nwc
        projections.append({
            "year": t,
            "revenue": round(revenue, 4),
            "cogs": round(cogs, 4),
            "ar": round(ar, 4),
            "inventory": round(inventory, 4),
            "ap": round(ap, 4),
            "nwc": round(nwc, 4),
            "delta_wc": round(delta_wc, 4),
            "ccc": round(ccc, 4),
        })
        prev_nwc = nwc

    return json.dumps({
        "model_type": "wc_model",
        "dso": dso,
        "dio": dio,
        "dpo": dpo,
        "ccc": round(ccc, 4),
        "projections": projections,
    })
```

Add to `TOOL_DEFINITIONS` (append):

```python
    {
        "type": "function",
        "function": {
            "name": "build_wc_model",
            "description": (
                "Build a Working Capital model. "
                "AR = DSO/365 × Revenue; Inventory = DIO/365 × COGS; AP = DPO/365 × COGS. "
                "ΔWC feeds into build_dcf_model projections. "
                "CCC = DSO + DIO - DPO."
            ),
            "parameters": {
                "type": "object",
                "required": ["revenue_list", "cogs_pct", "dso", "dio", "dpo"],
                "properties": {
                    "revenue_list": {"type": "array", "items": {"type": "number"}, "description": "Revenue per year (from build_revenue_model)"},
                    "cogs_pct": {"type": "number", "description": "COGS as fraction of revenue (e.g. 0.60 for 60%)"},
                    "dso": {"type": "number", "description": "Days Sales Outstanding (e.g. 30)"},
                    "dio": {"type": "number", "description": "Days Inventory Outstanding (e.g. 45)"},
                    "dpo": {"type": "number", "description": "Days Payable Outstanding (e.g. 20)"},
                    "opening_nwc": {"type": "number", "description": "NWC at t=0 for year-1 ΔWC. Default 0."},
                },
            },
        },
    },
```

Add to `TOOL_DISPATCH`: `"build_wc_model": build_wc_model,`

### Step 4: Run tests — expect all 7 PASS

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add build_wc_model tool (DSO/DIO/DPO/CCC)"
```

---

## Task 3: Add `build_capex_schedule` Tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Test: `tests/unit/test_financial_modeling_tools.py` — add `TestCapexSchedule` class

### Step 1: Write failing tests

```python
class TestCapexSchedule:
    def test_net_ppe_roll_forward(self):
        """Net PP&E = gross_ppe - accum_dep, rolling forward correctly."""
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=500.0, opening_accum_dep=100.0,
            useful_life=10.0, years=2, capex_list=[50.0, 60.0]
        ))
        projs = result["projections"]
        # Year 1: gross=500+50=550, DA=500/10=50, accum=100+50=150, net=550-150=400
        assert projs[0]["gross_ppe"] == pytest.approx(550.0, rel=1e-4)
        assert projs[0]["da"] == pytest.approx(50.0, rel=1e-4)
        assert projs[0]["accum_dep"] == pytest.approx(150.0, rel=1e-4)
        assert projs[0]["net_ppe"] == pytest.approx(400.0, rel=1e-4)

    def test_da_straight_line(self):
        """DA = opening_gross_ppe / useful_life (straight-line)."""
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=1000.0, opening_accum_dep=0.0,
            useful_life=20.0, years=1, capex_list=[0.0]
        ))
        assert result["projections"][0]["da"] == pytest.approx(50.0, rel=1e-4)

    def test_capex_pct_revenue_path(self):
        """capex = capex_pct_revenue × revenue when capex_list not provided."""
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=500.0, opening_accum_dep=0.0,
            useful_life=10.0, years=2,
            capex_pct_revenue=0.08, revenue_list=[1000.0, 1100.0]
        ))
        assert result["projections"][0]["capex"] == pytest.approx(80.0, rel=1e-4)
        assert result["projections"][1]["capex"] == pytest.approx(88.0, rel=1e-4)

    def test_accum_dep_never_exceeds_gross(self):
        """Accumulated depreciation is capped at gross PP&E (no negative net PP&E)."""
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        # Very short useful life — assets fully depreciate
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=100.0, opening_accum_dep=90.0,
            useful_life=2.0, years=3, capex_list=[0.0, 0.0, 0.0]
        ))
        for p in result["projections"]:
            assert p["net_ppe"] >= 0.0

    def test_schedule_length(self):
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=500.0, opening_accum_dep=100.0,
            useful_life=10.0, years=4, capex_list=[50.0]*4
        ))
        assert len(result["projections"]) == 4

    def test_model_type(self):
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=500.0, opening_accum_dep=0.0,
            useful_life=10.0, years=1, capex_list=[50.0]
        ))
        assert result["model_type"] == "capex_schedule"

    def test_missing_capex_inputs_error(self):
        """Neither capex_list nor capex_pct_revenue provided → error."""
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=500.0, opening_accum_dep=0.0,
            useful_life=10.0, years=2
        ))
        assert "error" in result
```

### Step 2: Run to verify tests fail

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest "tests/unit/test_financial_modeling_tools.py::TestCapexSchedule" \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" -v
```

### Step 3: Implement `build_capex_schedule`

```python
# ── CapEx & PP&E Schedule Tool ────────────────────────────────────────────────

def build_capex_schedule(
    db: Session,
    opening_gross_ppe: float,
    opening_accum_dep: float,
    useful_life: float,
    years: int,
    capex_list: Optional[list] = None,
    capex_pct_revenue: Optional[float] = None,
    revenue_list: Optional[list] = None,
    disposals_list: Optional[list] = None,
) -> str:
    """
    Build a PP&E roll-forward and depreciation schedule.

    PP&E Roll-Forward (per year):
        Gross PP&E(t)  = Gross PP&E(t-1) + CapEx(t) − Disposals(t)
        DA(t)          = Gross PP&E(t-1) / useful_life    (straight-line)
        Acc. Dep.(t)   = min(Acc. Dep.(t-1) + DA(t), Gross PP&E(t))
        Net PP&E(t)    = Gross PP&E(t) − Acc. Dep.(t)

    CapEx can be supplied as:
    - capex_list: explicit per-year values, OR
    - capex_pct_revenue + revenue_list: CapEx = pct × revenue

    Args:
        opening_gross_ppe: Gross PP&E at t=0 (billion IRR).
        opening_accum_dep: Accumulated depreciation at t=0.
        useful_life: Asset useful life in years for straight-line depreciation.
        years: Number of forecast years.
        capex_list: CapEx per year. Length must equal years.
        capex_pct_revenue: CapEx as fraction of revenue. Requires revenue_list.
        revenue_list: Revenue per year (needed if using capex_pct_revenue).
        disposals_list: Asset disposals (at cost) per year. Defaults to zeros.

    Returns:
        JSON with projections (capex, da, gross_ppe, accum_dep, net_ppe per year).
        capex and da arrays feed into build_dcf_model projections.
    """
    if years <= 0:
        return json.dumps({"error": "years must be positive"})
    if useful_life <= 0:
        return json.dumps({"error": "useful_life must be positive"})

    # Resolve CapEx per year
    if capex_list is not None:
        if len(capex_list) < years:
            return json.dumps({"error": f"capex_list has {len(capex_list)} items but years={years}"})
        capex_values = capex_list[:years]
    elif capex_pct_revenue is not None:
        if not revenue_list or len(revenue_list) < years:
            return json.dumps({"error": "revenue_list required (length >= years) when using capex_pct_revenue"})
        capex_values = [revenue_list[t] * capex_pct_revenue for t in range(years)]
    else:
        return json.dumps({"error": "Provide either capex_list or (capex_pct_revenue + revenue_list)"})

    disposals = disposals_list[:years] if disposals_list else [0.0] * years

    projections = []
    gross_ppe = opening_gross_ppe
    accum_dep = opening_accum_dep

    for t in range(years):
        capex = capex_values[t]
        disposal = disposals[t]
        # DA based on opening gross PP&E (before new CapEx)
        da = gross_ppe / useful_life
        gross_ppe_new = gross_ppe + capex - disposal
        accum_dep_new = min(accum_dep + da, gross_ppe_new)  # cap at gross
        net_ppe = max(0.0, gross_ppe_new - accum_dep_new)

        projections.append({
            "year": t + 1,
            "capex": round(capex, 4),
            "disposals": round(disposal, 4),
            "da": round(da, 4),
            "gross_ppe": round(gross_ppe_new, 4),
            "accum_dep": round(accum_dep_new, 4),
            "net_ppe": round(net_ppe, 4),
        })
        gross_ppe = gross_ppe_new
        accum_dep = accum_dep_new

    return json.dumps({
        "model_type": "capex_schedule",
        "useful_life": useful_life,
        "projections": projections,
    })
```

Add to `TOOL_DEFINITIONS` (append):

```python
    {
        "type": "function",
        "function": {
            "name": "build_capex_schedule",
            "description": (
                "Build a PP&E roll-forward and depreciation schedule. "
                "Gross PP&E(t) = Gross(t-1) + CapEx - Disposals. "
                "DA = Gross PP&E / useful_life (straight-line). "
                "capex and da arrays feed into build_dcf_model projections."
            ),
            "parameters": {
                "type": "object",
                "required": ["opening_gross_ppe", "opening_accum_dep", "useful_life", "years"],
                "properties": {
                    "opening_gross_ppe": {"type": "number", "description": "Gross PP&E at t=0 (billion IRR)"},
                    "opening_accum_dep": {"type": "number", "description": "Accumulated depreciation at t=0"},
                    "useful_life": {"type": "number", "description": "Asset useful life in years (e.g. 10 for straight-line)"},
                    "years": {"type": "integer", "description": "Number of forecast years"},
                    "capex_list": {"type": "array", "items": {"type": "number"}, "description": "Explicit CapEx per year. Alternative to capex_pct_revenue."},
                    "capex_pct_revenue": {"type": "number", "description": "CapEx as % of revenue decimal. Requires revenue_list."},
                    "revenue_list": {"type": "array", "items": {"type": "number"}, "description": "Revenue per year (needed if using capex_pct_revenue)"},
                    "disposals_list": {"type": "array", "items": {"type": "number"}, "description": "Asset disposals at cost per year. Default zeros."},
                },
            },
        },
    },
```

Add to `TOOL_DISPATCH`: `"build_capex_schedule": build_capex_schedule,`

### Step 4: Run tests — expect all 7 PASS

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add build_capex_schedule tool (PP&E roll-forward, straight-line DA)"
```

---

## Task 4: Add `build_debt_schedule` Tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Test: `tests/unit/test_financial_modeling_tools.py` — add `TestDebtSchedule` class

### Step 1: Write failing tests

```python
class TestDebtSchedule:
    def _single_tranche(self):
        return [{"name": "TLA", "opening_balance": 1000.0, "annual_rate": 0.08, "amortization_pct": 0.10}]

    def test_ending_balance_after_amortization(self):
        """Ending = opening - opening × amort_pct."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(db, tranches=self._single_tranche(), years=1))
        # Ending = 1000 - 100 = 900
        assert result["projections"][0]["total_debt"] == pytest.approx(900.0, rel=1e-4)

    def test_interest_uses_average_balance(self):
        """Interest = ((Opening + Ending) / 2) × rate."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(db, tranches=self._single_tranche(), years=1))
        # avg = (1000 + 900) / 2 = 950; interest = 950 × 0.08 = 76
        assert result["projections"][0]["interest_expense"] == pytest.approx(76.0, rel=1e-4)

    def test_multi_tranche_sums_correctly(self):
        """Total debt and interest are sum across all tranches."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        tranches = [
            {"name": "TLA", "opening_balance": 500.0, "annual_rate": 0.08, "amortization_pct": 0.10},
            {"name": "Senior Notes", "opening_balance": 300.0, "annual_rate": 0.10, "amortization_pct": 0.0},
        ]
        result = json.loads(build_debt_schedule(db, tranches=tranches, years=1))
        # TLA: ending=450, interest = avg(500,450)*0.08 = 475*0.08=38
        # Notes: ending=300, interest = avg(300,300)*0.10 = 30
        assert result["projections"][0]["total_debt"] == pytest.approx(750.0, rel=1e-4)
        assert result["projections"][0]["interest_expense"] == pytest.approx(68.0, rel=1e-4)

    def test_net_debt_uses_cash(self):
        """net_debt = total_debt - cash."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(
            db, tranches=self._single_tranche(), years=1, cash_list=[50.0]
        ))
        # total_debt=900, cash=50 → net_debt=850
        assert result["projections"][0]["net_debt"] == pytest.approx(850.0, rel=1e-4)

    def test_balance_rolls_forward(self):
        """Year 2 opening = year 1 ending."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(db, tranches=self._single_tranche(), years=2))
        projs = result["projections"]
        # Year 1: ending = 900. Year 2: ending = 900 - 900*0.10 = 810
        assert projs[1]["total_debt"] == pytest.approx(810.0, rel=1e-4)

    def test_balance_never_negative(self):
        """Debt balance cannot go below zero."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        tranches = [{"name": "TLA", "opening_balance": 100.0, "annual_rate": 0.05, "amortization_pct": 0.60}]
        result = json.loads(build_debt_schedule(db, tranches=tranches, years=3))
        for p in result["projections"]:
            assert p["total_debt"] >= 0.0

    def test_model_type(self):
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(db, tranches=self._single_tranche(), years=1))
        assert result["model_type"] == "debt_schedule"

    def test_schedule_length(self):
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(db, tranches=self._single_tranche(), years=5))
        assert len(result["projections"]) == 5
```

### Step 2: Run to verify tests fail

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest "tests/unit/test_financial_modeling_tools.py::TestDebtSchedule" \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" -v
```

### Step 3: Implement `build_debt_schedule`

```python
# ── Debt Schedule Tool ────────────────────────────────────────────────────────

def build_debt_schedule(
    db: Session,
    tranches: list,
    years: int,
    cash_list: Optional[list] = None,
) -> str:
    """
    Build a multi-tranche debt schedule with interest expense.

    Roll-Forward per tranche per year:
        Amortization(t) = Opening Balance(t) × amortization_pct
        Ending(t)       = max(0, Opening(t) - Amortization(t))
        Interest(t)     = (Opening(t) + Ending(t)) / 2 × annual_rate

    Args:
        tranches: List of debt tranches. Each tranche dict requires:
            - name (str): Tranche label (e.g. "TLA", "Senior Notes")
            - opening_balance (float): Balance at t=0 (billion IRR)
            - annual_rate (float): Fixed interest rate decimal
            - amortization_pct (float): Fraction of opening balance repaid per year
        years: Number of forecast years.
        cash_list: Cash balance per year (for net debt calculation). Defaults to zeros.

    Returns:
        JSON with projections (total_debt, interest_expense, net_debt per year)
        and per-tranche detail. interest_expense feeds into build_pl_model.
        net_debt[-1] feeds into build_dcf_model equity bridge.
    """
    if not tranches:
        return json.dumps({"error": "tranches must not be empty"})
    if years <= 0:
        return json.dumps({"error": "years must be positive"})

    cash = cash_list if cash_list else [0.0] * years
    if len(cash) < years:
        cash = cash + [0.0] * (years - len(cash))

    # Initialize tranche state
    balances = [t["opening_balance"] for t in tranches]

    projections = []
    for yr in range(years):
        year_total_debt = 0.0
        year_interest = 0.0
        tranche_detail = []

        new_balances = []
        for i, tranche in enumerate(tranches):
            opening = balances[i]
            amort_pct = tranche.get("amortization_pct", 0.0)
            rate = tranche["annual_rate"]
            amortization = opening * amort_pct
            ending = max(0.0, opening - amortization)
            interest = (opening + ending) / 2 * rate

            year_total_debt += ending
            year_interest += interest
            tranche_detail.append({
                "name": tranche["name"],
                "opening": round(opening, 4),
                "amortization": round(amortization, 4),
                "ending": round(ending, 4),
                "interest": round(interest, 4),
            })
            new_balances.append(ending)

        balances = new_balances
        net_debt = year_total_debt - cash[yr]

        projections.append({
            "year": yr + 1,
            "total_debt": round(year_total_debt, 4),
            "interest_expense": round(year_interest, 4),
            "cash": round(cash[yr], 4),
            "net_debt": round(net_debt, 4),
            "tranches": tranche_detail,
        })

    return json.dumps({
        "model_type": "debt_schedule",
        "projections": projections,
    })
```

Add to `TOOL_DEFINITIONS` (append):

```python
    {
        "type": "function",
        "function": {
            "name": "build_debt_schedule",
            "description": (
                "Build a multi-tranche debt schedule. "
                "Ending Balance = Opening - Opening×amort_pct. "
                "Interest = avg(Opening, Ending) × rate. "
                "interest_expense feeds into build_pl_model; "
                "net_debt[-1] feeds into build_dcf_model equity bridge."
            ),
            "parameters": {
                "type": "object",
                "required": ["tranches", "years"],
                "properties": {
                    "tranches": {
                        "type": "array",
                        "description": "Debt tranches. Each: {name, opening_balance, annual_rate, amortization_pct}",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "opening_balance": {"type": "number", "description": "Balance at t=0 (billion IRR)"},
                                "annual_rate": {"type": "number", "description": "Interest rate decimal"},
                                "amortization_pct": {"type": "number", "description": "Fraction repaid per year (0=bullet, 0.1=10% per year)"},
                            },
                        },
                    },
                    "years": {"type": "integer", "description": "Forecast years"},
                    "cash_list": {"type": "array", "items": {"type": "number"}, "description": "Cash per year for net_debt = total_debt - cash. Default zeros."},
                },
            },
        },
    },
```

Add to `TOOL_DISPATCH`: `"build_debt_schedule": build_debt_schedule,`

### Step 4: Run tests — expect all 8 PASS

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add build_debt_schedule tool (multi-tranche, avg-balance interest)"
```

---

## Task 5: Update Tool Count Assertions + Agent Config

**Files:**
- Modify: `tests/unit/test_financial_modeling_tools.py` — update `TestToolDefinitions` counts
- Modify: `tests/unit/test_financial_modeling_agent.py` — update assertions
- Modify: `rag/agents/financial_modeling.py` — update system prompt, max_tool_rounds=8

### Step 1: Update `TestToolDefinitions`

Change counts from 10 → 14:
```python
class TestToolDefinitions:
    def test_tool_definitions_count(self):
        from rag.tools.financial_modeling import TOOL_DEFINITIONS
        assert len(TOOL_DEFINITIONS) == 14

    def test_tool_dispatch_count(self):
        from rag.tools.financial_modeling import TOOL_DISPATCH
        assert len(TOOL_DISPATCH) == 14
```

### Step 2: Update `TestFinancialModelingAgent`

Change `test_ten_tools` to `test_fourteen_tools` and update `test_tool_names`:
```python
    def test_fourteen_tools(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        assert len(config.tool_definitions) == 14

    def test_tool_names(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        names = {d["function"]["name"] for d in config.tool_definitions}
        assert names == {
            "build_dcf_model", "build_pl_model", "build_loan_amortization", "build_bond_model",
            "compute_wacc", "compute_capm", "build_ddm_model",
            "build_residual_income_model", "build_multiples_model", "compute_fcfe",
            "build_revenue_model", "build_wc_model", "build_capex_schedule", "build_debt_schedule",
        }

    def test_max_tool_rounds(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        assert config.max_tool_rounds == 8
```

Also update `TestToolsRegistry` in `test_financial_modeling_agent.py` to include the 4 new tool names in both `test_fm_tools_in_all_definitions` and `test_fm_tools_in_all_dispatch`.

### Step 3: Update `rag/agents/financial_modeling.py`

Update `max_tool_rounds=8` and add the upstream chain section to the system prompt.

Replace the `## Typical Workflow` section with:
```
## Typical Workflows

### Simple DCF (3 calls)
1. compute_capm → compute_wacc → build_dcf_model

### Full Bottom-Up DCF (6 calls)
1. build_revenue_model   → revenue projections
2. build_wc_model        → delta_wc per year  (input: revenue_list from step 1)
3. build_capex_schedule  → capex + da per year
4. build_debt_schedule   → interest_expense + net_debt
5. build_pl_model        → EBIT per year  (input: revenue from step 1)
6. build_dcf_model       → assemble projections from steps 2, 3, 5
```

Also change `max_tool_rounds=6` → `max_tool_rounds=8`.

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

Expected: All PASS.

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py rag/agents/financial_modeling.py \
  tests/unit/test_financial_modeling_tools.py tests/unit/test_financial_modeling_agent.py
git commit -m "feat(financial-modeling): update agent to 14 tools, max_tool_rounds=8, add DCF chain guidance"
```

---

## Task 6: Frontend — Wire New Model Types

**Files:**
- Modify: `frontend/src/features/financial-modeling/components/ModelChatArea.jsx`
- Modify: `frontend/src/features/financial-modeling/components/ModelResultCard.jsx`
- Modify: `frontend/src/features/financial-modeling/components/ModelEmptyState.jsx`
- Modify: `frontend/src/features/financial-modeling/components/ModelSidebar.jsx`

### Step 1: Update `ModelChatArea.jsx` — `FM_TOOL_TO_TYPE`

Add to the existing `FM_TOOL_TO_TYPE` object:
```js
const FM_TOOL_TO_TYPE = {
  // ... existing entries ...
  build_revenue_model: 'revenue_model',
  build_wc_model: 'wc_model',
  build_capex_schedule: 'capex_schedule',
  build_debt_schedule: 'debt_schedule',
};
```

### Step 2: Update `ModelResultCard.jsx` — `MODEL_META` and `METRIC_LABELS`

Add to `MODEL_META`:
```js
  revenue_model: { label: 'مدل درآمد', color: 'green', metrics: ['total_revenue'] },
  wc_model: { label: 'سرمایه در گردش', color: 'blue', metrics: [] },
  capex_schedule: { label: 'برنامه CapEx', color: 'orange', metrics: [] },
  debt_schedule: { label: 'برنامه بدهی', color: 'red', metrics: [] },
```

Add to `METRIC_LABELS`:
```js
  total_revenue: 'کل درآمد',
```

### Step 3: Add quick-start to `ModelEmptyState.jsx`

Add to `QUICK_STARTS`:
```js
  {
    label: 'DCF کامل از پایه',
    prompt: 'یک DCF کامل برای شرکتی با درآمد پایه ۱۰۰۰ میلیارد ریال بساز: ابتدا مدل درآمد با رشد ۱۵٪ برای ۳ سال، سپس سرمایه در گردش با DSO=30، DIO=45، DPO=20 و COGS=60٪، سپس DCF با WACC=22٪',
    icon: IconChartLine,
    color: '#6366F1',
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.2)',
  },
```

### Step 4: Add template to `ModelSidebar.jsx`

Add to `TEMPLATES`:
```js
  {
    label: 'DCF کامل از پایه',
    icon: IconChartLine,
    color: '#6366F1',
    prompt: 'یک DCF کامل برای شرکتی با درآمد پایه ۱۰۰۰ میلیارد ریال بساز: ابتدا مدل درآمد با رشد ۱۵٪ برای ۳ سال، سپس سرمایه در گردش با DSO=30، DIO=45، DPO=20 و COGS=60٪، سپس DCF با WACC=22٪',
  },
```

### Step 5: Verify frontend builds

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | tail -10
```

Expected: `✓ built` with exit code 0.

### Step 6: Commit

```bash
git add frontend/src/features/financial-modeling/components/
git commit -m "feat(financial-modeling): add revenue/WC/CapEx/debt model UI types and full-DCF quick-start"
```

---

## Task 7: Final Verification

### Step 1: Run all financial modeling tests

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest tests/unit/test_financial_modeling_tools.py tests/unit/test_financial_modeling_agent.py \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" -v
```

Expected: All PASS (~120 tests total).

### Step 2: Run full unit suite (regression check)

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

### Step 3: Push

```bash
git push origin develop
```

---

## Summary

| Task | Tools Added | Tests |
|------|-------------|-------|
| 1 | `build_revenue_model` (3 approaches) | 8 tests |
| 2 | `build_wc_model` (DSO/DIO/DPO/CCC) | 7 tests |
| 3 | `build_capex_schedule` (PP&E roll-forward) | 7 tests |
| 4 | `build_debt_schedule` (multi-tranche) | 8 tests |
| 5 | Agent: 14 tools, max_tool_rounds=8 | count + name assertions |
| 6 | Frontend: 4 new model cards + quick-start | npm build |
| 7 | Full verification | — |

If you need specific details from before exiting plan mode (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/cjd/.claude/projects/-Users-cjd-TSE-Dashboard/0be04709-75a1-444f-a95d-f072c896a7ed.jsonl
