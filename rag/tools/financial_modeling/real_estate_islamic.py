"""Real estate and Islamic finance financial modeling tools."""
from __future__ import annotations

import json
import logging
import math
from typing import Optional

from sqlalchemy.orm import Session

from rag.tools.financial_modeling._fm_helpers import _irr, _pmt

logger = logging.getLogger(__name__)

# ── Tool Functions ───────────────────────────────────────────────────────────


def compute_real_estate_noi(
    db: Session,
    gross_rental_income: float,
    vacancy_rate: float,
    operating_expenses: float,
    property_value: Optional[float] = None,
    cap_rate: Optional[float] = None,
    debt_service: Optional[float] = None,
    equity_invested: Optional[float] = None,
) -> str:
    """Compute Net Operating Income and related real estate metrics."""
    if gross_rental_income <= 0:
        return json.dumps({"error": "gross_rental_income must be positive"})
    if not (0 <= vacancy_rate < 1):
        return json.dumps({"error": "vacancy_rate must be between 0 and 1"})

    egi = gross_rental_income * (1 - vacancy_rate)
    noi = egi - operating_expenses

    result: dict = {
        "model_type": "real_estate_noi",
        "gross_rental_income": round(gross_rental_income, 4),
        "vacancy_rate": round(vacancy_rate, 4),
        "effective_gross_income": round(egi, 4),
        "operating_expenses": round(operating_expenses, 4),
        "noi": round(noi, 4),
    }

    if property_value is not None and property_value > 0:
        result["property_value"] = round(property_value, 4)
        result["cap_rate"] = round(noi / property_value, 4)
        if gross_rental_income > 0:
            result["grm"] = round(property_value / gross_rental_income, 4)
    elif cap_rate is not None and cap_rate > 0:
        implied_value = noi / cap_rate
        result["cap_rate"] = round(cap_rate, 4)
        result["implied_value"] = round(implied_value, 4)

    if debt_service is not None and debt_service > 0:
        dscr = noi / debt_service
        cash_after_debt = noi - debt_service
        result["debt_service"] = round(debt_service, 4)
        result["dscr"] = round(dscr, 4)
        result["cash_after_debt"] = round(cash_after_debt, 4)
        if equity_invested is not None and equity_invested > 0:
            result["cash_on_cash_return"] = round(cash_after_debt / equity_invested, 4)

    return json.dumps(result)


def build_development_proforma(
    db: Session,
    land_cost: float,
    construction_cost_per_sqm: float,
    total_sqm: float,
    sellable_pct: float,
    sale_price_per_sqm: float,
    construction_months: int,
    absorption_months: int = 6,
    financing_rate: float = 0.20,
    equity_pct: float = 0.40,
) -> str:
    """Build a real estate development proforma."""
    if total_sqm <= 0 or sellable_pct <= 0:
        return json.dumps({"error": "total_sqm and sellable_pct must be positive"})
    if not (0 < equity_pct <= 1):
        return json.dumps({"error": "equity_pct must be between 0 and 1"})

    construction_cost = construction_cost_per_sqm * total_sqm
    hard_costs = land_cost + construction_cost
    equity_amount = hard_costs * equity_pct
    debt_amount = hard_costs * (1 - equity_pct)

    total_months = construction_months + absorption_months
    monthly_rate = financing_rate / 12
    # Average draw: 0.5 factor for gradual drawdown
    financing_cost = debt_amount * monthly_rate * total_months * 0.5
    total_cost = hard_costs + financing_cost

    sellable_area = total_sqm * sellable_pct
    revenue = sellable_area * sale_price_per_sqm
    gross_profit = revenue - total_cost
    margin = gross_profit / revenue if revenue > 0 else 0.0

    equity_multiple = (gross_profit + equity_amount) / equity_amount if equity_amount > 0 else 0.0
    # Approximate annualized IRR from equity multiple
    irr = (equity_multiple ** (12 / total_months) - 1) if total_months > 0 and equity_multiple > 0 else 0.0
    breakeven_price = total_cost / sellable_area if sellable_area > 0 else 0.0

    return json.dumps({
        "model_type": "development_proforma",
        "land_cost": round(land_cost, 4),
        "construction_cost": round(construction_cost, 4),
        "hard_costs": round(hard_costs, 4),
        "equity_amount": round(equity_amount, 4),
        "debt_amount": round(debt_amount, 4),
        "financing_cost": round(financing_cost, 4),
        "total_cost": round(total_cost, 4),
        "sellable_area": round(sellable_area, 4),
        "revenue": round(revenue, 4),
        "gross_profit": round(gross_profit, 4),
        "margin": round(margin, 4),
        "equity_multiple": round(equity_multiple, 4),
        "irr": round(irr, 4),
        "breakeven_price": round(breakeven_price, 4),
        "total_months": total_months,
    })


