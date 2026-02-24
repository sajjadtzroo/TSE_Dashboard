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

    # Cache all FCFFs for reuse across sensitivity rows
    _fcff_list = [
        _compute_fcff(p["ebit"], p["tax_rate"], p["da"], p["capex"], p["delta_wc"])
        for p in projections
    ]
    last_fcff_n = _fcff_list[-1]

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
                # Recompute PV of explicit FCFFs at this row's WACC
                pv_fcff_at_w = sum(
                    fcff / (1 + w) ** (t + 1)
                    for t, fcff in enumerate(_fcff_list)
                )
                # Use sensitivity TG for TV numerator
                tv = last_fcff_n * (1 + tg) / (w - tg)
                pv_tv = tv / (1 + w) ** n
                ev = pv_fcff_at_w + pv_tv
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
        # balloon_month: the month at which the remaining balance is paid off.
        # Payments sized as if fully amortizing over extended_term (double the loan term).
        if balloon_month is None or balloon_month >= term_months:
            balloon_month = term_months  # default: balloon at loan end

        extended_term = term_months * 2
        monthly_payment = _pmt_fn(monthly_rate, extended_term, principal)

        schedule = []
        balance = principal
        total_interest = 0.0
        for month in range(1, balloon_month + 1):
            interest = balance * monthly_rate
            if month == balloon_month:
                # Balloon: pay entire remaining balance
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
            "balloon_month": balloon_month,
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

    # Convexity: (1/P) × Σ [CFt × t × (t+1) / (1+y)^(t+2)]
    convexity_sum = 0.0
    for t in range(1, periods + 1):
        cf = periodic_coupon if t < periods else periodic_coupon + face_value
        convexity_sum += cf * t * (t + 1) / (1 + periodic_ytm) ** (t + 2)
    convexity_periodic = convexity_sum / price
    # Convert from periods² to years²
    convexity = convexity_periodic / (frequency ** 2)

    # DV01: dollar value of 1 basis point change in yield
    dv01 = modified_duration * price * 0.0001

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
        "convexity": round(convexity, 6),
        "dv01": round(dv01, 4),
        "schedule": schedule,
        "download_url": download_url,
    })


# ── WACC Tool ─────────────────────────────────────────────────────────────────

def compute_wacc(
    db: Session,
    equity_value: float,
    debt_value: float,
    cost_of_equity: float,
    cost_of_debt: float,
    tax_rate: float,
) -> str:
    """
    Compute Weighted Average Cost of Capital (WACC).

    Formula: WACC = (E/V) × Ke + (D/V) × Kd × (1 − T)
    """
    if equity_value < 0 or debt_value < 0:
        return json.dumps({"error": "equity_value and debt_value must be non-negative"})
    total = equity_value + debt_value
    if total == 0:
        return json.dumps({"error": "equity_value + debt_value must be positive"})
    if not (0 <= tax_rate <= 1):
        return json.dumps({"error": "tax_rate must be between 0 and 1"})

    equity_weight = equity_value / total
    debt_weight = debt_value / total
    after_tax_kd = cost_of_debt * (1 - tax_rate)
    wacc = equity_weight * cost_of_equity + debt_weight * after_tax_kd

    return json.dumps({
        "model_type": "wacc",
        "wacc": round(wacc, 6),
        "wacc_pct": round(wacc * 100, 4),
        "equity_weight": round(equity_weight, 4),
        "debt_weight": round(debt_weight, 4),
        "cost_of_equity_pct": round(cost_of_equity * 100, 4),
        "cost_of_debt_pct": round(cost_of_debt * 100, 4),
        "after_tax_cost_of_debt_pct": round(after_tax_kd * 100, 4),
        "tax_rate_pct": round(tax_rate * 100, 2),
        "formula": (
            f"WACC = {round(equity_weight*100,1)}% × {round(cost_of_equity*100,2)}% + "
            f"{round(debt_weight*100,1)}% × {round(cost_of_debt*100,2)}% × "
            f"(1 − {round(tax_rate*100,0):.0f}%)"
        ),
    })


# ── CAPM Tool ─────────────────────────────────────────────────────────────────

def compute_capm(
    db: Session,
    risk_free_rate: float,
    beta: float,
    equity_risk_premium: float,
    size_premium: float = 0.0,
    specific_premium: float = 0.0,
) -> str:
    """
    Compute cost of equity using CAPM.

    Formula: Ke = Rf + β × ERP + size_premium + specific_premium
    """
    cost_of_equity = risk_free_rate + beta * equity_risk_premium + size_premium + specific_premium

    return json.dumps({
        "model_type": "capm",
        "cost_of_equity": round(cost_of_equity, 6),
        "cost_of_equity_pct": round(cost_of_equity * 100, 4),
        "risk_free_rate_pct": round(risk_free_rate * 100, 4),
        "beta": round(beta, 4),
        "equity_risk_premium_pct": round(equity_risk_premium * 100, 4),
        "beta_contribution_pct": round(beta * equity_risk_premium * 100, 4),
        "size_premium_pct": round(size_premium * 100, 4),
        "specific_premium_pct": round(specific_premium * 100, 4),
        "formula": (
            f"Ke = {round(risk_free_rate*100,2)}% + "
            f"{round(beta,2)} × {round(equity_risk_premium*100,2)}% + "
            f"{round(size_premium*100,2)}% + {round(specific_premium*100,2)}%"
            f" = {round(cost_of_equity*100,2)}%"
        ),
    })


