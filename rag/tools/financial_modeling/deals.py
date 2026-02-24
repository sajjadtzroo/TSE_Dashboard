"""Deal analysis financial modeling tools."""
from __future__ import annotations

import json
import logging
import math

from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ── Tool Functions ───────────────────────────────────────────────────────────


def build_lbo_model(
    db: Session,
    entry_ebitda: float,
    entry_multiple: float,
    debt_pct: float,
    interest_rate: float,
    ebitda_growth_rates: list,
    exit_multiple: float,
    tax_rate: float = 0.25,
    da_pct_ebitda: float = 0.15,
    capex_pct_ebitda: float = 0.12,
    mandatory_amort_pct: float = 0.05,
) -> str:
    """
    Build a Leveraged Buyout (LBO) model.

    Mechanics:
        Entry EV = entry_ebitda × entry_multiple
        Entry Debt = Entry EV × debt_pct; Entry Equity = EV × (1 - debt_pct)
        Each year: EBITDA grows, interest accrues, FCF pays down debt (mandatory + sweep)
        Exit EV = Exit EBITDA × exit_multiple; Exit Equity = Exit EV − Remaining Debt
        MOIC = Exit Equity / Entry Equity
        IRR: solve 0 = −Entry Equity + Exit Equity / (1+IRR)^n  [no interim distributions]

    Returns attribution: EBITDA Growth effect, Multiple Expansion effect, Debt Paydown effect.
    """
    if not ebitda_growth_rates:
        return json.dumps({"error": "ebitda_growth_rates must not be empty"})
    if debt_pct <= 0 or debt_pct >= 1:
        return json.dumps({"error": "debt_pct must be between 0 and 1"})

    years = len(ebitda_growth_rates)
    entry_ev = entry_ebitda * entry_multiple
    entry_debt = entry_ev * debt_pct
    entry_equity = entry_ev * (1 - debt_pct)

    schedule = []
    debt = entry_debt
    ebitda = entry_ebitda
    mandatory_amort_annual = entry_debt * mandatory_amort_pct

    for t, g in enumerate(ebitda_growth_rates, start=1):
        ebitda = ebitda * (1 + g)
        da = ebitda * da_pct_ebitda
        ebit = ebitda - da
        interest = debt * interest_rate
        ebt = ebit - interest
        tax = max(0.0, ebt * tax_rate)
        net_income = ebt - tax
        capex = ebitda * capex_pct_ebitda
        fcf = net_income + da - capex

        # Debt paydown: mandatory + cash sweep (excess FCF)
        mandatory = min(mandatory_amort_annual, debt)
        sweep = max(0.0, fcf - mandatory)
        total_paydown = min(mandatory + sweep, debt)
        debt = max(0.0, debt - total_paydown)

        schedule.append({
            "year": t,
            "ebitda": round(ebitda, 4),
            "da": round(da, 4),
            "ebit": round(ebit, 4),
            "interest": round(interest, 4),
            "net_income": round(net_income, 4),
            "fcf": round(fcf, 4),
            "debt_paydown": round(total_paydown, 4),
            "remaining_debt": round(debt, 4),
        })

    exit_ebitda = ebitda
    exit_ev = exit_ebitda * exit_multiple
    exit_equity = max(0.0, exit_ev - debt)
    moic = exit_equity / entry_equity if entry_equity > 0 else 0

    # IRR: solve for r such that entry_equity = exit_equity / (1+r)^n
    irr = (exit_equity / entry_equity) ** (1.0 / years) - 1 if entry_equity > 0 and exit_equity > 0 else None

    # Returns attribution
    debt_paydown_effect = entry_debt - debt
    ebitda_growth_effect = (exit_ebitda - entry_ebitda) * exit_multiple
    multiple_expansion_effect = entry_ebitda * (exit_multiple - entry_multiple)

    return json.dumps({
        "model_type": "lbo",
        "entry": {"ev": round(entry_ev, 4), "debt": round(entry_debt, 4), "equity": round(entry_equity, 4), "ebitda": entry_ebitda, "multiple": entry_multiple},
        "exit": {"ev": round(exit_ev, 4), "debt": round(debt, 4), "equity": round(exit_equity, 4), "ebitda": round(exit_ebitda, 4), "multiple": exit_multiple},
        "returns": {"moic": round(moic, 4), "irr_pct": round(irr * 100, 2) if irr else None, "hold_years": years},
        "attribution": {
            "ebitda_growth_effect": round(ebitda_growth_effect, 4),
            "multiple_expansion_effect": round(multiple_expansion_effect, 4),
            "debt_paydown_effect": round(debt_paydown_effect, 4),
        },
        "schedule": schedule,
    })


