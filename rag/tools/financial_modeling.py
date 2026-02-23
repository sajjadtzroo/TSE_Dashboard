# rag/tools/financial_modeling.py
"""Financial modeling tools: DCF, P&L, Loan Amortization, Bond Pricing."""
from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

from config.settings import GOOGLE_SHEETS_CREDENTIALS_PATH, GOOGLE_SHEETS_ENABLED

try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError:  # pragma: no cover
    gspread = None  # type: ignore[assignment]
    Credentials = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

_SHEETS_CLIENT = None  # module-level cache


def _get_sheets_client():
    global _SHEETS_CLIENT
    if not GOOGLE_SHEETS_ENABLED:
        raise RuntimeError("GOOGLE_SHEETS_ENABLED is false")
    if _SHEETS_CLIENT is not None:
        return _SHEETS_CLIENT
    creds = Credentials.from_service_account_file(
        GOOGLE_SHEETS_CREDENTIALS_PATH,
        scopes=[
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ],
    )
    _SHEETS_CLIENT = gspread.authorize(creds)
    return _SHEETS_CLIENT


def _create_and_share_sheet(title: str, worksheets_data: list) -> str:
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


# ── DCF Tool ──────────────────────────────────────────────────────────────────

def _compute_fcff(ebit: float, tax_rate: float, da: float, capex: float, delta_wc: float) -> float:
    """FCFF = EBIT(1-T) + D&A - CapEx - ΔWC"""
    return ebit * (1 - tax_rate) + da - capex - delta_wc


def _build_dcf_sheet(
    company_name: str,
    projections: list[dict],
    wacc: float,
    terminal_growth: float,
    net_debt: float,
    shares_outstanding: float,
) -> list[dict]:
    """Build worksheet data for the DCF model spreadsheet."""
    years = len(projections)

    # Assumptions tab
    assumptions_data = [
        ["مدل DCF — " + company_name],
        [],
        ["پارامتر", "مقدار"],
        ["WACC (%)", round(wacc * 100, 2)],
        ["نرخ رشد دائمی (%)", round(terminal_growth * 100, 2)],
        ["بدهی خالص (میلیارد ریال)", net_debt],
        ["تعداد سهام (میلیون)", shares_outstanding],
        ["تعداد سال‌های پیش‌بینی", years],
    ]

    # DCF Valuation tab
    header = ["شرح"] + [f"سال {i+1}" for i in range(years)] + ["ارزش پایانه"]
    rows = [header]

    ebit_row = ["EBIT (میلیارد ریال)"]
    tax_row = ["نرخ مالیات (%)"]
    da_row = ["D&A (میلیارد ریال)"]
    capex_row = ["CapEx (میلیارد ریال)"]
    dwc_row = ["ΔWC (میلیارد ریال)"]
    fcff_row = ["FCFF (میلیارد ریال)"]
    disc_row = ["FCFF تنزیل‌شده"]

    pv_sum = 0.0
    for i, proj in enumerate(projections):
        fcff = _compute_fcff(
            proj["ebit"], proj["tax_rate"], proj["da"], proj["capex"], proj["delta_wc"]
        )
        discount = (1 + wacc) ** (i + 1)
        pv = fcff / discount
        pv_sum += pv

        ebit_row.append(round(proj["ebit"], 2))
        tax_row.append(round(proj["tax_rate"] * 100, 2))
        da_row.append(round(proj["da"], 2))
        capex_row.append(round(proj["capex"], 2))
        dwc_row.append(round(proj["delta_wc"], 2))
        fcff_row.append(round(fcff, 2))
        disc_row.append(round(pv, 2))

    # Terminal value (Gordon Growth)
    last_fcff = _compute_fcff(
        projections[-1]["ebit"],
        projections[-1]["tax_rate"],
        projections[-1]["da"],
        projections[-1]["capex"],
        projections[-1]["delta_wc"],
    )
    last_fcff_grown = last_fcff * (1 + terminal_growth)
    terminal_value = last_fcff_grown / (wacc - terminal_growth)
    pv_terminal = terminal_value / (1 + wacc) ** years

    ebit_row.append("")
    tax_row.append("")
    da_row.append("")
    capex_row.append("")
    dwc_row.append("")
    fcff_row.append(round(terminal_value, 2))
    disc_row.append(round(pv_terminal, 2))

    rows.extend([ebit_row, tax_row, da_row, capex_row, dwc_row, fcff_row, disc_row])

    # Equity bridge
    enterprise_value = pv_sum + pv_terminal
    equity_value = enterprise_value - net_debt
    price_per_share = equity_value / shares_outstanding if shares_outstanding else 0

    rows.extend([
        [],
        ["ارزش‌گذاری نهایی", "مقدار"],
        ["ارزش فعلی FCFF‌ها", round(pv_sum, 2)],
        ["ارزش فعلی ارزش پایانه", round(pv_terminal, 2)],
        ["ارزش سازمان (EV)", round(enterprise_value, 2)],
        ["(-) بدهی خالص", round(net_debt, 2)],
        ["ارزش حقوق صاحبان سهام", round(equity_value, 2)],
        ["ارزش هر سهم (ریال)", round(price_per_share, 2)],
    ])

    # Sensitivity tab (WACC × Terminal Growth)
    wacc_range = [round(wacc - 0.04 + i * 0.01, 2) for i in range(9)]
    tg_range = [round(terminal_growth - 0.02 + i * 0.01, 2) for i in range(5)]

    sens_header = ["WACC \\ TG"] + [f"{round(tg * 100, 1)}%" for tg in tg_range]
    sens_rows = [sens_header]
    for w in wacc_range:
        row = [f"{round(w * 100, 1)}%"]
        for tg in tg_range:
            if w <= tg:
                row.append("N/A")
            else:
                tv = last_fcff_grown / (w - tg)
                pv_tv = tv / (1 + w) ** years
                ev = pv_sum + pv_tv
                eq = ev - net_debt
                ps = round(eq / shares_outstanding, 2) if shares_outstanding else 0
                row.append(ps)
        sens_rows.append(row)

    return [
        {"name": "فرضیات", "data": assumptions_data},
        {"name": "ارزش‌گذاری DCF", "data": rows},
        {"name": "حساسیت‌سنجی", "data": sens_rows},
    ]


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
        pv_fcff, pv_terminal, sheet_url (null if sheets disabled), model_type.
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

    sheet_url = None
    if GOOGLE_SHEETS_ENABLED:
        try:
            worksheets = _build_dcf_sheet(
                company_name, projections, wacc, terminal_growth, net_debt, shares_outstanding
            )
            sheet_url = _create_and_share_sheet(f"DCF — {company_name}", worksheets)
        except Exception as e:
            logger.warning(f"DCF sheet creation failed: {e}")

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
        "sheet_url": sheet_url,
    })