def build_sukuk_model(
    db: Session,
    face_value: float,
    profit_rate: float,
    periods: int,
    sukuk_type: str = "ijara",
    market_yield: Optional[float] = None,
) -> str:
    """Build an Islamic bond (sukuk) model for ijara, murabaha, or musharaka."""
    sukuk_type = sukuk_type.lower()
    if sukuk_type not in ("ijara", "murabaha", "musharaka"):
        return json.dumps({"error": "sukuk_type must be 'ijara', 'murabaha', or 'musharaka'"})
    if periods <= 0:
        return json.dumps({"error": "periods must be positive"})
    if face_value <= 0:
        return json.dumps({"error": "face_value must be positive"})

    cash_flows: list[float] = []

    if sukuk_type == "ijara":
        # Periodic rental payments + face returned at maturity (like a bond)
        periodic_payment = face_value * profit_rate
        for t in range(1, periods + 1):
            if t < periods:
                cash_flows.append(periodic_payment)
            else:
                cash_flows.append(periodic_payment + face_value)

    elif sukuk_type == "murabaha":
        # Total price = cost + markup, divided into equal installments
        total_price = face_value + face_value * profit_rate
        installment = total_price / periods
        cash_flows = [installment] * periods

    elif sukuk_type == "musharaka":
        # Declining balance: each period buyback face/periods + profit share on remaining
        buyback = face_value / periods
        for t in range(1, periods + 1):
            remaining = face_value - buyback * (t - 1)
            profit_share = remaining * profit_rate
            cash_flows.append(buyback + profit_share)

    # Compute price if market_yield provided
    price = None
    if market_yield is not None and market_yield > 0:
        price = sum(cf / (1 + market_yield) ** t for t, cf in enumerate(cash_flows, 1))
        price = round(price, 4)

    # Compute Macaulay duration (weight by PV of cash flows)
    discount_rate = market_yield if market_yield is not None and market_yield > 0 else profit_rate
    duration = None
    if discount_rate > 0:
        pv_total = sum(cf / (1 + discount_rate) ** t for t, cf in enumerate(cash_flows, 1))
        if pv_total > 0:
            weighted_sum = sum(t * cf / (1 + discount_rate) ** t for t, cf in enumerate(cash_flows, 1))
            duration = round(weighted_sum / pv_total, 4)

    total_payments = round(sum(cash_flows), 4)

    result: dict = {
        "model_type": "sukuk",
        "sukuk_type": sukuk_type,
        "face_value": round(face_value, 4),
        "profit_rate": round(profit_rate, 4),
        "periods": periods,
        "cash_flows": [round(cf, 4) for cf in cash_flows],
        "total_payments": total_payments,
    }

    if price is not None:
        result["market_yield"] = round(market_yield, 4)
        result["price"] = price
        result["premium_discount"] = round(price - face_value, 4)

    if duration is not None:
        result["macaulay_duration"] = duration

    return json.dumps(result)


