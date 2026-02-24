# Financial Modeling Phase 3 — Three Financial Statements Model

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `build_three_statement_model` — a single tool that links the Income Statement, Balance Sheet, and Cash Flow Statement using outputs from the Phase 2 operational tools.

**Architecture:** Pure-compute tool in `rag/tools/financial_modeling.py` following the existing `fn(db, **kwargs) -> str` pattern. Takes revenue/EBIT/interest lists (from build_pl_model), DA/CapEx (from build_capex_schedule), debt/net_borrowing (from build_debt_schedule), and optional AR/Inventory/AP (from build_wc_model). Computes delta_wc internally from WC lists so the balance sheet always balances. No Excel dependency. Agent becomes 15 tools at max_tool_rounds=8.

**Tech Stack:** Python 3.11, FastAPI, React 18, Mantine v7. Tests via Docker (`tse_dashboard-test`). No new dependencies.

---

## Key Math: Why the Balance Sheet Always Balances

Given the CFS constructs cash as the residual and equity rolls from NI:

```
ΔAssets = ΔCash + ΔPP&E + ΔAR + ΔInv
        = (NI + DA − ΔWC − CapEx + NetBorrow − Div) + (CapEx − DA) + ΔAR + ΔInv
        = NI + NetBorrow − Div − ΔWC + ΔAR + ΔInv
        = NI + NetBorrow − Div + ΔAP          [since ΔWC = ΔAR + ΔInv − ΔAP]

ΔL+E   = ΔDebt + ΔEquity + ΔAP
        = NetBorrow + (NI − Div) + ΔAP
        = NI + NetBorrow − Div + ΔAP  ✓
```

The balance holds **as long as delta_wc is computed from ar/inv/ap lists** (not passed in separately). This is enforced internally.

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

## Reference: Verified Test Numbers

Use these numbers throughout — they have been verified to balance:

**Opening BS:** `{cash: 100, ppe_net: 500, other_assets: 50, other_liabilities: 50, equity: 200}`
*(Implicit opening debt = 400 so BS balances at t=0)*

**Year 1 inputs (no WC):**
- revenue=1000, ebit=200, interest=30, tax_rate=0.25, da=50, capex=80
- total_debt=350, net_borrowing=-50, dividend_payout_ratio=0

**Year 1 results:**
- NI = (200-30)×0.75 = **127.5**
- Operating CF = 127.5+50−0 = **177.5**
- Investing CF = **−80**
- Financing CF = −50−0 = **−50**
- Net cash change = **47.5** → Cash = **147.5**
- PP&E = 500+80−50 = **530**
- Total assets = 147.5+530+50 = **727.5** ✓
- Total L+E = (350+50) + (200+127.5) = 400+327.5 = **727.5** ✓

**Year 1 with WC (ar=100, inv=80, ap=40):**
- delta_wc = (100+80−40) − 0 = **140**
- Operating CF = 127.5+50−140 = **37.5**
- Net cash change = 37.5−80−50 = **−92.5** → Cash = **7.5**
- Total assets = 7.5+100+80+530+50 = **767.5** ✓
- Total L+E = (40+350+50) + (200+127.5) = 440+327.5 = **767.5** ✓

---

## Task 1: Add `build_three_statement_model` Tool

**Files:**
- Modify: `rag/tools/financial_modeling.py` — add function, TOOL_DEFINITIONS +=1, TOOL_DISPATCH +=1
- Test: `tests/unit/test_financial_modeling_tools.py` — add `TestThreeStatementModel` class

### Step 1: Write failing tests

Add `TestThreeStatementModel` class just before `class TestToolDefinitions:` in `tests/unit/test_financial_modeling_tools.py`:

