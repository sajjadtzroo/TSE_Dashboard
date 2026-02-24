"""Comparable multiples and scenario analysis tools."""
from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


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
    ebit: float = 0.0,
    peer_ev_ebit: float = 0.0,
    peer_ev_revenue: float = 0.0,
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

    if peer_ev_ebit > 0 and ebit > 0:
        implied_ev = ebit * peer_ev_ebit
        implied_equity = implied_ev - net_debt
        implied_price = implied_equity / shares_outstanding
        multiples["ev_ebit"] = {
            "multiple": peer_ev_ebit,
            "implied_ev": round(implied_ev, 2),
            "implied_equity": round(implied_equity, 2),
            "implied_price": round(implied_price, 2),
        }
        if implied_price > 0:
            prices.append(implied_price)

    if peer_ev_revenue > 0 and revenue > 0:
        implied_ev = revenue * peer_ev_revenue
        implied_equity = implied_ev - net_debt
        implied_price = implied_equity / shares_outstanding
        multiples["ev_revenue"] = {
            "multiple": peer_ev_revenue,
            "implied_ev": round(implied_ev, 2),
            "implied_equity": round(implied_equity, 2),
            "implied_price": round(implied_price, 2),
        }
        if implied_price > 0:
            prices.append(implied_price)

    sorted_prices = sorted(prices)
    if sorted_prices:
        n = len(sorted_prices)
        median = (sorted_prices[(n - 1) // 2] + sorted_prices[n // 2]) / 2
    else:
        median = None

    return json.dumps({
        "model_type": "multiples",
        "multiples": multiples,
        "implied_price_min": round(min(prices), 2) if prices else None,
        "implied_price_max": round(max(prices), 2) if prices else None,
        "implied_price_median": round(median, 2) if median is not None else None,
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


TOOL_DEFINITIONS = [
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
                    "ebit": {"type": "number", "description": "EBIT (same unit as ebitda). Required for EV/EBIT multiple."},
                    "peer_ev_ebit": {"type": "number", "description": "Peer median EV/EBIT multiple. Set 0 to skip."},
                    "peer_ev_revenue": {"type": "number", "description": "Peer median EV/Revenue multiple. Set 0 to skip."},
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
]

TOOL_DISPATCH = {
    "build_multiples_model": build_multiples_model,
    "build_scenario_model": build_scenario_model,
}
