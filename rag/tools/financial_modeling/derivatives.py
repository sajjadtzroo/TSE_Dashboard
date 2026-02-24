"""Derivatives and options financial modeling tools."""
from __future__ import annotations

import json
import logging
import math

from sqlalchemy.orm import Session

from rag.tools.financial_modeling._fm_helpers import (
    _bsm_d1_d2,
    _bsm_price,
    _bsm_vega_raw,
    _norm_cdf,
    _norm_pdf,
)

logger = logging.getLogger(__name__)

# ── Tool Functions ───────────────────────────────────────────────────────────


def price_option_bsm(
    db: Session,
    spot: float,
    strike: float,
    time_to_expiry: float,
    risk_free_rate: float,
    volatility: float,
    option_type: str = "call",
    dividend_yield: float = 0.0,
) -> str:
    """Price a European option using Black-Scholes-Merton."""
    option_type = option_type.lower()
    if option_type not in ("call", "put"):
        return json.dumps({"error": "option_type must be 'call' or 'put'"})
    if volatility <= 0:
        return json.dumps({"error": "volatility must be positive"})
    if spot <= 0 or strike <= 0:
        return json.dumps({"error": "spot and strike must be positive"})

    S, K, T, r, sigma, q = spot, strike, time_to_expiry, risk_free_rate, volatility, dividend_yield

    # Handle expired option — return intrinsic value
    if T <= 0:
        if option_type == "call":
            intrinsic = max(S - K, 0.0)
        else:
            intrinsic = max(K - S, 0.0)
        return json.dumps({
            "model_type": "bsm",
            "price": round(intrinsic, 4),
            "d1": None,
            "d2": None,
            "intrinsic_value": round(intrinsic, 4),
            "time_value": 0.0,
            "inputs": {
                "spot": S, "strike": K, "time_to_expiry": T,
                "risk_free_rate": r, "volatility": sigma,
                "option_type": option_type, "dividend_yield": q,
            },
        })

    d1, d2 = _bsm_d1_d2(S, K, T, r, sigma, q)
    price = _bsm_price(S, K, T, r, sigma, option_type, q)

    if option_type == "call":
        intrinsic = max(S - K, 0.0)
    else:
        intrinsic = max(K - S, 0.0)
    time_val = price - intrinsic

    return json.dumps({
        "model_type": "bsm",
        "price": round(price, 4),
        "d1": round(d1, 4),
        "d2": round(d2, 4),
        "intrinsic_value": round(intrinsic, 4),
        "time_value": round(time_val, 4),
        "inputs": {
            "spot": S, "strike": K, "time_to_expiry": T,
            "risk_free_rate": r, "volatility": sigma,
            "option_type": option_type, "dividend_yield": q,
        },
    })


def price_option_binomial(
    db: Session,
    spot: float,
    strike: float,
    time_to_expiry: float,
    risk_free_rate: float,
    volatility: float,
    option_type: str = "call",
    dividend_yield: float = 0.0,
    steps: int = 100,
    exercise: str = "european",
) -> str:
    """Price an option using the Cox-Ross-Rubinstein binomial tree."""
    option_type = option_type.lower()
    exercise = exercise.lower()
    if option_type not in ("call", "put"):
        return json.dumps({"error": "option_type must be 'call' or 'put'"})
    if exercise not in ("european", "american"):
        return json.dumps({"error": "exercise must be 'european' or 'american'"})
    if volatility <= 0:
        return json.dumps({"error": "volatility must be positive"})
    if spot <= 0 or strike <= 0:
        return json.dumps({"error": "spot and strike must be positive"})
    if time_to_expiry <= 0:
        # Expired — intrinsic value
        if option_type == "call":
            intrinsic = max(spot - strike, 0.0)
        else:
            intrinsic = max(strike - spot, 0.0)
        return json.dumps({
            "model_type": "binomial_tree",
            "price": round(intrinsic, 4),
            "exercise": exercise,
            "steps": steps,
            "u": None, "d": None, "p": None,
        })
    steps = max(steps, 1)

    S, K, T, r, sigma, q = spot, strike, time_to_expiry, risk_free_rate, volatility, dividend_yield
    dt = T / steps
    u = math.exp(sigma * math.sqrt(dt))
    d_val = 1.0 / u
    disc = math.exp(-r * dt)
    p = (math.exp((r - q) * dt) - d_val) / (u - d_val)

    # Terminal payoffs
    prices = [S * (u ** (steps - i)) * (d_val ** i) for i in range(steps + 1)]
    if option_type == "call":
        values = [max(px - K, 0.0) for px in prices]
    else:
        values = [max(K - px, 0.0) for px in prices]

    # Backward induction
    for step in range(steps - 1, -1, -1):
        for i in range(step + 1):
            hold = disc * (p * values[i] + (1.0 - p) * values[i + 1])
            if exercise == "american":
                node_price = S * (u ** (step - i)) * (d_val ** i)
                if option_type == "call":
                    ex_val = max(node_price - K, 0.0)
                else:
                    ex_val = max(K - node_price, 0.0)
                values[i] = max(hold, ex_val)
            else:
                values[i] = hold

    return json.dumps({
        "model_type": "binomial_tree",
        "price": round(values[0], 4),
        "exercise": exercise,
        "steps": steps,
        "u": round(u, 4),
        "d": round(d_val, 4),
        "p": round(p, 4),
    })


