"""Dividend Discount Model and Residual Income tools."""
from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


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
        if discount_rate <= short_term_growth:
            return json.dumps({"error": "discount_rate must be greater than short_term_growth (ke > gS)"})
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


TOOL_DEFINITIONS = [
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
]

TOOL_DISPATCH = {
    "build_ddm_model": build_ddm_model,
    "build_residual_income_model": build_residual_income_model,
}
