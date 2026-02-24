# rag/tools/financial_modeling.py
"""Financial modeling tools: DCF, P&L, Loan Amortization, Bond Pricing."""
from __future__ import annotations

import json
import logging
import uuid
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

try:
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
    EXCEL_AVAILABLE = True
except ImportError:  # pragma: no cover
    openpyxl = None  # type: ignore[assignment]
    EXCEL_AVAILABLE = False

logger = logging.getLogger(__name__)

# Lazy import to avoid circular imports at module load time
def _get_excel_models_dir() -> Path:
    from config.settings import EXCEL_MODELS_DIR
    return EXCEL_MODELS_DIR


# ── Excel styling helpers ─────────────────────────────────────────────────────

_FILL_HEADER  = PatternFill("solid", fgColor="1C2030") if EXCEL_AVAILABLE else None
_FILL_INPUT   = PatternFill("solid", fgColor="FFFDE7") if EXCEL_AVAILABLE else None
_FILL_FORMULA = PatternFill("solid", fgColor="E3F2FD") if EXCEL_AVAILABLE else None
_FILL_RESULT  = PatternFill("solid", fgColor="E8F5E9") if EXCEL_AVAILABLE else None

_FONT_HEADER  = Font(bold=True, color="FFFFFF") if EXCEL_AVAILABLE else None
_FONT_RESULT  = Font(bold=True) if EXCEL_AVAILABLE else None
_ALIGN_CENTER = Alignment(horizontal="center") if EXCEL_AVAILABLE else None


def _style_header(cell):
    cell.fill = _FILL_HEADER
    cell.font = _FONT_HEADER
    cell.alignment = _ALIGN_CENTER


def _style_input(cell):
    cell.fill = _FILL_INPUT


def _style_formula(cell):
    cell.fill = _FILL_FORMULA


def _style_result(cell):
    cell.fill = _FILL_RESULT
    cell.font = _FONT_RESULT


def _auto_width(ws, min_width: int = 12):
    """Set column widths to max content length."""
    for col in ws.columns:
        max_len = min_width
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            try:
                v = str(cell.value or "")
                if len(v) > max_len:
                    max_len = len(v)
            except Exception:
                pass
        ws.column_dimensions[col_letter].width = min(max_len + 2, 40)


def _save_excel(wb, title: str) -> str | None:
    """Save workbook to data/models/{uuid}.xlsx, return file_id or None."""
    if not EXCEL_AVAILABLE:
        return None
    try:
        models_dir = _get_excel_models_dir()
        models_dir.mkdir(parents=True, exist_ok=True)
        file_id = str(uuid.uuid4())
        path = models_dir / f"{file_id}.xlsx"
        wb.save(str(path))
        return file_id
    except Exception as exc:
        logger.warning("Excel save failed: %s", exc)
        return None


# ── DCF Tool ──────────────────────────────────────────────────────────────────

def _compute_fcff(ebit: float, tax_rate: float, da: float, capex: float, delta_wc: float) -> float:
    """FCFF = EBIT(1-T) + D&A - CapEx - ΔWC"""
    return ebit * (1 - tax_rate) + da - capex - delta_wc