```python
class TestThreeStatementModel:
    def _base_inputs(self):
        """Verified-balanced single-year inputs (no WC)."""
        return dict(
            revenue_list=[1000.0],
            ebit_list=[200.0],
            interest_expense_list=[30.0],
            tax_rate=0.25,
            da_list=[50.0],
            capex_list=[80.0],
            total_debt_list=[350.0],
            net_borrowing_list=[-50.0],
            opening_bs={"cash": 100.0, "ppe_net": 500.0, "other_assets": 50.0,
                        "other_liabilities": 50.0, "equity": 200.0},
        )

    def test_balance_sheet_balances(self):
        """Total Assets must equal Total Liabilities + Equity (balance check)."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        bs = result["years"][0]["balance_sheet"]
        assert bs["balance_check_passed"] is True
        assert bs["balance_error"] < 0.01

    def test_balance_sheet_balances_with_wc(self):
        """Balance holds when AR/inventory/AP lists are provided."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        inp = self._base_inputs()
        inp["ar_list"] = [100.0]
        inp["inventory_list"] = [80.0]
        inp["ap_list"] = [40.0]
        result = json.loads(build_three_statement_model(db, **inp))
        bs = result["years"][0]["balance_sheet"]
        assert bs["balance_check_passed"] is True
        assert bs["balance_error"] < 0.01

    def test_cash_rolls_forward(self):
        """Cash(t) = Cash(t-1) + net_change_in_cash."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        yr = result["years"][0]
        expected_cash = 100.0 + yr["cash_flow_statement"]["net_change_in_cash"]
        assert yr["balance_sheet"]["cash"] == pytest.approx(expected_cash, rel=1e-4)

    def test_ppe_rolls_forward(self):
        """PP&E(t) = PP&E(t-1) + CapEx - DA."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        # 500 + 80 - 50 = 530
        assert result["years"][0]["balance_sheet"]["ppe_net"] == pytest.approx(530.0, rel=1e-4)

    def test_equity_rolls_forward(self):
        """Equity(t) = Equity(t-1) + NI - Dividends."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        yr = result["years"][0]
        ni = yr["income_statement"]["net_income"]
        divid = yr["income_statement"]["dividends"]
        expected_equity = 200.0 + ni - divid
        assert yr["balance_sheet"]["equity"] == pytest.approx(expected_equity, rel=1e-4)

    def test_operating_cf_formula(self):
        """Operating CF = NI + DA - delta_wc."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        yr = result["years"][0]
        ni = yr["income_statement"]["net_income"]
        # No WC: delta_wc = 0, da=50
        assert yr["cash_flow_statement"]["operating_cf"] == pytest.approx(ni + 50.0, rel=1e-4)

    def test_net_income_formula(self):
        """NI = (EBIT - interest) * (1 - tax_rate) when EBT > 0."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        # (200-30)*(1-0.25) = 127.5
        assert result["years"][0]["income_statement"]["net_income"] == pytest.approx(127.5, rel=1e-4)

    def test_tax_zero_when_ebt_negative(self):
        """Loss year: EBT < 0 → tax = 0, NI = EBT."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        inp = self._base_inputs()
        inp["ebit_list"] = [10.0]           # EBIT=10, interest=30 → EBT=-20
        result = json.loads(build_three_statement_model(db, **inp))
        yr = result["years"][0]["income_statement"]
        assert yr["tax"] == pytest.approx(0.0, abs=1e-6)
        assert yr["net_income"] == pytest.approx(-20.0, rel=1e-4)

    def test_schedule_length(self):
        """One entry per year in the years list."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        inp = dict(
            revenue_list=[1000.0, 1100.0, 1200.0],
            ebit_list=[200.0, 220.0, 240.0],
            interest_expense_list=[30.0, 25.0, 20.0],
            tax_rate=0.25,
            da_list=[50.0, 55.0, 60.0],
            capex_list=[80.0, 85.0, 90.0],
            total_debt_list=[350.0, 300.0, 250.0],
            net_borrowing_list=[-50.0, -50.0, -50.0],
            opening_bs={"cash": 100.0, "ppe_net": 500.0, "other_assets": 50.0,
                        "other_liabilities": 50.0, "equity": 200.0},
        )
        result = json.loads(build_three_statement_model(db, **inp))
        assert len(result["years"]) == 3

    def test_model_type(self):
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        assert result["model_type"] == "three_statement_model"

    def test_mismatched_list_length_error(self):
        """Lists of different lengths must return an error."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        inp = self._base_inputs()
        inp["ebit_list"] = [200.0, 220.0]   # 2 items vs 1 revenue
        result = json.loads(build_three_statement_model(db, **inp))
        assert "error" in result
```

### Step 2: Run to verify tests fail

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest "tests/unit/test_financial_modeling_tools.py::TestThreeStatementModel" \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" -v
```

Expected: `AttributeError` — `build_three_statement_model` not defined.

### Step 3: Implement `build_three_statement_model`

Add this function to `rag/tools/financial_modeling.py` just before the `# ── Tool Definitions ──` comment:

```python
# ── Three Financial Statements Tool ───────────────────────────────────────────

def build_three_statement_model(
    db: Session,
    revenue_list: list,
    ebit_list: list,
    interest_expense_list: list,
    tax_rate: float,
    da_list: list,
    capex_list: list,
    total_debt_list: list,
    net_borrowing_list: list,
    opening_bs: dict,
    ar_list: Optional[list] = None,
    inventory_list: Optional[list] = None,
    ap_list: Optional[list] = None,
    dividend_payout_ratio: float = 0.0,
) -> str:
    """
    Build linked Income Statement, Cash Flow Statement, and Balance Sheet.

    Linkages:
        IS → CFS: Net Income is the starting point of Operating CF.
        IS → BS:  Net Income adds to Retained Earnings (Equity roll-forward).
        CFS → BS: Ending cash = opening cash + net change in cash.
        CapEx/DA → BS: PP&E roll-forward (PP&E(t) = PP&E(t-1) + CapEx - DA).
        Debt → BS: total_debt_list drives the debt balance per year.
        WC → CFS+BS: delta_wc computed internally from ar/inv/ap lists.

    The balance sheet always balances (Assets = L+E) because cash is the CFS residual.
    A balance_check_passed field confirms this within a 0.01 tolerance.

    Args:
        revenue_list: Revenue per year (from build_revenue_model or build_pl_model).
        ebit_list: EBIT per year (from build_pl_model).
        interest_expense_list: Interest expense per year (from build_debt_schedule).
        tax_rate: Corporate tax rate decimal (constant across all years).
        da_list: Depreciation & Amortization per year (from build_capex_schedule).
        capex_list: Capital expenditure per year (from build_capex_schedule).
        total_debt_list: Total debt balance per year (from build_debt_schedule).
        net_borrowing_list: Net new debt per year (positive = drawdown, negative = repayment).
        opening_bs: Opening balance sheet dict with keys:
            cash, ppe_net, other_assets, other_liabilities, equity.
            Optional keys: opening_ar, opening_inventory, opening_ap (default 0).
        ar_list: Accounts Receivable per year (from build_wc_model). Optional.
        inventory_list: Inventory per year (from build_wc_model). Optional.
        ap_list: Accounts Payable per year (from build_wc_model). Optional.
        dividend_payout_ratio: Fraction of positive NI paid as dividends. Default 0.

    Returns:
        JSON with model_type and years list. Each year contains income_statement,
        cash_flow_statement, and balance_sheet (including balance_check_passed).
    """
    n = len(revenue_list)

    # Validate all required lists have the same length
    required_lists = {
        "ebit_list": ebit_list,
        "interest_expense_list": interest_expense_list,
        "da_list": da_list,
        "capex_list": capex_list,
        "total_debt_list": total_debt_list,
        "net_borrowing_list": net_borrowing_list,
    }
    for name, lst in required_lists.items():
        if len(lst) != n:
            return json.dumps({"error": f"{name} has {len(lst)} items but revenue_list has {n}"})

    for name, lst in [("ar_list", ar_list), ("inventory_list", inventory_list), ("ap_list", ap_list)]:
        if lst is not None and len(lst) != n:
            return json.dumps({"error": f"{name} has {len(lst)} items but revenue_list has {n}"})

    # Opening balance sheet state
    cash = float(opening_bs.get("cash", 0.0))
    ppe_net = float(opening_bs.get("ppe_net", 0.0))
    other_assets = float(opening_bs.get("other_assets", 0.0))
    other_liabilities = float(opening_bs.get("other_liabilities", 0.0))
    equity = float(opening_bs.get("equity", 0.0))

    # Opening WC for delta_wc computation in year 1
    prev_ar = float(opening_bs.get("opening_ar", 0.0))
    prev_inv = float(opening_bs.get("opening_inventory", 0.0))
    prev_ap = float(opening_bs.get("opening_ap", 0.0))
    prev_nwc = prev_ar + prev_inv - prev_ap

    years = []

    for t in range(n):
        # ── Income Statement ──────────────────────────────────────────────────
        ebit = ebit_list[t]
        interest = interest_expense_list[t]
        ebt = ebit - interest
        tax = max(0.0, ebt * tax_rate)
        net_income = ebt - tax
        dividends = max(0.0, net_income * dividend_payout_ratio) if net_income > 0 else 0.0

        # ── Working Capital (compute delta_wc internally for BS consistency) ──
        ar = float(ar_list[t]) if ar_list else 0.0
        inv = float(inventory_list[t]) if inventory_list else 0.0
        ap = float(ap_list[t]) if ap_list else 0.0
        nwc = ar + inv - ap
        delta_wc = nwc - prev_nwc
        prev_nwc = nwc

        # ── Cash Flow Statement ───────────────────────────────────────────────
        da = da_list[t]
        capex = capex_list[t]
        net_borrowing = net_borrowing_list[t]

        operating_cf = net_income + da - delta_wc
        investing_cf = -capex
        financing_cf = net_borrowing - dividends
        net_change_in_cash = operating_cf + investing_cf + financing_cf

        # ── Balance Sheet (roll forward) ──────────────────────────────────────
        cash_new = cash + net_change_in_cash
        ppe_net_new = ppe_net + capex - da
        total_assets = cash_new + ar + inv + ppe_net_new + other_assets

        total_debt = total_debt_list[t]
        total_liabilities = ap + total_debt + other_liabilities
        equity_new = equity + net_income - dividends
        total_le = total_liabilities + equity_new

        balance_error = abs(total_assets - total_le)

        years.append({
            "year": t + 1,
            "income_statement": {
                "revenue": round(revenue_list[t], 4),
                "ebit": round(ebit, 4),
                "interest_expense": round(interest, 4),
                "ebt": round(ebt, 4),
                "tax": round(tax, 4),
                "net_income": round(net_income, 4),
                "dividends": round(dividends, 4),
                "retained_earnings_addition": round(net_income - dividends, 4),
            },
            "cash_flow_statement": {
                "operating_cf": round(operating_cf, 4),
                "investing_cf": round(investing_cf, 4),
                "financing_cf": round(financing_cf, 4),
                "net_change_in_cash": round(net_change_in_cash, 4),
            },
            "balance_sheet": {
                "cash": round(cash_new, 4),
                "ar": round(ar, 4),
                "inventory": round(inv, 4),
                "ppe_net": round(ppe_net_new, 4),
                "other_assets": round(other_assets, 4),
                "total_assets": round(total_assets, 4),
                "ap": round(ap, 4),
                "total_debt": round(total_debt, 4),
                "other_liabilities": round(other_liabilities, 4),
                "total_liabilities": round(total_liabilities, 4),
                "equity": round(equity_new, 4),
                "total_liabilities_and_equity": round(total_le, 4),
                "balance_check_passed": balance_error < 0.01,
                "balance_error": round(balance_error, 6),
            },
        })

        # Roll forward for next year
        cash = cash_new
        ppe_net = ppe_net_new
        equity = equity_new

    return json.dumps({"model_type": "three_statement_model", "years": years})
```