# ── DDM Tool ──────────────────────────────────────────────────────────────────

def build_ddm_model(
    db: Session,
    current_dividend: float,
    discount_rate: float,
    model_type: str = "gordon",
    growth_rate: Optional[float] = None,
    short_term_growth: Optional[float] = None,
    long_term_growth: Optional[float] = None,
    half_life: Optional[float] = None,
    stage_growth_rates: Optional[list] = None,
    terminal_growth: Optional[float] = None,
) -> str:
    """
    Dividend Discount Model (DDM) valuation.

    Supports: 'gordon' (single-stage), 'h_model' (linearly declining), 'multistage'.
    """
    if model_type == "gordon":
        if growth_rate is None:
            return json.dumps({"error": "growth_rate required for Gordon Growth model"})
        if discount_rate <= growth_rate:
            return json.dumps({"error": "discount_rate must be greater than growth_rate (ke > g)"})
        d1 = current_dividend * (1 + growth_rate)
        intrinsic_value = d1 / (discount_rate - growth_rate)
        return json.dumps({
            "model_type": "ddm_gordon",
            "intrinsic_value": round(intrinsic_value, 4),
            "d0": current_dividend,
            "d1": round(d1, 4),
            "growth_rate_pct": round(growth_rate * 100, 2),
            "discount_rate_pct": round(discount_rate * 100, 2),
            "formula": (
                f"P₀ = D₁/(ke−g) = {round(d1, 2)}/"
                f"({round(discount_rate*100,2)}%−{round(growth_rate*100,2)}%)"
            ),
        })

    elif model_type == "h_model":
        if short_term_growth is None or long_term_growth is None or half_life is None:
            return json.dumps({"error": "short_term_growth, long_term_growth, and half_life required for H-model"})
        if discount_rate <= long_term_growth:
            return json.dumps({"error": "discount_rate must be greater than long_term_growth (ke > gL)"})
        long_term_component = current_dividend * (1 + long_term_growth) / (discount_rate - long_term_growth)
        h_component = current_dividend * half_life * (short_term_growth - long_term_growth) / (discount_rate - long_term_growth)
        intrinsic_value = long_term_component + h_component
        return json.dumps({
            "model_type": "ddm_h_model",
            "intrinsic_value": round(intrinsic_value, 4),
            "long_term_component": round(long_term_component, 4),
            "h_component": round(h_component, 4),
            "d0": current_dividend,
            "short_term_growth_pct": round(short_term_growth * 100, 2),
            "long_term_growth_pct": round(long_term_growth * 100, 2),
            "half_life_years": half_life,
            "discount_rate_pct": round(discount_rate * 100, 2),
        })

    elif model_type == "multistage":
        if stage_growth_rates is None or terminal_growth is None:
            return json.dumps({"error": "stage_growth_rates and terminal_growth required for multistage DDM"})
        if discount_rate <= terminal_growth:
            return json.dumps({"error": "discount_rate must be greater than terminal_growth (ke > g_terminal)"})
        dividend = current_dividend
        schedule = []
        pv_dividends = 0.0
        for t, g in enumerate(stage_growth_rates, start=1):
            dividend = dividend * (1 + g)
            pv = dividend / (1 + discount_rate) ** t
            pv_dividends += pv
            schedule.append({
                "period": t,
                "growth_pct": round(g * 100, 2),
                "dividend": round(dividend, 4),
                "pv": round(pv, 4),
            })
        n = len(stage_growth_rates)
        terminal_dividend = dividend * (1 + terminal_growth)
        terminal_price = terminal_dividend / (discount_rate - terminal_growth)
        pv_terminal = terminal_price / (1 + discount_rate) ** n
        intrinsic_value = pv_dividends + pv_terminal
        return json.dumps({
            "model_type": "ddm_multistage",
            "intrinsic_value": round(intrinsic_value, 4),
            "pv_dividends": round(pv_dividends, 4),
            "pv_terminal": round(pv_terminal, 4),
            "terminal_price": round(terminal_price, 4),
            "terminal_growth_pct": round(terminal_growth * 100, 2),
            "discount_rate_pct": round(discount_rate * 100, 2),
            "schedule": schedule,
        })

    else:
        return json.dumps({"error": f"Unknown model_type '{model_type}'. Use 'gordon', 'h_model', or 'multistage'"})