def _build_dcf_workbook(
    company_name: str,
    projections: list[dict],
    wacc: float,
    terminal_growth: float,
    net_debt: float,
    shares_outstanding: float,
    pv_sum: float,
):
    wb = openpyxl.Workbook()

    # ── Sheet 1: Assumptions (user-editable inputs) ───────────────────────────
    ws_a = wb.active
    ws_a.title = "Assumptions"
    ws_a.sheet_view.rightToLeft = True

    ws_a["A1"] = f"DCF Model — {company_name}"
    ws_a["A1"].font = Font(bold=True, size=14)
    ws_a.merge_cells("A1:B1")

    for col, h in enumerate(["Parameter", "Value"], 1):
        _style_header(ws_a.cell(row=3, column=col, value=h))

    inputs = [
        ("WACC", wacc),
        ("Terminal Growth Rate", terminal_growth),
        ("Net Debt (B IRR)", net_debt),
        ("Shares Outstanding (M)", shares_outstanding),
    ]
    for r, (label, val) in enumerate(inputs, 4):
        ws_a.cell(row=r, column=1, value=label)
        _style_input(ws_a.cell(row=r, column=2, value=val))

    _auto_width(ws_a)

    # ── Sheet 2: DCF Valuation ────────────────────────────────────────────────
    ws_d = wb.create_sheet("DCF")
    ws_d.sheet_view.rightToLeft = True

    n = len(projections)
    ws_d.cell(row=1, column=1, value="Item")
    _style_header(ws_d.cell(row=1, column=1))
    for i in range(n):
        c = ws_d.cell(row=1, column=i + 2, value=f"Year {i+1}")
        _style_header(c)

    row_labels = {
        2: "Year #",
        3: "EBIT (B IRR)",
        4: "Tax Rate",
        5: "D&A (B IRR)",
        6: "CapEx (B IRR)",
        7: "Delta WC (B IRR)",
    }
    for row_num, label in row_labels.items():
        ws_d.cell(row=row_num, column=1, value=label)

    for i, proj in enumerate(projections):
        col = i + 2
        ws_d.cell(row=2, column=col, value=i + 1)
        for row_num, key in [(3, "ebit"), (4, "tax_rate"), (5, "da"), (6, "capex"), (7, "delta_wc")]:
            _style_input(ws_d.cell(row=row_num, column=col, value=proj[key]))

    # Row 8: FCFF formula =B3*(1-B4)+B5-B6-B7
    ws_d.cell(row=8, column=1, value="FCFF (B IRR)")
    for i in range(n):
        cl = get_column_letter(i + 2)
        c = ws_d.cell(row=8, column=i + 2)
        c.value = f"={cl}3*(1-{cl}4)+{cl}5-{cl}6-{cl}7"
        _style_formula(c)

    # Row 9: Discount factor =(1+Assumptions!$B$4)^B2
    ws_d.cell(row=9, column=1, value="Discount Factor")
    for i in range(n):
        cl = get_column_letter(i + 2)
        c = ws_d.cell(row=9, column=i + 2)
        c.value = f"=(1+Assumptions!$B$4)^{cl}2"
        _style_formula(c)

    # Row 10: PV of FCFF =B8/B9
    ws_d.cell(row=10, column=1, value="PV of FCFF")
    for i in range(n):
        cl = get_column_letter(i + 2)
        c = ws_d.cell(row=10, column=i + 2)
        c.value = f"={cl}8/{cl}9"
        _style_formula(c)

    # Terminal value block (rows 13–21)
    last_col = get_column_letter(n + 1)
    first_pv_col = get_column_letter(2)

    tv_rows = [
        ("Sum PV FCFFs",        f"=SUM({first_pv_col}10:{last_col}10)"),
        ("Terminal FCFF",        f"={last_col}8*(1+Assumptions!$B$5)"),
        ("Terminal Value",       f"=B14/(Assumptions!$B$4-Assumptions!$B$5)"),
        ("PV Terminal Value",    f"=B15/(1+Assumptions!$B$4)^{n}"),
        ("Enterprise Value",     "=B13+B16"),
        ("(-) Net Debt",         "=Assumptions!$B$6"),
        ("Equity Value",         "=B17-B18"),
        ("Shares (M)",           "=Assumptions!$B$7"),
        ("Price / Share (IRR)",  "=B19/B20"),
    ]
    for r_offset, (label, formula) in enumerate(tv_rows):
        row = 13 + r_offset
        ws_d.cell(row=row, column=1, value=label)
        _style_result(ws_d.cell(row=row, column=2, value=formula))

    _auto_width(ws_d)

    # ── Sheet 3: Sensitivity (Python-computed) ────────────────────────────────
    ws_s = wb.create_sheet("Sensitivity")
    ws_s.sheet_view.rightToLeft = True

    _style_header(ws_s.cell(row=1, column=1, value="WACC \\ Terminal Growth"))

    last_fcff = _compute_fcff(
        projections[-1]["ebit"],
        projections[-1]["tax_rate"],
        projections[-1]["da"],
        projections[-1]["capex"],
        projections[-1]["delta_wc"],
    )
    last_fcff_grown = last_fcff * (1 + terminal_growth)
    net_debt_val = inputs[2][1]  # net_debt

    wacc_range = [round(wacc - 0.04 + i * 0.01, 4) for i in range(9)]
    tg_range = [round(terminal_growth - 0.02 + i * 0.01, 4) for i in range(5)]

    for col_i, tg in enumerate(tg_range, 2):
        _style_header(ws_s.cell(row=1, column=col_i, value=f"{round(tg * 100, 1)}%"))

    for row_i, w in enumerate(wacc_range, 2):
        ws_s.cell(row=row_i, column=1, value=f"{round(w * 100, 1)}%")
        for col_i, tg in enumerate(tg_range, 2):
            if w <= tg:
                ws_s.cell(row=row_i, column=col_i, value="N/A")
            else:
                tv = last_fcff_grown / (w - tg)
                pv_tv = tv / (1 + w) ** n
                ev = pv_sum + pv_tv
                eq = ev - net_debt
                ps = round(eq / shares_outstanding, 2) if shares_outstanding else 0
                ws_s.cell(row=row_i, column=col_i, value=ps)

    _auto_width(ws_s)
    return wb