### Step 4: Add TOOL_DEFINITIONS entry

Find the closing `]` of the `TOOL_DEFINITIONS += [...]` block (currently ends after the `build_debt_schedule` entry). Add before it:

```python
    {
        "type": "function",
        "function": {
            "name": "build_three_statement_model",
            "description": (
                "Build linked Income Statement, Cash Flow Statement, and Balance Sheet. "
                "Takes outputs from Phase 2 tools (build_pl_model, build_capex_schedule, "
                "build_debt_schedule, build_wc_model) and links all three statements. "
                "Validates balance check (Assets = L+E) per year. "
                "CFA guide section 18."
            ),
            "parameters": {
                "type": "object",
                "required": [
                    "revenue_list", "ebit_list", "interest_expense_list", "tax_rate",
                    "da_list", "capex_list", "total_debt_list", "net_borrowing_list", "opening_bs"
                ],
                "properties": {
                    "revenue_list": {"type": "array", "items": {"type": "number"}, "description": "Revenue per year (from build_revenue_model or build_pl_model)"},
                    "ebit_list": {"type": "array", "items": {"type": "number"}, "description": "EBIT per year (from build_pl_model)"},
                    "interest_expense_list": {"type": "array", "items": {"type": "number"}, "description": "Interest expense per year (from build_debt_schedule)"},
                    "tax_rate": {"type": "number", "description": "Corporate tax rate decimal (e.g. 0.25)"},
                    "da_list": {"type": "array", "items": {"type": "number"}, "description": "D&A per year (from build_capex_schedule)"},
                    "capex_list": {"type": "array", "items": {"type": "number"}, "description": "CapEx per year (from build_capex_schedule)"},
                    "total_debt_list": {"type": "array", "items": {"type": "number"}, "description": "Total debt balance per year (from build_debt_schedule)"},
                    "net_borrowing_list": {"type": "array", "items": {"type": "number"}, "description": "Net new debt per year: positive=drawdown, negative=repayment (from build_debt_schedule)"},
                    "opening_bs": {
                        "type": "object",
                        "description": "Opening balance sheet. Required keys: cash, ppe_net, other_assets, other_liabilities, equity. Optional: opening_ar, opening_inventory, opening_ap.",
                        "properties": {
                            "cash": {"type": "number"},
                            "ppe_net": {"type": "number"},
                            "other_assets": {"type": "number"},
                            "other_liabilities": {"type": "number"},
                            "equity": {"type": "number"},
                            "opening_ar": {"type": "number"},
                            "opening_inventory": {"type": "number"},
                            "opening_ap": {"type": "number"},
                        },
                    },
                    "ar_list": {"type": "array", "items": {"type": "number"}, "description": "AR per year (from build_wc_model). Optional."},
                    "inventory_list": {"type": "array", "items": {"type": "number"}, "description": "Inventory per year (from build_wc_model). Optional."},
                    "ap_list": {"type": "array", "items": {"type": "number"}, "description": "AP per year (from build_wc_model). Optional."},
                    "dividend_payout_ratio": {"type": "number", "description": "Fraction of NI paid as dividends. Default 0 (all retained)."},
                },
            },
        },
    },
```

