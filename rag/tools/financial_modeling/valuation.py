"""Valuation financial modeling tools."""
from __future__ import annotations

import json
import logging
import math
from typing import Optional

from sqlalchemy.orm import Session

import rag.tools.financial_modeling._fm_helpers as _fmh
from rag.tools.financial_modeling._fm_helpers import (
    Font,
    _auto_width,
    _save_excel,
    _style_formula,
    _style_header,
    _style_input,
    _style_result,
    get_column_letter,
    openpyxl,
)

logger = logging.getLogger(__name__)

# ── Private helpers ──────────────────────────────────────────────────────────


def _compute_fcff(ebit: float, tax_rate: float, da: float, capex: float, delta_wc: float) -> float:
    """FCFF = EBIT(1-T) + D&A - CapEx - ΔWC"""
    return ebit * (1 - tax_rate) + da - capex - delta_wc


# ── Workbook builders ────────────────────────────────────────────────────────


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


# ── Tool Functions ───────────────────────────────────────────────────────────


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
    if _fmh.EXCEL_AVAILABLE:
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
    if _fmh.EXCEL_AVAILABLE:
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
        β_U   = β_L / [1 + (1−T) × (D/E)]
        β_L   = β_U × [1 + (1−T) × (D/E)_target]
        β_adj = (2/3) × β_L + (1/3) × 1.0    (Bloomberg adjusted)
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
        "hamada_formula": f"β_U = {levered_beta} / [1 + (1−{tax_rate}) × {debt_to_equity}] = {round(unlevered_beta, 4)}",
        "bloomberg_formula": f"β_adj = (2/3) × {levered_beta} + 1/3 = {round(adjusted_beta, 4)}",
    })


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

    For each numeric metric in base_results:
        bear_value = base × (1 + bear_overrides.get(key, bear_pct))
        bull_value = base × (1 + bull_overrides.get(key, bull_pct))
    """
    if not base_results:
        return json.dumps({"error": "base_results must not be empty"})

    bear_ov = bear_overrides or {}
    bull_ov = bull_overrides or {}
    labels = scenario_labels or {"bear": "Bear", "base": "Base", "bull": "Bull"}

    bear_scenario, bull_scenario = {}, {}
    downside_pct, upside_pct = {}, {}

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


def compute_operating_leverage(
    db: Session,
    revenue: float,
    variable_costs: float,
    fixed_costs: float,
    units_sold: Optional[float] = None,
) -> str:
    """
    Compute operating leverage: DOL, contribution margin, and breakeven.

    Formulas:
        CM            = Revenue − Variable Costs
        CM Ratio      = CM / Revenue
        EBIT          = CM − Fixed Costs
        DOL           = CM / EBIT
        Breakeven Rev = Fixed Costs / CM Ratio
    """
    if revenue == 0:
        return json.dumps({"error": "revenue must be positive"})
    cm = revenue - variable_costs
    cm_ratio = cm / revenue
    if cm_ratio == 0:
        return json.dumps({"error": "Contribution margin is zero — cannot compute DOL or breakeven"})

    ebit = cm - fixed_costs
    dol = (cm / ebit) if ebit != 0 else None
    breakeven_revenue = fixed_costs / cm_ratio

    breakeven_units = None
    if units_sold and units_sold > 0:
        price_per_unit = revenue / units_sold
        vc_per_unit = variable_costs / units_sold
        cm_per_unit = price_per_unit - vc_per_unit
        if cm_per_unit > 0:
            breakeven_units = round(fixed_costs / cm_per_unit, 4)

    return json.dumps({
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
    })


def compute_pvgo(
    db: Session,
    intrinsic_value: float,
    earnings_per_share: float,
    cost_of_equity: float,
    growth_rate: float,
    payout_ratio: float,
) -> str:
    """
    Compute PVGO and justified P/E ratios.

    Formulas:
        No-Growth Value  = E₁ / ke
        PVGO             = Intrinsic Value − No-Growth Value
        Justified P/E (leading)  = (1 − b) / (ke − g)
        Justified P/E (trailing) = (1 − b) × (1 + g) / (ke − g)
    """
    if cost_of_equity <= growth_rate:
        return json.dumps({"error": "cost_of_equity must be greater than growth_rate (ke > g)"})
    if cost_of_equity <= 0:
        return json.dumps({"error": "cost_of_equity must be positive"})

    no_growth_value = earnings_per_share / cost_of_equity
    pvgo = intrinsic_value - no_growth_value
    pvgo_pct = (pvgo / intrinsic_value * 100) if intrinsic_value else 0
    ke_minus_g = cost_of_equity - growth_rate
    justified_pe_leading = (1 - payout_ratio) / ke_minus_g
    justified_pe_trailing = justified_pe_leading * (1 + growth_rate)

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
        "justified_pe_leading": round(justified_pe_leading, 4),
        "justified_pe_trailing": round(justified_pe_trailing, 4),
    })


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
        EVA        = (ROIC − WACC) × IC
        EVA Spread = ROIC − WACC
        MVA        = Market Value − Book Value of IC   [optional]
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


# ── Tool Definitions & Dispatch ──────────────────────────────────────────────

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
    {
        "type": "function",
        "function": {
            "name": "compute_beta",
            "description": (
                "Compute unlevered and re-levered beta using the Hamada equation. "
                "β_U = β_L / [1 + (1−T)×(D/E)]. Also computes Bloomberg adjusted beta = 2/3×β + 1/3. "
                "Feed re_levered_beta into compute_capm."
            ),
            "parameters": {
                "type": "object",
                "required": ["levered_beta", "debt_to_equity", "tax_rate"],
                "properties": {
                    "levered_beta": {"type": "number", "description": "Observed equity beta"},
                    "debt_to_equity": {"type": "number", "description": "Current D/E ratio"},
                    "tax_rate": {"type": "number", "description": "Corporate tax rate decimal"},
                    "target_debt_to_equity": {"type": "number", "description": "D/E for re-levering. Defaults to current."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_scenario_model",
            "description": (
                "Apply bear/base/bull scenarios to any model output dict. "
                "bear_value = base × (1 + bear_pct). bull_value = base × (1 + bull_pct). "
                "Per-metric overrides supported."
            ),
            "parameters": {
                "type": "object",
                "required": ["base_results", "bear_pct", "bull_pct"],
                "properties": {
                    "base_results": {"type": "object", "description": "Base-case outputs e.g. {price_per_share: 100}"},
                    "bear_pct": {"type": "number", "description": "Global bear discount decimal (e.g. -0.30)"},
                    "bull_pct": {"type": "number", "description": "Global bull premium decimal (e.g. 0.25)"},
                    "bear_overrides": {"type": "object", "description": "Per-metric bear overrides"},
                    "bull_overrides": {"type": "object", "description": "Per-metric bull overrides"},
                    "scenario_labels": {"type": "object", "description": "Optional {bear, base, bull} labels."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_operating_leverage",
            "description": (
                "Compute DOL, contribution margin, and operating breakeven. "
                "DOL = CM / EBIT. Breakeven Revenue = Fixed Costs / CM Ratio."
            ),
            "parameters": {
                "type": "object",
                "required": ["revenue", "variable_costs", "fixed_costs"],
                "properties": {
                    "revenue": {"type": "number", "description": "Total revenue"},
                    "variable_costs": {"type": "number", "description": "Total variable costs"},
                    "fixed_costs": {"type": "number", "description": "Total fixed operating costs"},
                    "units_sold": {"type": "number", "description": "Units sold for per-unit breakeven. Optional."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_pvgo",
            "description": (
                "Compute PVGO = Intrinsic Value − E₁/ke, and justified P/E ratios. "
                "Justified Leading P/E = (1−b)/(ke−g). CFA L2 equity valuation."
            ),
            "parameters": {
                "type": "object",
                "required": ["intrinsic_value", "earnings_per_share", "cost_of_equity", "growth_rate", "payout_ratio"],
                "properties": {
                    "intrinsic_value": {"type": "number", "description": "Per-share value from DDM or DCF"},
                    "earnings_per_share": {"type": "number", "description": "Forward EPS (E₁)"},
                    "cost_of_equity": {"type": "number", "description": "Required return decimal (ke)"},
                    "growth_rate": {"type": "number", "description": "Long-term growth rate decimal (g)"},
                    "payout_ratio": {"type": "number", "description": "Dividend payout ratio decimal (b)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_eva",
            "description": (
                "Compute EVA = (ROIC − WACC) × Invested Capital, and optionally MVA. "
                "Positive EVA = value creation. ROIC = NOPAT / IC. CFA L2."
            ),
            "parameters": {
                "type": "object",
                "required": ["ebit", "tax_rate", "wacc", "invested_capital"],
                "properties": {
                    "ebit": {"type": "number", "description": "EBIT (billion IRR)"},
                    "tax_rate": {"type": "number", "description": "Corporate tax rate decimal"},
                    "wacc": {"type": "number", "description": "WACC decimal (from compute_wacc)"},
                    "invested_capital": {"type": "number", "description": "Total Debt + Equity (book value)"},
                    "market_value_of_firm": {"type": "number", "description": "Market cap + market debt. Optional — enables MVA."},
                },
            },
        },
    },
]

TOOL_DISPATCH = {
    "build_dcf_model": build_dcf_model,
    "build_pl_model": build_pl_model,
    "compute_wacc": compute_wacc,
    "compute_capm": compute_capm,
    "build_ddm_model": build_ddm_model,
    "build_residual_income_model": build_residual_income_model,
    "build_multiples_model": build_multiples_model,
    "compute_fcfe": compute_fcfe,
    "compute_beta": compute_beta,
    "build_scenario_model": build_scenario_model,
    "compute_operating_leverage": compute_operating_leverage,
    "compute_pvgo": compute_pvgo,
    "compute_eva": compute_eva,
}