def build_dcf_model(
    db: Session,
    company_name: str,
    projections: list[dict],
    wacc: float,
    terminal_growth: float,
    net_debt: float = 0.0,
    shares_outstanding: float = 1000.0,
) -> str:
    """
    Build a DCF valuation model.

    Args:
        company_name: Company name for the spreadsheet title.
        projections: List of annual projections, each with keys:
            ebit, tax_rate, da, capex, delta_wc (all in billion IRR).
        wacc: Weighted average cost of capital (decimal, e.g. 0.22 for 22%).
        terminal_growth: Terminal growth rate (decimal, e.g. 0.03 for 3%).
        net_debt: Net debt = total debt - cash (billion IRR).
        shares_outstanding: Total shares in millions.

    Returns:
        JSON string with keys: enterprise_value, equity_value, price_per_share,
        pv_fcff, pv_terminal, download_url (null if Excel unavailable), model_type.
    """
    if wacc <= terminal_growth:
        return json.dumps({"error": "WACC must be greater than terminal growth rate (WACC > TG)"})

    if not projections:
        return json.dumps({"error": "At least one projection year is required"})

    # Compute values
    pv_sum = 0.0
    for i, proj in enumerate(projections):
        fcff = _compute_fcff(
            proj["ebit"], proj["tax_rate"], proj["da"], proj["capex"], proj["delta_wc"]
        )
        pv_sum += fcff / (1 + wacc) ** (i + 1)

    last_fcff = _compute_fcff(
        projections[-1]["ebit"],
        projections[-1]["tax_rate"],
        projections[-1]["da"],
        projections[-1]["capex"],
        projections[-1]["delta_wc"],
    )
    last_fcff_grown = last_fcff * (1 + terminal_growth)
    terminal_value = last_fcff_grown / (wacc - terminal_growth)
    pv_terminal = terminal_value / (1 + wacc) ** len(projections)

    enterprise_value = pv_sum + pv_terminal
    equity_value = enterprise_value - net_debt
    price_per_share = equity_value / shares_outstanding if shares_outstanding else 0

    download_url = None
    if EXCEL_AVAILABLE:
        try:
            wb = _build_dcf_workbook(
                company_name, projections, wacc, terminal_growth,
                net_debt, shares_outstanding, pv_sum,
            )
            file_id = _save_excel(wb, f"DCF-{company_name}")
            if file_id:
                download_url = f"/api/financial-modeling/download/{file_id}"
        except Exception as e:
            logger.warning("DCF Excel creation failed: %s", e)

    return json.dumps({
        "model_type": "dcf",
        "company_name": company_name,
        "enterprise_value": round(enterprise_value, 2),
        "equity_value": round(equity_value, 2),
        "price_per_share": round(price_per_share, 2),
        "pv_fcff": round(pv_sum, 2),
        "pv_terminal": round(pv_terminal, 2),
        "wacc_pct": round(wacc * 100, 2),
        "terminal_growth_pct": round(terminal_growth * 100, 2),
        "download_url": download_url,
    })


# ── P&L Tool ──────────────────────────────────────────────────────────────────

def _build_pl_workbook(
    company_name: str,
    years: list[dict],
    gross_margin: float,
    ebitda_margin: float,
    da_pct: float,
    interest_expense: float,
    tax_rate: float,
):
    wb = openpyxl.Workbook()

    # ── Sheet 1: Assumptions ─────────────────────────────────────────────────
    ws_a = wb.active
    ws_a.title = "PL_Assumptions"
    ws_a.sheet_view.rightToLeft = True

    ws_a["A1"] = f"P&L Model — {company_name}"
    ws_a["A1"].font = Font(bold=True, size=14)
    ws_a.merge_cells("A1:B1")

    for col, h in enumerate(["Parameter", "Value"], 1):
        _style_header(ws_a.cell(row=3, column=col, value=h))

    pl_inputs = [
        ("Gross Margin", gross_margin),
        ("EBITDA Margin", ebitda_margin),
        ("D&A % of Revenue", da_pct),
        ("Tax Rate", tax_rate),
        ("Interest Expense (B IRR)", interest_expense),
    ]
    for r, (label, val) in enumerate(pl_inputs, 4):
        ws_a.cell(row=r, column=1, value=label)
        _style_input(ws_a.cell(row=r, column=2, value=val))

    _auto_width(ws_a)

    # ── Sheet 2: P&L ─────────────────────────────────────────────────────────
    ws_p = wb.create_sheet("P&L")
    ws_p.sheet_view.rightToLeft = True

    n = len(years)
    _style_header(ws_p.cell(row=1, column=1, value="Item"))
    for i, y in enumerate(years):
        _style_header(ws_p.cell(row=1, column=i + 2, value=f"Year {y['year']}"))

    # Row 2: Revenue (static computed values)
    ws_p.cell(row=2, column=1, value="Revenue (B IRR)")
    for i, y in enumerate(years):
        _style_input(ws_p.cell(row=2, column=i + 2, value=y["revenue"]))

    # Rows 3-5: margin formulas referencing PL_Assumptions
    # PL_Assumptions: B4=gross_margin, B5=ebitda_margin, B6=da_pct, B7=tax_rate, B8=interest_expense
    margin_rows = [
        (3, "Gross Profit",  "PL_Assumptions!$B$4"),
        (4, "EBITDA",        "PL_Assumptions!$B$5"),
        (5, "D&A",           "PL_Assumptions!$B$6"),
    ]
    for row_num, label, margin_ref in margin_rows:
        ws_p.cell(row=row_num, column=1, value=label)
        for i in range(n):
            cl = get_column_letter(i + 2)
            _style_formula(ws_p.cell(row=row_num, column=i + 2, value=f"={cl}2*{margin_ref}"))

    # Row 6: EBIT = EBITDA - D&A
    ws_p.cell(row=6, column=1, value="EBIT")
    for i in range(n):
        cl = get_column_letter(i + 2)
        _style_formula(ws_p.cell(row=6, column=i + 2, value=f"={cl}4-{cl}5"))

    # Row 7: Interest expense (constant from assumptions B8)
    ws_p.cell(row=7, column=1, value="Interest Expense (B IRR)")
    for i in range(n):
        _style_input(ws_p.cell(row=7, column=i + 2, value="=PL_Assumptions!$B$8"))

    # Row 8: EBT
    ws_p.cell(row=8, column=1, value="EBT")
    for i in range(n):
        cl = get_column_letter(i + 2)
        _style_formula(ws_p.cell(row=8, column=i + 2, value=f"={cl}6-{cl}7"))

    # Row 9: Tax =IF(B8>0,B8*PL_Assumptions!$B$7,0)
    ws_p.cell(row=9, column=1, value="Tax")
    for i in range(n):
        cl = get_column_letter(i + 2)
        _style_formula(ws_p.cell(row=9, column=i + 2, value=f"=IF({cl}8>0,{cl}8*PL_Assumptions!$B$7,0)"))

    # Row 10: Net Income =EBT - Tax
    ws_p.cell(row=10, column=1, value="Net Income")
    for i in range(n):
        cl = get_column_letter(i + 2)
        _style_result(ws_p.cell(row=10, column=i + 2, value=f"={cl}8-{cl}9"))

    _auto_width(ws_p)
    return wb