def compute_greeks(
    db: Session,
    spot: float,
    strike: float,
    time_to_expiry: float,
    risk_free_rate: float,
    volatility: float,
    option_type: str = "call",
    dividend_yield: float = 0.0,
) -> str:
    """Compute option Greeks (delta, gamma, vega, theta, rho) using BSM."""
    option_type = option_type.lower()
    if option_type not in ("call", "put"):
        return json.dumps({"error": "option_type must be 'call' or 'put'"})
    if volatility <= 0:
        return json.dumps({"error": "volatility must be positive"})
    if time_to_expiry <= 0:
        return json.dumps({"error": "time_to_expiry must be positive for Greeks computation"})
    if spot <= 0 or strike <= 0:
        return json.dumps({"error": "spot and strike must be positive"})

    S, K, T, r, sigma, q = spot, strike, time_to_expiry, risk_free_rate, volatility, dividend_yield
    d1, d2 = _bsm_d1_d2(S, K, T, r, sigma, q)
    sqrt_t = math.sqrt(T)
    exp_qt = math.exp(-q * T)
    exp_rt = math.exp(-r * T)
    nd1 = _norm_pdf(d1)

    # Delta
    if option_type == "call":
        delta = exp_qt * _norm_cdf(d1)
    else:
        delta = exp_qt * (_norm_cdf(d1) - 1.0)

    # Gamma (same for call and put)
    gamma = exp_qt * nd1 / (S * sigma * sqrt_t)

    # Vega (per 1% vol change)
    vega = S * exp_qt * nd1 * sqrt_t / 100.0

    # Theta (per day)
    if option_type == "call":
        theta = (
            -(S * nd1 * sigma * exp_qt) / (2.0 * sqrt_t)
            - r * K * exp_rt * _norm_cdf(d2)
            + q * S * exp_qt * _norm_cdf(d1)
        ) / 365.0
    else:
        theta = (
            -(S * nd1 * sigma * exp_qt) / (2.0 * sqrt_t)
            + r * K * exp_rt * _norm_cdf(-d2)
            - q * S * exp_qt * _norm_cdf(-d1)
        ) / 365.0

    # Rho (per 1% rate change)
    if option_type == "call":
        rho = K * T * exp_rt * _norm_cdf(d2) / 100.0
    else:
        rho = -K * T * exp_rt * _norm_cdf(-d2) / 100.0

    return json.dumps({
        "model_type": "greeks",
        "delta": round(delta, 4),
        "gamma": round(gamma, 4),
        "vega": round(vega, 4),
        "theta": round(theta, 4),
        "rho": round(rho, 4),
        "d1": round(d1, 4),
        "d2": round(d2, 4),
    })


