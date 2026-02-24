"""Cost of capital tools: WACC, CAPM, beta."""
from __future__ import annotations

import json
from typing import Optional

from sqlalchemy.orm import Session

import logging
logger = logging.getLogger(__name__)


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


TOOL_DEFINITIONS = [
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
]

TOOL_DISPATCH = {
    "compute_wacc": compute_wacc,
    "compute_capm": compute_capm,
    "compute_beta": compute_beta,
}