def build_pl_model(
    db: Session,
    company_name: str,
    base_revenue: float,
    revenue_growth_rates: list[float],
    gross_margin: float,
    ebitda_margin: float,
    da_pct: float,
    interest_expense: float,
    tax_rate: float,
) -> str:
    """
    Build a multi-year P&L projection model.

    Args:
        company_name: Company name.
        base_revenue: Base year revenue (billion IRR).
        revenue_growth_rates: List of annual growth rates (decimals), one per year.
        gross_margin: Gross profit / Revenue (decimal).
        ebitda_margin: EBITDA / Revenue (decimal).
        da_pct: D&A as % of Revenue (decimal).
        interest_expense: Annual interest expense (billion IRR, constant).
        tax_rate: Corporate tax rate (decimal).

    Returns:
        JSON string with projected P&L for each year + download_url.
    """
    years = []
    revenue = base_revenue

    for i, growth in enumerate(revenue_growth_rates):
        revenue = revenue * (1 + growth)
        gross_profit = revenue * gross_margin
        ebitda = revenue * ebitda_margin
        da = revenue * da_pct
        ebit = ebitda - da
        ebt = ebit - interest_expense
        net_income = ebt * (1 - tax_rate) if ebt > 0 else ebt
        net_margin = net_income / revenue if revenue else 0

        years.append({
            "year": i + 1,
            "revenue": round(revenue, 2),
            "gross_profit": round(gross_profit, 2),
            "gross_margin_pct": round(gross_margin * 100, 2),
            "ebitda": round(ebitda, 2),
            "ebitda_margin_pct": round(ebitda_margin * 100, 2),
            "da": round(da, 2),
            "ebit": round(ebit, 2),
            "ebit_margin_pct": round(ebit / revenue * 100, 2) if revenue else 0,
            "interest_expense": round(interest_expense, 2),
            "ebt": round(ebt, 2),
            "tax": round(ebt * tax_rate, 2) if ebt > 0 else 0,
            "net_income": round(net_income, 2),
            "net_margin_pct": round(net_margin * 100, 2),
        })

    download_url = None
    if EXCEL_AVAILABLE:
        try:
            wb = _build_pl_workbook(
                company_name, years,
                gross_margin, ebitda_margin, da_pct, interest_expense, tax_rate,
            )
            file_id = _save_excel(wb, f"PL-{company_name}")
            if file_id:
                download_url = f"/api/financial-modeling/download/{file_id}"
        except Exception as e:
            logger.warning("P&L Excel creation failed: %s", e)

    return json.dumps({
        "model_type": "pl",
        "company_name": company_name,
        "projections": years,
        "download_url": download_url,
    })


# ── Math helpers (numpy_financial fallbacks) ─────────────────────────────────

def _pmt(rate: float, nper: int, pv: float) -> float:
    """PMT: periodic payment for a fully-amortizing loan.

    Formula: PMT = PV * r * (1+r)^n / ((1+r)^n - 1)
    """
    if rate == 0:
        return pv / nper
    factor = (1 + rate) ** nper
    return pv * rate * factor / (factor - 1)


def _irr(cash_flows: list[float], max_iter: int = 100, tol: float = 1e-6) -> float | None:
    """Compute IRR via Newton-Raphson. Returns per-period rate or None on failure."""
    rate = 0.1
    for _ in range(max_iter):
        npv = sum(cf / (1 + rate) ** t for t, cf in enumerate(cash_flows))
        dnpv = sum(-t * cf / (1 + rate) ** (t + 1) for t, cf in enumerate(cash_flows))
        if abs(dnpv) < 1e-12:
            break
        new_rate = rate - npv / dnpv
        if abs(new_rate - rate) < tol:
            return new_rate
        rate = new_rate
    return rate if abs(sum(cf / (1 + rate) ** t for t, cf in enumerate(cash_flows))) < 0.01 else None


