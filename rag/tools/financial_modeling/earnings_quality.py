"""Earnings quality and FP&A financial modeling tools."""
from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ── Tool Functions ───────────────────────────────────────────────────────────


def compute_altman_z(
    db: Session,
    working_capital: float,
    total_assets: float,
    retained_earnings: float,
    ebit: float,
    total_liabilities: float,
    revenue: float,
    market_cap: Optional[float] = None,
    book_equity: Optional[float] = None,
) -> str:
    """
    Compute Altman Z-Score for bankruptcy prediction.

    Public Z-Score: Z = 1.2×X1 + 1.4×X2 + 3.3×X3 + 0.6×X4 + 1.0×X5
        X1 = Working Capital / Total Assets
        X2 = Retained Earnings / Total Assets
        X3 = EBIT / Total Assets
        X4 = Market Cap / Total Liabilities (public)
        X5 = Revenue / Total Assets

    Private Z'-Score: uses Book Equity instead of Market Cap in X4.
    Zones: Public: Z>2.99=Safe, 1.81-2.99=Grey, <1.81=Distress
           Private: Z'>2.9=Safe, 1.23-2.9=Grey, <1.23=Distress
    """
    if total_assets <= 0:
        return json.dumps({"error": "total_assets must be positive"})
    if total_liabilities <= 0:
        return json.dumps({"error": "total_liabilities must be positive"})

    x1 = working_capital / total_assets
    x2 = retained_earnings / total_assets
    x3 = ebit / total_assets
    x5 = revenue / total_assets

    results = {}

    if market_cap is not None:
        x4_public = market_cap / total_liabilities
        z_public = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4_public + 1.0 * x5
        zone_public = "Safe" if z_public > 2.99 else "Grey Zone" if z_public > 1.81 else "Distress"
        results["public"] = {
            "z_score": round(z_public, 4),
            "zone": zone_public,
            "x4_market_cap_to_liabilities": round(x4_public, 4),
        }

    if book_equity is not None or market_cap is None:
        equity_for_private = book_equity if book_equity is not None else (total_assets - total_liabilities)
        x4_private = equity_for_private / total_liabilities
        z_prime = 0.717 * x1 + 0.847 * x2 + 3.107 * x3 + 0.420 * x4_private + 0.998 * x5
        zone_private = "Safe" if z_prime > 2.9 else "Grey Zone" if z_prime > 1.23 else "Distress"
        results["private"] = {
            "z_prime_score": round(z_prime, 4),
            "zone": zone_private,
            "x4_book_equity_to_liabilities": round(x4_private, 4),
        }

    return json.dumps({
        "model_type": "altman_z",
        "components": {
            "x1_working_capital_to_assets": round(x1, 4),
            "x2_retained_earnings_to_assets": round(x2, 4),
            "x3_ebit_to_assets": round(x3, 4),
            "x5_revenue_to_assets": round(x5, 4),
        },
        **results,
    })