# ── P&L Tool ──────────────────────────────────────────────────────────────────

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
        JSON string with projected P&L for each year + sheet_url.
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
        net_income = ebt * (1 - tax_rate) if ebt > 0 else ebt  # no tax benefit on losses
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

    sheet_url = None
    if GOOGLE_SHEETS_ENABLED:
        try:
            header = [
                "سال", "درآمد", "سود ناخالص", "حاشیه ناخالص%",
                "EBITDA", "حاشیه EBITDA%", "D&A", "EBIT",
                "حاشیه EBIT%", "هزینه بهره", "EBT", "مالیات",
                "سود خالص", "حاشیه خالص%"
            ]
            rows = [header]
            for y in years:
                rows.append([
                    y["year"], y["revenue"], y["gross_profit"], y["gross_margin_pct"],
                    y["ebitda"], y["ebitda_margin_pct"], y["da"], y["ebit"],
                    y["ebit_margin_pct"], y["interest_expense"], y["ebt"], y["tax"],
                    y["net_income"], y["net_margin_pct"],
                ])
            worksheets = [{"name": "صورت سود و زیان", "data": rows}]
            sheet_url = _create_and_share_sheet(f"P&L — {company_name}", worksheets)
        except Exception as e:
            logger.warning(f"P&L sheet creation failed: {e}")

    return json.dumps({
        "model_type": "pl",
        "company_name": company_name,
        "projections": years,
        "sheet_url": sheet_url,
    })


# ── Math helpers (numpy_financial fallbacks) ─────────────────────────────────