# ── Loan Amortization Tool ────────────────────────────────────────────────────

def _build_loan_workbook(
    principal: float,
    annual_rate: float,
    term_months: int,
    loan_type: str,
    schedule: list[dict],
):
    wb = openpyxl.Workbook()

    # ── Sheet 1: Inputs ───────────────────────────────────────────────────────
    ws_i = wb.active
    ws_i.title = "Inputs"
    ws_i.sheet_view.rightToLeft = True

    ws_i["A1"] = "Loan Amortization Schedule"
    ws_i["A1"].font = Font(bold=True, size=14)
    ws_i.merge_cells("A1:B1")

    for col, h in enumerate(["Parameter", "Value"], 1):
        _style_header(ws_i.cell(row=3, column=col, value=h))

    loan_inputs = [
        ("Principal (M IRR)", principal),
        ("Annual Rate",       annual_rate),
        ("Term (months)",     term_months),
        ("Loan Type",         loan_type),
    ]
    for r, (label, val) in enumerate(loan_inputs, 4):
        ws_i.cell(row=r, column=1, value=label)
        _style_input(ws_i.cell(row=r, column=2, value=val))

    # PMT formula for fully_amortizing (informational)
    if loan_type == "fully_amortizing":
        ws_i.cell(row=9, column=1, value="Monthly Payment (PMT)")
        _style_result(ws_i.cell(row=9, column=2, value="=PMT(B5/12,B6,-B4)"))

    _auto_width(ws_i)

    # ── Sheet 2: Schedule ─────────────────────────────────────────────────────
    ws_s = wb.create_sheet("Schedule")
    ws_s.sheet_view.rightToLeft = True

    for col, h in enumerate(["Month", "Payment", "Principal", "Interest", "Balance"], 1):
        _style_header(ws_s.cell(row=1, column=col, value=h))

    if loan_type == "fully_amortizing":
        # Month 1 — reference Inputs!B9 for payment
        ws_s.cell(row=2, column=1, value=1)
        _style_formula(ws_s.cell(row=2, column=2, value="=Inputs!$B$9"))
        # Interest month 1: principal * monthly_rate
        _style_formula(ws_s.cell(row=2, column=4, value="=Inputs!$B$4*Inputs!$B$5/12"))
        # Principal = payment - interest
        _style_formula(ws_s.cell(row=2, column=3, value="=B2-D2"))
        # Balance = principal - principal_payment
        _style_formula(ws_s.cell(row=2, column=5, value="=Inputs!$B$4-C2"))

        for row in range(3, term_months + 2):
            prev = row - 1
            ws_s.cell(row=row, column=1, value=row - 1)
            _style_formula(ws_s.cell(row=row, column=2, value="=Inputs!$B$9"))
            _style_formula(ws_s.cell(row=row, column=4, value=f"=E{prev}*Inputs!$B$5/12"))
            _style_formula(ws_s.cell(row=row, column=3, value=f"=B{row}-D{row}"))
            _style_formula(ws_s.cell(row=row, column=5, value=f"=E{prev}-C{row}"))
    else:
        # bullet/balloon: write computed values
        for row_i, s in enumerate(schedule, 2):
            ws_s.cell(row=row_i, column=1, value=s["month"])
            ws_s.cell(row=row_i, column=2, value=s["payment"])
            ws_s.cell(row=row_i, column=3, value=s["principal"])
            ws_s.cell(row=row_i, column=4, value=s["interest"])
            ws_s.cell(row=row_i, column=5, value=s["balance"])

    _auto_width(ws_s)
    return wb