def compute_beneish_score(
    db: Session,
    ar_current: float, sales_current: float,
    ar_prior: float, sales_prior: float,
    gross_profit_current: float, gross_profit_prior: float,
    current_assets_current: float, ppe_current: float, total_assets_current: float,
    current_assets_prior: float, ppe_prior: float, total_assets_prior: float,
    dep_current: float, dep_prior: float,
    sga_current: float, sga_prior: float,
    net_income: float, cfo: float,
    ltd_current: float, current_liab_current: float,
    ltd_prior: float, current_liab_prior: float,
) -> str:
    """
    Compute Beneish M-Score for earnings manipulation detection.

    M = -4.84 + 0.920(DSRI) + 0.528(GMI) + 0.404(AQI) + 0.892(SGI)
        + 0.115(DEPI) - 0.172(SGAI) + 4.679(TATA) - 0.327(LVGI)

    M > -1.78 suggests likely manipulation.
    """
    if sales_prior == 0 or total_assets_current == 0:
        return json.dumps({"error": "sales_prior and total_assets_current must be non-zero"})

    # DSRI: Days Sales Receivables Index
    dsri = (ar_current / sales_current) / (ar_prior / sales_prior) if (ar_prior / sales_prior) != 0 else 1

    # GMI: Gross Margin Index (prior / current — declining margin → GMI > 1)
    gm_current = gross_profit_current / sales_current if sales_current else 0
    gm_prior = gross_profit_prior / sales_prior if sales_prior else 0
    gmi = gm_prior / gm_current if gm_current != 0 else 1

    # AQI: Asset Quality Index
    non_current_current = 1 - (current_assets_current + ppe_current) / total_assets_current
    non_current_prior = 1 - (current_assets_prior + ppe_prior) / total_assets_prior if total_assets_prior else 0
    aqi = non_current_current / non_current_prior if non_current_prior != 0 else 1

    # SGI: Sales Growth Index
    sgi = sales_current / sales_prior

    # DEPI: Depreciation Index (lower dep rate → DEPI > 1)
    dep_rate_prior = dep_prior / (dep_prior + ppe_prior) if (dep_prior + ppe_prior) != 0 else 0
    dep_rate_current = dep_current / (dep_current + ppe_current) if (dep_current + ppe_current) != 0 else 0
    depi = dep_rate_prior / dep_rate_current if dep_rate_current != 0 else 1

    # SGAI: SG&A Index
    sga_ratio_current = sga_current / sales_current if sales_current else 0
    sga_ratio_prior = sga_prior / sales_prior if sales_prior else 0
    sgai = sga_ratio_current / sga_ratio_prior if sga_ratio_prior != 0 else 1

    # TATA: Total Accruals to Total Assets
    tata = (net_income - cfo) / total_assets_current

    # LVGI: Leverage Index
    lev_current = (ltd_current + current_liab_current) / total_assets_current
    lev_prior = (ltd_prior + current_liab_prior) / total_assets_prior if total_assets_prior else 0
    lvgi = lev_current / lev_prior if lev_prior != 0 else 1

    m_score = (-4.84 + 0.920 * dsri + 0.528 * gmi + 0.404 * aqi + 0.892 * sgi
               + 0.115 * depi - 0.172 * sgai + 4.679 * tata - 0.327 * lvgi)

    return json.dumps({
        "model_type": "beneish_m_score",
        "m_score": round(m_score, 4),
        "manipulation_likely": m_score > -1.78,
        "interpretation": "Likely manipulation" if m_score > -1.78 else "No manipulation signal",
        "components": {
            "dsri": round(dsri, 4),
            "gmi": round(gmi, 4),
            "aqi": round(aqi, 4),
            "sgi": round(sgi, 4),
            "depi": round(depi, 4),
            "sgai": round(sgai, 4),
            "tata": round(tata, 4),
            "lvgi": round(lvgi, 4),
        },
    })


def compute_accrual_ratios(
    db: Session,
    net_income: float,
    cfo: float,
    cfi: float,
    total_assets_current: float,
    total_assets_prior: float,
    cash_current: float = 0.0,
    cash_prior: float = 0.0,
    total_debt_current: float = 0.0,
    total_debt_prior: float = 0.0,
) -> str:
    """
    Compute accrual-based earnings quality metrics.

    CF-based: Accrual Ratio = (NI - CFO - CFI) / Average Total Assets
    BS-based: Accrual Ratio = (ΔNon-Cash Assets - ΔNon-Debt Liabilities) / Average Total Assets
    High accruals (positive) indicate lower earnings quality.
    """
    avg_assets = (total_assets_current + total_assets_prior) / 2
    if avg_assets == 0:
        return json.dumps({"error": "average total assets must be non-zero"})

    # CF-based accrual ratio
    cf_accrual_ratio = (net_income - cfo - cfi) / avg_assets

    # BS-based accrual ratio (simplified)
    delta_non_cash_assets = (total_assets_current - cash_current) - (total_assets_prior - cash_prior)
    delta_non_debt_liabilities = (
        (total_assets_current - total_debt_current - (total_assets_current - total_debt_current - 0))
    )
    # Simplified version: ΔNet Assets excluding cash and debt changes
    bs_accrual_ratio = (
        ((total_assets_current - cash_current) - (total_assets_prior - cash_prior))
        - ((total_debt_current) - (total_debt_prior))
    ) / avg_assets

    total_accruals = net_income - cfo

    return json.dumps({
        "model_type": "accrual_ratios",
        "total_accruals": round(total_accruals, 4),
        "cf_accrual_ratio": round(cf_accrual_ratio, 4),
        "bs_accrual_ratio": round(bs_accrual_ratio, 4),
        "interpretation": (
            "High accruals — lower earnings quality" if cf_accrual_ratio > 0.05
            else "Low accruals — higher earnings quality" if cf_accrual_ratio < -0.05
            else "Moderate accruals"
        ),
        "avg_total_assets": round(avg_assets, 4),
    })