def compute_implied_volatility(
    db: Session,
    market_price: float,
    spot: float,
    strike: float,
    time_to_expiry: float,
    risk_free_rate: float,
    option_type: str = "call",
    dividend_yield: float = 0.0,
    max_iterations: int = 100,
    tolerance: float = 1e-6,
) -> str:
    """Compute implied volatility using Newton-Raphson with bisection fallback."""
    option_type = option_type.lower()
    if option_type not in ("call", "put"):
        return json.dumps({"error": "option_type must be 'call' or 'put'"})
    if market_price <= 0:
        return json.dumps({"error": "market_price must be positive"})
    if time_to_expiry <= 0:
        return json.dumps({"error": "time_to_expiry must be positive"})
    if spot <= 0 or strike <= 0:
        return json.dumps({"error": "spot and strike must be positive"})

    S, K, T, r, q = spot, strike, time_to_expiry, risk_free_rate, dividend_yield

    # Newton-Raphson
    sigma = 0.20
    converged = False
    iterations = 0

    for i in range(max_iterations):
        iterations = i + 1
        price = _bsm_price(S, K, T, r, sigma, option_type, q)
        vega_raw = _bsm_vega_raw(S, K, T, r, sigma, q)

        diff = price - market_price
        if abs(diff) < tolerance:
            converged = True
            break

        if abs(vega_raw) < 1e-12:
            break  # vega too small, switch to bisection

        sigma = sigma - diff / vega_raw
        sigma = max(0.001, min(sigma, 5.0))

    # If Newton didn't converge, try bisection
    if not converged:
        lo, hi = 0.001, 5.0
        for i in range(max_iterations):
            iterations += 1
            mid = (lo + hi) / 2.0
            price = _bsm_price(S, K, T, r, mid, option_type, q)
            diff = price - market_price
            if abs(diff) < tolerance:
                sigma = mid
                converged = True
                break
            if diff > 0:
                hi = mid
            else:
                lo = mid
        if not converged:
            sigma = (lo + hi) / 2.0

    return json.dumps({
        "model_type": "implied_volatility",
        "implied_volatility": round(sigma, 4),
        "iterations": iterations,
        "convergence": "converged" if converged else "not_converged",
    })


def check_put_call_parity(
    db: Session,
    call_price: float,
    put_price: float,
    spot: float,
    strike: float,
    time_to_expiry: float,
    risk_free_rate: float,
    dividend_yield: float = 0.0,
) -> str:
    """Check European put-call parity and detect arbitrage opportunities."""
    if time_to_expiry < 0:
        return json.dumps({"error": "time_to_expiry must be non-negative"})
    if spot <= 0 or strike <= 0:
        return json.dumps({"error": "spot and strike must be positive"})

    S, K, T, r, q = spot, strike, time_to_expiry, risk_free_rate, dividend_yield

    lhs = call_price - put_price  # C - P
    rhs = S * math.exp(-q * T) - K * math.exp(-r * T)  # S·e^(-qT) - K·e^(-rT)
    deviation = lhs - rhs

    threshold = 0.50
    arbitrage = abs(deviation) > threshold

    # Describe the arbitrage strategy
    if not arbitrage:
        strategy = "No significant arbitrage opportunity detected."
    elif deviation > 0:
        # C - P > S·e^(-qT) - K·e^(-rT): call overpriced relative to put
        strategy = (
            "Call overpriced relative to put. Strategy: sell call, buy put, "
            "buy underlying, borrow K·e^(-rT)."
        )
    else:
        # C - P < S·e^(-qT) - K·e^(-rT): put overpriced relative to call
        strategy = (
            "Put overpriced relative to call. Strategy: buy call, sell put, "
            "sell underlying, invest K·e^(-rT)."
        )

    return json.dumps({
        "model_type": "put_call_parity",
        "lhs_c_minus_p": round(lhs, 4),
        "rhs_s_minus_pvk": round(rhs, 4),
        "deviation": round(deviation, 4),
        "arbitrage_opportunity": arbitrage,
        "strategy": strategy,
    })