def build_loan_amortization(
    db: Session,
    principal: float,
    annual_rate: float,
    term_months: int,
    loan_type: str = "fully_amortizing",
    balloon_month: Optional[int] = None,
) -> str:
    """
    Build a loan amortization schedule.

    Args:
        principal: Loan principal amount (million IRR).
        annual_rate: Annual interest rate (decimal, e.g. 0.18 for 18%).
        term_months: Total loan term in months.
        loan_type: One of 'fully_amortizing', 'bullet', 'balloon'.
        balloon_month: Month at which balloon payment occurs (required for 'balloon' type).

    Returns:
        JSON string with amortization schedule + summary + download_url.
    """
    try:
        import numpy_financial as npf
        _pmt_fn = lambda r, n, pv: -npf.pmt(r, n, pv)
        _irr_fn = npf.irr
    except ImportError:
        _pmt_fn = _pmt
        _irr_fn = _irr

    monthly_rate = annual_rate / 12

    if loan_type == "fully_amortizing":
        monthly_payment = _pmt_fn(monthly_rate, term_months, principal)

        schedule = []
        balance = principal
        total_interest = 0.0
        for month in range(1, term_months + 1):
            interest = balance * monthly_rate
            principal_payment = monthly_payment - interest
            balance = max(0.0, balance - principal_payment)
            total_interest += interest
            schedule.append({
                "month": month,
                "payment": round(monthly_payment, 2),
                "principal": round(principal_payment, 2),
                "interest": round(interest, 2),
                "balance": round(balance, 2),
            })

        summary = {
            "loan_type": "fully_amortizing",
            "principal": principal,
            "monthly_payment": round(monthly_payment, 2),
            "total_paid": round(monthly_payment * term_months, 2),
            "total_interest": round(total_interest, 2),
            "final_balance": schedule[-1]["balance"],
        }

    elif loan_type == "bullet":
        monthly_payment = principal * monthly_rate
        schedule = []
        total_interest = 0.0
        for month in range(1, term_months + 1):
            interest = principal * monthly_rate
            balloon = principal if month == term_months else 0.0
            payment = interest + balloon
            total_interest += interest
            schedule.append({
                "month": month,
                "payment": round(payment, 2),
                "principal": round(balloon, 2),
                "interest": round(interest, 2),
                "balance": round(principal if month < term_months else 0.0, 2),
            })

        summary = {
            "loan_type": "bullet",
            "principal": principal,
            "monthly_interest_payment": round(monthly_payment, 2),
            "balloon_payment_month": term_months,
            "balloon_amount": round(principal + monthly_payment, 2),
            "total_paid": round(monthly_payment * term_months + principal, 2),
            "total_interest": round(total_interest, 2),
            "final_balance": 0.0,
        }

    elif loan_type == "balloon":
        if balloon_month is None or balloon_month >= term_months:
            balloon_month = term_months - 1

        extended_term = term_months * 2
        monthly_payment = _pmt_fn(monthly_rate, extended_term, principal)

        schedule = []
        balance = principal
        total_interest = 0.0
        for month in range(1, term_months + 1):
            interest = balance * monthly_rate
            if month == term_months:
                payment = balance + interest
                principal_payment = balance
                balance = 0.0
            else:
                principal_payment = monthly_payment - interest
                balance = max(0.0, balance - principal_payment)
                payment = monthly_payment
            total_interest += interest
            schedule.append({
                "month": month,
                "payment": round(payment, 2),
                "principal": round(principal_payment, 2),
                "interest": round(interest, 2),
                "balance": round(balance, 2),
            })

        summary = {
            "loan_type": "balloon",
            "principal": principal,
            "monthly_payment": round(monthly_payment, 2),
            "balloon_month": term_months,
            "balloon_amount": round(schedule[-1]["payment"], 2),
            "total_paid": round(sum(s["payment"] for s in schedule), 2),
            "total_interest": round(total_interest, 2),
            "final_balance": 0.0,
        }

    else:
        return json.dumps({"error": f"Unknown loan_type: {loan_type}. Use 'fully_amortizing', 'bullet', or 'balloon'."})

    download_url = None
    if EXCEL_AVAILABLE:
        try:
            wb = _build_loan_workbook(principal, annual_rate, term_months, loan_type, schedule)
            file_id = _save_excel(wb, f"Loan-{loan_type}")
            if file_id:
                download_url = f"/api/financial-modeling/download/{file_id}"
        except Exception as e:
            logger.warning("Loan Excel creation failed: %s", e)

    return json.dumps({
        "model_type": "loan_amortization",
        "summary": summary,
        "schedule": schedule,
        "download_url": download_url,
    })


# ── Bond Pricing Tool ─────────────────────────────────────────────────────────

def _build_bond_workbook(
    face_value: float,
    coupon_rate: float,
    ytm: float,
    periods: int,
    frequency: int,
    price: float,
    ytm_from_irr: float,
    macaulay_duration_years: float,
    modified_duration: float,
    schedule: list[dict],
):
    wb = openpyxl.Workbook()

    # ── Sheet 1: Inputs ───────────────────────────────────────────────────────
    ws_i = wb.active
    ws_i.title = "Inputs"
    ws_i.sheet_view.rightToLeft = True

    ws_i["A1"] = "Bond Pricing Model"
    ws_i["A1"].font = Font(bold=True, size=14)
    ws_i.merge_cells("A1:B1")

    for col, h in enumerate(["Parameter", "Value"], 1):
        _style_header(ws_i.cell(row=3, column=col, value=h))

    bond_inputs = [
        ("Face Value (IRR)", face_value),
        ("Coupon Rate",      coupon_rate),
        ("YTM",              ytm),
        ("Periods",          periods),
        ("Frequency",        frequency),
    ]
    for r, (label, val) in enumerate(bond_inputs, 4):
        ws_i.cell(row=r, column=1, value=label)
        _style_input(ws_i.cell(row=r, column=2, value=val))

    # Excel PV formula
    ws_i.cell(row=10, column=1, value="Bond Price (PV formula)")
    _style_result(ws_i.cell(row=10, column=2, value="=-PV(B6/B8,B7,-B4*B5/B8,-B4)"))

    # Computed metrics (static — duration is verbose in Excel)
    static_metrics = [
        ("Computed Price",           round(price, 2)),
        ("YTM from IRR (%)",         round(ytm_from_irr * 100, 4)),
        ("Macaulay Duration (yrs)",  round(macaulay_duration_years, 4)),
        ("Modified Duration",        round(modified_duration, 4)),
    ]
    for r_offset, (label, val) in enumerate(static_metrics):
        row = 12 + r_offset
        ws_i.cell(row=row, column=1, value=label)
        ws_i.cell(row=row, column=2, value=val)

    _auto_width(ws_i)

    # ── Sheet 2: Cash Flows ───────────────────────────────────────────────────
    ws_c = wb.create_sheet("Cash Flows")
    ws_c.sheet_view.rightToLeft = True

    for col, h in enumerate(["Period", "Coupon", "Principal", "Total CF", "PV"], 1):
        _style_header(ws_c.cell(row=1, column=col, value=h))

    # Row 2: purchase price (negative) for IRR
    ws_c.cell(row=2, column=1, value=0)
    ws_c.cell(row=2, column=4, value=-round(price, 2))

    for row_i, s in enumerate(schedule, 3):
        ws_c.cell(row=row_i, column=1, value=s["period"])
        ws_c.cell(row=row_i, column=2, value=s["coupon"])
        ws_c.cell(row=row_i, column=3, value=s["principal"])
        ws_c.cell(row=row_i, column=4, value=s["total_cash_flow"])
        ws_c.cell(row=row_i, column=5, value=s["pv"])

    # IRR formula over D range (D2 = -price, D3..D(n+2) = cash flows)
    irr_row = periods + 4
    ws_c.cell(row=irr_row, column=1, value="Periodic YTM (IRR)")
    _style_result(ws_c.cell(row=irr_row, column=2, value=f"=IRR(D2:D{periods + 2})"))

    _auto_width(ws_c)
    return wb