def compute_variance_analysis(
    db: Session,
    actual_price: float,
    budget_price: float,
    actual_volume: float,
    budget_volume: float,
    actual_hours: Optional[float] = None,
    budget_hours: Optional[float] = None,
    actual_rate: Optional[float] = None,
    budget_rate: Optional[float] = None,
) -> str:
    """
    Compute budget vs. actual variance analysis for FP&A.

    Revenue variances:
        Price Variance = (Actual Price - Budget Price) × Actual Volume
        Volume Variance = (Actual Volume - Budget Volume) × Budget Price
        Total Variance = Price Variance + Volume Variance

    Labor variances (if hours and rates provided):
        Spending (Rate) Variance = (Actual Rate - Budget Rate) × Actual Hours
        Efficiency Variance = (Actual Hours - Budget Hours) × Budget Rate

    Favorable = positive (more revenue or less cost than budget).
    """
    actual_revenue = actual_price * actual_volume
    budget_revenue = budget_price * budget_volume

    price_variance = (actual_price - budget_price) * actual_volume
    volume_variance = (actual_volume - budget_volume) * budget_price
    total_revenue_variance = actual_revenue - budget_revenue

    result = {
        "model_type": "variance_analysis",
        "revenue": {
            "actual": round(actual_revenue, 4),
            "budget": round(budget_revenue, 4),
            "total_variance": round(total_revenue_variance, 4),
            "price_variance": round(price_variance, 4),
            "volume_variance": round(volume_variance, 4),
            "price_variance_favorable": price_variance >= 0,
            "volume_variance_favorable": volume_variance >= 0,
        },
    }

    if all(p is not None for p in [actual_hours, budget_hours, actual_rate, budget_rate]):
        spending_variance = (actual_rate - budget_rate) * actual_hours
        efficiency_variance = (actual_hours - budget_hours) * budget_rate
        total_labor_variance = spending_variance + efficiency_variance
        result["labor"] = {
            "actual_cost": round(actual_hours * actual_rate, 4),
            "budget_cost": round(budget_hours * budget_rate, 4),
            "total_variance": round(total_labor_variance, 4),
            "spending_variance": round(spending_variance, 4),
            "efficiency_variance": round(efficiency_variance, 4),
            "spending_variance_favorable": spending_variance <= 0,  # less cost = favorable
            "efficiency_variance_favorable": efficiency_variance <= 0,
        }

    return json.dumps(result)


# ── Industry Benchmarks Tool ──────────────────────────────────────────────────

