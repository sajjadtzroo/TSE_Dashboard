# Financial Modeling Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated financial modeling section with chat-driven DCF, P&L, loan amortization, and bond pricing models that auto-fetch TSE/CODAL data and create Google Sheets.

**Architecture:** New `financial_modeling` RAG agent + 4 tools slot into the existing agent infrastructure. Dedicated `/financial-modeling` frontend page reuses `useSSEChat` and `useChatSessions`. Google Sheets created via service account. All monetary values in Billion Rials.

**Tech Stack:** Python (numpy-financial, gspread, google-auth), React 18 (Mantine v7), existing FastAPI RAG infrastructure.

**CFA Guide reference:** `docs/financial_modeling_guide.md` — formulas used:
- DCF: FCFF = EBIT(1-T) + D&A - CapEx - ΔWC (§12.1), Terminal Value via Gordon Growth (§13.3)
- Loan: bullet / balloon / fully-amortizing structures (§8.1–8.3)
- Bond: price, YTM, Macaulay/Modified duration (§8, §10)

---

## Task 1: Install dependencies + add settings

**Files:**
- Modify: `requirements.txt`
- Modify: `config/settings.py`

**Step 1: Add Python dependencies to requirements.txt**

```
gspread>=6.1.0
google-auth>=2.28.0
numpy-financial>=1.0.0
```

**Step 2: Add to config/settings.py** (before the final `settings = Settings()` line)

```python
# Google Sheets Integration
GOOGLE_SHEETS_CREDENTIALS_PATH: str = "config/google_service_account.json"
GOOGLE_SHEETS_ENABLED: bool = True
```

**Step 3: Commit**
```bash
git add requirements.txt config/settings.py
git commit -m "feat(financial-modeling): add gspread, google-auth, numpy-financial deps + settings"
```

---

## Task 2: Google Sheets helper + skeleton file

**Files:**
- Create: `rag/tools/financial_modeling.py`
- Create: `tests/unit/test_financial_modeling_tools.py`

**Step 1: Write failing test**

```python
# tests/unit/test_financial_modeling_tools.py
import json
from unittest.mock import MagicMock, patch
import pytest


class TestSheetsHelper:
    @patch("rag.tools.financial_modeling.gspread")
    @patch("rag.tools.financial_modeling.Credentials")
    def test_create_sheet_returns_url(self, mock_creds, mock_gspread):
        mock_client = MagicMock()
        mock_sh = MagicMock()
        mock_sh.url = "https://docs.google.com/spreadsheets/d/test123"
        mock_gspread.authorize.return_value = mock_client
        mock_client.create.return_value = mock_sh

        from rag.tools.financial_modeling import _create_and_share_sheet
        url = _create_and_share_sheet("Test Sheet", [])
        assert url == "https://docs.google.com/spreadsheets/d/test123"
        mock_sh.share.assert_called_once_with(None, perm_type="anyone", role="reader")
```

**Step 2: Run to verify it fails**
```bash
python -m pytest tests/unit/test_financial_modeling_tools.py::TestSheetsHelper -v --no-cov
```
Expected: `ModuleNotFoundError` or `ImportError`

**Step 3: Create rag/tools/financial_modeling.py**

```python
# rag/tools/financial_modeling.py
"""Financial modeling tools: DCF, P&L, Loan Amortization, Bond Pricing."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional

import numpy_financial as npf
from sqlalchemy.orm import Session

from config.settings import settings

logger = logging.getLogger(__name__)

_SHEETS_CLIENT = None  # module-level cache


def _get_sheets_client():
    global _SHEETS_CLIENT
    if not settings.GOOGLE_SHEETS_ENABLED:
        raise RuntimeError("GOOGLE_SHEETS_ENABLED is false")
    if _SHEETS_CLIENT is not None:
        return _SHEETS_CLIENT
    import gspread
    from google.oauth2.service_account import Credentials
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_file(
        settings.GOOGLE_SHEETS_CREDENTIALS_PATH, scopes=scopes
    )
    _SHEETS_CLIENT = gspread.authorize(creds)
    return _SHEETS_CLIENT


def _create_and_share_sheet(title: str, worksheets_data: list[dict]) -> str:
    """Create sheet, write worksheets_data, share publicly, return URL."""
    gc = _get_sheets_client()
    sh = gc.create(title)

    if worksheets_data:
        sh.sheet1.update_title(worksheets_data[0]["name"])
        if worksheets_data[0].get("data"):
            sh.sheet1.update("A1", worksheets_data[0]["data"])
        for ws_def in worksheets_data[1:]:
            ws = sh.add_worksheet(title=ws_def["name"], rows=200, cols=30)
            if ws_def.get("data"):
                ws.update("A1", ws_def["data"])

    sh.share(None, perm_type="anyone", role="reader")
    return sh.url
```

**Step 4: Run test to verify it passes**
```bash
python -m pytest tests/unit/test_financial_modeling_tools.py::TestSheetsHelper -v --no-cov
```
Expected: PASS

**Step 5: Commit**
```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add Google Sheets helper + test skeleton"
```

---

## Task 3: DCF tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Modify: `tests/unit/test_financial_modeling_tools.py`

Uses FCFF from CFA guide §12.1: `FCFF = EBIT(1-T) + D&A - CapEx - ΔWC`
Terminal Value: Gordon Growth `TV = FCFF_{n+1} / (WACC - g)` (§13.3)

**Step 1: Add failing tests**

```python
class TestDCFModel:
    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_dcf_fcff_formula(self, mock_sheets):
        """FCFF = EBIT(1-T) + D&A - CapEx - ΔWC (flat revenue → ΔWC = 0)"""
        mock_sheets.return_value = "https://docs.google.com/test"
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()

        result = json.loads(build_dcf_model(
            db,
            base_revenue=1000.0,
            revenue_growth_rate=0.0,  # flat → ΔWC = 0
            ebit_margin=0.20,
            da_pct=0.05,
            capex_pct=0.06,
            nwc_pct=0.10,
            tax_rate=0.25,
            wacc=0.20,
            terminal_growth_rate=0.05,
            net_debt=0.0,
            years=1,
        ))
        # revenue=1000, ebit=200, ebit(1-T)=150, da=50, capex=60, ΔWC=0
        # FCFF = 150 + 50 - 60 - 0 = 140
        assert abs(result["projections"]["fcff"][0] - 140.0) < 0.01

    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_dcf_equity_bridge(self, mock_sheets):
        mock_sheets.return_value = "https://docs.google.com/test"
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()

        result = json.loads(build_dcf_model(
            db, base_revenue=1000.0, net_debt=200.0, years=3,
        ))
        s = result["summary"]
        assert abs(s["equity_value_b"] - (s["enterprise_value_b"] - 200.0)) < 0.01

    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_dcf_wacc_lte_tg_returns_error(self, mock_sheets):
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()
        result = json.loads(build_dcf_model(
            db, base_revenue=1000.0, wacc=0.05, terminal_growth_rate=0.05,
        ))
        assert "error" in result

    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_dcf_sheets_disabled_returns_null_url(self, mock_sheets):
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()
        with patch("rag.tools.financial_modeling.settings") as ms:
            ms.GOOGLE_SHEETS_ENABLED = False
            result = json.loads(build_dcf_model(db, base_revenue=500.0))
        assert result["sheet_url"] is None
```

**Step 2: Run to verify fails**
```bash
python -m pytest tests/unit/test_financial_modeling_tools.py::TestDCFModel -v --no-cov
```

**Step 3: Implement build_dcf_model + _build_dcf_sheet**

Add to `rag/tools/financial_modeling.py`:

```python
def build_dcf_model(
    db: Session,
    ticker: Optional[str] = None,
    base_revenue: float = 1000.0,
    revenue_growth_rate: float = 0.15,
    ebit_margin: float = 0.20,
    da_pct: float = 0.05,
    capex_pct: float = 0.06,
    nwc_pct: float = 0.10,
    tax_rate: float = 0.25,
    wacc: float = 0.25,
    terminal_growth_rate: float = 0.05,
    net_debt: float = 0.0,
    shares_outstanding: Optional[float] = None,
    years: int = 5,
) -> str:
    """DCF via FCFF. FCFF = EBIT(1-T) + D&A - CapEx - ΔWC [CFA §12.1]"""
    if wacc <= terminal_growth_rate:
        return json.dumps({"error": "WACC must exceed terminal growth rate"}, ensure_ascii=False)

    revenues = [base_revenue * (1 + revenue_growth_rate) ** t for t in range(1, years + 1)]
    ebits = [r * ebit_margin for r in revenues]
    das = [r * da_pct for r in revenues]
    capexs = [r * capex_pct for r in revenues]

    nwcs = [r * nwc_pct for r in revenues]
    prev_nwcs = [base_revenue * nwc_pct] + nwcs[:-1]
    delta_nwcs = [nwcs[i] - prev_nwcs[i] for i in range(years)]

    fcffs = [
        ebits[i] * (1 - tax_rate) + das[i] - capexs[i] - delta_nwcs[i]
        for i in range(years)
    ]

    dfs = [(1 + wacc) ** -t for t in range(1, years + 1)]
    pv_fcffs = [fcffs[i] * dfs[i] for i in range(years)]

    # Terminal Value: Gordon Growth Model [CFA §13.3]
    tv = fcffs[-1] * (1 + terminal_growth_rate) / (wacc - terminal_growth_rate)
    pv_tv = tv * dfs[-1]

    ev = sum(pv_fcffs) + pv_tv
    eq = ev - net_debt
    per_share = (eq / shares_outstanding * 1e9) if shares_outstanding else None  # B Rials → Rials/share

    summary = {
        "enterprise_value_b": round(ev, 2),
        "equity_value_b": round(eq, 2),
        "intrinsic_value_per_share": round(per_share, 0) if per_share else None,
        "terminal_value_b": round(tv, 2),
        "pv_terminal_pct": round(pv_tv / ev * 100, 1),
        "wacc": wacc,
        "terminal_growth_rate": terminal_growth_rate,
    }

    sheet_url = None
    if settings.GOOGLE_SHEETS_ENABLED:
        try:
            sheet_url = _build_dcf_sheet(
                ticker=ticker, revenues=revenues, ebits=ebits, das=das,
                capexs=capexs, delta_nwcs=delta_nwcs, fcffs=fcffs,
                pv_fcffs=pv_fcffs, tv=tv, pv_tv=pv_tv, ev=ev, eq=eq,
                per_share=per_share, years=years,
                assumptions=dict(
                    base_revenue=base_revenue, revenue_growth_rate=revenue_growth_rate,
                    ebit_margin=ebit_margin, da_pct=da_pct, capex_pct=capex_pct,
                    nwc_pct=nwc_pct, tax_rate=tax_rate, wacc=wacc,
                    terminal_growth_rate=terminal_growth_rate,
                    net_debt=net_debt, shares_outstanding=shares_outstanding,
                ),
            )
        except Exception as e:
            logger.error(f"DCF sheet creation failed: {e}")

    return json.dumps({
        "model_type": "dcf",
        "ticker": ticker,
        "sheet_url": sheet_url,
        "summary": summary,
        "projections": {
            "years": list(range(1, years + 1)),
            "revenue": [round(v, 2) for v in revenues],
            "ebit": [round(v, 2) for v in ebits],
            "fcff": [round(v, 2) for v in fcffs],
            "pv_fcff": [round(v, 2) for v in pv_fcffs],
        },
    }, ensure_ascii=False)


def _build_dcf_sheet(ticker, revenues, ebits, das, capexs, delta_nwcs,
                     fcffs, pv_fcffs, tv, pv_tv, ev, eq, per_share, years, assumptions) -> str:
    pct = lambda x: f"{x * 100:.1f}%"
    r = lambda v, d=2: round(v, d) if v is not None else ""
    yr = ["Metric"] + [f"Year {i+1}" for i in range(years)]

    assumptions_data = [
        ["DCF Model Assumptions — Blue cells are inputs"], [""],
        ["Parameter", "Value"],
        ["Base Revenue (B Rials)", r(assumptions["base_revenue"])],
        ["Revenue Growth Rate", pct(assumptions["revenue_growth_rate"])],
        ["EBIT Margin", pct(assumptions["ebit_margin"])],
        ["D&A as % Revenue", pct(assumptions["da_pct"])],
        ["CapEx as % Revenue", pct(assumptions["capex_pct"])],
        ["NWC as % Revenue", pct(assumptions["nwc_pct"])],
        ["Tax Rate", pct(assumptions["tax_rate"])],
        ["WACC", pct(assumptions["wacc"])],
        ["Terminal Growth Rate (g)", pct(assumptions["terminal_growth_rate"])],
        ["Net Debt (B Rials)", r(assumptions["net_debt"])],
        ["Shares Outstanding (M)", r(assumptions.get("shares_outstanding")) or "N/A"],
        ["Projection Years", years],
    ]

    dcf_data = [
        yr,
        ["Revenue (B Rials)"] + [r(v) for v in revenues],
        ["EBIT (B Rials)"] + [r(v) for v in ebits],
        ["EBIT × (1−T)"] + [r(v * (1 - assumptions["tax_rate"])) for v in ebits],
        ["+ D&A"] + [r(v) for v in das],
        ["− CapEx"] + [r(-v) for v in capexs],
        ["− ΔNWC"] + [r(-v) for v in delta_nwcs],
        ["= FCFF (B Rials)"] + [r(v) for v in fcffs],
        ["Discount Factor"] + [r((1 + assumptions["wacc"]) ** -(i + 1), 4) for i in range(years)],
        ["PV of FCFF"] + [r(v) for v in pv_fcffs],
        [""],
        ["Sum PV(FCFF)", r(sum(pv_fcffs))],
        ["Terminal Value (Gordon Growth)", r(tv)],
        ["PV of Terminal Value", r(pv_tv)],
        [""],
        ["Enterprise Value (B Rials)", r(ev)],
        ["− Net Debt (B Rials)", r(assumptions["net_debt"])],
        ["= Equity Value (B Rials)", r(eq)],
        ["Intrinsic Value / Share (Rials)", r(per_share, 0) if per_share else "N/A"],
    ]

    w = assumptions["wacc"]
    g = assumptions["terminal_growth_rate"]
    w_range = [round(w + d, 3) for d in [-0.02, -0.01, 0, 0.01, 0.02]]
    g_range = [round(g + d, 3) for d in [-0.02, -0.01, 0, 0.01, 0.02]]

    sens_data = [["WACC \\ TG"] + [pct(t) for t in g_range]]
    for wi in w_range:
        row = [pct(wi)]
        for gi in g_range:
            if wi <= gi:
                row.append("N/A")
            else:
                tv_i = fcffs[-1] * (1 + gi) / (wi - gi)
                pv_tv_i = tv_i * (1 + wi) ** -years
                pv_ex = sum(fcffs[i] * (1 + wi) ** -(i + 1) for i in range(years))
                row.append(r(pv_ex + pv_tv_i))
        sens_data.append(row)

    title = f"DCF - {ticker or 'Custom'} ({datetime.now().strftime('%Y-%m-%d')})"
    return _create_and_share_sheet(title, [
        {"name": "Assumptions", "data": assumptions_data},
        {"name": "DCF Valuation", "data": dcf_data},
        {"name": "Sensitivity (WACC × TG)", "data": sens_data},
    ])
```

**Step 4: Run tests**
```bash
python -m pytest tests/unit/test_financial_modeling_tools.py::TestDCFModel -v --no-cov
```
Expected: 4 PASS

**Step 5: Commit**
```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add DCF tool (FCFF formula + sensitivity sheet)"
```

---

## Task 4: P&L projection tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Modify: `tests/unit/test_financial_modeling_tools.py`

**Step 1: Add failing tests**