def build_bond_model(
    db: Session,
    face_value: float,
    coupon_rate: float,
    periods: int,
    ytm: float,
    frequency: int = 1,
) -> str:
    """
    Build a bond pricing and risk metrics model.

    Args:
        face_value: Face/par value of the bond (IRR).
        coupon_rate: Annual coupon rate (decimal, e.g. 0.18 for 18%).
        periods: Number of coupon periods until maturity.
        ytm: Yield to maturity used for pricing (decimal).
        frequency: Coupon payments per year (1=annual, 2=semi-annual).

    Returns:
        JSON string with price, ytm, Macaulay duration, Modified duration, download_url.
    """
    try:
        import numpy_financial as npf
        _irr_fn = npf.irr
    except ImportError:
        _irr_fn = _irr

    periodic_ytm = ytm / frequency
    periodic_coupon = face_value * coupon_rate / frequency

    # Bond price = PV of coupons + PV of face value
    price = 0.0
    for t in range(1, periods + 1):
        price += periodic_coupon / (1 + periodic_ytm) ** t
    price += face_value / (1 + periodic_ytm) ** periods

    # Macaulay Duration
    weighted_time = 0.0
    for t in range(1, periods + 1):
        pv_cf = periodic_coupon / (1 + periodic_ytm) ** t
        weighted_time += t * pv_cf
    weighted_time += periods * face_value / (1 + periodic_ytm) ** periods
    macaulay_duration = weighted_time / price
    macaulay_duration_years = macaulay_duration / frequency

    # Modified Duration
    modified_duration = macaulay_duration_years / (1 + ytm / frequency)

    # YTM verification via IRR
    cash_flows = [-price] + [periodic_coupon] * (periods - 1) + [periodic_coupon + face_value]
    try:
        irr_periodic = _irr_fn(cash_flows)
        ytm_from_irr = irr_periodic * frequency if irr_periodic is not None else ytm
    except Exception:
        ytm_from_irr = ytm

    # Build schedule
    schedule = []
    for t in range(1, periods + 1):
        coupon_payment = periodic_coupon
        principal = face_value if t == periods else 0.0
        schedule.append({
            "period": t,
            "coupon": round(coupon_payment, 2),
            "principal": round(principal, 2),
            "total_cash_flow": round(coupon_payment + principal, 2),
            "pv": round((coupon_payment + principal) / (1 + periodic_ytm) ** t, 2),
        })

    download_url = None
    if EXCEL_AVAILABLE:
        try:
            wb = _build_bond_workbook(
                face_value, coupon_rate, ytm, periods, frequency,
                price, ytm_from_irr, macaulay_duration_years, modified_duration,
                schedule,
            )
            file_id = _save_excel(wb, "Bond")
            if file_id:
                download_url = f"/api/financial-modeling/download/{file_id}"
        except Exception as e:
            logger.warning("Bond Excel creation failed: %s", e)

    return json.dumps({
        "model_type": "bond",
        "face_value": face_value,
        "coupon_rate_pct": round(coupon_rate * 100, 2),
        "ytm_pct": round(ytm * 100, 2),
        "periods": periods,
        "frequency": frequency,
        "price": round(price, 2),
        "ytm_from_irr_pct": round(ytm_from_irr * 100, 4),
        "macaulay_duration_years": round(macaulay_duration_years, 4),
        "modified_duration": round(modified_duration, 4),
        "schedule": schedule,
        "download_url": download_url,
    })