def lookup_industry_benchmarks(
    db: Session,
    business_type: str,
    country: str = "Iran",
) -> str:
    """
    Look up industry financial benchmarks for a given business type using web search.

    Performs 3 targeted web searches to find:
    - Revenue range (small/medium/large businesses)
    - Gross margin and EBITDA margin benchmarks
    - Key cost drivers and working capital norms

    The LLM should extract structured benchmark data from the search results
    and use them as default inputs when building financial models.

    Args:
        business_type: Business description in English or Persian
            (e.g. "coffee roastery", "online trading exchange", "pharmacy", "قهوه‌برشته‌کاری")
        country: Country context for localized benchmarks. Default "Iran".

    Returns:
        JSON with search results for the LLM to extract benchmark data from.
    """
    from rag.tools.web import web_search

    queries = [
        f"{business_type} annual revenue benchmark {country} 2024 2025",
        f"{business_type} gross margin EBITDA margin industry average",
        f"{business_type} درآمد سالانه بنچمارک ایران حاشیه سود",
    ]

    all_results = []
    for query in queries:
        result_json = web_search(db, query=query, max_results=3)
        try:
            data = json.loads(result_json)
            if "results" in data:
                all_results.extend(data["results"])
        except Exception:
            pass

    return json.dumps({
        "model_type": "industry_benchmarks",
        "business_type": business_type,
        "country": country,
        "search_results": all_results[:9],
        "instruction": (
            "Extract from these results: revenue range (min/max), "
            "gross margin %, EBITDA margin %, typical CapEx % of revenue, "
            "DSO/DIO/DPO norms. Use as DEFAULT inputs for modeling tools. "
            "Always cite the source when presenting benchmarks to the user."
        ),
    }, ensure_ascii=False)