def build_option_strategy(
    db: Session,
    legs: list,
    underlying_price: float,
    spot_min: float = 0.0,
    spot_max: float = 0.0,
    spot_steps: int = 50,
) -> str:
    """Build and analyze a multi-leg option strategy (payoff diagram)."""
    if not legs:
        return json.dumps({"error": "At least one leg is required"})
    if underlying_price <= 0:
        return json.dumps({"error": "underlying_price must be positive"})

    # Default spot range
    if spot_max <= spot_min:
        spot_min = underlying_price * 0.7
        spot_max = underlying_price * 1.3

    spot_steps = max(spot_steps, 2)
    step_size = (spot_max - spot_min) / (spot_steps - 1)
    spot_prices = [spot_min + i * step_size for i in range(spot_steps)]

    payoff_table = []
    for sp in spot_prices:
        total_payoff = 0.0
        total_cost = 0.0
        for leg in legs:
            leg_type = leg.get("type", "call").lower()
            position = leg.get("position", "long").lower()
            strike_l = leg.get("strike", 0.0)
            premium = leg.get("premium", 0.0)
            sign = 1.0 if position == "long" else -1.0

            if leg_type == "call":
                payoff = max(sp - strike_l, 0.0)
            elif leg_type == "put":
                payoff = max(strike_l - sp, 0.0)
            else:  # stock
                payoff = sp - strike_l  # strike acts as purchase price

            total_payoff += sign * payoff
            total_cost += sign * premium

        profit = total_payoff - total_cost
        payoff_table.append({
            "spot": round(sp, 4),
            "payoff": round(total_payoff, 4),
            "profit": round(profit, 4),
        })

    # Find max profit, max loss
    profits = [row["profit"] for row in payoff_table]
    max_profit = max(profits)
    max_loss = min(profits)

    # Find breakevens by linear interpolation
    breakevens = []
    for i in range(len(payoff_table) - 1):
        p1 = payoff_table[i]["profit"]
        p2 = payoff_table[i + 1]["profit"]
        if p1 * p2 < 0:  # sign change
            s1 = payoff_table[i]["spot"]
            s2 = payoff_table[i + 1]["spot"]
            # Linear interpolation
            be = s1 + (s2 - s1) * abs(p1) / (abs(p1) + abs(p2))
            breakevens.append(round(be, 4))
        elif p1 == 0.0:
            breakevens.append(payoff_table[i]["spot"])

    return json.dumps({
        "model_type": "option_strategy",
        "legs": legs,
        "underlying_price": round(underlying_price, 4),
        "max_profit": round(max_profit, 4),
        "max_loss": round(max_loss, 4),
        "breakevens": breakevens,
        "payoff_table": payoff_table,
    })


# ── Tool Definitions & Dispatch ──────────────────────────────────────────────