def build_murabaha_schedule(
    db: Session,
    cost_price: float,
    markup_rate: float,
    installments: int,
    grace_months: int = 0,
) -> str:
    """Build a Murabaha (cost-plus financing) payment schedule."""
    if cost_price <= 0:
        return json.dumps({"error": "cost_price must be positive"})
    if installments <= 0:
        return json.dumps({"error": "installments must be positive"})

    profit_amount = cost_price * markup_rate
    total_price = cost_price + profit_amount
    installment_amount = total_price / installments

    schedule = []
    remaining = total_price

    # Grace months (no payment)
    for p in range(1, grace_months + 1):
        schedule.append({
            "period": p,
            "payment": 0.0,
            "remaining": round(remaining, 4),
        })

    # Installment months
    for p in range(1, installments + 1):
        remaining -= installment_amount
        schedule.append({
            "period": grace_months + p,
            "payment": round(installment_amount, 4),
            "remaining": round(max(remaining, 0.0), 4),
        })

    return json.dumps({
        "model_type": "murabaha_schedule",
        "cost_price": round(cost_price, 4),
        "markup_rate": round(markup_rate, 4),
        "profit_amount": round(profit_amount, 4),
        "total_price": round(total_price, 4),
        "installment_amount": round(installment_amount, 4),
        "installments": installments,
        "grace_months": grace_months,
        "schedule": schedule,
    })


def build_ijara_model(
    db: Session,
    asset_value: float,
    lease_term_months: int,
    monthly_rent: float,
    transfer_price: float,
    maintenance_pct: float = 0.01,
) -> str:
    """Build an Ijara (Islamic lease) model with optional transfer of ownership."""
    if asset_value <= 0:
        return json.dumps({"error": "asset_value must be positive"})
    if lease_term_months <= 0:
        return json.dumps({"error": "lease_term_months must be positive"})

    total_rental = monthly_rent * lease_term_months
    maintenance = asset_value * maintenance_pct * (lease_term_months / 12)
    net_rental = total_rental - maintenance
    net_yield = net_rental / asset_value if asset_value > 0 else 0.0

    # Approximate effective annual rate:
    # PV of all payments should equal asset_value
    # Payments: monthly_rent for each month + transfer_price at end
    # Use bisection to solve for monthly rate
    effective_annual_rate = 0.0
    lo, hi = 0.0, 1.0  # monthly rate range
    for _ in range(200):
        mid = (lo + hi) / 2.0
        if mid == 0:
            pv = monthly_rent * lease_term_months + transfer_price
        else:
            pv = sum(monthly_rent / (1 + mid) ** t for t in range(1, lease_term_months + 1))
            pv += transfer_price / (1 + mid) ** lease_term_months
        if pv > asset_value:
            lo = mid
        else:
            hi = mid
    effective_annual_rate = (1 + (lo + hi) / 2.0) ** 12 - 1

    # Build schedule
    schedule = []
    for t in range(1, lease_term_months + 1):
        entry: dict = {
            "month": t,
            "payment": round(monthly_rent, 4),
            "type": "rent",
        }
        if t == lease_term_months:
            entry["transfer_price"] = round(transfer_price, 4)
            entry["total_payment"] = round(monthly_rent + transfer_price, 4)
            entry["type"] = "rent+transfer"
        schedule.append(entry)

    return json.dumps({
        "model_type": "ijara",
        "asset_value": round(asset_value, 4),
        "lease_term_months": lease_term_months,
        "monthly_rent": round(monthly_rent, 4),
        "transfer_price": round(transfer_price, 4),
        "total_rental": round(total_rental, 4),
        "maintenance": round(maintenance, 4),
        "net_rental": round(net_rental, 4),
        "net_yield": round(net_yield, 4),
        "effective_annual_rate": round(effective_annual_rate, 4),
        "schedule_length": len(schedule),
        "schedule": schedule[:12],  # first 12 months for brevity
    })


