"""Fixed income financial modeling tools."""
from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

from rag.tools.financial_modeling._fm_helpers import (
    EXCEL_AVAILABLE,
    Font,
    _auto_width,
    _irr,
    _pmt,
    _save_excel,
    _style_formula,
    _style_header,
    _style_input,
    _style_result,
    get_column_letter,
    openpyxl,
)

logger = logging.getLogger(__name__)

# ── Workbook builders ────────────────────────────────────────────────────────


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
    elif loan_type == "bullet":
        # Bullet: interest-only payments, principal returned at maturity
        # Inputs: B4=principal, B5=annual_rate, B6=term_months
        # Month 1
        ws_s.cell(row=2, column=1, value=1)
        # Interest = principal × monthly rate
        _style_formula(ws_s.cell(row=2, column=4, value="=Inputs!$B$4*Inputs!$B$5/12"))
        # Principal = 0 for all except last month
        _style_formula(ws_s.cell(row=2, column=3,
                                  value=f"=IF(A2=Inputs!$B$6,Inputs!$B$4,0)"))
        # Payment = Interest + Principal
        _style_formula(ws_s.cell(row=2, column=2, value="=C2+D2"))
        # Balance = principal - cumulative principal paid
        _style_formula(ws_s.cell(row=2, column=5, value="=Inputs!$B$4-C2"))

        for row in range(3, term_months + 2):
            prev = row - 1
            ws_s.cell(row=row, column=1, value=row - 1)
            _style_formula(ws_s.cell(row=row, column=4, value="=Inputs!$B$4*Inputs!$B$5/12"))
            _style_formula(ws_s.cell(row=row, column=3,
                                      value=f"=IF(A{row}=Inputs!$B$6,Inputs!$B$4,0)"))
            _style_formula(ws_s.cell(row=row, column=2, value=f"=C{row}+D{row}"))
            _style_formula(ws_s.cell(row=row, column=5, value=f"=E{prev}-C{row}"))

    else:
        # Balloon: amortizing payments over extended term, balloon at balloon_month
        # Write computed values (balloon logic is complex with variable cutoff)
        for row_i, s in enumerate(schedule, 2):
            ws_s.cell(row=row_i, column=1, value=s["month"])
            ws_s.cell(row=row_i, column=2, value=s["payment"])
            ws_s.cell(row=row_i, column=3, value=s["principal"])
            ws_s.cell(row=row_i, column=4, value=s["interest"])
            ws_s.cell(row=row_i, column=5, value=s["balance"])

    _auto_width(ws_s)
    return wb


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

    # Computed metrics — formulas referencing Cash Flows sheet
    irr_row = periods + 4
    formula_metrics = [
        ("Computed Price",           "=-'Cash Flows'!D2"),
        ("Periodic YTM (IRR)",       f"='Cash Flows'!B{irr_row}"),
        ("Annual YTM",               f"='Cash Flows'!B{irr_row + 1}"),
        ("Macaulay Duration (yrs)",  f"='Cash Flows'!B{irr_row + 2}"),
        ("Modified Duration",        f"='Cash Flows'!B{irr_row + 3}"),
    ]
    for r_offset, (label, formula) in enumerate(formula_metrics):
        row = 12 + r_offset
        ws_i.cell(row=row, column=1, value=label)
        _style_formula(ws_i.cell(row=row, column=2, value=formula))

    _auto_width(ws_i)

    # ── Sheet 2: Cash Flows ───────────────────────────────────────────────────
    ws_c = wb.create_sheet("Cash Flows")
    ws_c.sheet_view.rightToLeft = True

    for col, h in enumerate(["Period", "Coupon", "Principal", "Total CF", "PV"], 1):
        _style_header(ws_c.cell(row=1, column=col, value=h))

    # Inputs refs: B4=face, B5=coupon_rate, B6=YTM, B7=periods, B8=frequency
    # Row 2: purchase price (negative) for IRR — formula = -PV(...)
    ws_c.cell(row=2, column=1, value=0)
    _style_formula(ws_c.cell(row=2, column=4, value="=PV(Inputs!$B$6/Inputs!$B$8,Inputs!$B$7,-Inputs!$B$4*Inputs!$B$5/Inputs!$B$8,-Inputs!$B$4)"))

    for row_i in range(3, periods + 3):
        period = row_i - 2
        ws_c.cell(row=row_i, column=1, value=period)
        # Coupon = face × coupon_rate / frequency
        _style_formula(ws_c.cell(row=row_i, column=2,
                                  value="=Inputs!$B$4*Inputs!$B$5/Inputs!$B$8"))
        # Principal = face if last period, else 0
        _style_formula(ws_c.cell(row=row_i, column=3,
                                  value=f"=IF(A{row_i}=Inputs!$B$7,Inputs!$B$4,0)"))
        # Total CF = Coupon + Principal
        _style_formula(ws_c.cell(row=row_i, column=4,
                                  value=f"=B{row_i}+C{row_i}"))
        # PV = Total CF / (1 + periodic YTM)^period
        _style_formula(ws_c.cell(row=row_i, column=5,
                                  value=f"=D{row_i}/(1+Inputs!$B$6/Inputs!$B$8)^A{row_i}"))

    # IRR formula over D range (D2 = -price, D3..D(n+2) = cash flows)
    irr_row = periods + 4
    ws_c.cell(row=irr_row, column=1, value="Periodic YTM (IRR)")
    _style_result(ws_c.cell(row=irr_row, column=2, value=f"=IRR(D2:D{periods + 2})"))

    # Duration formulas
    ws_c.cell(row=irr_row + 1, column=1, value="Annual YTM")
    _style_result(ws_c.cell(row=irr_row + 1, column=2,
                             value=f"={get_column_letter(2)}{irr_row}*Inputs!$B$8"))

    # Macaulay Duration = SUMPRODUCT(period, PV) / SUM(PV) / frequency
    ws_c.cell(row=irr_row + 2, column=1, value="Macaulay Duration (years)")
    _style_result(ws_c.cell(row=irr_row + 2, column=2,
                             value=f"=SUMPRODUCT(A3:A{periods+2},E3:E{periods+2})/SUM(E3:E{periods+2})/Inputs!$B$8"))

    # Modified Duration = Macaulay / (1 + YTM/frequency)
    ws_c.cell(row=irr_row + 3, column=1, value="Modified Duration")
    _style_result(ws_c.cell(row=irr_row + 3, column=2,
                             value=f"=B{irr_row+2}/(1+Inputs!$B$6/Inputs!$B$8)"))

    _auto_width(ws_c)
    return wb


# ── Tool Functions ───────────────────────────────────────────────────────────


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


# ── Tool Definitions & Dispatch ──────────────────────────────────────────────

TOOL_DEFINITIONS = [
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
    "build_loan_amortization": build_loan_amortization,
    "build_bond_model": build_bond_model,
}