TOOL_DEFINITIONS = [
    # ── Phase 8: Derivatives & Options ────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "price_option_bsm",
            "description": (
                "Price a European option using the Black-Scholes-Merton model. "
                "Returns theoretical price, d1/d2 values, intrinsic and time value. "
                "Supports dividend yield via continuous dividend adjustment."
            ),
            "parameters": {
                "type": "object",
                "required": ["spot", "strike", "time_to_expiry", "risk_free_rate", "volatility"],
                "properties": {
                    "spot": {"type": "number", "description": "Current price of the underlying asset"},
                    "strike": {"type": "number", "description": "Option strike price"},
                    "time_to_expiry": {"type": "number", "description": "Time to expiry in years"},
                    "risk_free_rate": {"type": "number", "description": "Annual risk-free rate (decimal)"},
                    "volatility": {"type": "number", "description": "Annual volatility (decimal)"},
                    "option_type": {"type": "string", "enum": ["call", "put"], "description": "Option type. Default: call."},
                    "dividend_yield": {"type": "number", "description": "Continuous dividend yield (decimal). Default 0.0."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "price_option_binomial",
            "description": (
                "Price an option using the Cox-Ross-Rubinstein binomial tree model. "
                "Supports both European and American exercise styles. "
                "American options allow early exercise at each node."
            ),
            "parameters": {
                "type": "object",
                "required": ["spot", "strike", "time_to_expiry", "risk_free_rate", "volatility"],
                "properties": {
                    "spot": {"type": "number", "description": "Current price of the underlying asset"},
                    "strike": {"type": "number", "description": "Option strike price"},
                    "time_to_expiry": {"type": "number", "description": "Time to expiry in years"},
                    "risk_free_rate": {"type": "number", "description": "Annual risk-free rate (decimal)"},
                    "volatility": {"type": "number", "description": "Annual volatility (decimal)"},
                    "option_type": {"type": "string", "enum": ["call", "put"], "description": "Option type. Default: call."},
                    "dividend_yield": {"type": "number", "description": "Continuous dividend yield (decimal). Default 0.0."},
                    "steps": {"type": "integer", "description": "Number of tree steps. Default 100."},
                    "exercise": {"type": "string", "enum": ["european", "american"], "description": "Exercise style. Default: european."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_greeks",
            "description": (
                "Compute option Greeks using the Black-Scholes-Merton model. "
                "Returns delta, gamma, vega (per 1% vol), theta (per day), rho (per 1% rate)."
            ),
            "parameters": {
                "type": "object",
                "required": ["spot", "strike", "time_to_expiry", "risk_free_rate", "volatility"],
                "properties": {
                    "spot": {"type": "number", "description": "Current price of the underlying asset"},
                    "strike": {"type": "number", "description": "Option strike price"},
                    "time_to_expiry": {"type": "number", "description": "Time to expiry in years"},
                    "risk_free_rate": {"type": "number", "description": "Annual risk-free rate (decimal)"},
                    "volatility": {"type": "number", "description": "Annual volatility (decimal)"},
                    "option_type": {"type": "string", "enum": ["call", "put"], "description": "Option type. Default: call."},
                    "dividend_yield": {"type": "number", "description": "Continuous dividend yield (decimal). Default 0.0."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_implied_volatility",
            "description": (
                "Compute implied volatility from a market option price using Newton-Raphson "
                "with bisection fallback. Returns the implied vol, iteration count, and "
                "convergence status."
            ),
            "parameters": {
                "type": "object",
                "required": ["market_price", "spot", "strike", "time_to_expiry", "risk_free_rate"],
                "properties": {
                    "market_price": {"type": "number", "description": "Observed market price of the option"},
                    "spot": {"type": "number", "description": "Current price of the underlying asset"},
                    "strike": {"type": "number", "description": "Option strike price"},
                    "time_to_expiry": {"type": "number", "description": "Time to expiry in years"},
                    "risk_free_rate": {"type": "number", "description": "Annual risk-free rate (decimal)"},
                    "option_type": {"type": "string", "enum": ["call", "put"], "description": "Option type. Default: call."},
                    "dividend_yield": {"type": "number", "description": "Continuous dividend yield (decimal). Default 0.0."},
                    "max_iterations": {"type": "integer", "description": "Maximum iterations. Default 100."},
                    "tolerance": {"type": "number", "description": "Convergence tolerance. Default 1e-6."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_put_call_parity",
            "description": (
                "Check European put-call parity: C - P = S·e^(-qT) - K·e^(-rT). "
                "Computes deviation and identifies arbitrage opportunities with strategy."
            ),
            "parameters": {
                "type": "object",
                "required": ["call_price", "put_price", "spot", "strike", "time_to_expiry", "risk_free_rate"],
                "properties": {
                    "call_price": {"type": "number", "description": "Market call price"},
                    "put_price": {"type": "number", "description": "Market put price"},
                    "spot": {"type": "number", "description": "Current price of the underlying asset"},
                    "strike": {"type": "number", "description": "Option strike price"},
                    "time_to_expiry": {"type": "number", "description": "Time to expiry in years"},
                    "risk_free_rate": {"type": "number", "description": "Annual risk-free rate (decimal)"},
                    "dividend_yield": {"type": "number", "description": "Continuous dividend yield (decimal). Default 0.0."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_option_strategy",
            "description": (
                "Build and analyze a multi-leg option strategy. "
                "Computes payoff/profit at each spot price in range, finds breakevens, "
                "max profit, and max loss. Supports calls, puts, and stock legs."
            ),
            "parameters": {
                "type": "object",
                "required": ["legs", "underlying_price"],
                "properties": {
                    "legs": {
                        "type": "array",
                        "description": "Strategy legs: [{type, position, strike, premium}]",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string", "enum": ["call", "put", "stock"], "description": "Leg type"},
                                "position": {"type": "string", "enum": ["long", "short"], "description": "Long or short"},
                                "strike": {"type": "number", "description": "Strike price (or purchase price for stock)"},
                                "premium": {"type": "number", "description": "Premium paid (positive) or received (positive, position determines sign)"},
                            },
                        },
                    },
                    "underlying_price": {"type": "number", "description": "Current underlying asset price"},
                    "spot_min": {"type": "number", "description": "Min spot price for payoff range. Default: underlying × 0.7."},
                    "spot_max": {"type": "number", "description": "Max spot price for payoff range. Default: underlying × 1.3."},
                    "spot_steps": {"type": "integer", "description": "Number of spot price points. Default 50."},
                },
            },
        },
    },
]

TOOL_DISPATCH = {
    "price_option_bsm": price_option_bsm,
    "price_option_binomial": price_option_binomial,
    "compute_greeks": compute_greeks,
    "compute_implied_volatility": compute_implied_volatility,
    "check_put_call_parity": check_put_call_parity,
    "build_option_strategy": build_option_strategy,
}