def compute_inflation_adjusted_valuation(
    db: Session,
    nominal_values: list,
    base_year: int,
    cpi_values: Optional[list] = None,
    inflation_rates: Optional[list] = None,
    metric_name: str = "value",
) -> str:
    """Deflate nominal values to real terms using CPI or inflation rates."""
    if not nominal_values:
        return json.dumps({"error": "nominal_values list is required"})
    if cpi_values is None and inflation_rates is None:
        return json.dumps({"error": "Either cpi_values or inflation_rates must be provided"})

    # Build CPI lookup
    cpi_lookup: dict = {}

    if cpi_values is not None:
        for entry in cpi_values:
            cpi_lookup[entry["year"]] = entry["cpi"]
    elif inflation_rates is not None:
        # Build CPI from inflation rates; base_year CPI = 100
        rates_by_year = {entry["year"]: entry["rate"] for entry in inflation_rates}
        all_years = sorted(set(
            [nv["year"] for nv in nominal_values] + list(rates_by_year.keys()) + [base_year]
        ))
        # Set base_year CPI = 100, then forward/backward from there
        cpi_lookup[base_year] = 100.0
        # Forward from base_year
        for i in range(len(all_years)):
            yr = all_years[i]
            if yr > base_year and yr not in cpi_lookup:
                prev_yr = yr - 1
                if prev_yr in cpi_lookup and prev_yr in rates_by_year:
                    cpi_lookup[yr] = cpi_lookup[prev_yr] * (1 + rates_by_year[prev_yr])
        # Backward from base_year
        for i in range(len(all_years) - 1, -1, -1):
            yr = all_years[i]
            if yr < base_year and yr not in cpi_lookup:
                next_yr = yr + 1
                if next_yr in cpi_lookup and yr in rates_by_year:
                    cpi_lookup[yr] = cpi_lookup[next_yr] / (1 + rates_by_year[yr])

    # Get base CPI
    if base_year not in cpi_lookup:
        return json.dumps({"error": f"CPI for base_year {base_year} not available"})
    base_cpi = cpi_lookup[base_year]

    # Deflate
    adjusted = []
    for nv in nominal_values:
        yr = nv["year"]
        nominal = nv["value"]
        if yr in cpi_lookup and cpi_lookup[yr] > 0:
            real_val = nominal * (base_cpi / cpi_lookup[yr])
            adjusted.append({
                "year": yr,
                "nominal": round(nominal, 4),
                "real": round(real_val, 4),
                "cpi": round(cpi_lookup[yr], 4),
            })
        else:
            adjusted.append({
                "year": yr,
                "nominal": round(nominal, 4),
                "real": None,
                "cpi": None,
            })

    # Compute CAGR for nominal and real
    valid = [a for a in adjusted if a["real"] is not None]
    nominal_cagr = None
    real_cagr = None
    if len(valid) >= 2:
        first = valid[0]
        last = valid[-1]
        n_years = last["year"] - first["year"]
        if n_years > 0:
            if first["nominal"] > 0 and last["nominal"] > 0:
                nominal_cagr = round((last["nominal"] / first["nominal"]) ** (1 / n_years) - 1, 4)
            if first["real"] > 0 and last["real"] > 0:
                real_cagr = round((last["real"] / first["real"]) ** (1 / n_years) - 1, 4)

    inflation_impact_pct = None
    if nominal_cagr is not None and real_cagr is not None and nominal_cagr > 0:
        inflation_impact_pct = round(1 - real_cagr / nominal_cagr, 4)

    return json.dumps({
        "model_type": "inflation_adjusted",
        "metric_name": metric_name,
        "base_year": base_year,
        "adjusted_values": adjusted,
        "nominal_cagr": nominal_cagr,
        "real_cagr": real_cagr,
        "inflation_impact_pct": inflation_impact_pct,
    })