def build_ma_model(
    db: Session,
    acquirer_net_income: float,
    acquirer_shares: float,
    acquirer_share_price: float,
    target_net_income: float,
    deal_value: float,
    cash_pct: float,
    tax_rate: float,
    cost_synergies: float = 0.0,
    revenue_synergies: float = 0.0,
    financing_rate: float = 0.08,
    target_book_equity: Optional[float] = None,
) -> str:
    """
    Build an M&A Accretion/Dilution model.

    Mechanics:
        Cash portion: financed with new debt → interest cost × (1-T) reduces NI
        Stock portion: new shares issued at acquirer share price → dilutes EPS
        Pro Forma NI = Acquirer NI + Target NI + Synergies - After-Tax Financing Cost
        Pro Forma Shares = Acquirer Shares + New Shares Issued (for stock portion)
        Accretion % = (Pro Forma EPS - Standalone EPS) / Standalone EPS × 100
        Goodwill = Deal Value - Target Book Equity (if provided)
    """
    if acquirer_shares <= 0:
        return json.dumps({"error": "acquirer_shares must be positive"})
    if not (0 <= cash_pct <= 1):
        return json.dumps({"error": "cash_pct must be between 0 and 1"})

    standalone_eps = acquirer_net_income / acquirer_shares

    # Financing structure
    cash_consideration = deal_value * cash_pct
    stock_consideration = deal_value * (1 - cash_pct)

    # New debt interest cost (after-tax)
    financing_cost_after_tax = cash_consideration * financing_rate * (1 - tax_rate)

    # New shares issued (stock portion at current acquirer price)
    new_shares_issued = stock_consideration / acquirer_share_price if acquirer_share_price > 0 else 0

    # Pro forma
    pro_forma_ni = acquirer_net_income + target_net_income + cost_synergies + revenue_synergies - financing_cost_after_tax
    pro_forma_shares = acquirer_shares + new_shares_issued
    pro_forma_eps = pro_forma_ni / pro_forma_shares if pro_forma_shares > 0 else 0

    accretion_pct = (pro_forma_eps - standalone_eps) / standalone_eps * 100 if standalone_eps else 0
    accretive = accretion_pct > 0

    # Goodwill
    if target_book_equity is None:
        target_book_equity = deal_value * 0.6
    goodwill = max(0.0, deal_value - target_book_equity)

    return json.dumps({
        "model_type": "ma_accretion_dilution",
        "standalone_eps": round(standalone_eps, 4),
        "pro_forma_eps": round(pro_forma_eps, 4),
        "accretion_pct": round(accretion_pct, 4),
        "accretive": accretive,
        "deal_structure": {
            "deal_value": deal_value,
            "cash_consideration": round(cash_consideration, 4),
            "stock_consideration": round(stock_consideration, 4),
            "new_shares_issued": round(new_shares_issued, 4),
            "pro_forma_shares": round(pro_forma_shares, 4),
        },
        "pro_forma_income": {
            "acquirer_ni": acquirer_net_income,
            "target_ni": target_net_income,
            "cost_synergies": cost_synergies,
            "revenue_synergies": revenue_synergies,
            "financing_cost_after_tax": round(financing_cost_after_tax, 4),
            "pro_forma_ni": round(pro_forma_ni, 4),
        },
        "goodwill": round(goodwill, 4),
    })