```python
class TestPLModel:
    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_pl_margin_waterfall(self, mock_sheets):
        """Revenue → Gross Profit → EBITDA → EBIT → Net Income"""
        mock_sheets.return_value = "https://docs.google.com/test"
        from rag.tools.financial_modeling import build_pl_model
        db = MagicMock()

        result = json.loads(build_pl_model(
            db, base_revenue=1000.0, revenue_growth_rate=0.0,
            gross_margin=0.40, sga_pct=0.15, rd_pct=0.05,
            da_pct=0.05, tax_rate=0.25, years=1,
        ))
        p = result["projections"]
        # revenue=1000, gp=400, ebitda=400-150-50=200, ebit=200-50=150, ni=150*0.75=112.5
        assert abs(p["gross_profit"][0] - 400.0) < 0.01
        assert abs(p["ebitda"][0] - 200.0) < 0.01
        assert abs(p["ebit"][0] - 150.0) < 0.01
        assert abs(p["net_income"][0] - 112.5) < 0.01

    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_pl_revenue_grows(self, mock_sheets):
        mock_sheets.return_value = "https://docs.google.com/test"
        from rag.tools.financial_modeling import build_pl_model
        db = MagicMock()

        result = json.loads(build_pl_model(
            db, base_revenue=1000.0, revenue_growth_rate=0.10, years=2,
        ))
        p = result["projections"]
        assert abs(p["revenue"][0] - 1100.0) < 0.01
        assert abs(p["revenue"][1] - 1210.0) < 0.01
```

**Step 2: Run to verify fails**
```bash
python -m pytest tests/unit/test_financial_modeling_tools.py::TestPLModel -v --no-cov
```

**Step 3: Implement build_pl_model**

```python
def build_pl_model(
    db: Session,
    ticker: Optional[str] = None,
    base_revenue: float = 1000.0,
    revenue_growth_rate: float = 0.12,
    gross_margin: float = 0.40,
    sga_pct: float = 0.15,
    rd_pct: float = 0.05,
    da_pct: float = 0.05,
    tax_rate: float = 0.25,
    years: int = 5,
) -> str:
    """P&L projection: Revenue → Gross Profit → EBITDA → EBIT → Net Income"""
    revenues = [base_revenue * (1 + revenue_growth_rate) ** t for t in range(1, years + 1)]
    gross_profits = [r * gross_margin for r in revenues]
    cogs = [r * (1 - gross_margin) for r in revenues]
    sgas = [r * sga_pct for r in revenues]
    rds = [r * rd_pct for r in revenues]
    das = [r * da_pct for r in revenues]
    ebitdas = [gross_profits[i] - sgas[i] - rds[i] for i in range(years)]
    ebits = [ebitdas[i] - das[i] for i in range(years)]
    net_incomes = [max(0, ebits[i]) * (1 - tax_rate) for i in range(years)]

    sheet_url = None
    if settings.GOOGLE_SHEETS_ENABLED:
        try:
            pct = lambda x: f"{x * 100:.1f}%"
            r = lambda v: round(v, 2)
            yr = ["Metric"] + [f"Year {i+1}" for i in range(years)]

            pl_data = [
                yr,
                ["Revenue (B Rials)"] + [r(v) for v in revenues],
                ["− COGS"] + [r(v) for v in cogs],
                ["= Gross Profit"] + [r(v) for v in gross_profits],
                ["  Gross Margin %"] + [pct(gross_margin)] * years,
                [""],
                ["− SG&A"] + [r(v) for v in sgas],
                ["− R&D"] + [r(v) for v in rds],
                ["= EBITDA"] + [r(v) for v in ebitdas],
                ["  EBITDA Margin %"] + [pct(ebitdas[i] / revenues[i]) for i in range(years)],
                [""],
                ["− D&A"] + [r(v) for v in das],
                ["= EBIT"] + [r(v) for v in ebits],
                ["  EBIT Margin %"] + [pct(ebits[i] / revenues[i]) for i in range(years)],
                [""],
                ["− Tax"] + [r(max(0, ebits[i]) * tax_rate) for i in range(years)],
                ["= Net Income"] + [r(v) for v in net_incomes],
                ["  Net Margin %"] + [pct(net_incomes[i] / revenues[i]) for i in range(years)],
            ]

            assumptions_data = [
                ["P&L Assumptions"], [""],
                ["Parameter", "Value"],
                ["Base Revenue (B Rials)", base_revenue],
                ["Revenue Growth Rate", pct(revenue_growth_rate)],
                ["Gross Margin", pct(gross_margin)],
                ["SG&A % Revenue", pct(sga_pct)],
                ["R&D % Revenue", pct(rd_pct)],
                ["D&A % Revenue", pct(da_pct)],
                ["Tax Rate", pct(tax_rate)],
                ["Projection Years", years],
            ]

            title = f"P&L - {ticker or 'Custom'} ({datetime.now().strftime('%Y-%m-%d')})"
            sheet_url = _create_and_share_sheet(title, [
                {"name": "Assumptions", "data": assumptions_data},
                {"name": "P&L Projection", "data": pl_data},
            ])
        except Exception as e:
            logger.error(f"P&L sheet creation failed: {e}")

    return json.dumps({
        "model_type": "pl",
        "ticker": ticker,
        "sheet_url": sheet_url,
        "summary": {
            "year_1_revenue_b": round(revenues[0], 2),
            "year_1_ebitda_margin": round(ebitdas[0] / revenues[0], 4),
            "year_1_net_margin": round(net_incomes[0] / revenues[0], 4),
            f"year_{years}_revenue_b": round(revenues[-1], 2),
        },
        "projections": {
            "years": list(range(1, years + 1)),
            "revenue": [round(v, 2) for v in revenues],
            "gross_profit": [round(v, 2) for v in gross_profits],
            "ebitda": [round(v, 2) for v in ebitdas],
            "ebit": [round(v, 2) for v in ebits],
            "net_income": [round(v, 2) for v in net_incomes],
        },
    }, ensure_ascii=False)
```

**Step 4: Run tests**
```bash
python -m pytest tests/unit/test_financial_modeling_tools.py::TestPLModel -v --no-cov
```
Expected: 2 PASS

**Step 5: Commit**
```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add P&L projection tool"
```

---

## Task 5: Loan amortization tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Modify: `tests/unit/test_financial_modeling_tools.py`

Three structures from CFA guide §8:
- `bullet` — interest only, 100% principal at maturity (§8.1)
- `balloon` — partial amortization + balloon at maturity (§8.2)
- `fully_amortizing` — equal payments, zero balance at maturity (§8.3)

**Step 1: Add failing tests**

```python
class TestLoanAmortization:
    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_fully_amortizing_balance_zero(self, mock_sheets):
        mock_sheets.return_value = "https://docs.google.com/test"
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()

        result = json.loads(build_loan_amortization(
            db, principal=1_000_000, annual_rate=0.12, years=3,
            loan_type="fully_amortizing", frequency="annual",
        ))
        assert abs(result["schedule"][-1]["ending_balance"]) < 1.0

    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_bullet_principal_only_at_end(self, mock_sheets):
        mock_sheets.return_value = "https://docs.google.com/test"
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()

        result = json.loads(build_loan_amortization(
            db, principal=1_000_000, annual_rate=0.10, years=3,
            loan_type="bullet", frequency="annual",
        ))
        for row in result["schedule"][:-1]:
            assert row["principal_payment"] == 0.0
        assert result["schedule"][-1]["principal_payment"] == 1_000_000

    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_fully_amortizing_equal_payments(self, mock_sheets):
        mock_sheets.return_value = "https://docs.google.com/test"
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()

        result = json.loads(build_loan_amortization(
            db, principal=120_000, annual_rate=0.12, years=1,
            loan_type="fully_amortizing", frequency="monthly",
        ))
        payments = [row["total_payment"] for row in result["schedule"]]
        assert max(payments) - min(payments) < 1.0  # all payments equal
```

**Step 2: Run to verify fails**
```bash
python -m pytest tests/unit/test_financial_modeling_tools.py::TestLoanAmortization -v --no-cov
```

**Step 3: Implement build_loan_amortization**