def build_tehran_housing_model(
    db: Session,
    area_sqm: float,
    price_per_sqm: float,
    monthly_rent_per_sqm: float,
    annual_appreciation_pct: float,
    maintenance_cost_pct: float = 0.01,
    vacancy_months_per_year: float = 0,
    mortgage_amount: Optional[float] = None,
    mortgage_rate: Optional[float] = None,
    mortgage_term_months: Optional[int] = None,
) -> str:
    """Build a Tehran housing investment model with yield, appreciation, and mortgage analysis."""
    if area_sqm <= 0 or price_per_sqm <= 0:
        return json.dumps({"error": "area_sqm and price_per_sqm must be positive"})

    property_value = area_sqm * price_per_sqm
    annual_rent = monthly_rent_per_sqm * area_sqm * 12 * ((12 - vacancy_months_per_year) / 12)
    annual_maintenance = property_value * maintenance_cost_pct
    gross_yield = annual_rent / property_value if property_value > 0 else 0.0
    net_yield = (annual_rent - annual_maintenance) / property_value if property_value > 0 else 0.0

    result: dict = {
        "model_type": "tehran_housing",
        "area_sqm": round(area_sqm, 4),
        "property_value": round(property_value, 4),
        "annual_rent": round(annual_rent, 4),
        "annual_maintenance": round(annual_maintenance, 4),
        "gross_yield": round(gross_yield, 4),
        "net_yield": round(net_yield, 4),
    }

    # Mortgage analysis
    monthly_payment = None
    total_interest = None
    if (mortgage_amount is not None and mortgage_rate is not None
            and mortgage_term_months is not None and mortgage_term_months > 0):
        monthly_rate = mortgage_rate / 12
        monthly_payment = _pmt(monthly_rate, mortgage_term_months, mortgage_amount)
        total_paid = monthly_payment * mortgage_term_months
        total_interest = total_paid - mortgage_amount
        result["mortgage_amount"] = round(mortgage_amount, 4)
        result["mortgage_rate"] = round(mortgage_rate, 4)
        result["mortgage_term_months"] = mortgage_term_months
        result["monthly_payment"] = round(monthly_payment, 4)
        result["total_interest"] = round(total_interest, 4)

    # 5-year total return projection
    appreciation_5yr = property_value * ((1 + annual_appreciation_pct) ** 5 - 1)
    rental_income_5yr = annual_rent * 5
    maintenance_5yr = annual_maintenance * 5
    mortgage_interest_5yr = 0.0
    if monthly_payment is not None:
        # Total mortgage payments over 5 years (or mortgage term if shorter)
        months_5yr = min(60, mortgage_term_months)
        mortgage_interest_5yr = monthly_payment * months_5yr - mortgage_amount * (months_5yr / mortgage_term_months)

    total_return_5yr = appreciation_5yr + rental_income_5yr - maintenance_5yr - mortgage_interest_5yr
    result["appreciation_5yr"] = round(appreciation_5yr, 4)
    result["rental_income_5yr"] = round(rental_income_5yr, 4)
    result["maintenance_5yr"] = round(maintenance_5yr, 4)
    result["total_return_5yr"] = round(total_return_5yr, 4)
    result["total_return_5yr_pct"] = round(total_return_5yr / property_value, 4) if property_value > 0 else 0.0

    # Buy vs rent breakeven (simplified)
    # Each year: ownership cost = maintenance + mortgage_interest_annual (if any) - appreciation
    # vs rent paid = annual_rent
    # Find year where cumulative ownership advantage turns positive
    breakeven_years = None
    cumulative_ownership_cost = 0.0
    cumulative_rent = 0.0
    for yr in range(1, 31):
        annual_appreciation = property_value * ((1 + annual_appreciation_pct) ** yr
                                                - (1 + annual_appreciation_pct) ** (yr - 1))
        annual_mortgage_cost = 0.0
        if monthly_payment is not None and yr * 12 <= mortgage_term_months:
            annual_mortgage_cost = monthly_payment * 12 - mortgage_amount / (mortgage_term_months / 12)

        ownership_year_cost = annual_maintenance + annual_mortgage_cost - annual_appreciation
        cumulative_ownership_cost += ownership_year_cost
        cumulative_rent += annual_rent

        if cumulative_rent > cumulative_ownership_cost and breakeven_years is None:
            breakeven_years = yr
            break

    result["buy_vs_rent_breakeven_years"] = breakeven_years

    return json.dumps(result)


