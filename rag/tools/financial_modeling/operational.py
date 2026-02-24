"""Operational financial modeling tools."""
from __future__ import annotations

import json
import logging
import math

from typing import Optional

from sqlalchemy.orm import Session

from rag.tools.financial_modeling._fm_helpers import (
    EXCEL_AVAILABLE,
    Font,
    get_column_letter,
    _auto_width,
    _save_excel,
    _style_formula,
    _style_header,
    _style_input,
    _style_result,
    openpyxl,
)

logger = logging.getLogger(__name__)

# ── Tool Functions ───────────────────────────────────────────────────────────


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
                "da": round(da, 4),
                "delta_wc": round(delta_wc, 4),
                "operating_cf": round(operating_cf, 4),
                "capex": round(capex, 4),
                "investing_cf": round(investing_cf, 4),
                "net_borrowing": round(net_borrowing, 4),
                "dividends": round(dividends, 4),
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

    # ── Excel workbook ──────────────────────────────────────────────────────
    download_url = None
    if EXCEL_AVAILABLE:
        try:
            wb = _build_three_statement_workbook(
                years=years, opening_bs=opening_bs, tax_rate=tax_rate,
                dividend_payout_ratio=dividend_payout_ratio,
                revenue_list=revenue_list, ebit_list=ebit_list,
                interest_expense_list=interest_expense_list,
                da_list=da_list, capex_list=capex_list,
                total_debt_list=total_debt_list,
                net_borrowing_list=net_borrowing_list,
                ar_list=ar_list, inventory_list=inventory_list, ap_list=ap_list,
            )
            file_id = _save_excel(wb, "ThreeStatement")
            if file_id:
                download_url = f"/api/financial-modeling/download/{file_id}"
        except Exception as e:
            logger.warning("Three-statement Excel creation failed: %s", e)

    return json.dumps({
        "model_type": "three_statement_model",
        "years": years,
        "download_url": download_url,
    })


# ── Workbook builder ─────────────────────────────────────────────────────────