def _pmt(rate: float, nper: int, pv: float) -> float:
    """PMT: periodic payment for a fully-amortizing loan.

    Equivalent to numpy_financial.pmt (returns positive value, unlike npf which returns negative).
    Formula: PMT = PV * r * (1+r)^n / ((1+r)^n - 1)
    """
    if rate == 0:
        return pv / nper
    factor = (1 + rate) ** nper
    return pv * rate * factor / (factor - 1)


def _irr(cash_flows: list[float], max_iter: int = 100, tol: float = 1e-6) -> float | None:
    """Compute IRR via Newton-Raphson. Returns per-period rate or None on failure."""
    # Initial guess: small positive rate
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
        JSON string with amortization schedule + summary + sheet_url.
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
        # Interest-only payments, full principal at end
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
        # Partial amortization then balloon payment
        if balloon_month is None or balloon_month >= term_months:
            balloon_month = term_months - 1

        # Calculate payments as if fully amortizing over a longer period
        extended_term = term_months * 2  # amortize over double the term
        monthly_payment = _pmt_fn(monthly_rate, extended_term, principal)

        schedule = []
        balance = principal
        total_interest = 0.0
        for month in range(1, term_months + 1):
            interest = balance * monthly_rate
            if month == term_months:
                # Balloon — pay off remaining balance
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

    sheet_url = None
    if GOOGLE_SHEETS_ENABLED:
        try:
            header = ["ماه", "قسط", "اصل", "بهره", "مانده"]
            rows = [header] + [
                [s["month"], s["payment"], s["principal"], s["interest"], s["balance"]]
                for s in schedule
            ]
            worksheets = [{"name": "جدول استهلاک", "data": rows}]
            loan_title = f"استهلاک وام — {loan_type} — {principal}M — {round(annual_rate*100,1)}%"
            sheet_url = _create_and_share_sheet(loan_title, worksheets)
        except Exception as e:
            logger.warning(f"Loan sheet creation failed: {e}")

    return json.dumps({
        "model_type": "loan_amortization",
        "summary": summary,
        "schedule": schedule,
        "sheet_url": sheet_url,
    })


# ── Bond Pricing Tool ─────────────────────────────────────────────────────────

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
        JSON string with price, ytm, Macaulay duration, Modified duration, sheet_url.
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
    macaulay_duration = weighted_time / price  # in periods
    macaulay_duration_years = macaulay_duration / frequency

    # Modified Duration
    modified_duration = macaulay_duration_years / (1 + ytm / frequency)

    # YTM verification via IRR (cash flows from buyer's perspective)
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

    sheet_url = None
    if GOOGLE_SHEETS_ENABLED:
        try:
            summary_data = [
                ["مدل اوراق بدهی"],
                [],
                ["ارزش اسمی", face_value],
                ["نرخ کوپن (%)", round(coupon_rate * 100, 2)],
                ["YTM (%)", round(ytm * 100, 2)],
                ["دوره‌های تا سررسید", periods],
                ["تعداد کوپن در سال", frequency],
                [],
                ["قیمت اوراق", round(price, 2)],
                ["YTM از IRR (%)", round(ytm_from_irr * 100, 4)],
                ["دیرش مکالی (سال)", round(macaulay_duration_years, 4)],
                ["دیرش اصلاح‌شده", round(modified_duration, 4)],
            ]
            schedule_header = ["دوره", "کوپن", "اصل", "جریان نقدی", "ارزش فعلی"]
            schedule_rows = [schedule_header] + [
                [s["period"], s["coupon"], s["principal"], s["total_cash_flow"], s["pv"]]
                for s in schedule
            ]
            worksheets = [
                {"name": "خلاصه", "data": summary_data},
                {"name": "جدول جریان‌های نقدی", "data": schedule_rows},
            ]
            sheet_url = _create_and_share_sheet(
                f"اوراق بدهی — کوپن {round(coupon_rate*100,1)}% — YTM {round(ytm*100,1)}%",
                worksheets
            )
        except Exception as e:
            logger.warning(f"Bond sheet creation failed: {e}")

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
        "sheet_url": sheet_url,
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
                "Creates a Google Sheets spreadsheet with Assumptions, DCF Valuation, and Sensitivity tabs."
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
                "Creates a Google Sheets spreadsheet."
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
                "Creates a Google Sheets amortization table."
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
                "Creates a Google Sheets cash flow schedule."
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