# ── Tool Definitions & Dispatch ──────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "compute_real_estate_noi",
            "description": (
                "Compute Net Operating Income (NOI) for a real estate property. "
                "Calculates effective gross income, NOI, cap rate, GRM, DSCR, "
                "and cash-on-cash return depending on inputs provided."
            ),
            "parameters": {
                "type": "object",
                "required": ["gross_rental_income", "vacancy_rate", "operating_expenses"],
                "properties": {
                    "gross_rental_income": {"type": "number", "description": "Annual gross rental income"},
                    "vacancy_rate": {"type": "number", "description": "Vacancy rate as decimal (e.g. 0.05 for 5%)"},
                    "operating_expenses": {"type": "number", "description": "Annual operating expenses"},
                    "property_value": {"type": "number", "description": "Property market value (to compute cap rate)"},
                    "cap_rate": {"type": "number", "description": "Cap rate (to compute implied value when property_value not given)"},
                    "debt_service": {"type": "number", "description": "Annual debt service payment"},
                    "equity_invested": {"type": "number", "description": "Total equity invested (for cash-on-cash return)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_development_proforma",
            "description": (
                "Build a real estate development proforma with land cost, construction, "
                "financing, and sale projections. Calculates profit, margin, equity multiple, "
                "IRR, and breakeven sale price per square meter."
            ),
            "parameters": {
                "type": "object",
                "required": [
                    "land_cost", "construction_cost_per_sqm", "total_sqm",
                    "sellable_pct", "sale_price_per_sqm", "construction_months",
                ],
                "properties": {
                    "land_cost": {"type": "number", "description": "Total land acquisition cost"},
                    "construction_cost_per_sqm": {"type": "number", "description": "Construction cost per square meter"},
                    "total_sqm": {"type": "number", "description": "Total built area in square meters"},
                    "sellable_pct": {"type": "number", "description": "Sellable percentage (e.g. 0.85 for 85%)"},
                    "sale_price_per_sqm": {"type": "number", "description": "Expected sale price per sqm"},
                    "construction_months": {"type": "integer", "description": "Construction duration in months"},
                    "absorption_months": {"type": "integer", "description": "Sales absorption period in months. Default 6."},
                    "financing_rate": {"type": "number", "description": "Annual financing rate (decimal). Default 0.20."},
                    "equity_pct": {"type": "number", "description": "Equity percentage of hard costs. Default 0.40."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_sukuk_model",
            "description": (
                "Build an Islamic bond (sukuk) pricing model. Supports ijara (lease-based), "
                "murabaha (cost-plus), and musharaka (diminishing partnership) structures. "
                "Computes cash flows, pricing at market yield, and Macaulay duration."
            ),
            "parameters": {
                "type": "object",
                "required": ["face_value", "profit_rate", "periods"],
                "properties": {
                    "face_value": {"type": "number", "description": "Face/par value of the sukuk"},
                    "profit_rate": {"type": "number", "description": "Periodic profit rate (decimal)"},
                    "periods": {"type": "integer", "description": "Number of payment periods"},
                    "sukuk_type": {"type": "string", "enum": ["ijara", "murabaha", "musharaka"], "description": "Sukuk structure type. Default: ijara."},
                    "market_yield": {"type": "number", "description": "Market yield for pricing (decimal). If provided, computes fair price."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_murabaha_schedule",
            "description": (
                "Build a Murabaha (cost-plus financing) payment schedule. "
                "Computes markup, total price, installment amount, and full "
                "payment schedule with optional grace period."
            ),
            "parameters": {
                "type": "object",
                "required": ["cost_price", "markup_rate", "installments"],
                "properties": {
                    "cost_price": {"type": "number", "description": "Original cost/purchase price of the asset"},
                    "markup_rate": {"type": "number", "description": "Markup rate (decimal, e.g. 0.20 for 20%)"},
                    "installments": {"type": "integer", "description": "Number of installment payments"},
                    "grace_months": {"type": "integer", "description": "Grace period months (no payments). Default 0."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_ijara_model",
            "description": (
                "Build an Ijara (Islamic lease) model. Computes total rental, maintenance, "
                "net yield, effective annual rate, and a payment schedule including "
                "the final ownership transfer payment."
            ),
            "parameters": {
                "type": "object",
                "required": ["asset_value", "lease_term_months", "monthly_rent", "transfer_price"],
                "properties": {
                    "asset_value": {"type": "number", "description": "Original asset value"},
                    "lease_term_months": {"type": "integer", "description": "Lease duration in months"},
                    "monthly_rent": {"type": "number", "description": "Monthly rental payment"},
                    "transfer_price": {"type": "number", "description": "Final ownership transfer price"},
                    "maintenance_pct": {"type": "number", "description": "Annual maintenance as % of asset value. Default 0.01."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_inflation_adjusted_valuation",
            "description": (
                "Deflate nominal values to real terms using CPI data or inflation rates. "
                "Computes nominal and real CAGR, and measures inflation's impact on returns. "
                "Useful for analyzing Iranian asset values in real terms."
            ),
            "parameters": {
                "type": "object",
                "required": ["nominal_values", "base_year"],
                "properties": {
                    "nominal_values": {
                        "type": "array",
                        "description": "List of {year, value} objects with nominal values",
                        "items": {
                            "type": "object",
                            "properties": {
                                "year": {"type": "integer"},
                                "value": {"type": "number"},
                            },
                        },
                    },
                    "base_year": {"type": "integer", "description": "Base year for deflation (real values expressed in this year's prices)"},
                    "cpi_values": {
                        "type": "array",
                        "description": "List of {year, cpi} objects. Provide either this or inflation_rates.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "year": {"type": "integer"},
                                "cpi": {"type": "number"},
                            },
                        },
                    },
                    "inflation_rates": {
                        "type": "array",
                        "description": "List of {year, rate} objects (e.g. 0.30 for 30%). Provide either this or cpi_values.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "year": {"type": "integer"},
                                "rate": {"type": "number"},
                            },
                        },
                    },
                    "metric_name": {"type": "string", "description": "Name of the metric being adjusted. Default: 'value'."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_tehran_housing_model",
            "description": (
                "Build a Tehran housing investment analysis model. Calculates gross/net yield, "
                "5-year total return with appreciation, optional mortgage analysis, "
                "and buy-vs-rent breakeven estimation."
            ),
            "parameters": {
                "type": "object",
                "required": ["area_sqm", "price_per_sqm", "monthly_rent_per_sqm", "annual_appreciation_pct"],
                "properties": {
                    "area_sqm": {"type": "number", "description": "Property area in square meters"},
                    "price_per_sqm": {"type": "number", "description": "Purchase price per square meter"},
                    "monthly_rent_per_sqm": {"type": "number", "description": "Monthly rent per square meter"},
                    "annual_appreciation_pct": {"type": "number", "description": "Expected annual price appreciation (decimal, e.g. 0.25 for 25%)"},
                    "maintenance_cost_pct": {"type": "number", "description": "Annual maintenance as % of property value. Default 0.01."},
                    "vacancy_months_per_year": {"type": "number", "description": "Expected vacancy months per year. Default 0."},
                    "mortgage_amount": {"type": "number", "description": "Mortgage loan amount (optional)"},
                    "mortgage_rate": {"type": "number", "description": "Annual mortgage rate (decimal, optional)"},
                    "mortgage_term_months": {"type": "integer", "description": "Mortgage term in months (optional)"},
                },
            },
        },
    },
]

TOOL_DISPATCH = {
    "compute_real_estate_noi": compute_real_estate_noi,
    "build_development_proforma": build_development_proforma,
    "build_sukuk_model": build_sukuk_model,
    "build_murabaha_schedule": build_murabaha_schedule,
    "build_ijara_model": build_ijara_model,
    "compute_inflation_adjusted_valuation": compute_inflation_adjusted_valuation,
    "build_tehran_housing_model": build_tehran_housing_model,
}