def compute_credit_metrics(
    db: Session,
    ebitda: float,
    interest_expense: float,
    total_debt: float,
    cash: float,
    capex: float = 0.0,
    mandatory_amortization: float = 0.0,
    revenue: Optional[float] = None,
    max_leverage_multiple: float = 4.0,
) -> str:
    """
    Compute key credit and leverage metrics.

    Metrics:
        Net Debt = Total Debt - Cash
        Net Leverage = Net Debt / EBITDA
        Interest Coverage = EBITDA / Interest
        DSCR = (EBITDA - CapEx) / (Interest + Mandatory Amort)
        Debt Capacity (at max_leverage × EBITDA)
    """
    if ebitda <= 0:
        return json.dumps({"error": "ebitda must be positive"})

    net_debt = total_debt - cash
    net_leverage = net_debt / ebitda
    gross_leverage = total_debt / ebitda
    interest_coverage = ebitda / interest_expense if interest_expense > 0 else None

    debt_service = interest_expense + mandatory_amortization
    dscr = (ebitda - capex) / debt_service if debt_service > 0 else None

    debt_capacity = ebitda * max_leverage_multiple
    debt_headroom = debt_capacity - total_debt

    result = {
        "model_type": "credit_metrics",
        "net_debt": round(net_debt, 4),
        "gross_leverage": round(gross_leverage, 4),
        "net_leverage": round(net_leverage, 4),
        "interest_coverage": round(interest_coverage, 4) if interest_coverage else None,
        "dscr": round(dscr, 4) if dscr else None,
        "debt_capacity": round(debt_capacity, 4),
        "debt_headroom": round(debt_headroom, 4),
        "credit_rating_proxy": (
            "Investment Grade" if net_leverage < 2.5 else
            "High Yield" if net_leverage < 5.0 else
            "Distressed"
        ),
    }
    if revenue:
        result["debt_to_revenue"] = round(total_debt / revenue, 4)
    return json.dumps(result)


def compute_liquidation_value(
    db: Session,
    assets: list,
    claims: list,
    admin_costs_pct: float = 0.05,
) -> str:
    """
    Compute liquidation value and creditor recovery in a distressed scenario.

    Apply recovery rates to each asset, deduct admin costs, then distribute
    through claims waterfall in priority order.

    Args:
        assets: [{name, book_value, recovery_rate}]
        claims: [{name, amount, priority}] (priority 1 = highest, e.g. secured)
        admin_costs_pct: Bankruptcy admin costs as fraction of liquidation proceeds.
    """
    if not assets:
        return json.dumps({"error": "assets list must not be empty"})
    if not claims:
        return json.dumps({"error": "claims list must not be empty"})

    # Compute liquidation proceeds
    asset_recoveries = []
    total_liquidation = 0.0
    for a in assets:
        recovery = a["book_value"] * a.get("recovery_rate", 0.5)
        total_liquidation += recovery
        asset_recoveries.append({
            "name": a["name"],
            "book_value": a["book_value"],
            "recovery_rate": a.get("recovery_rate", 0.5),
            "recovery_value": round(recovery, 4),
        })

    admin_costs = total_liquidation * admin_costs_pct
    net_proceeds = total_liquidation - admin_costs

    # Distribute through waterfall
    remaining = net_proceeds
    sorted_claims = sorted(claims, key=lambda c: c.get("priority", 999))
    waterfall = []
    for claim in sorted_claims:
        amount = claim["amount"]
        recovery = min(remaining, amount)
        recovery_pct = (recovery / amount * 100) if amount > 0 else 0
        remaining = max(0.0, remaining - recovery)
        waterfall.append({
            "name": claim["name"],
            "claim_amount": amount,
            "recovery_amount": round(recovery, 4),
            "recovery_pct": round(recovery_pct, 2),
            "priority": claim.get("priority", 999),
            "fulcrum": recovery < amount and remaining == 0,
        })

    # Identify fulcrum security (last class to get partial recovery)
    fulcrum_security = next((w["name"] for w in waterfall if w["fulcrum"]), None)

    return json.dumps({
        "model_type": "liquidation_value",
        "total_book_value": round(sum(a["book_value"] for a in assets), 4),
        "total_liquidation_value": round(total_liquidation, 4),
        "admin_costs": round(admin_costs, 4),
        "net_proceeds": round(net_proceeds, 4),
        "asset_recoveries": asset_recoveries,
        "waterfall": waterfall,
        "fulcrum_security": fulcrum_security,
    })