# ── Residual Income Tool ───────────────────────────────────────────────────────

def build_residual_income_model(
    db: Session,
    book_value_per_share: float,
    earnings_per_share_list: list,
    cost_of_equity: float,
    persistence_factor: float = 1.0,
    continuing_ri_growth: float = 0.0,
) -> str:
    """
    Residual Income (RI) valuation model.

    Formula: V₀ = B₀ + Σ PV(RIₜ) + PV(continuing RI)
    where RIₜ = EPSₜ − ke × BVPSₜ₋₁
    """
    if not earnings_per_share_list:
        return json.dumps({"error": "earnings_per_share_list must not be empty"})
    if cost_of_equity <= 0:
        return json.dumps({"error": "cost_of_equity must be positive"})
    if not (0 <= persistence_factor <= 1):
        return json.dumps({"error": "persistence_factor must be between 0 and 1"})

    schedule = []
    pv_ri_sum = 0.0
    bvps = book_value_per_share

    for t, eps in enumerate(earnings_per_share_list, start=1):
        equity_charge = cost_of_equity * bvps
        ri = eps - equity_charge
        pv_ri = ri / (1 + cost_of_equity) ** t
        pv_ri_sum += pv_ri
        schedule.append({
            "period": t,
            "bvps_start": round(bvps, 4),
            "eps": round(eps, 4),
            "equity_charge": round(equity_charge, 4),
            "ri": round(ri, 4),
            "pv_ri": round(pv_ri, 4),
        })
        bvps = bvps + eps  # book value grows by reinvested earnings

    last_ri = schedule[-1]["ri"]
    n = len(earnings_per_share_list)

    if persistence_factor == 0 or abs(last_ri) < 1e-12:
        pv_continuing_ri = 0.0
    elif continuing_ri_growth > 0 and cost_of_equity > continuing_ri_growth:
        continuing_ri_value = last_ri * (1 + continuing_ri_growth) / (cost_of_equity - continuing_ri_growth)
        pv_continuing_ri = continuing_ri_value / (1 + cost_of_equity) ** n
    else:
        pv_continuing_ri = (last_ri * persistence_factor / cost_of_equity) / (1 + cost_of_equity) ** n

    intrinsic_value = book_value_per_share + pv_ri_sum + pv_continuing_ri

    return json.dumps({
        "model_type": "residual_income",
        "intrinsic_value": round(intrinsic_value, 4),
        "book_value_per_share": book_value_per_share,
        "pv_explicit_ri": round(pv_ri_sum, 4),
        "pv_continuing_ri": round(pv_continuing_ri, 4),
        "premium_to_book": round(intrinsic_value - book_value_per_share, 4),
        "cost_of_equity_pct": round(cost_of_equity * 100, 2),
        "persistence_factor": persistence_factor,
        "schedule": schedule,
    })


# ── Multiples Valuation Tool ───────────────────────────────────────────────────