```python
def build_loan_amortization(
    db: Session,
    principal: float = 1_000_000_000,
    annual_rate: float = 0.22,
    years: int = 5,
    loan_type: str = "fully_amortizing",
    balloon_pct: float = 0.30,
    frequency: str = "monthly",
) -> str:
    """
    Loan amortization schedule. [CFA guide §8.1–8.3]
    loan_type: fully_amortizing | bullet | balloon
    frequency: monthly | quarterly | annual
    """
    periods_per_year = {"monthly": 12, "quarterly": 4, "annual": 1}[frequency]
    total_periods = years * periods_per_year
    period_rate = annual_rate / periods_per_year

    schedule = []
    balance = float(principal)

    if loan_type == "fully_amortizing":
        payment = float(-npf.pmt(period_rate, total_periods, principal))
        for t in range(1, total_periods + 1):
            interest = balance * period_rate
            principal_pmt = payment - interest
            balance = max(0.0, balance - principal_pmt)
            schedule.append({
                "period": t,
                "total_payment": round(payment, 2),
                "interest_payment": round(interest, 2),
                "principal_payment": round(principal_pmt, 2),
                "ending_balance": round(balance, 2),
            })

    elif loan_type == "bullet":
        interest_pmt = principal * period_rate
        for t in range(1, total_periods + 1):
            is_last = t == total_periods
            schedule.append({
                "period": t,
                "total_payment": round(interest_pmt + (principal if is_last else 0), 2),
                "interest_payment": round(interest_pmt, 2),
                "principal_payment": float(principal) if is_last else 0.0,
                "ending_balance": 0.0 if is_last else round(principal, 2),
            })

    elif loan_type == "balloon":
        balloon = principal * balloon_pct
        amortizing = principal - balloon
        periodic_principal = amortizing / (total_periods - 1) if total_periods > 1 else amortizing
        for t in range(1, total_periods + 1):
            interest = balance * period_rate
            principal_pmt = balance if t == total_periods else periodic_principal
            balance = max(0.0, balance - principal_pmt)
            schedule.append({
                "period": t,
                "total_payment": round(interest + principal_pmt, 2),
                "interest_payment": round(interest, 2),
                "principal_payment": round(principal_pmt, 2),
                "ending_balance": round(balance, 2),
            })

    total_interest = sum(r["interest_payment"] for r in schedule)

    sheet_url = None
    if settings.GOOGLE_SHEETS_ENABLED:
        try:
            period_label = {"monthly": "Month", "quarterly": "Quarter", "annual": "Year"}[frequency]
            headers = [period_label, "Total Payment", "Interest", "Principal", "Ending Balance"]
            data = [headers] + [
                [r["period"], r["total_payment"], r["interest_payment"],
                 r["principal_payment"], r["ending_balance"]]
                for r in schedule
            ]
            summary_data = [
                ["Loan Summary"], [""],
                ["Parameter", "Value"],
                ["Loan Type", loan_type.replace("_", " ").title()],
                ["Principal", f"{principal:,.0f}"],
                ["Annual Rate", f"{annual_rate * 100:.2f}%"],
                ["Term (Years)", years],
                ["Frequency", frequency.title()],
                ["Total Periods", total_periods],
                ["Total Interest Paid", f"{total_interest:,.0f}"],
                ["Total Paid", f"{sum(r['total_payment'] for r in schedule):,.0f}"],
            ]
            title = f"Loan - {loan_type.replace('_', ' ').title()} ({datetime.now().strftime('%Y-%m-%d')})"
            sheet_url = _create_and_share_sheet(title, [
                {"name": "Summary", "data": summary_data},
                {"name": "Amortization Schedule", "data": data},
            ])
        except Exception as e:
            logger.error(f"Loan sheet creation failed: {e}")

    return json.dumps({
        "model_type": "loan_amortization",
        "sheet_url": sheet_url,
        "summary": {
            "loan_type": loan_type,
            "principal": principal,
            "annual_rate": annual_rate,
            "years": years,
            "frequency": frequency,
            "total_periods": total_periods,
            "total_interest_paid": round(total_interest, 2),
            "total_payments": round(sum(r["total_payment"] for r in schedule), 2),
        },
        "schedule": schedule[:24],  # first 24 periods in response body
    }, ensure_ascii=False)
```

**Step 4: Run tests**
```bash
python -m pytest tests/unit/test_financial_modeling_tools.py::TestLoanAmortization -v --no-cov
```
Expected: 3 PASS

**Step 5: Commit**
```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add loan amortization tool (bullet/balloon/fully-amortizing)"
```

---

## Task 6: Bond pricing tool

**Files:**
- Modify: `rag/tools/financial_modeling.py`
- Modify: `tests/unit/test_financial_modeling_tools.py`

**Step 1: Add failing tests**

```python
class TestBondModel:
    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_bond_at_par_when_coupon_equals_yield(self, mock_sheets):
        """When coupon rate == discount rate → price = face value"""
        mock_sheets.return_value = "https://docs.google.com/test"
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()

        result = json.loads(build_bond_model(
            db, face_value=1000.0, coupon_rate=0.08,
            maturity_years=5, discount_rate=0.08, frequency=1,
        ))
        assert abs(result["summary"]["price"] - 1000.0) < 0.01

    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_discount_bond_below_par(self, mock_sheets):
        """discount_rate > coupon_rate → price < face value"""
        mock_sheets.return_value = "https://docs.google.com/test"
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()

        result = json.loads(build_bond_model(
            db, face_value=1000.0, coupon_rate=0.06,
            maturity_years=5, discount_rate=0.08, frequency=1,
        ))
        assert result["summary"]["price"] < 1000.0

    @patch("rag.tools.financial_modeling._create_and_share_sheet")
    def test_macaulay_duration_lte_maturity(self, mock_sheets):
        mock_sheets.return_value = "https://docs.google.com/test"
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()

        result = json.loads(build_bond_model(
            db, face_value=1000.0, coupon_rate=0.06,
            maturity_years=5, discount_rate=0.08, frequency=1,
        ))
        s = result["summary"]
        assert 0 < s["macaulay_duration"] <= 5
        assert s["modified_duration"] < s["macaulay_duration"]
```

**Step 2: Run to verify fails**
```bash
python -m pytest tests/unit/test_financial_modeling_tools.py::TestBondModel -v --no-cov
```

**Step 3: Implement build_bond_model**