# ── Tool Definitions ──────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "build_dcf_model",
            "description": (
                "Build a Discounted Cash Flow (DCF) valuation model. "
                "Calculates FCFF, enterprise value, equity value, and price per share. "
                "Creates an Excel spreadsheet with Assumptions, DCF Valuation, and Sensitivity tabs."
            ),
            "parameters": {
                "type": "object",
                "required": ["company_name", "projections", "wacc", "terminal_growth"],
                "properties": {
                    "company_name": {
                        "type": "string",
                        "description": "Company name (Persian or English)",
                    },
                    "projections": {
                        "type": "array",
                        "description": "Annual projections (1–10 years). Each item must include: ebit, tax_rate, da, capex, delta_wc (all in billion IRR).",
                        "items": {
                            "type": "object",
                            "required": ["ebit", "tax_rate", "da", "capex", "delta_wc"],
                            "properties": {
                                "ebit": {"type": "number", "description": "EBIT (billion IRR)"},
                                "tax_rate": {"type": "number", "description": "Tax rate decimal (e.g. 0.25 for 25%)"},
                                "da": {"type": "number", "description": "Depreciation & Amortization (billion IRR)"},
                                "capex": {"type": "number", "description": "Capital expenditure (billion IRR)"},
                                "delta_wc": {"type": "number", "description": "Change in working capital (billion IRR)"},
                            },
                        },
                    },
                    "wacc": {
                        "type": "number",
                        "description": "Weighted average cost of capital decimal (e.g. 0.22 for 22%). Typical TSE range: 0.20–0.28.",
                    },
                    "terminal_growth": {
                        "type": "number",
                        "description": "Terminal growth rate decimal (e.g. 0.03 for 3%). Must be less than WACC.",
                    },
                    "net_debt": {
                        "type": "number",
                        "description": "Net debt = total debt minus cash (billion IRR). Default 0.",
                    },
                    "shares_outstanding": {
                        "type": "number",
                        "description": "Shares outstanding in millions. Default 1000.",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_pl_model",
            "description": (
                "Build a multi-year P&L (Profit & Loss) projection. "
                "Projects Revenue → Gross Profit → EBITDA → EBIT → Net Income waterfall. "
                "Creates an Excel spreadsheet."
            ),
            "parameters": {
                "type": "object",
                "required": [
                    "company_name", "base_revenue", "revenue_growth_rates",
                    "gross_margin", "ebitda_margin", "da_pct",
                    "interest_expense", "tax_rate",
                ],
                "properties": {
                    "company_name": {"type": "string"},
                    "base_revenue": {
                        "type": "number",
                        "description": "Base year revenue (billion IRR)",
                    },
                    "revenue_growth_rates": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Annual revenue growth rates (decimals). One per projection year.",
                    },
                    "gross_margin": {
                        "type": "number",
                        "description": "Gross profit margin decimal (e.g. 0.40 for 40%)",
                    },
                    "ebitda_margin": {
                        "type": "number",
                        "description": "EBITDA margin decimal (e.g. 0.25 for 25%)",
                    },
                    "da_pct": {
                        "type": "number",
                        "description": "D&A as % of revenue decimal (e.g. 0.05 for 5%)",
                    },
                    "interest_expense": {
                        "type": "number",
                        "description": "Annual interest expense (billion IRR)",
                    },
                    "tax_rate": {
                        "type": "number",
                        "description": "Corporate tax rate decimal. Iran standard: 0.25",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_loan_amortization",
            "description": (
                "Build a loan amortization schedule. Supports three types: "
                "fully_amortizing (equal periodic payments), "
                "bullet (interest-only with principal at maturity), "
                "balloon (partial amortization then lump sum). "
                "Creates an Excel amortization table."
            ),
            "parameters": {
                "type": "object",
                "required": ["principal", "annual_rate", "term_months"],
                "properties": {
                    "principal": {
                        "type": "number",
                        "description": "Loan principal (million IRR)",
                    },
                    "annual_rate": {
                        "type": "number",
                        "description": "Annual interest rate decimal (e.g. 0.18 for 18%)",
                    },
                    "term_months": {
                        "type": "integer",
                        "description": "Loan term in months",
                    },
                    "loan_type": {
                        "type": "string",
                        "enum": ["fully_amortizing", "bullet", "balloon"],
                        "description": "Amortization type. Default: fully_amortizing",
                    },
                    "balloon_month": {
                        "type": "integer",
                        "description": "Month of balloon payment (balloon type only)",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_bond_model",
            "description": (
                "Price a bond and compute risk metrics: YTM (via IRR), "
                "Macaulay duration, and Modified duration. "
                "Creates an Excel cash flow schedule."
            ),
            "parameters": {
                "type": "object",
                "required": ["face_value", "coupon_rate", "periods", "ytm"],
                "properties": {
                    "face_value": {
                        "type": "number",
                        "description": "Face/par value of the bond (IRR)",
                    },
                    "coupon_rate": {
                        "type": "number",
                        "description": "Annual coupon rate decimal (e.g. 0.18 for 18%)",
                    },
                    "periods": {
                        "type": "integer",
                        "description": "Number of coupon periods until maturity",
                    },
                    "ytm": {
                        "type": "number",
                        "description": "Yield to maturity decimal (e.g. 0.20 for 20%)",
                    },
                    "frequency": {
                        "type": "integer",
                        "enum": [1, 2, 4],
                        "description": "Coupon payments per year: 1=annual, 2=semi-annual, 4=quarterly. Default: 1",
                    },
                },
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
