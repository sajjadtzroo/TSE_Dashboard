"""Equity metrics: FCFE, PVGO, EVA, operating leverage."""
from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


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
        Justified P/E (leading)  = payout_ratio / (ke − g)
        Justified P/E (trailing) = payout_ratio × (1 + g) / (ke − g)
    """
    if cost_of_equity <= growth_rate:
        return json.dumps({"error": "cost_of_equity must be greater than growth_rate (ke > g)"})
    if cost_of_equity <= 0:
        return json.dumps({"error": "cost_of_equity must be positive"})

    no_growth_value = earnings_per_share / cost_of_equity
    pvgo = intrinsic_value - no_growth_value
    pvgo_pct = (pvgo / intrinsic_value * 100) if intrinsic_value else 0
    ke_minus_g = cost_of_equity - growth_rate
    justified_pe_leading = payout_ratio / ke_minus_g
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


TOOL_DEFINITIONS = [
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
                    "payout_ratio": {"type": "number", "description": "Dividend payout ratio decimal (e.g. 0.40 for 40% paid out as dividends)"},
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
    "compute_fcfe": compute_fcfe,
    "compute_operating_leverage": compute_operating_leverage,
    "compute_pvgo": compute_pvgo,
    "compute_eva": compute_eva,
}