### Step 5: Add to TOOL_DISPATCH

In the `TOOL_DISPATCH` dict at the bottom of the file, add:
```python
    "build_three_statement_model": build_three_statement_model,
```

### Step 6: Run all TestThreeStatementModel tests — expect 11 PASS

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest "tests/unit/test_financial_modeling_tools.py::TestThreeStatementModel" \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" -v
```

Expected: **11 PASS**.

### Step 7: Commit

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add build_three_statement_model (IS+BS+CFS linkage)"
```

---

## Task 2: Update Tool Count Assertions + Agent Config (14 → 15)

**Files:**
- Modify: `tests/unit/test_financial_modeling_tools.py` — update `TestToolDefinitions`
- Modify: `tests/unit/test_financial_modeling_agent.py` — update `TestFinancialModelingAgent` and `TestToolsRegistry`
- Modify: `rag/agents/financial_modeling.py` — add tool to system prompt

### Step 1: Update `TestToolDefinitions` counts

In `tests/unit/test_financial_modeling_tools.py`, change:
```python
class TestToolDefinitions:
    def test_tool_definitions_count(self):
        from rag.tools.financial_modeling import TOOL_DEFINITIONS
        assert len(TOOL_DEFINITIONS) == 15   # was 14

    def test_tool_dispatch_count(self):
        from rag.tools.financial_modeling import TOOL_DISPATCH
        assert len(TOOL_DISPATCH) == 15   # was 14
```

### Step 2: Update `TestFinancialModelingAgent`

In `tests/unit/test_financial_modeling_agent.py`, change:
```python
    def test_fourteen_tools(self):   # rename to test_fifteen_tools
        from rag.agents.financial_modeling import build_config
        config = build_config()
        assert len(config.tool_definitions) == 15   # was 14

    def test_tool_names(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        names = {d["function"]["name"] for d in config.tool_definitions}
        assert names == {
            "build_dcf_model", "build_pl_model", "build_loan_amortization", "build_bond_model",
            "compute_wacc", "compute_capm", "build_ddm_model",
            "build_residual_income_model", "build_multiples_model", "compute_fcfe",
            "build_revenue_model", "build_wc_model", "build_capex_schedule", "build_debt_schedule",
            "build_three_statement_model",   # new
        }
```

Also update `TestToolsRegistry._ALL_FM_TOOLS` to include `"build_three_statement_model"`.

### Step 3: Update `rag/agents/financial_modeling.py`

Add `build_three_statement_model` to the tool list in SYSTEM_PROMPT. Change the header line from `14 tools` to `15 tools`. Add the tool under a new **Integration** section:

```
**Integration:**
15. `build_three_statement_model` — Links IS + BS + CFS. Takes outputs from build_pl_model,
    build_capex_schedule, build_debt_schedule, build_wc_model. Validates balance check per year.
```

Also add to the Full Bottom-Up DCF workflow:
```
## Full Integrated Model (7 calls)
1. build_revenue_model   → revenue
2. build_wc_model        → AR, inventory, AP, delta_wc
3. build_capex_schedule  → capex, da, PP&E
4. build_debt_schedule   → interest_expense, total_debt, net_borrowing
5. build_pl_model        → EBIT per year
6. build_dcf_model       → valuation
7. build_three_statement_model → full IS+BS+CFS linkage
```

`max_tool_rounds` stays at 8. No change needed.

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

Expected: All PASS (~124 tests).

### Step 5: Commit

```bash
git add rag/tools/financial_modeling.py rag/agents/financial_modeling.py \
  tests/unit/test_financial_modeling_tools.py tests/unit/test_financial_modeling_agent.py
git commit -m "feat(financial-modeling): update agent to 15 tools, add 3-statement model chain docs"
```

---

## Task 3: Frontend — Wire Three Statement Model Type

**Files:**
- Modify: `frontend/src/features/financial-modeling/components/ModelChatArea.jsx`
- Modify: `frontend/src/features/financial-modeling/components/ModelResultCard.jsx`
- Modify: `frontend/src/features/financial-modeling/components/ModelEmptyState.jsx`
- Modify: `frontend/src/features/financial-modeling/components/ModelSidebar.jsx`

### Step 1: `ModelChatArea.jsx` — Add to `FM_TOOL_TO_TYPE`

```js
build_three_statement_model: 'three_statement',
```

### Step 2: `ModelResultCard.jsx` — Add `MODEL_META` and `METRIC_LABELS`

Add to `MODEL_META`:
```js
three_statement: { label: 'صورت‌های مالی سه‌گانه', color: 'teal', metrics: [] },
```

### Step 3: `ModelEmptyState.jsx` — Add quick-start prompt

Add to `QUICK_STARTS`:
```js
  {
    label: 'مدل یکپارچه IS+BS+CF',
    prompt: 'صورت‌های مالی سه‌گانه برای شرکتی با EBIT 200 میلیارد ریال، وام 400 میلیارد با نرخ ۱۸٪، CapEx 80 میلیارد و D&A 50 میلیارد بساز',
    icon: IconChartLine,
    color: '#0D9488',
    bg: 'rgba(13, 148, 136, 0.08)',
    border: 'rgba(13, 148, 136, 0.2)',
  },
```

### Step 4: `ModelSidebar.jsx` — Add template

```js
  {
    label: 'مدل سه‌گانه IS+BS+CF',
    icon: IconChartLine,
    color: '#0D9488',
    prompt: 'صورت‌های مالی سه‌گانه برای شرکتی با EBIT 200 میلیارد ریال، وام 400 میلیارد با نرخ ۱۸٪، CapEx 80 میلیارد و D&A 50 میلیارد بساز',
  },
```

### Step 5: Verify frontend builds

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | tail -5
```

Expected: `✓ built` exit code 0.

### Step 6: Commit

```bash
git add frontend/src/features/financial-modeling/components/
git commit -m "feat(financial-modeling): add three-statement model UI card and quick-start prompts"
```

---

## Task 4: Final Verification + Push

### Step 1: Run full financial modeling test suite

```bash
docker run --rm -v /Users/cjd/TSE_Dashboard:/app -e PYTHONPATH=/app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  -w /app tse_dashboard-test \
  pytest tests/unit/test_financial_modeling_tools.py tests/unit/test_financial_modeling_agent.py \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" -v
```

Expected: ~124 PASS.

### Step 2: Run full unit suite (regression)

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

| Task | Change | Tests |
|------|--------|-------|
| 1 | `build_three_statement_model` (IS+BS+CFS, balance check) | 11 tests |
| 2 | Agent: 15 tools, chain docs updated | count + name assertions |
| 3 | Frontend: `three_statement` card + quick-start | npm build |
| 4 | Full regression + push | — |

If you need specific details from before exiting plan mode (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/cjd/.claude/projects/-Users-cjd-TSE-Dashboard/0be04709-75a1-444f-a95d-f072c896a7ed.jsonl