# ── Tool Definitions & Dispatch ──────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "compute_altman_z",
            "description": (
                "Compute Altman Z-Score for bankruptcy prediction. "
                "Public: Z = 1.2X1 + 1.4X2 + 3.3X3 + 0.6X4 + 1.0X5. "
                "Private Z': uses book equity instead of market cap in X4. "
                "Z > 2.99 = Safe; 1.81–2.99 = Grey; < 1.81 = Distress."
            ),
            "parameters": {
                "type": "object",
                "required": ["working_capital", "total_assets", "retained_earnings",
                             "ebit", "total_liabilities", "revenue"],
                "properties": {
                    "working_capital": {"type": "number", "description": "Current Assets - Current Liabilities"},
                    "total_assets": {"type": "number", "description": "Total assets"},
                    "retained_earnings": {"type": "number", "description": "Cumulative retained earnings"},
                    "ebit": {"type": "number", "description": "Earnings before interest and taxes"},
                    "total_liabilities": {"type": "number", "description": "Total debt + current liabilities"},
                    "revenue": {"type": "number", "description": "Total revenue"},
                    "market_cap": {"type": "number", "description": "Market capitalization. Use for public company. Omit for private."},
                    "book_equity": {"type": "number", "description": "Book value of equity. Used for private Z'-Score when market_cap not provided."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_beneish_score",
            "description": (
                "Compute Beneish M-Score for earnings manipulation detection. "
                "M > -1.78 suggests likely manipulation. Requires two periods of financial data "
                "to compute the 8 index ratios."
            ),
            "parameters": {
                "type": "object",
                "required": ["ar_current", "sales_current", "ar_prior", "sales_prior",
                             "gross_profit_current", "gross_profit_prior",
                             "current_assets_current", "ppe_current", "total_assets_current",
                             "current_assets_prior", "ppe_prior", "total_assets_prior",
                             "dep_current", "dep_prior", "sga_current", "sga_prior",
                             "net_income", "cfo", "ltd_current", "current_liab_current",
                             "ltd_prior", "current_liab_prior"],
                "properties": {
                    "ar_current": {"type": "number", "description": "Accounts Receivable (current year)"},
                    "sales_current": {"type": "number", "description": "Net Sales (current year)"},
                    "ar_prior": {"type": "number", "description": "Accounts Receivable (prior year)"},
                    "sales_prior": {"type": "number", "description": "Net Sales (prior year)"},
                    "gross_profit_current": {"type": "number"},
                    "gross_profit_prior": {"type": "number"},
                    "current_assets_current": {"type": "number"},
                    "ppe_current": {"type": "number", "description": "Net PP&E (current year)"},
                    "total_assets_current": {"type": "number"},
                    "current_assets_prior": {"type": "number"},
                    "ppe_prior": {"type": "number", "description": "Net PP&E (prior year)"},
                    "total_assets_prior": {"type": "number"},
                    "dep_current": {"type": "number", "description": "Depreciation expense (current year)"},
                    "dep_prior": {"type": "number", "description": "Depreciation expense (prior year)"},
                    "sga_current": {"type": "number", "description": "SG&A expense (current year)"},
                    "sga_prior": {"type": "number", "description": "SG&A expense (prior year)"},
                    "net_income": {"type": "number", "description": "Net income (current year)"},
                    "cfo": {"type": "number", "description": "Cash flow from operations (current year)"},
                    "ltd_current": {"type": "number", "description": "Long-term debt (current year)"},
                    "current_liab_current": {"type": "number"},
                    "ltd_prior": {"type": "number"},
                    "current_liab_prior": {"type": "number"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_accrual_ratios",
            "description": (
                "Compute accrual-based earnings quality metrics. "
                "High accruals relative to assets indicate lower earnings quality. "
                "Two methods: Balance Sheet (ΔNon-Cash Assets - ΔNon-Debt Liabilities) / Avg Assets, "
                "and Cash Flow (NI - CFO - CFI) / Avg Assets."
            ),
            "parameters": {
                "type": "object",
                "required": ["net_income", "cfo", "cfi",
                             "total_assets_current", "total_assets_prior"],
                "properties": {
                    "net_income": {"type": "number", "description": "Net income"},
                    "cfo": {"type": "number", "description": "Cash flow from operations"},
                    "cfi": {"type": "number", "description": "Cash flow from investing"},
                    "total_assets_current": {"type": "number"},
                    "total_assets_prior": {"type": "number"},
                    "cash_current": {"type": "number", "description": "Cash (current). For BS accrual."},
                    "cash_prior": {"type": "number"},
                    "total_debt_current": {"type": "number"},
                    "total_debt_prior": {"type": "number"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_variance_analysis",
            "description": (
                "Compute budget vs. actual variance analysis for FP&A. "
                "Splits total revenue variance into Price Variance and Volume Variance. "
                "Splits labor cost variance into Spending (Rate) Variance and Efficiency Variance."
            ),
            "parameters": {
                "type": "object",
                "required": ["actual_price", "budget_price", "actual_volume", "budget_volume"],
                "properties": {
                    "actual_price": {"type": "number", "description": "Actual selling price per unit"},
                    "budget_price": {"type": "number", "description": "Budgeted selling price per unit"},
                    "actual_volume": {"type": "number", "description": "Actual units sold"},
                    "budget_volume": {"type": "number", "description": "Budgeted units sold"},
                    "actual_hours": {"type": "number", "description": "Actual labor hours. Optional."},
                    "budget_hours": {"type": "number", "description": "Budgeted labor hours. Optional."},
                    "actual_rate": {"type": "number", "description": "Actual labor rate per hour. Optional."},
                    "budget_rate": {"type": "number", "description": "Budgeted labor rate per hour. Optional."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_industry_benchmarks",
            "description": (
                "Search the web for industry financial benchmarks for a given business type. "
                "Returns revenue range, gross margin, EBITDA margin, and cost structure benchmarks. "
                "ALWAYS call this FIRST when a user mentions a real business (coffee shop, restaurant, "
                "trading exchange, pharmacy, gym, manufacturing, etc.) before building any model."
            ),
            "parameters": {
                "type": "object",
                "required": ["business_type"],
                "properties": {
                    "business_type": {
                        "type": "string",
                        "description": "Business type in English or Persian (e.g. 'coffee roastery', 'online trading exchange', 'قهوه‌برشته‌کاری')",
                    },
                    "country": {
                        "type": "string",
                        "description": "Country for localized benchmarks. Default: 'Iran'",
                    },
                },
            },
        },
    },
]

TOOL_DISPATCH = {
    "compute_altman_z": compute_altman_z,
    "compute_beneish_score": compute_beneish_score,
    "compute_accrual_ratios": compute_accrual_ratios,
    "compute_variance_analysis": compute_variance_analysis,
    "lookup_industry_benchmarks": lookup_industry_benchmarks,
}