def compute_ipo_pricing(
    db: Session,
    shares_offered: float,
    offer_price: float,
    pre_ipo_shares: float,
    underwriting_discount_pct: float = 0.05,
    first_day_close: Optional[float] = None,
    greenshoe_pct: float = 0.15,
) -> str:
    """
    Analyze IPO economics: gross proceeds, net proceeds, underpricing, and greenshoe.

    Args:
        shares_offered: Shares in IPO (millions).
        offer_price: IPO offer price (IRR).
        pre_ipo_shares: Existing shares before IPO (millions).
        underwriting_discount_pct: Underwriting fee fraction. Default 5%.
        first_day_close: First-day closing price for underpricing calc. Optional.
        greenshoe_pct: Overallotment option fraction. Default 15%.
    """
    gross_proceeds = shares_offered * offer_price
    underwriting_fee = gross_proceeds * underwriting_discount_pct
    net_proceeds = gross_proceeds - underwriting_fee

    total_shares = pre_ipo_shares + shares_offered
    float_pct = shares_offered / total_shares * 100
    market_cap_at_offer = total_shares * offer_price

    greenshoe_shares = shares_offered * greenshoe_pct
    greenshoe_proceeds = greenshoe_shares * offer_price

    result = {
        "model_type": "ipo_pricing",
        "shares_offered": shares_offered,
        "offer_price": offer_price,
        "gross_proceeds": round(gross_proceeds, 4),
        "underwriting_fee": round(underwriting_fee, 4),
        "net_proceeds": round(net_proceeds, 4),
        "market_cap_at_offer": round(market_cap_at_offer, 4),
        "float_pct": round(float_pct, 2),
        "greenshoe": {
            "shares": round(greenshoe_shares, 4),
            "max_proceeds": round(greenshoe_proceeds, 4),
        },
    }

    if first_day_close is not None:
        underpricing_pct = (first_day_close - offer_price) / offer_price * 100
        money_left_on_table = (first_day_close - offer_price) * shares_offered
        market_cap_at_close = total_shares * first_day_close
        result.update({
            "first_day_close": first_day_close,
            "underpricing_pct": round(underpricing_pct, 2),
            "money_left_on_table": round(money_left_on_table, 4),
            "market_cap_at_close": round(market_cap_at_close, 4),
        })

    return json.dumps(result)