def _build_three_statement_workbook(
    years: list[dict],
    opening_bs: dict,
    tax_rate: float,
    dividend_payout_ratio: float = 0.0,
    revenue_list: list | None = None,
    ebit_list: list | None = None,
    interest_expense_list: list | None = None,
    da_list: list | None = None,
    capex_list: list | None = None,
    total_debt_list: list | None = None,
    net_borrowing_list: list | None = None,
    ar_list: list | None = None,
    inventory_list: list | None = None,
    ap_list: list | None = None,
):
    """Build a 5-sheet Excel workbook with formulas: Assumptions, Summary, IS, BS, CFS."""
    wb = openpyxl.Workbook()
    n = len(years)

    # ── Sheet 1: Assumptions (editable inputs) ───────────────────────────
    ws_a = wb.active
    ws_a.title = "Assumptions"
    ws_a.sheet_view.rightToLeft = True

    ws_a["A1"] = "Three-Statement Model — Assumptions"
    ws_a["A1"].font = Font(bold=True, size=14)
    ws_a.merge_cells("A1:C1")

    # Section A: Key rates (rows 3-4)
    _style_header(ws_a.cell(row=3, column=1, value="Parameter"))
    _style_header(ws_a.cell(row=3, column=2, value="Value"))

    assumptions = [
        ("Tax Rate", tax_rate),                          # B4
        ("Dividend Payout Ratio", dividend_payout_ratio), # B5
    ]
    for r, (label, val) in enumerate(assumptions, 4):
        ws_a.cell(row=r, column=1, value=label)
        _style_input(ws_a.cell(row=r, column=2, value=val))

    # Section B: Opening Balance Sheet (rows 7+)
    ws_a.cell(row=7, column=1, value="Opening Balance Sheet")
    ws_a.cell(row=7, column=1).font = Font(bold=True, size=12)

    _style_header(ws_a.cell(row=8, column=1, value="Item"))
    _style_header(ws_a.cell(row=8, column=2, value="Value"))

    opening_items = [
        ("Cash", float(opening_bs.get("cash", 0))),                      # B9
        ("Accounts Receivable", float(opening_bs.get("opening_ar", 0))),  # B10
        ("Inventory", float(opening_bs.get("opening_inventory", 0))),     # B11
        ("PP&E (Net)", float(opening_bs.get("ppe_net", 0))),              # B12
        ("Other Assets", float(opening_bs.get("other_assets", 0))),       # B13
        ("Accounts Payable", float(opening_bs.get("opening_ap", 0))),     # B14
        ("Other Liabilities", float(opening_bs.get("other_liabilities", 0))),  # B15
        ("Equity", float(opening_bs.get("equity", 0))),                   # B16
    ]
    for r, (label, val) in enumerate(opening_items, 9):
        ws_a.cell(row=r, column=1, value=label)
        _style_input(ws_a.cell(row=r, column=2, value=val))

    # Computed opening totals with formulas
    ws_a.cell(row=17, column=1, value="Total Assets")
    _style_formula(ws_a.cell(row=17, column=2, value="=SUM(B9:B13)"))  # B17
    ws_a.cell(row=18, column=1, value="Total Liabilities")
    _style_formula(ws_a.cell(row=18, column=2, value="=B14+B15"))      # B18
    ws_a.cell(row=19, column=1, value="Total L + E")
    _style_result(ws_a.cell(row=19, column=2, value="=B18+B16"))       # B19

    # Section C: Annual inputs (rows 22+)
    ws_a.cell(row=21, column=1, value="Annual Inputs")
    ws_a.cell(row=21, column=1).font = Font(bold=True, size=12)

    _style_header(ws_a.cell(row=22, column=1, value="Item"))
    for i in range(n):
        _style_header(ws_a.cell(row=22, column=i + 2, value=f"Year {i+1}"))

    # Annual input rows — row numbers: Revenue=23, EBIT=24, Interest=25,
    # D&A=26, CapEx=27, AR=28, Inventory=29, AP=30, Total Debt=31, Net Borrowing=32
    annual_inputs = [
        ("Revenue",           revenue_list or [0] * n),
        ("EBIT",              ebit_list or [0] * n),
        ("Interest Expense",  interest_expense_list or [0] * n),
        ("D&A",               da_list or [0] * n),
        ("CapEx",             capex_list or [0] * n),
        ("Accounts Receivable", ar_list or [0] * n),
        ("Inventory",         inventory_list or [0] * n),
        ("Accounts Payable",  ap_list or [0] * n),
        ("Total Debt",        total_debt_list or [0] * n),
        ("Net Borrowing",     net_borrowing_list or [0] * n),
    ]
    for r, (label, vals) in enumerate(annual_inputs, 23):
        ws_a.cell(row=r, column=1, value=label)
        for c, v in enumerate(vals, 2):
            _style_input(ws_a.cell(row=r, column=c, value=float(v)))

    _auto_width(ws_a)

    # ── Row references for Assumptions sheet ─────────────────────────────
    # Rates: B4=tax_rate, B5=dividend_payout
    # Opening BS: B9=cash, B10=AR, B11=inv, B12=PPE, B13=other_assets,
    #             B14=AP, B15=other_liab, B16=equity
    # Annual: row 23=Revenue, 24=EBIT, 25=Interest, 26=D&A, 27=CapEx,
    #         28=AR, 29=Inv, 30=AP, 31=TotalDebt, 32=NetBorrowing

    def _acol(year_idx):
        """Column letter for year_idx (0-based) in Assumptions annual section."""
        return get_column_letter(year_idx + 2)

    # ── Sheet 2: Income Statement ────────────────────────────────────────
    ws_is = wb.create_sheet("Income Statement")
    ws_is.sheet_view.rightToLeft = True

    ws_is["A1"] = "Income Statement"
    ws_is["A1"].font = Font(bold=True, size=14)
    ws_is.merge_cells(start_row=1, start_column=1, end_row=1, end_column=n + 1)

    _style_header(ws_is.cell(row=3, column=1, value="Item"))
    for i in range(n):
        _style_header(ws_is.cell(row=3, column=i + 2, value=f"Year {i+1}"))

    # IS rows: 4=Revenue, 5=EBIT, 6=Interest, 7=EBT, 8=Tax, 9=NI, 10=Dividends, 11=RetEarnings
    is_labels = [
        (4, "Revenue"),
        (5, "EBIT"),
        (6, "Interest Expense"),
        (7, "EBT (Earnings Before Tax)"),
        (8, "Tax"),
        (9, "Net Income"),
        (10, "Dividends"),
        (11, "Retained Earnings Addition"),
    ]
    for row, label in is_labels:
        ws_is.cell(row=row, column=1, value=label)

    for i in range(n):
        cl = get_column_letter(i + 2)
        acl = _acol(i)

        # Row 4: Revenue = Assumptions!annual row 23
        c = ws_is.cell(row=4, column=i + 2, value=f"=Assumptions!{acl}23")
        _style_input(c)

        # Row 5: EBIT = Assumptions!annual row 24
        c = ws_is.cell(row=5, column=i + 2, value=f"=Assumptions!{acl}24")
        _style_input(c)

        # Row 6: Interest = Assumptions!annual row 25
        c = ws_is.cell(row=6, column=i + 2, value=f"=Assumptions!{acl}25")
        _style_input(c)

        # Row 7: EBT = EBIT - Interest
        c = ws_is.cell(row=7, column=i + 2, value=f"={cl}5-{cl}6")
        _style_formula(c)

        # Row 8: Tax = MAX(0, EBT * TaxRate)
        c = ws_is.cell(row=8, column=i + 2, value=f"=MAX(0,{cl}7*Assumptions!$B$4)")
        _style_formula(c)

        # Row 9: Net Income = EBT - Tax
        c = ws_is.cell(row=9, column=i + 2, value=f"={cl}7-{cl}8")
        _style_result(c)

        # Row 10: Dividends = MAX(0, NI * DividendPayout) if NI>0
        c = ws_is.cell(row=10, column=i + 2,
                        value=f"=IF({cl}9>0,MAX(0,{cl}9*Assumptions!$B$5),0)")
        _style_formula(c)

        # Row 11: Retained Earnings Addition = NI - Dividends
        c = ws_is.cell(row=11, column=i + 2, value=f"={cl}9-{cl}10")
        _style_result(c)

    _auto_width(ws_is)

    # ── Sheet 3: Cash Flow Statement ─────────────────────────────────────
    ws_cf = wb.create_sheet("Cash Flow Statement")
    ws_cf.sheet_view.rightToLeft = True

    ws_cf["A1"] = "Cash Flow Statement"
    ws_cf["A1"].font = Font(bold=True, size=14)
    ws_cf.merge_cells(start_row=1, start_column=1, end_row=1, end_column=n + 1)

    _style_header(ws_cf.cell(row=3, column=1, value="Item"))
    for i in range(n):
        _style_header(ws_cf.cell(row=3, column=i + 2, value=f"Year {i+1}"))

    # CFS rows:
    # 4=header OPERATING, 5=NI, 6=D&A, 7=DeltaWC, 8=OperatingCF
    # 9=spacer, 10=header INVESTING, 11=CapEx, 12=InvestingCF
    # 13=spacer, 14=header FINANCING, 15=NetBorrowing, 16=DividendsPaid, 17=FinancingCF
    # 18=spacer, 19=NetChange, 20=EndingCash
    cf_labels = {
        4: ("OPERATING", True),
        5: ("Net Income", False),
        6: ("+ D&A", False),
        7: ("- Change in Working Capital", False),
        8: ("Operating Cash Flow", False),
        10: ("INVESTING", True),
        11: ("Capital Expenditure", False),
        12: ("Investing Cash Flow", False),
        14: ("FINANCING", True),
        15: ("Net Borrowing", False),
        16: ("Dividends Paid", False),
        17: ("Financing Cash Flow", False),
        19: ("Net Change in Cash", False),
        20: ("Ending Cash Balance", False),
    }
    for row, (label, is_header) in cf_labels.items():
        c = ws_cf.cell(row=row, column=1, value=label)
        if is_header:
            c.font = Font(bold=True)

    for i in range(n):
        cl = get_column_letter(i + 2)
        acl = _acol(i)
        is_cl = cl  # same column letter in IS sheet

        # Row 5: Net Income = 'Income Statement'!row9
        c = ws_cf.cell(row=5, column=i + 2,
                        value=f"='Income Statement'!{is_cl}9")
        _style_formula(c)

        # Row 6: D&A = Assumptions!annual row 26
        c = ws_cf.cell(row=6, column=i + 2, value=f"=Assumptions!{acl}26")
        _style_input(c)

        # Row 7: Delta WC — computed as change in (AR+Inv-AP)
        # Year 1: NWC_1 - NWC_opening where opening NWC = B10+B11-B14
        # Year t>1: NWC_t - NWC_(t-1)  — use Assumptions annual rows 28,29,30
        if i == 0:
            # NWC_1 = Assumptions!(B28+B29-B30), NWC_0 = Assumptions!(B10+B11-B14)
            formula = (
                f"=(Assumptions!{acl}28+Assumptions!{acl}29-Assumptions!{acl}30)"
                f"-(Assumptions!$B$10+Assumptions!$B$11-Assumptions!$B$14)"
            )
        else:
            prev_cl = _acol(i - 1)
            formula = (
                f"=(Assumptions!{acl}28+Assumptions!{acl}29-Assumptions!{acl}30)"
                f"-(Assumptions!{prev_cl}28+Assumptions!{prev_cl}29-Assumptions!{prev_cl}30)"
            )
        c = ws_cf.cell(row=7, column=i + 2, value=formula)
        _style_formula(c)

        # Row 8: Operating CF = NI + D&A - DeltaWC
        c = ws_cf.cell(row=8, column=i + 2, value=f"={cl}5+{cl}6-{cl}7")
        _style_result(c)

        # Row 11: CapEx (negative) = -Assumptions!annual row 27
        c = ws_cf.cell(row=11, column=i + 2, value=f"=-Assumptions!{acl}27")
        _style_formula(c)

        # Row 12: Investing CF = CapEx (already negative)
        c = ws_cf.cell(row=12, column=i + 2, value=f"={cl}11")
        _style_result(c)

        # Row 15: Net Borrowing = Assumptions!annual row 32
        c = ws_cf.cell(row=15, column=i + 2, value=f"=Assumptions!{acl}32")
        _style_input(c)

        # Row 16: Dividends Paid = -'Income Statement'!row10
        c = ws_cf.cell(row=16, column=i + 2,
                        value=f"=-'Income Statement'!{is_cl}10")
        _style_formula(c)

        # Row 17: Financing CF = NetBorrowing + DividendsPaid
        c = ws_cf.cell(row=17, column=i + 2, value=f"={cl}15+{cl}16")
        _style_result(c)

        # Row 19: Net Change = Operating + Investing + Financing
        c = ws_cf.cell(row=19, column=i + 2, value=f"={cl}8+{cl}12+{cl}17")
        _style_result(c)

        # Row 20: Ending Cash = previous cash + net change
        if i == 0:
            c = ws_cf.cell(row=20, column=i + 2,
                            value=f"=Assumptions!$B$9+{cl}19")
        else:
            prev_cl = get_column_letter(i + 1)
            c = ws_cf.cell(row=20, column=i + 2,
                            value=f"={prev_cl}20+{cl}19")
        _style_result(c)

    _auto_width(ws_cf)

    # ── Sheet 4: Balance Sheet ───────────────────────────────────────────
    ws_bs = wb.create_sheet("Balance Sheet")
    ws_bs.sheet_view.rightToLeft = True

    ws_bs["A1"] = "Balance Sheet"
    ws_bs["A1"].font = Font(bold=True, size=14)
    ws_bs.merge_cells(start_row=1, start_column=1, end_row=1, end_column=n + 2)

    _style_header(ws_bs.cell(row=3, column=1, value="Item"))
    _style_header(ws_bs.cell(row=3, column=2, value="Opening"))
    for i in range(n):
        _style_header(ws_bs.cell(row=3, column=i + 3, value=f"Year {i+1}"))

    # BS rows layout:
    # 4=header ASSETS, 5=Cash, 6=AR, 7=Inv, 8=PPE, 9=OtherAssets, 10=TotalAssets
    # 11=spacer, 12=header LIAB&EQ, 13=AP, 14=TotalDebt, 15=OtherLiab,
    # 16=TotalLiab, 17=Equity, 18=TotalL+E, 19=BalanceCheck
    bs_labels = {
        4: ("ASSETS", True),
        5: ("Cash", False),
        6: ("Accounts Receivable", False),
        7: ("Inventory", False),
        8: ("PP&E (Net)", False),
        9: ("Other Assets", False),
        10: ("Total Assets", False),
        12: ("LIABILITIES & EQUITY", True),
        13: ("Accounts Payable", False),
        14: ("Total Debt", False),
        15: ("Other Liabilities", False),
        16: ("Total Liabilities", False),
        17: ("Equity", False),
        18: ("Total L + E", False),
        19: ("Balance Check (A - L&E)", False),
    }
    for row, (label, is_header) in bs_labels.items():
        c = ws_bs.cell(row=row, column=1, value=label)
        if is_header:
            c.font = Font(bold=True)

    # Opening column (col 2) — formulas referencing Assumptions sheet
    opening_formulas = {
        5: "=Assumptions!$B$9",    # Cash
        6: "=Assumptions!$B$10",   # AR
        7: "=Assumptions!$B$11",   # Inventory
        8: "=Assumptions!$B$12",   # PPE
        9: "=Assumptions!$B$13",   # Other Assets
        10: "=SUM(B5:B9)",         # Total Assets
        13: "=Assumptions!$B$14",  # AP
        14: 0,                     # Total Debt (opening = 0 or user can edit)
        15: "=Assumptions!$B$15",  # Other Liabilities
        16: "=B13+B14+B15",        # Total Liabilities
        17: "=Assumptions!$B$16",  # Equity
        18: "=B16+B17",            # Total L+E
        19: "=B10-B18",            # Balance check
    }
    for row, val in opening_formulas.items():
        c = ws_bs.cell(row=row, column=2, value=val)
        if row in (10, 18, 19):
            _style_result(c)
        elif isinstance(val, str) and val.startswith("="):
            _style_formula(c)
        else:
            _style_input(c)

    # Year columns (col 3..n+2) — formulas
    for i in range(n):
        col = i + 3
        cl = get_column_letter(col)
        prev_cl = get_column_letter(col - 1)
        acl = _acol(i)
        cf_cl = get_column_letter(i + 2)  # CFS uses col i+2

        # Row 5: Cash = 'Cash Flow Statement'!row20
        c = ws_bs.cell(row=5, column=col,
                        value=f"='Cash Flow Statement'!{cf_cl}20")
        _style_formula(c)

        # Row 6: AR = Assumptions!annual row 28
        c = ws_bs.cell(row=6, column=col, value=f"=Assumptions!{acl}28")
        _style_input(c)

        # Row 7: Inventory = Assumptions!annual row 29
        c = ws_bs.cell(row=7, column=col, value=f"=Assumptions!{acl}29")
        _style_input(c)

        # Row 8: PPE = previous PPE + CapEx - D&A
        # (CapEx adds to PPE, D&A reduces it)
        c = ws_bs.cell(row=8, column=col,
                        value=f"={prev_cl}8+Assumptions!{acl}27-Assumptions!{acl}26")
        _style_formula(c)

        # Row 9: Other Assets = previous (constant)
        c = ws_bs.cell(row=9, column=col, value=f"={prev_cl}9")
        _style_input(c)

        # Row 10: Total Assets = SUM(Cash..OtherAssets)
        c = ws_bs.cell(row=10, column=col, value=f"=SUM({cl}5:{cl}9)")
        _style_result(c)

        # Row 13: AP = Assumptions!annual row 30
        c = ws_bs.cell(row=13, column=col, value=f"=Assumptions!{acl}30")
        _style_input(c)

        # Row 14: Total Debt = Assumptions!annual row 31
        c = ws_bs.cell(row=14, column=col, value=f"=Assumptions!{acl}31")
        _style_input(c)

        # Row 15: Other Liabilities = previous (constant)
        c = ws_bs.cell(row=15, column=col, value=f"={prev_cl}15")
        _style_input(c)

        # Row 16: Total Liabilities = AP + Debt + OtherLiab
        c = ws_bs.cell(row=16, column=col, value=f"={cl}13+{cl}14+{cl}15")
        _style_formula(c)

        # Row 17: Equity = previous equity + retained earnings from IS
        c = ws_bs.cell(row=17, column=col,
                        value=f"={prev_cl}17+'Income Statement'!{cf_cl}11")
        _style_result(c)

        # Row 18: Total L + E = Total Liab + Equity
        c = ws_bs.cell(row=18, column=col, value=f"={cl}16+{cl}17")
        _style_result(c)

        # Row 19: Balance Check = Total Assets - Total L+E (should be 0)
        c = ws_bs.cell(row=19, column=col, value=f"={cl}10-{cl}18")
        _style_result(c)

    _auto_width(ws_bs)

    # ── Sheet 5: Summary (cross-sheet formula references) ────────────────
    ws_s = wb.create_sheet("Summary")
    ws_s.sheet_view.rightToLeft = True

    ws_s["A1"] = "Financial Model — Three-Statement Summary"
    ws_s["A1"].font = Font(bold=True, size=14)
    ws_s.merge_cells(start_row=1, start_column=1, end_row=1, end_column=n + 1)

    _style_header(ws_s.cell(row=3, column=1, value="Item"))
    for i in range(n):
        _style_header(ws_s.cell(row=3, column=i + 2, value=f"Year {i+1}"))

    # Summary rows referencing other sheets
    # IS refs: row4=Revenue, row5=EBIT, row9=NI
    # CFS refs: row8=OpCF, row12=InvCF, row17=FinCF, row19=NetChange
    # BS refs (col offset +1): row10=TotalAssets, row16=TotalLiab, row17=Equity, row19=BalCheck
    summary_defs = [
        (4,  "Revenue",           "'Income Statement'!{cl}4"),
        (5,  "EBIT",              "'Income Statement'!{cl}5"),
        (6,  "Net Income",        "'Income Statement'!{cl}9"),
        # spacer row 7
        (8,  "Operating CF",      "'Cash Flow Statement'!{cl}8"),
        (9,  "Investing CF",      "'Cash Flow Statement'!{cl}12"),
        (10, "Financing CF",      "'Cash Flow Statement'!{cl}17"),
        (11, "Net Change in Cash","'Cash Flow Statement'!{cl}19"),
        # spacer row 12
        (13, "Total Assets",      "'Balance Sheet'!{bcl}10"),
        (14, "Total Liabilities", "'Balance Sheet'!{bcl}16"),
        (15, "Equity",            "'Balance Sheet'!{bcl}17"),
        (16, "Balance Check",     "'Balance Sheet'!{bcl}19"),
    ]

    for row, label, _ in summary_defs:
        ws_s.cell(row=row, column=1, value=label)

    for i in range(n):
        is_cf_cl = get_column_letter(i + 2)   # IS/CFS column
        bs_cl = get_column_letter(i + 3)       # BS column (offset by opening col)

        for row, label, tmpl in summary_defs:
            formula = "=" + tmpl.format(cl=is_cf_cl, bcl=bs_cl)
            c = ws_s.cell(row=row, column=i + 2, value=formula)
            if label in ("Net Income", "Net Change in Cash", "Equity"):
                _style_result(c)
            elif label == "Balance Check":
                _style_result(c)
            else:
                _style_formula(c)

    _auto_width(ws_s)

    return wb


# ── Tool Definitions & Dispatch ──────────────────────────────────────────────

TOOL_DEFINITIONS = [
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
    "build_revenue_model": build_revenue_model,
    "build_wc_model": build_wc_model,
    "build_capex_schedule": build_capex_schedule,
    "build_debt_schedule": build_debt_schedule,
    "build_three_statement_model": build_three_statement_model,
}