```python
def build_bond_model(
    db: Session,
    face_value: float = 1_000_000,
    coupon_rate: float = 0.18,
    maturity_years: int = 5,
    discount_rate: float = 0.20,
    bond_type: str = "bullet",
    frequency: int = 1,
) -> str:
    """
    Bond pricing, YTM, Macaulay duration, Modified duration. [CFA §8, §10]
    bond_type: bullet | fully_amortizing
    frequency: 1=annual, 2=semi-annual
    """
    total_periods = maturity_years * frequency
    period_rate = discount_rate / frequency
    coupon_pmt = face_value * coupon_rate / frequency

    # Build cash flow schedule
    if bond_type == "bullet":
        cash_flows = [coupon_pmt] * total_periods
        cash_flows[-1] += face_value
    else:  # fully_amortizing
        payment = float(-npf.pmt(period_rate, total_periods, face_value))
        cash_flows = [payment] * total_periods

    # Bond price = PV of cash flows
    price = sum(cf / (1 + period_rate) ** t for t, cf in enumerate(cash_flows, 1))

    # YTM via irr
    irr_cfs = [-price] + list(cash_flows)
    period_irr = float(npf.irr(irr_cfs))
    ytm = period_irr * frequency

    # Macaulay Duration = Σ[t/freq × PV(CF_t)] / Price  [CFA §10]
    mac_dur = sum(
        (t / frequency) * (cf / (1 + period_rate) ** t)
        for t, cf in enumerate(cash_flows, 1)
    ) / price
    mod_dur = mac_dur / (1 + period_rate)

    # Cash flow rows
    cf_rows = []
    balance = face_value
    for t, cf in enumerate(cash_flows, 1):
        if bond_type == "bullet":
            interest = coupon_pmt
            principal = face_value if t == total_periods else 0.0
        else:
            interest = balance * period_rate
            principal = cf - interest
            balance = max(0.0, balance - principal)
        cf_rows.append({
            "period": t,
            "coupon_interest": round(interest, 2),
            "principal": round(principal, 2),
            "total_cf": round(cf, 2),
            "pv_cf": round(cf / (1 + period_rate) ** t, 2),
        })

    summary = {
        "price": round(price, 2),
        "price_pct_par": round(price / face_value * 100, 2),
        "ytm": round(ytm, 6),
        "coupon_rate": coupon_rate,
        "macaulay_duration": round(mac_dur, 4),
        "modified_duration": round(mod_dur, 4),
        "bond_type": bond_type,
        "valuation": "premium" if price > face_value else ("discount" if price < face_value else "at par"),
    }

    sheet_url = None
    if settings.GOOGLE_SHEETS_ENABLED:
        try:
            period_label = "Semi-Annual Period" if frequency == 2 else "Year"
            cf_headers = [period_label, "Coupon/Interest", "Principal", "Total CF", "PV of CF"]
            cf_data = [cf_headers] + [
                [r["period"], r["coupon_interest"], r["principal"], r["total_cf"], r["pv_cf"]]
                for r in cf_rows
            ] + [["Total",
                  round(sum(r["coupon_interest"] for r in cf_rows), 2),
                  round(sum(r["principal"] for r in cf_rows), 2),
                  round(sum(r["total_cf"] for r in cf_rows), 2),
                  round(sum(r["pv_cf"] for r in cf_rows), 2)]]

            summary_data = [
                ["Bond Pricing Summary"], [""],
                ["Metric", "Value"],
                ["Face Value", f"{face_value:,.0f}"],
                ["Coupon Rate", f"{coupon_rate * 100:.2f}%"],
                ["Required Yield (Discount Rate)", f"{discount_rate * 100:.2f}%"],
                ["Maturity (Years)", maturity_years],
                ["Payment Frequency", f"{frequency}x / year"],
                ["Bond Type", bond_type.replace("_", " ").title()],
                [""],
                ["Bond Price", round(price, 2)],
                ["Price as % of Par", f"{price / face_value * 100:.2f}%"],
                ["YTM (annualized)", f"{ytm * 100:.4f}%"],
                ["Macaulay Duration", f"{mac_dur:.4f} years"],
                ["Modified Duration", f"{mod_dur:.4f}"],
                ["Valuation", summary["valuation"].title()],
            ]
            title = f"Bond - {coupon_rate*100:.0f}% coupon {maturity_years}Y ({datetime.now().strftime('%Y-%m-%d')})"
            sheet_url = _create_and_share_sheet(title, [
                {"name": "Summary", "data": summary_data},
                {"name": "Cash Flows", "data": cf_data},
            ])
        except Exception as e:
            logger.error(f"Bond sheet creation failed: {e}")

    return json.dumps({
        "model_type": "bond",
        "sheet_url": sheet_url,
        "summary": summary,
        "cash_flows": cf_rows,
    }, ensure_ascii=False)
```

**Step 4: Add TOOL_DEFINITIONS and TOOL_DISPATCH at the bottom of the file**

```python
# ── OpenAI Tool Schemas ────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "build_dcf_model",
            "description": "Build a DCF valuation using FCFF. Optionally auto-fetches TSE/CODAL data for a ticker. Creates Google Sheet with projections, equity bridge, and WACC×TG sensitivity table.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "TSE ticker (optional, fetches CODAL data)"},
                    "base_revenue": {"type": "number", "description": "Base year revenue in Billion Rials"},
                    "revenue_growth_rate": {"type": "number", "description": "Annual revenue growth (e.g. 0.15)"},
                    "ebit_margin": {"type": "number", "description": "EBIT / Revenue (e.g. 0.20)"},
                    "da_pct": {"type": "number", "description": "D&A / Revenue (default 0.05)"},
                    "capex_pct": {"type": "number", "description": "CapEx / Revenue (default 0.06)"},
                    "nwc_pct": {"type": "number", "description": "Net Working Capital / Revenue (default 0.10)"},
                    "tax_rate": {"type": "number", "description": "Corporate tax rate (default 0.25)"},
                    "wacc": {"type": "number", "description": "WACC (default 0.25 for Iran)"},
                    "terminal_growth_rate": {"type": "number", "description": "Terminal growth g (default 0.05, must be < WACC)"},
                    "net_debt": {"type": "number", "description": "Net Debt in Billion Rials for equity bridge"},
                    "shares_outstanding": {"type": "number", "description": "Shares outstanding in millions"},
                    "years": {"type": "integer", "description": "Projection years (default 5)"},
                },
                "required": ["base_revenue"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_pl_model",
            "description": "Build a P&L income statement projection with margin waterfall. Creates Google Sheet.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string"},
                    "base_revenue": {"type": "number", "description": "Base year revenue in Billion Rials"},
                    "revenue_growth_rate": {"type": "number"},
                    "gross_margin": {"type": "number", "description": "Gross Profit / Revenue (e.g. 0.40)"},
                    "sga_pct": {"type": "number", "description": "SG&A / Revenue (default 0.15)"},
                    "rd_pct": {"type": "number", "description": "R&D / Revenue (default 0.05)"},
                    "da_pct": {"type": "number", "description": "D&A / Revenue (default 0.05)"},
                    "tax_rate": {"type": "number"},
                    "years": {"type": "integer"},
                },
                "required": ["base_revenue"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_loan_amortization",
            "description": "Build a loan amortization schedule. Supports bullet (interest-only), balloon (partial amortization), and fully-amortizing (equal payments). Creates Google Sheet.",
            "parameters": {
                "type": "object",
                "properties": {
                    "principal": {"type": "number", "description": "Loan principal in Rials"},
                    "annual_rate": {"type": "number", "description": "Annual interest rate (e.g. 0.22)"},
                    "years": {"type": "integer", "description": "Loan term in years"},
                    "loan_type": {"type": "string", "enum": ["fully_amortizing", "bullet", "balloon"]},
                    "balloon_pct": {"type": "number", "description": "Balloon: fraction of principal remaining at maturity (default 0.30)"},
                    "frequency": {"type": "string", "enum": ["monthly", "quarterly", "annual"]},
                },
                "required": ["principal", "annual_rate", "years"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_bond_model",
            "description": "Price a bond and compute YTM, Macaulay duration, Modified duration. Creates Google Sheet.",
            "parameters": {
                "type": "object",
                "properties": {
                    "face_value": {"type": "number", "description": "Face value in Rials (default 1,000,000)"},
                    "coupon_rate": {"type": "number", "description": "Annual coupon rate (e.g. 0.18)"},
                    "maturity_years": {"type": "integer"},
                    "discount_rate": {"type": "number", "description": "Required yield"},
                    "bond_type": {"type": "string", "enum": ["bullet", "fully_amortizing"]},
                    "frequency": {"type": "integer", "description": "Coupons per year: 1=annual, 2=semi-annual"},
                },
                "required": ["coupon_rate", "maturity_years", "discount_rate"],
            },
        },
    },
]

TOOL_DISPATCH = {
    "build_dcf_model": build_dcf_model,
    "build_pl_model": build_pl_model,
    "build_loan_amortization": build_loan_amortization,
    "build_bond_model": build_bond_model,
}
```

**Step 5: Run all tool tests**
```bash
python -m pytest tests/unit/test_financial_modeling_tools.py -v --no-cov
```
Expected: All PASS

**Step 6: Commit**
```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add bond pricing tool + TOOL_DEFINITIONS/DISPATCH"
```

---

## Task 7: Financial modeling agent

**Files:**
- Create: `rag/agents/financial_modeling.py`
- Create: `tests/unit/test_financial_modeling_agent.py`

**Step 1: Write failing test**