# ── Tool Definitions & Dispatch ──────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "build_lbo_model",
            "description": (
                "Build a Leveraged Buyout (LBO) model. Computes MOIC and IRR from entry equity, "
                "debt paydown via cash sweep, and exit equity. Returns attribution of value creation "
                "to EBITDA growth, multiple expansion, and debt paydown."
            ),
            "parameters": {
                "type": "object",
                "required": ["entry_ebitda", "entry_multiple", "debt_pct", "interest_rate",
                             "ebitda_growth_rates", "exit_multiple"],
                "properties": {
                    "entry_ebitda": {"type": "number", "description": "EBITDA at acquisition (billion IRR)"},
                    "entry_multiple": {"type": "number", "description": "EV/EBITDA at entry (e.g. 8.0)"},
                    "debt_pct": {"type": "number", "description": "Debt as fraction of EV at entry (e.g. 0.65)"},
                    "interest_rate": {"type": "number", "description": "Blended interest rate decimal (e.g. 0.10)"},
                    "ebitda_growth_rates": {"type": "array", "items": {"type": "number"}, "description": "Annual EBITDA growth rates. Length = hold period."},
                    "exit_multiple": {"type": "number", "description": "EV/EBITDA at exit"},
                    "tax_rate": {"type": "number", "description": "Tax rate decimal. Default 0.25"},
                    "da_pct_ebitda": {"type": "number", "description": "D&A as fraction of EBITDA. Default 0.15"},
                    "capex_pct_ebitda": {"type": "number", "description": "CapEx as fraction of EBITDA. Default 0.12"},
                    "mandatory_amort_pct": {"type": "number", "description": "Mandatory debt amort as fraction of original debt per year. Default 0.05"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_ma_model",
            "description": (
                "Build an M&A Accretion/Dilution model. Determines if a merger is accretive "
                "(Pro Forma EPS > Standalone EPS) or dilutive. Accounts for synergies, "
                "financing costs (interest on cash/debt vs. share dilution), and goodwill."
            ),
            "parameters": {
                "type": "object",
                "required": ["acquirer_net_income", "acquirer_shares", "acquirer_share_price",
                             "target_net_income", "deal_value", "cash_pct", "tax_rate"],
                "properties": {
                    "acquirer_net_income": {"type": "number", "description": "Acquirer standalone net income"},
                    "acquirer_shares": {"type": "number", "description": "Acquirer diluted shares outstanding (millions)"},
                    "acquirer_share_price": {"type": "number", "description": "Acquirer current share price (IRR)"},
                    "target_net_income": {"type": "number", "description": "Target net income"},
                    "deal_value": {"type": "number", "description": "Total deal consideration (same unit as net incomes)"},
                    "cash_pct": {"type": "number", "description": "Fraction of deal paid in cash (vs. stock). 1.0 = all cash."},
                    "tax_rate": {"type": "number", "description": "Tax rate decimal for financing cost adjustment"},
                    "cost_synergies": {"type": "number", "description": "Annual after-tax cost synergies. Default 0."},
                    "revenue_synergies": {"type": "number", "description": "Annual after-tax revenue synergies. Default 0."},
                    "financing_rate": {"type": "number", "description": "Interest rate on new debt for cash portion. Default 0.08."},
                    "target_book_equity": {"type": "number", "description": "Target book equity for goodwill calc. Default = deal_value × 0.6."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_credit_metrics",
            "description": (
                "Compute key credit and leverage metrics for debt analysis. "
                "Returns leverage ratio, interest coverage, DSCR, and max debt capacity. "
                "Useful for evaluating LBO feasibility, covenant headroom, and credit ratings."
            ),
            "parameters": {
                "type": "object",
                "required": ["ebitda", "interest_expense", "total_debt", "cash"],
                "properties": {
                    "ebitda": {"type": "number", "description": "EBITDA (billion IRR)"},
                    "interest_expense": {"type": "number", "description": "Annual interest expense"},
                    "total_debt": {"type": "number", "description": "Total debt"},
                    "cash": {"type": "number", "description": "Cash and equivalents"},
                    "capex": {"type": "number", "description": "Capital expenditure. Default 0."},
                    "mandatory_amortization": {"type": "number", "description": "Annual mandatory debt repayment. Default 0."},
                    "revenue": {"type": "number", "description": "Revenue for debt/revenue ratio. Optional."},
                    "max_leverage_multiple": {"type": "number", "description": "Assumed max leverage for debt capacity. Default 4.0×."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_liquidation_value",
            "description": (
                "Compute liquidation value and creditor recovery in a distressed scenario. "
                "Applies recovery rates by asset class, deducts admin costs, then distributes "
                "proceeds through the claims waterfall (secured → unsecured → equity)."
            ),
            "parameters": {
                "type": "object",
                "required": ["assets", "claims"],
                "properties": {
                    "assets": {
                        "type": "array",
                        "description": "Asset list: [{name, book_value, recovery_rate}]",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "book_value": {"type": "number"},
                                "recovery_rate": {"type": "number", "description": "Fraction recoverable (0–1)"},
                            },
                        },
                    },
                    "claims": {
                        "type": "array",
                        "description": "Creditor claims in priority order: [{name, amount, priority}] where priority 1=senior secured",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "amount": {"type": "number"},
                                "priority": {"type": "integer"},
                            },
                        },
                    },
                    "admin_costs_pct": {"type": "number", "description": "Bankruptcy admin costs as fraction of liquidation proceeds. Default 0.05."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_ipo_pricing",
            "description": (
                "Analyze IPO economics: gross proceeds, net proceeds after underwriting, "
                "first-day underpricing, money left on the table, and greenshoe option. "
                "Useful for pre-IPO valuation analysis."
            ),
            "parameters": {
                "type": "object",
                "required": ["shares_offered", "offer_price", "pre_ipo_shares"],
                "properties": {
                    "shares_offered": {"type": "number", "description": "Shares offered in IPO (millions)"},
                    "offer_price": {"type": "number", "description": "IPO offer price (IRR)"},
                    "pre_ipo_shares": {"type": "number", "description": "Existing shares before IPO (millions)"},
                    "underwriting_discount_pct": {"type": "number", "description": "Underwriting fee as fraction of gross proceeds. Default 0.05."},
                    "first_day_close": {"type": "number", "description": "First-day closing price. Optional — for underpricing calc."},
                    "greenshoe_pct": {"type": "number", "description": "Greenshoe overallotment fraction. Default 0.15."},
                },
            },
        },
    },
]

TOOL_DISPATCH = {
    "build_lbo_model": build_lbo_model,
    "build_ma_model": build_ma_model,
    "compute_credit_metrics": compute_credit_metrics,
    "compute_liquidation_value": compute_liquidation_value,
    "compute_ipo_pricing": compute_ipo_pricing,
}