def build_multiples_model(
    db: Session,
    ebitda: float,
    net_income: float,
    book_value: float,
    revenue: float,
    shares_outstanding: float,
    net_debt: float,
    peer_ev_ebitda: float,
    peer_pe: float,
    peer_pb: float,
    peer_ps: float,
) -> str:
    """
    Peer comparables (multiples) valuation.

    Applies four CFA multiples: EV/EBITDA, P/E, P/B, P/S.
    """
    if shares_outstanding <= 0:
        return json.dumps({"error": "shares_outstanding must be positive"})

    multiples = {}
    prices = []

    if peer_ev_ebitda > 0 and ebitda > 0:
        implied_ev = ebitda * peer_ev_ebitda
        implied_equity = implied_ev - net_debt
        implied_price = implied_equity / shares_outstanding
        multiples["ev_ebitda"] = {
            "multiple": peer_ev_ebitda,
            "implied_ev": round(implied_ev, 2),
            "implied_equity": round(implied_equity, 2),
            "implied_price": round(implied_price, 2),
        }
        if implied_price > 0:
            prices.append(implied_price)

    if peer_pe > 0:
        eps = net_income / shares_outstanding
        implied_price = eps * peer_pe
        multiples["pe"] = {
            "multiple": peer_pe,
            "eps": round(eps, 4),
            "implied_price": round(implied_price, 2),
        }
        if implied_price > 0:
            prices.append(implied_price)

    if peer_pb > 0:
        bvps = book_value / shares_outstanding
        implied_price = bvps * peer_pb
        multiples["pb"] = {
            "multiple": peer_pb,
            "bvps": round(bvps, 4),
            "implied_price": round(implied_price, 2),
        }
        if implied_price > 0:
            prices.append(implied_price)

    if peer_ps > 0:
        rps = revenue / shares_outstanding
        implied_price = rps * peer_ps
        multiples["ps"] = {
            "multiple": peer_ps,
            "revenue_per_share": round(rps, 4),
            "implied_price": round(implied_price, 2),
        }
        if implied_price > 0:
            prices.append(implied_price)

    sorted_prices = sorted(prices)
    median = sorted_prices[len(sorted_prices) // 2] if sorted_prices else None

    return json.dumps({
        "model_type": "multiples",
        "multiples": multiples,
        "implied_price_min": round(min(prices), 2) if prices else None,
        "implied_price_max": round(max(prices), 2) if prices else None,
        "implied_price_median": round(median, 2) if median is not None else None,
    })


# ── FCFE Tool ─────────────────────────────────────────────────────────────────

def compute_fcfe(
    db: Session,
    net_income: Optional[float] = None,
    da: Optional[float] = None,
    capex: Optional[float] = None,
    delta_wc: Optional[float] = None,
    net_borrowing: Optional[float] = None,
    fcff: Optional[float] = None,
    interest_expense: Optional[float] = None,
    tax_rate: Optional[float] = None,
) -> str:
    """
    Compute Free Cash Flow to Equity (FCFE).

    Two paths:
    - Direct: FCFE = NI + D&A − CapEx − ΔNWC + Net Borrowing
    - From FCFF: FCFE = FCFF − Interest × (1 − T) + Net Borrowing
    """
    direct_params = [net_income, da, capex, delta_wc, net_borrowing]
    fcff_params = [fcff, interest_expense, tax_rate, net_borrowing]

    if all(p is not None for p in direct_params):
        fcfe_val = net_income + da - capex - delta_wc + net_borrowing
        return json.dumps({
            "model_type": "fcfe",
            "fcfe": round(fcfe_val, 4),
            "calculation_path": "direct",
            "net_income": net_income,
            "da": da,
            "capex": capex,
            "delta_wc": delta_wc,
            "net_borrowing": net_borrowing,
            "formula": "FCFE = NI + D&A − CapEx − ΔWC + Net Borrowing",
        })
    elif all(p is not None for p in fcff_params):
        after_tax_interest = interest_expense * (1 - tax_rate)
        fcfe_val = fcff - after_tax_interest + net_borrowing
        return json.dumps({
            "model_type": "fcfe",
            "fcfe": round(fcfe_val, 4),
            "calculation_path": "from_fcff",
            "fcff": fcff,
            "interest_expense": interest_expense,
            "tax_rate": tax_rate,
            "after_tax_interest": round(after_tax_interest, 4),
            "net_borrowing": net_borrowing,
            "formula": "FCFE = FCFF − Interest × (1 − T) + Net Borrowing",
        })
    else:
        return json.dumps({
            "error": (
                "Provide either (net_income, da, capex, delta_wc, net_borrowing) "
                "for direct calculation OR (fcff, interest_expense, tax_rate, net_borrowing) "
                "for FCFF-based calculation."
            )
        })


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
    - 'growth_rates': compound base_revenue by a list of annual rates.
    - 'top_down': revenue = market_size × (1+market_growth_rate)^t × market_share_pct.
    - 'bottom_up': revenue = units_sold×(1+vol_g)^t × price_per_unit×(1+price_g)^t.
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
            projections.append({"year": t + 1, "revenue": round(revenue, 4), "growth_pct": round(g * 100, 4), "method": "growth_rates"})

    elif approach == "top_down":
        if market_size is None or market_share_pct is None:
            return json.dumps({"error": "market_size and market_share_pct required for top_down approach"})
        for t in range(1, years + 1):
            market = market_size * (1 + market_growth_rate) ** t
            revenue = market * market_share_pct
            prev_revenue = market_size * (1 + market_growth_rate) ** (t - 1) * market_share_pct
            growth_pct = (revenue / prev_revenue - 1) * 100 if prev_revenue else 0
            projections.append({"year": t, "revenue": round(revenue, 4), "market_size": round(market, 4), "growth_pct": round(growth_pct, 4), "method": "top_down"})

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
            projections.append({"year": t, "revenue": round(revenue, 4), "units": round(units, 4), "price": round(price, 4), "growth_pct": round(growth_pct, 4), "method": "bottom_up"})

    else:
        return json.dumps({"error": f"Unknown approach '{approach}'. Use 'growth_rates', 'top_down', or 'bottom_up'"})

    return json.dumps({
        "model_type": "revenue_model",
        "approach": approach,
        "projections": projections,
        "total_revenue": round(sum(p["revenue"] for p in projections), 4),
    })


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
        Inventory(t) = (DIO / 365) × COGS(t)    where COGS = Revenue × cogs_pct
        AP(t)        = (DPO / 365) × COGS(t)
        NWC(t)       = AR(t) + Inventory(t) − AP(t)
        ΔWC(t)       = NWC(t) − NWC(t−1)        (positive = cash outflow in FCFF)
        CCC          = DSO + DIO − DPO
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

    return json.dumps({"model_type": "wc_model", "dso": dso, "dio": dio, "dpo": dpo, "ccc": round(ccc, 4), "projections": projections})


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

    Roll-Forward:
        DA(t)          = Gross PP&E(t-1) / useful_life   (straight-line)
        Gross PP&E(t)  = Gross PP&E(t-1) + CapEx(t) − Disposals(t)
        Acc. Dep.(t)   = min(Acc. Dep.(t-1) + DA(t), Gross PP&E(t))
        Net PP&E(t)    = Gross PP&E(t) − Acc. Dep.(t)
    """
    if years <= 0:
        return json.dumps({"error": "years must be positive"})
    if useful_life <= 0:
        return json.dumps({"error": "useful_life must be positive"})

    if capex_list is not None:
        if len(capex_list) < years:
            return json.dumps({"error": f"capex_list has {len(capex_list)} items but years={years}"})
        capex_values = list(capex_list[:years])
    elif capex_pct_revenue is not None:
        if not revenue_list or len(revenue_list) < years:
            return json.dumps({"error": "revenue_list required (length >= years) when using capex_pct_revenue"})
        capex_values = [revenue_list[t] * capex_pct_revenue for t in range(years)]
    else:
        return json.dumps({"error": "Provide either capex_list or (capex_pct_revenue + revenue_list)"})

    disposals = list(disposals_list[:years]) if disposals_list else [0.0] * years

    projections = []
    gross_ppe = opening_gross_ppe
    accum_dep = opening_accum_dep

    for t in range(years):
        capex = capex_values[t]
        disposal = disposals[t]
        da = gross_ppe / useful_life
        gross_ppe_new = gross_ppe + capex - disposal
        accum_dep_new = min(accum_dep + da, gross_ppe_new)
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

    return json.dumps({"model_type": "capex_schedule", "useful_life": useful_life, "projections": projections})


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
        Amortization(t) = Opening(t) × amortization_pct
        Ending(t)       = max(0, Opening(t) − Amortization(t))
        Interest(t)     = (Opening(t) + Ending(t)) / 2 × annual_rate
    """
    if not tranches:
        return json.dumps({"error": "tranches must not be empty"})
    if years <= 0:
        return json.dumps({"error": "years must be positive"})

    cash = list(cash_list) if cash_list else [0.0] * years
    if len(cash) < years:
        cash = cash + [0.0] * (years - len(cash))

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
            tranche_detail.append({"name": tranche["name"], "opening": round(opening, 4), "amortization": round(amortization, 4), "ending": round(ending, 4), "interest": round(interest, 4)})
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

    return json.dumps({"model_type": "debt_schedule", "projections": projections})


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
        IS → CFS: Net Income starts Operating CF.
        IS → BS:  NI adds to Equity (retained earnings roll-forward).
        CFS → BS: Cash(t) = Cash(t-1) + net_change_in_cash.
        CapEx/DA → BS: PP&E(t) = PP&E(t-1) + CapEx − DA.
        Debt → BS: total_debt_list drives the debt balance per year.
        WC → CFS+BS: delta_wc computed internally from ar/inv/ap for consistency.

    The balance sheet always balances (Assets = L+E) because cash is the CFS residual.

    Args:
        revenue_list: Revenue per year (from build_pl_model or build_revenue_model).
        ebit_list: EBIT per year (from build_pl_model).
        interest_expense_list: Interest expense per year (from build_debt_schedule).
        tax_rate: Corporate tax rate decimal (constant).
        da_list: D&A per year (from build_capex_schedule).
        capex_list: CapEx per year (from build_capex_schedule).
        total_debt_list: Total debt balance per year (from build_debt_schedule).
        net_borrowing_list: Net new debt per year; positive=drawdown, negative=repayment.
        opening_bs: Opening balance sheet. Required keys: cash, ppe_net, other_assets,
            other_liabilities, equity. Optional: opening_ar, opening_inventory, opening_ap.
        ar_list: AR per year (from build_wc_model). Optional.
        inventory_list: Inventory per year (from build_wc_model). Optional.
        ap_list: AP per year (from build_wc_model). Optional.
        dividend_payout_ratio: Fraction of positive NI paid as dividends. Default 0.

    Returns:
        JSON with model_type and years list. Each year: income_statement,
        cash_flow_statement, balance_sheet (with balance_check_passed).
    """
    n = len(revenue_list)

    required = {
        "ebit_list": ebit_list, "interest_expense_list": interest_expense_list,
        "da_list": da_list, "capex_list": capex_list,
        "total_debt_list": total_debt_list, "net_borrowing_list": net_borrowing_list,
    }
    for name, lst in required.items():
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

    # Opening WC for delta_wc in year 1
    prev_nwc = (
        float(opening_bs.get("opening_ar", 0.0)) +
        float(opening_bs.get("opening_inventory", 0.0)) -
        float(opening_bs.get("opening_ap", 0.0))
    )

    years = []

    for t in range(n):
        # Income Statement
        ebit = ebit_list[t]
        interest = interest_expense_list[t]
        ebt = ebit - interest
        tax = max(0.0, ebt * tax_rate)
        net_income = ebt - tax
        dividends = max(0.0, net_income * dividend_payout_ratio) if net_income > 0 else 0.0

        # Working Capital (compute delta_wc internally for BS consistency)
        ar = float(ar_list[t]) if ar_list else 0.0
        inv = float(inventory_list[t]) if inventory_list else 0.0
        ap = float(ap_list[t]) if ap_list else 0.0
        nwc = ar + inv - ap
        delta_wc = nwc - prev_nwc
        prev_nwc = nwc

        # Cash Flow Statement
        da = da_list[t]
        capex = capex_list[t]
        net_borrowing = net_borrowing_list[t]
        operating_cf = net_income + da - delta_wc
        investing_cf = -capex
        financing_cf = net_borrowing - dividends
        net_change = operating_cf + investing_cf + financing_cf

        # Balance Sheet (roll forward)
        cash_new = cash + net_change
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
                "net_change_in_cash": round(net_change, 4),
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

        cash = cash_new
        ppe_net = ppe_net_new
        equity = equity_new

    return json.dumps({"model_type": "three_statement_model", "years": years})


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

TOOL_DEFINITIONS += [
    {
        "type": "function",
        "function": {
            "name": "compute_wacc",
            "description": (
                "Compute WACC (Weighted Average Cost of Capital). "
                "Formula: WACC = (E/V)×Ke + (D/V)×Kd×(1-T). "
                "Chain with compute_capm to derive Ke first, then feed WACC into build_dcf_model."
            ),
            "parameters": {
                "type": "object",
                "required": ["equity_value", "debt_value", "cost_of_equity", "cost_of_debt", "tax_rate"],
                "properties": {
                    "equity_value": {"type": "number", "description": "Market value of equity"},
                    "debt_value": {"type": "number", "description": "Market value of debt (same unit as equity_value)"},
                    "cost_of_equity": {"type": "number", "description": "Cost of equity decimal (e.g. 0.20). Use compute_capm output."},
                    "cost_of_debt": {"type": "number", "description": "Pre-tax cost of debt decimal (e.g. 0.18)"},
                    "tax_rate": {"type": "number", "description": "Corporate tax rate decimal. Iran standard: 0.25"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_capm",
            "description": (
                "Compute cost of equity (Ke) using CAPM: Ke = Rf + β×ERP + size_premium + specific_premium. "
                "Iranian market defaults: Rf ≈ 20%, ERP ≈ 5-8%."
            ),
            "parameters": {
                "type": "object",
                "required": ["risk_free_rate", "beta", "equity_risk_premium"],
                "properties": {
                    "risk_free_rate": {"type": "number", "description": "Risk-free rate decimal (Iran ~0.20)"},
                    "beta": {"type": "number", "description": "Equity beta. β=1 = market risk, β<1 = defensive, β>1 = aggressive"},
                    "equity_risk_premium": {"type": "number", "description": "ERP decimal (Iran ~0.05–0.08)"},
                    "size_premium": {"type": "number", "description": "Small-cap premium decimal. Default 0."},
                    "specific_premium": {"type": "number", "description": "Company-specific risk premium decimal. Default 0."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_ddm_model",
            "description": (
                "Dividend Discount Model (DDM) valuation. Three types: "
                "'gordon' (P₀=D₁/(ke−g)), 'h_model' (linearly declining growth), "
                "'multistage' (explicit years + Gordon terminal). CFA Level 2."
            ),
            "parameters": {
                "type": "object",
                "required": ["current_dividend", "discount_rate"],
                "properties": {
                    "current_dividend": {"type": "number", "description": "Most recent annual dividend per share (D₀)"},
                    "discount_rate": {"type": "number", "description": "Required return on equity (ke) decimal"},
                    "model_type": {"type": "string", "enum": ["gordon", "h_model", "multistage"], "description": "DDM variant. Default: gordon"},
                    "growth_rate": {"type": "number", "description": "Perpetual growth rate for Gordon model"},
                    "short_term_growth": {"type": "number", "description": "Near-term growth rate for H-model"},
                    "long_term_growth": {"type": "number", "description": "Long-term sustainable growth for H-model"},
                    "half_life": {"type": "number", "description": "Half the high-growth period length in years (H-model)"},
                    "stage_growth_rates": {"type": "array", "items": {"type": "number"}, "description": "Per-year growth rates for multistage explicit period"},
                    "terminal_growth": {"type": "number", "description": "Long-run growth rate after explicit period (multistage)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_residual_income_model",
            "description": (
                "Residual Income (RI) valuation. V₀ = B₀ + PV(explicit RIs) + PV(continuing RI). "
                "RIₜ = EPSₜ − ke × BVPSₜ₋₁. Positive RI creates premium to book. CFA Level 2."
            ),
            "parameters": {
                "type": "object",
                "required": ["book_value_per_share", "earnings_per_share_list", "cost_of_equity"],
                "properties": {
                    "book_value_per_share": {"type": "number", "description": "Book value per share at t=0"},
                    "earnings_per_share_list": {"type": "array", "items": {"type": "number"}, "description": "EPS forecast for each explicit year [EPS₁, EPS₂, ...]"},
                    "cost_of_equity": {"type": "number", "description": "Required return on equity (ke) decimal"},
                    "persistence_factor": {"type": "number", "description": "RI persistence beyond explicit period: 0=fades immediately, 1=perpetuity. Default 1."},
                    "continuing_ri_growth": {"type": "number", "description": "Growth rate of continuing RI (decimal). Default 0."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_multiples_model",
            "description": (
                "Peer comparables (multiples) valuation. "
                "Applies EV/EBITDA, P/E, P/B, P/S to estimate implied share price range."
            ),
            "parameters": {
                "type": "object",
                "required": ["ebitda", "net_income", "book_value", "revenue", "shares_outstanding",
                             "net_debt", "peer_ev_ebitda", "peer_pe", "peer_pb", "peer_ps"],
                "properties": {
                    "ebitda": {"type": "number", "description": "EBITDA"},
                    "net_income": {"type": "number", "description": "Net income (same unit as ebitda)"},
                    "book_value": {"type": "number", "description": "Total book value of equity"},
                    "revenue": {"type": "number", "description": "Total revenue"},
                    "shares_outstanding": {"type": "number", "description": "Shares in millions"},
                    "net_debt": {"type": "number", "description": "Net debt = total debt − cash"},
                    "peer_ev_ebitda": {"type": "number", "description": "Peer median EV/EBITDA multiple"},
                    "peer_pe": {"type": "number", "description": "Peer median P/E multiple"},
                    "peer_pb": {"type": "number", "description": "Peer median P/Book multiple"},
                    "peer_ps": {"type": "number", "description": "Peer median P/Sales multiple"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_fcfe",
            "description": (
                "Compute Free Cash Flow to Equity (FCFE). "
                "Direct: FCFE = NI + D&A − CapEx − ΔNWC + Net Borrowing. "
                "From FCFF: FCFE = FCFF − Interest × (1-T) + Net Borrowing."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "net_income": {"type": "number", "description": "Net income (direct path)"},
                    "da": {"type": "number", "description": "Depreciation & Amortization (direct path)"},
                    "capex": {"type": "number", "description": "Capital expenditure (direct path)"},
                    "delta_wc": {"type": "number", "description": "Change in net working capital (direct path)"},
                    "net_borrowing": {"type": "number", "description": "Net new debt issued (both paths)"},
                    "fcff": {"type": "number", "description": "FCFF value (FCFF path)"},
                    "interest_expense": {"type": "number", "description": "Interest expense (FCFF path)"},
                    "tax_rate": {"type": "number", "description": "Tax rate decimal (FCFF path)"},
                },
            },
        },
    },
]

TOOL_DEFINITIONS += [
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
                    "growth_rates": {"type": "array", "items": {"type": "number"}, "description": "Per-year growth rates. Length must equal years."},
                    "market_size": {"type": "number", "description": "Total addressable market (top_down)"},
                    "market_share_pct": {"type": "number", "description": "Market share decimal (top_down)"},
                    "market_growth_rate": {"type": "number", "description": "Annual market growth decimal (top_down). Default 0."},
                    "units_sold": {"type": "number", "description": "Base units sold (bottom_up)"},
                    "price_per_unit": {"type": "number", "description": "Base price per unit in IRR (bottom_up)"},
                    "volume_growth_rate": {"type": "number", "description": "Annual volume growth decimal (bottom_up). Default 0."},
                    "price_growth_rate": {"type": "number", "description": "Annual price growth decimal (bottom_up). Default 0."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_wc_model",
            "description": (
                "Build a Working Capital model. "
                "AR = DSO/365 × Revenue; Inventory = DIO/365 × COGS; AP = DPO/365 × COGS. "
                "ΔWC feeds into build_dcf_model projections. CCC = DSO + DIO - DPO."
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
    {
        "type": "function",
        "function": {
            "name": "build_capex_schedule",
            "description": (
                "Build a PP&E roll-forward and depreciation schedule. "
                "DA = Gross PP&E(t-1) / useful_life (straight-line). "
                "capex and da arrays feed into build_dcf_model projections."
            ),
            "parameters": {
                "type": "object",
                "required": ["opening_gross_ppe", "opening_accum_dep", "useful_life", "years"],
                "properties": {
                    "opening_gross_ppe": {"type": "number", "description": "Gross PP&E at t=0 (billion IRR)"},
                    "opening_accum_dep": {"type": "number", "description": "Accumulated depreciation at t=0"},
                    "useful_life": {"type": "number", "description": "Asset useful life in years (straight-line)"},
                    "years": {"type": "integer", "description": "Number of forecast years"},
                    "capex_list": {"type": "array", "items": {"type": "number"}, "description": "Explicit CapEx per year"},
                    "capex_pct_revenue": {"type": "number", "description": "CapEx as % of revenue. Requires revenue_list."},
                    "revenue_list": {"type": "array", "items": {"type": "number"}, "description": "Revenue per year (needed if using capex_pct_revenue)"},
                    "disposals_list": {"type": "array", "items": {"type": "number"}, "description": "Asset disposals per year. Default zeros."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_debt_schedule",
            "description": (
                "Build a multi-tranche debt schedule. "
                "Ending = Opening - Opening×amort_pct. "
                "Interest = avg(Opening, Ending) × rate. "
                "interest_expense feeds into build_pl_model; net_debt into build_dcf_model equity bridge."
            ),
            "parameters": {
                "type": "object",
                "required": ["tranches", "years"],
                "properties": {
                    "tranches": {
                        "type": "array",
                        "description": "Debt tranches: [{name, opening_balance, annual_rate, amortization_pct}]",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "opening_balance": {"type": "number"},
                                "annual_rate": {"type": "number"},
                                "amortization_pct": {"type": "number"},
                            },
                        },
                    },
                    "years": {"type": "integer", "description": "Forecast years"},
                    "cash_list": {"type": "array", "items": {"type": "number"}, "description": "Cash per year for net_debt. Default zeros."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_three_statement_model",
            "description": (
                "Build linked Income Statement, Cash Flow Statement, and Balance Sheet. "
                "Takes outputs from Phase 2 tools (build_pl_model, build_capex_schedule, "
                "build_debt_schedule, build_wc_model) and links all three statements. "
                "Validates balance check (Assets = L+E) per year. CFA guide section 18."
            ),
            "parameters": {
                "type": "object",
                "required": [
                    "revenue_list", "ebit_list", "interest_expense_list", "tax_rate",
                    "da_list", "capex_list", "total_debt_list", "net_borrowing_list", "opening_bs"
                ],
                "properties": {
                    "revenue_list": {"type": "array", "items": {"type": "number"}, "description": "Revenue per year"},
                    "ebit_list": {"type": "array", "items": {"type": "number"}, "description": "EBIT per year (from build_pl_model)"},
                    "interest_expense_list": {"type": "array", "items": {"type": "number"}, "description": "Interest expense per year (from build_debt_schedule)"},
                    "tax_rate": {"type": "number", "description": "Corporate tax rate decimal (e.g. 0.25)"},
                    "da_list": {"type": "array", "items": {"type": "number"}, "description": "D&A per year (from build_capex_schedule)"},
                    "capex_list": {"type": "array", "items": {"type": "number"}, "description": "CapEx per year (from build_capex_schedule)"},
                    "total_debt_list": {"type": "array", "items": {"type": "number"}, "description": "Total debt balance per year (from build_debt_schedule)"},
                    "net_borrowing_list": {"type": "array", "items": {"type": "number"}, "description": "Net new debt per year: positive=drawdown, negative=repayment"},
                    "opening_bs": {
                        "type": "object",
                        "description": "Opening balance sheet. Required: cash, ppe_net, other_assets, other_liabilities, equity. Optional: opening_ar, opening_inventory, opening_ap.",
                    },
                    "ar_list": {"type": "array", "items": {"type": "number"}, "description": "AR per year (from build_wc_model). Optional."},
                    "inventory_list": {"type": "array", "items": {"type": "number"}, "description": "Inventory per year (from build_wc_model). Optional."},
                    "ap_list": {"type": "array", "items": {"type": "number"}, "description": "AP per year (from build_wc_model). Optional."},
                    "dividend_payout_ratio": {"type": "number", "description": "Fraction of NI paid as dividends. Default 0."},
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
    "compute_wacc": compute_wacc,
    "compute_capm": compute_capm,
    "build_ddm_model": build_ddm_model,
    "build_residual_income_model": build_residual_income_model,
    "build_multiples_model": build_multiples_model,
    "compute_fcfe": compute_fcfe,
    "build_revenue_model": build_revenue_model,
    "build_wc_model": build_wc_model,
    "build_capex_schedule": build_capex_schedule,
    "build_debt_schedule": build_debt_schedule,
    "build_three_statement_model": build_three_statement_model,
}