```python
# tests/unit/test_financial_modeling_agent.py
def test_build_config():
    from rag.agents.financial_modeling import build_config
    from rag.agents.base import AgentConfig

    config = build_config()
    assert isinstance(config, AgentConfig)
    assert config.name == "financial_modeling"
    assert len(config.tool_definitions) == 4
    names = {t["function"]["name"] for t in config.tool_definitions}
    assert names == {"build_dcf_model", "build_pl_model", "build_loan_amortization", "build_bond_model"}
    assert "build_dcf_model" in config.tool_dispatch
    assert config.temperature <= 0.3
    assert config.max_tool_rounds >= 3
```

**Step 2: Run to verify fails**
```bash
python -m pytest tests/unit/test_financial_modeling_agent.py -v --no-cov
```

**Step 3: Create rag/agents/financial_modeling.py**

```python
# rag/agents/financial_modeling.py
"""Financial modeling agent: DCF, P&L, Loan Amortization, Bond Pricing."""
from rag.agents.base import AgentConfig
from rag.tools.financial_modeling import TOOL_DEFINITIONS, TOOL_DISPATCH

SYSTEM_PROMPT = """You are a CFA-trained financial modeling assistant for the Tehran Stock Exchange (TSE).

You help users build financial models by:
1. Extracting assumptions from natural language (Persian or English)
2. Using auto-fetched CODAL/TSE financial data when a ticker is provided
3. Calling the appropriate tool to build the model and create a Google Sheet
4. Explaining key outputs clearly (intrinsic value, WACC, duration, etc.)

Rules:
- All monetary values are in Billion Rials unless the user specifies otherwise
- Default WACC for Iranian companies: 20–28% (high inflation environment)
- Default corporate tax rate: 25%
- Default terminal growth rate: 5–8% (conservative for Iran)
- If critical assumptions are missing, ask ONE clarifying question before calling a tool
- After building a model, explain the key metrics in plain language
- Always share the Google Sheet link when available
- Respond in the same language as the user (Persian or English)

Model selection guide:
- Equity valuation / stock price → build_dcf_model
- Revenue/cost planning / income statement → build_pl_model
- Loan or mortgage analysis → build_loan_amortization
- Bond / fixed income pricing → build_bond_model"""


def build_config() -> AgentConfig:
    return AgentConfig(
        name="financial_modeling",
        system_prompt=SYSTEM_PROMPT,
        tool_definitions=TOOL_DEFINITIONS,
        tool_dispatch=TOOL_DISPATCH,
        max_tool_rounds=5,
        temperature=0.2,
        max_tokens=3000,
    )
```

**Step 4: Run test**
```bash
python -m pytest tests/unit/test_financial_modeling_agent.py -v --no-cov
```
Expected: PASS

**Step 5: Commit**
```bash
git add rag/agents/financial_modeling.py tests/unit/test_financial_modeling_agent.py
git commit -m "feat(financial-modeling): add financial modeling agent"
```

---

## Task 8: Router, agent registry, and tool registry updates

**Files:**
- Modify: `rag/agents/router.py`
- Modify: `rag/agents/__init__.py`
- Modify: `rag/tools/__init__.py`

**Step 1: Write failing test**

```python
# tests/unit/test_router_financial_modeling.py
def test_financial_modeling_intent_in_enum():
    from rag.agents.router import AgentIntent
    assert AgentIntent.FINANCIAL_MODELING == "financial_modeling"

def test_get_agent_financial_modeling():
    from rag.agents import get_agent
    agent = get_agent("financial_modeling")
    assert agent is not None
    assert agent.config.name == "financial_modeling"
```

**Step 2: Run to verify fails**
```bash
python -m pytest tests/unit/test_router_financial_modeling.py -v --no-cov
```

**Step 3: Update rag/agents/router.py**

Add `FINANCIAL_MODELING` to `AgentIntent` enum:
```python
class AgentIntent(StrEnum):
    MARKET_DATA = "market_data"
    DOCUMENT_QA = "document_qa"
    TECHNICAL_ANALYSIS = "technical_analysis"
    COMPARISON = "comparison"
    LOAN_ADVISOR = "loan_advisor"
    CRYPTO = "crypto"
    CFA_FINANCE = "cfa_finance"
    PORTFOLIO_ADVISOR = "portfolio_advisor"
    FINANCIAL_MODELING = "financial_modeling"  # ← add
    GENERAL = "general"
```

Add to the router system prompt (in the list of categories):
```
- financial_modeling: User wants to BUILD a financial model or run a valuation calculation.
  Examples: "build a DCF for FOLD", "model loan amortization", "price a bond with 18% coupon",
  "create a P&L projection", "مدل DCF بسازید", "مدل مالی", "ارزش‌گذاری", "استهلاک وام", "قیمت اوراق".
  DISTINCT from cfa_finance (which is educational Q&A, not model building).
```

Add keyword boost (after existing boost blocks, before the return statement):
```python
FINANCIAL_MODELING_KEYWORDS = [
    "dcf", "discounted cash flow", "fcff", "fcfe", "build model", "financial model",
    "amortization schedule", "loan schedule", "bond price", "bond pricing", "ytm",
    "yield to maturity", "p&l projection", "income statement model", "valuation model",
    "مدل مالی", "ارزش‌گذاری", "جریان نقد آزاد", "استهلاک وام", "قیمت اوراق",
    "بازده تا سررسید", "مدل dcf", "پیش‌بینی سود و زیان",
]

if any(kw in message_lower for kw in FINANCIAL_MODELING_KEYWORDS):
    if intent != AgentIntent.FINANCIAL_MODELING or confidence < 0.85:
        intent = AgentIntent.FINANCIAL_MODELING
        confidence = 0.90
```

**Step 4: Update rag/agents/__init__.py**

Add the financial_modeling entry (follow exact existing lazy-import pattern in the file):
```python
"financial_modeling": ("rag.agents.financial_modeling", "build_config"),
```

**Step 5: Update rag/tools/__init__.py**

Add import (follow exact existing pattern):
```python
from rag.tools.financial_modeling import (
    TOOL_DEFINITIONS as FM_DEFINITIONS,
    TOOL_DISPATCH as FM_DISPATCH,
)
```

Add `FM_DEFINITIONS` to `ALL_TOOL_DEFINITIONS` list and `FM_DISPATCH` to `ALL_TOOL_DISPATCH` dict.

**Step 6: Run tests**
```bash
python -m pytest tests/unit/test_router_financial_modeling.py -v --no-cov
```
Expected: 2 PASS

**Step 7: Commit**
```bash
git add rag/agents/router.py rag/agents/__init__.py rag/tools/__init__.py
git commit -m "feat(financial-modeling): register agent, router intent, tool registry"
```

---

## Task 9: Frontend — ModelResultCard + ModelEmptyState

**Files:**
- Create: `frontend/src/features/financial-modeling/components/ModelResultCard.jsx`
- Create: `frontend/src/features/financial-modeling/components/ModelEmptyState.jsx`

**Step 1: Create ModelResultCard.jsx**

```jsx
// frontend/src/features/financial-modeling/components/ModelResultCard.jsx
import { Paper, Text, Group, Badge, Button, Stack, SimpleGrid, Divider } from '@mantine/core';
import { IconExternalLink, IconChartBar, IconBuildingBank, IconCoin, IconTrendingUp } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

const MODEL_META = {
  dcf:              { label: 'DCF Valuation',     color: 'blue',   Icon: IconChartBar },
  pl:               { label: 'P&L Projection',    color: 'green',  Icon: IconTrendingUp },
  loan_amortization:{ label: 'Loan Schedule',     color: 'orange', Icon: IconBuildingBank },
  bond:             { label: 'Bond Pricing',       color: 'violet', Icon: IconCoin },
};

const METRIC_LABELS = {
  enterprise_value_b:       'Enterprise Value (B ﷼)',
  equity_value_b:           'Equity Value (B ﷼)',
  intrinsic_value_per_share:'Value / Share (﷼)',
  wacc:                     'WACC',
  terminal_growth_rate:     'Terminal Growth',
  pv_terminal_pct:          'Terminal Value %',
  price:                    'Bond Price (﷼)',
  ytm:                      'YTM',
  macaulay_duration:        'Macaulay Duration',
  modified_duration:        'Modified Duration',
  year_1_ebitda_margin:     'Yr1 EBITDA Margin',
  total_interest_paid:      'Total Interest (﷼)',
};

function fmt(key, v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') {
    if (['wacc','terminal_growth_rate','year_1_ebitda_margin'].includes(key))
      return `${(v * 100).toFixed(1)}%`;
    if (key === 'pv_terminal_pct') return `${v.toFixed(1)}%`;
    if (key === 'ytm') return `${(v * 100).toFixed(2)}%`;
    if (key.includes('duration')) return `${v.toFixed(2)}y`;
    return v.toLocaleString('fa-IR', { maximumFractionDigits: 1 });
  }
  return String(v);
}

export default function ModelResultCard({ modelType, summary = {}, sheetUrl, ticker }) {
  const meta = MODEL_META[modelType] || MODEL_META.dcf;
  const { Icon } = meta;
  const metrics = Object.entries(summary)
    .filter(([k, v]) => METRIC_LABELS[k] && v !== null && v !== undefined)
    .slice(0, 4);

  return (
    <Paper p="md" radius="md" mt={8}
      style={{ background: rallyColors.surface2, border: `1px solid ${rallyColors.border}` }}
    >
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Icon size={16} color={rallyColors.accent} />
          <Badge color={meta.color} variant="light" size="sm">{meta.label}</Badge>
          {ticker && <Badge variant="outline" size="sm">{ticker.toUpperCase()}</Badge>}
        </Group>
        {sheetUrl && (
          <Button component="a" href={sheetUrl} target="_blank" rel="noopener noreferrer"
            size="xs" variant="light" color="green"
            rightSection={<IconExternalLink size={12} />}
          >
            Open in Google Sheets
          </Button>
        )}
      </Group>
      <Divider mb="sm" color={rallyColors.border} />
      <SimpleGrid cols={2} spacing="xs">
        {metrics.map(([k, v]) => (
          <Stack key={k} gap={2}>
            <Text size="xs" c="dimmed">{METRIC_LABELS[k]}</Text>
            <Text size="sm" fw={600} c={rallyColors.text}>{fmt(k, v)}</Text>
          </Stack>
        ))}
      </SimpleGrid>
    </Paper>
  );
}
```

**Step 2: Create ModelEmptyState.jsx**

```jsx
// frontend/src/features/financial-modeling/components/ModelEmptyState.jsx
import { Stack, Text, SimpleGrid, UnstyledButton, ThemeIcon, Group } from '@mantine/core';
import { IconChartBar, IconTrendingUp, IconBuildingBank, IconCoin } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

const TEMPLATES = [
  { Icon: IconChartBar,      labelFa: 'ارزش‌گذاری DCF',      label: 'DCF Valuation',   color: 'blue',
    prompt: 'یک مدل DCF بسازید. نماد: ' },
  { Icon: IconTrendingUp,    labelFa: 'پیش‌بینی سود و زیان', label: 'P&L Projection',  color: 'green',
    prompt: 'یک پیش‌بینی سود و زیان ۵ ساله بسازید. درآمد پایه: ' },
  { Icon: IconBuildingBank,  labelFa: 'استهلاک وام',         label: 'Loan Schedule',   color: 'orange',
    prompt: 'جدول استهلاک وام بسازید. مبلغ: ' },
  { Icon: IconCoin,          labelFa: 'قیمت‌گذاری اوراق',    label: 'Bond Pricing',    color: 'violet',
    prompt: 'اوراق با نرخ کوپن ' },
];

export default function ModelEmptyState({ onSelectTemplate }) {
  return (
    <Stack align="center" py={48} px={24} gap="xl">
      <Stack align="center" gap={4}>
        <Text size="xl" fw={700} c={rallyColors.text}>مدل‌ساز مالی</Text>
        <Text size="sm" c="dimmed" ta="center">
          یک نوع مدل انتخاب کنید یا مستقیم فرض‌هایتان را بنویسید
        </Text>
      </Stack>
      <SimpleGrid cols={2} spacing="sm" w="100%" maw={380}>
        {TEMPLATES.map((t) => (
          <UnstyledButton key={t.label} onClick={() => onSelectTemplate(t.prompt)}
            style={{
              padding: 14, borderRadius: 8,
              border: `1px solid ${rallyColors.border}`,
              background: rallyColors.surface2, cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = rallyColors.accent}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = rallyColors.border}
          >
            <Group gap="sm">
              <ThemeIcon color={t.color} variant="light" size="md">
                <t.Icon size={14} />
              </ThemeIcon>
              <Stack gap={2}>
                <Text size="xs" fw={600} c={rallyColors.text}>{t.labelFa}</Text>
                <Text size="xs" c="dimmed">{t.label}</Text>
              </Stack>
            </Group>
          </UnstyledButton>
        ))}
      </SimpleGrid>
      <Text size="xs" c="dimmed" ta="center" maw={360}>
        مثال: «یک DCF برای فولاد با درآمد ۵۰۰۰ میلیارد تومان و رشد ۱۵٪ بسازید»
      </Text>
    </Stack>
  );
}
```

**Step 3: Commit**
```bash
git add frontend/src/features/financial-modeling/
git commit -m "feat(financial-modeling): add ModelResultCard and ModelEmptyState"
```

---

## Task 10: Frontend — ModelSidebar + ModelChatArea

**Files:**
- Create: `frontend/src/features/financial-modeling/components/ModelSidebar.jsx`
- Create: `frontend/src/features/financial-modeling/components/ModelChatArea.jsx`

**Step 1: Create ModelSidebar.jsx**

```jsx
// frontend/src/features/financial-modeling/components/ModelSidebar.jsx
import { Stack, Text, Button, ScrollArea, UnstyledButton, Group, ActionIcon, Divider } from '@mantine/core';
import { IconPlus, IconChartBar, IconTrendingUp, IconBuildingBank, IconCoin, IconTrash } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

const TEMPLATE_ITEMS = [
  { Icon: IconChartBar,     labelFa: 'ارزش‌گذاری DCF' },
  { Icon: IconTrendingUp,   labelFa: 'سود و زیان' },
  { Icon: IconBuildingBank, labelFa: 'استهلاک وام' },
  { Icon: IconCoin,         labelFa: 'قیمت اوراق' },
];

export default function ModelSidebar({ sessions = [], activeSessionId, onNewSession, onSelectSession, onDeleteSession }) {
  return (
    <Stack h="100%" gap={0} style={{ borderInlineEnd: `1px solid ${rallyColors.border}` }}>
      <Stack p="md" pb="sm">
        <Button leftSection={<IconPlus size={14} />} variant="light" fullWidth onClick={onNewSession} size="sm">
          مدل جدید
        </Button>
      </Stack>
      <Divider color={rallyColors.border} />
      <ScrollArea flex={1} px="md" py="sm">
        {sessions.length > 0 && (
          <Stack gap={4} mb="md">
            <Text size="xs" c="dimmed" fw={600} mb={4}>مدل‌های اخیر</Text>
            {sessions.map((s) => (
              <Group key={s.id} gap={4} wrap="nowrap">
                <UnstyledButton flex={1} onClick={() => onSelectSession(s.id)}
                  style={{
                    padding: '6px 8px', borderRadius: 6,
                    background: s.id === activeSessionId ? rallyColors.surface3 : 'transparent',
                  }}
                >
                  <Text size="xs" c={rallyColors.text} truncate>{s.title || 'مدل بدون نام'}</Text>
                </UnstyledButton>
                <ActionIcon size="xs" variant="subtle" color="red" onClick={() => onDeleteSession(s.id)}>
                  <IconTrash size={12} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        )}
        <Stack gap={4}>
          <Text size="xs" c="dimmed" fw={600} mb={4}>قالب‌ها</Text>
          {TEMPLATE_ITEMS.map((t) => (
            <Group key={t.labelFa} gap="xs" px={8} py={6} style={{ borderRadius: 6 }}>
              <t.Icon size={13} color={rallyColors.textMuted} />
              <Text size="xs" c={rallyColors.textMuted}>{t.labelFa}</Text>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
```

**Step 2: Create ModelChatArea.jsx**

```jsx
// frontend/src/features/financial-modeling/components/ModelChatArea.jsx
import { useState, useRef, useEffect } from 'react';
import { Stack, ScrollArea, Group, Textarea, ActionIcon } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { useSSEChat } from '../../chat/hooks/useSSEChat';
import MessageBubble from '../../chat/components/MessageBubble';
import ThinkingIndicator from '../../chat/components/ThinkingIndicator';
import ModelResultCard from './ModelResultCard';
import ModelEmptyState from './ModelEmptyState';
import rallyColors from '../../../theme/rallyColors';

function parseModelResult(content = '') {
  try {
    const m = content.match(/```json\n([\s\S]*?)\n```/);
    if (m) { const p = JSON.parse(m[1]); if (p.model_type) return p; }
    const i = content.indexOf('{"model_type":');
    if (i !== -1) { const p = JSON.parse(content.slice(i)); if (p.model_type) return p; }
  } catch {}
  return null;
}

export default function ModelChatArea({ messages, onMessagesUpdate, model }) {
  const [input, setInput] = useState('');
  const viewport = useRef(null);

  const { sendMessage, isStreaming, streamingContent } = useSSEChat({
    model,
    onMessageComplete: (msg) => onMessagesUpdate((prev) => [...prev, msg]),
  });

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const userMsg = { role: 'user', content: input.trim() };
    onMessagesUpdate((prev) => [...prev, userMsg]);
    sendMessage([...messages, userMsg]);
    setInput('');
  };

  return (
    <Stack h="100%" gap={0}>
      <ScrollArea flex={1} viewportRef={viewport} p="md">
        {messages.length === 0 && !isStreaming ? (
          <ModelEmptyState onSelectTemplate={(p) => setInput(p)} />
        ) : (
          <Stack gap="sm">
            {messages.map((msg, idx) => {
              const mr = msg.role === 'assistant' ? parseModelResult(msg.content) : null;
              return (
                <Stack key={idx} gap={4}>
                  <MessageBubble message={msg} />
                  {mr && <ModelResultCard modelType={mr.model_type} summary={mr.summary}
                    sheetUrl={mr.sheet_url} ticker={mr.ticker} />}
                </Stack>
              );
            })}
            {isStreaming && (
              <Stack gap={4}>
                {streamingContent
                  ? <MessageBubble message={{ role: 'assistant', content: streamingContent }} />
                  : <ThinkingIndicator />}
              </Stack>
            )}
          </Stack>
        )}
      </ScrollArea>
      <Group p="sm" gap="xs" align="flex-end"
        style={{ borderTop: `1px solid ${rallyColors.border}` }}
      >
        <Textarea flex={1}
          placeholder="فرض‌های مدل را بنویسید... مثلاً: DCF برای فولاد با درآمد ۵۰۰۰ میلیارد"
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          autosize minRows={1} maxRows={4}
          styles={{ input: { background: rallyColors.surface2, borderColor: rallyColors.border, color: rallyColors.text } }}
        />
        <ActionIcon size="lg" variant="filled" color="blue"
          onClick={handleSend} disabled={!input.trim() || isStreaming}
        >
          <IconSend size={16} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
```

**Step 3: Commit**
```bash
git add frontend/src/features/financial-modeling/
git commit -m "feat(financial-modeling): add ModelSidebar and ModelChatArea"
```

---

## Task 11: ModelingLayout + FinancialModelingPage

**Files:**
- Create: `frontend/src/features/financial-modeling/components/ModelingLayout.jsx`
- Create: `frontend/src/pages/FinancialModelingPage.jsx`

**Step 1: Create ModelingLayout.jsx**

```jsx
// frontend/src/features/financial-modeling/components/ModelingLayout.jsx
import { useState } from 'react';
import { Group, ActionIcon, Text, Box } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useChatSessions } from '../../chat/hooks/useChatSessions';
import ModelSidebar from './ModelSidebar';
import ModelChatArea from './ModelChatArea';
import rallyColors from '../../../theme/rallyColors';

export default function ModelingLayout() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const { sessions, activeSessionId, createSession, loadSession, deleteSession } = useChatSessions();

  const handleNewSession = () => {
    setMessages([]);
    createSession({ title: 'مدل مالی جدید' });
  };

  const handleSelectSession = async (id) => {
    const loaded = await loadSession(id);
    if (loaded?.messages) setMessages(loaded.messages);
  };

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: rallyColors.bg }}>
      <Group px="md" py="sm" gap="sm"
        style={{ borderBottom: `1px solid ${rallyColors.border}`, background: rallyColors.surface, flexShrink: 0 }}
      >
        <ActionIcon variant="subtle" onClick={() => navigate('/dashboard')}>
          <IconArrowRight size={16} />
        </ActionIcon>
        <Text fw={600} c={rallyColors.text}>مدل‌ساز مالی</Text>
      </Group>
      <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box style={{ width: 260, flexShrink: 0, overflow: 'hidden' }}>
          <ModelSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onNewSession={handleNewSession}
            onSelectSession={handleSelectSession}
            onDeleteSession={deleteSession}
          />
        </Box>
        <Box style={{ flex: 1, overflow: 'hidden' }}>
          <ModelChatArea messages={messages} onMessagesUpdate={setMessages} model={null} />
        </Box>
      </Box>
    </Box>
  );
}
```

**Step 2: Create FinancialModelingPage.jsx**

```jsx
// frontend/src/pages/FinancialModelingPage.jsx
import ModelingLayout from '../features/financial-modeling/components/ModelingLayout';

export default function FinancialModelingPage() {
  return <ModelingLayout />;
}
```

**Step 3: Commit**
```bash
git add frontend/src/features/financial-modeling/ frontend/src/pages/FinancialModelingPage.jsx
git commit -m "feat(financial-modeling): add ModelingLayout and FinancialModelingPage"
```

---

## Task 12: App.jsx route + navigation link

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/constants/navigation.js`

**Step 1: Add lazy import in App.jsx**

In the lazy imports block (around line 100–112), add:
```jsx
const FinancialModelingPage = lazyRetry(
  () => import('./pages/FinancialModelingPage'),
  'FinancialModelingPage'
);
```

**Step 2: Add route in App.jsx**

In the standalone pages section (same block as `/pricing`, `/tutorial`, etc.), add:
```jsx
<Route path="/financial-modeling" element={<FinancialModelingPage />} />
```

**Step 3: Add nav link in navigation.js**

In the **ابزارها (Tools)** section, add:
```js
{
  text: 'مدل‌ساز مالی',
  icon: IconCalculator,   // add to imports at top of file if not already present
  path: '/financial-modeling',
},
```

Add `IconCalculator` to the import from `@tabler/icons-react` at the top of `navigation.js`.

**Step 4: Verify the frontend builds**
```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | tail -30
```
Expected: No errors.

**Step 5: Commit**
```bash
cd /Users/cjd/TSE_Dashboard
git add frontend/src/App.jsx frontend/src/constants/navigation.js
git commit -m "feat(financial-modeling): add /financial-modeling route and nav link"
```

---

## Final verification

Run the full backend test suite to confirm no regressions:
```bash
python -m pytest tests/unit/ -v --no-cov -q 2>&1 | tail -30
```
Expected: All pre-existing tests pass + 10+ new tests pass.

Check the frontend dev server loads the new route:
```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run dev
# Navigate to http://localhost:5173/financial-modeling
```

---

## What's NOT in Phase 1 (Phase 2+)

- PDF/Excel upload for auto-extracting financials
- Auto-fetch CODAL 3Y historical data into tools (ticker param wired up)
- Sensitivity analysis for P&L
- Multi-stage DCF / DDM
- PDF tearsheet export
- Per-user Google Drive (OAuth)
