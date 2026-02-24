"""Portfolio and risk analytics financial modeling tools."""
from __future__ import annotations

import json
import logging
import math
import random
import statistics
from typing import Optional

from sqlalchemy.orm import Session

from rag.tools.financial_modeling._fm_helpers import _portfolio_variance

logger = logging.getLogger(__name__)

# ── Tool Functions ───────────────────────────────────────────────────────────


def compute_portfolio_stats(
    db: Session,
    assets: list,
    correlation_matrix: list,
) -> str:
    """
    Compute portfolio return, volatility, and diversification ratio.

    E(Rp) = Σ wᵢ×E(Rᵢ)
    σp = √(w'Σw)
    Diversification ratio = (Σ wᵢσᵢ) / σp
    """
    n = len(assets)
    if n == 0:
        return json.dumps({"error": "assets list must not be empty"})
    if len(correlation_matrix) != n:
        return json.dumps({"error": f"correlation_matrix must be {n}x{n}, got {len(correlation_matrix)} rows"})
    for row in correlation_matrix:
        if len(row) != n:
            return json.dumps({"error": f"correlation_matrix must be {n}x{n}"})

    weights = [a["weight"] for a in assets]
    expected_returns = [a["expected_return"] for a in assets]
    volatilities = [a["volatility"] for a in assets]

    weight_sum = sum(weights)
    if abs(weight_sum - 1.0) > 0.01:
        return json.dumps({"error": f"weights must sum to ~1.0, got {round(weight_sum, 6)}"})

    # Portfolio return
    port_return = sum(w * r for w, r in zip(weights, expected_returns))

    # Covariance matrix from correlation and volatilities
    # Σ_ij = ρ_ij × σ_i × σ_j
    # Portfolio variance = w' Σ w
    port_variance = _portfolio_variance(weights, volatilities, correlation_matrix)
    port_volatility = math.sqrt(max(port_variance, 0.0))

    # Diversification ratio
    weighted_vol_sum = sum(w * s for w, s in zip(weights, volatilities))
    div_ratio = weighted_vol_sum / port_volatility if port_volatility > 0 else 1.0

    return json.dumps({
        "model_type": "portfolio_stats",
        "portfolio_return": round(port_return, 4),
        "portfolio_volatility": round(port_volatility, 4),
        "diversification_ratio": round(div_ratio, 4),
        "assets": [
            {
                "name": a["name"],
                "weight": round(a["weight"], 4),
                "expected_return": round(a["expected_return"], 4),
                "volatility": round(a["volatility"], 4),
            }
            for a in assets
        ],
    })


def compute_risk_metrics(
    db: Session,
    returns: list,
    risk_free_rate: float = 0.0,
    benchmark_returns: Optional[list] = None,
    periods_per_year: int = 12,
) -> str:
    """
    Compute risk-adjusted performance metrics from a return series.

    Metrics: annualized return, annualized volatility, Sharpe ratio,
    Sortino ratio, max drawdown, Calmar ratio.
    If benchmark provided: beta, Treynor ratio, information ratio, tracking error.
    """
    if len(returns) < 2:
        return json.dumps({"error": "need at least 2 return observations"})

    mean_r = statistics.mean(returns)
    std_r = statistics.pstdev(returns)  # population stdev for consistency

    ann_return = mean_r * periods_per_year
    ann_vol = std_r * math.sqrt(periods_per_year)

    # Sharpe
    sharpe = (ann_return - risk_free_rate) / ann_vol if ann_vol > 0 else 0.0

    # Sortino — downside deviation
    downside = [r for r in returns if r < 0]
    if len(downside) > 0:
        downside_var = sum(r ** 2 for r in downside) / len(returns)
        downside_std = math.sqrt(downside_var) * math.sqrt(periods_per_year)
    else:
        downside_std = 0.0
    sortino = (ann_return - risk_free_rate) / downside_std if downside_std > 0 else 0.0

    # Max drawdown
    cumulative = 1.0
    peak = 1.0
    max_dd = 0.0
    for r in returns:
        cumulative *= (1 + r)
        if cumulative > peak:
            peak = cumulative
        dd = (peak - cumulative) / peak
        if dd > max_dd:
            max_dd = dd

    # Calmar
    calmar = ann_return / max_dd if max_dd > 0 else 0.0

    result = {
        "model_type": "risk_metrics",
        "annualized_return": round(ann_return, 4),
        "annualized_volatility": round(ann_vol, 4),
        "sharpe_ratio": round(sharpe, 4),
        "sortino_ratio": round(sortino, 4),
        "max_drawdown": round(max_dd, 4),
        "calmar_ratio": round(calmar, 4),
    }

    # Benchmark-relative metrics
    if benchmark_returns is not None:
        if len(benchmark_returns) != len(returns):
            return json.dumps({"error": "benchmark_returns must have same length as returns"})
        excess = [r - b for r, b in zip(returns, benchmark_returns)]
        mean_excess = statistics.mean(excess)
        tracking_error = statistics.pstdev(excess) * math.sqrt(periods_per_year)
        info_ratio = (mean_excess * periods_per_year) / tracking_error if tracking_error > 0 else 0.0

        # Beta = Cov(Rp, Rb) / Var(Rb)
        mean_b = statistics.mean(benchmark_returns)
        cov_pb = sum((r - mean_r) * (b - mean_b) for r, b in zip(returns, benchmark_returns)) / len(returns)
        var_b = sum((b - mean_b) ** 2 for b in benchmark_returns) / len(benchmark_returns)
        beta = cov_pb / var_b if var_b > 0 else 0.0

        # Treynor
        treynor = (ann_return - risk_free_rate) / beta if beta != 0 else 0.0

        result["beta"] = round(beta, 4)
        result["treynor_ratio"] = round(treynor, 4)
        result["information_ratio"] = round(info_ratio, 4)
        result["tracking_error"] = round(tracking_error, 4)

    return json.dumps(result)


def compute_var(
    db: Session,
    portfolio_value: float,
    confidence_level: float = 0.95,
    method: str = "parametric",
    horizon_days: int = 1,
    expected_return: Optional[float] = None,
    volatility: Optional[float] = None,
    returns: Optional[list] = None,
    num_simulations: int = 10000,
    seed: Optional[int] = None,
) -> str:
    """
    Compute Value at Risk (VaR).

    Methods:
      - parametric: VaR = |−μ_daily×t + z_α × σ_daily × √t| × portfolio_value
      - historical: percentile of sorted returns
      - monte_carlo: simulate N paths, take percentile
    """
    z_scores = {0.90: 1.2816, 0.95: 1.6449, 0.99: 2.3263, 0.975: 1.9600}

    if method == "parametric":
        if expected_return is None or volatility is None:
            return json.dumps({"error": "parametric method requires expected_return and volatility"})
        z = z_scores.get(confidence_level)
        if z is None:
            return json.dumps({"error": f"unsupported confidence_level {confidence_level}, use one of {list(z_scores.keys())}"})
        mu_daily = expected_return / 252
        sigma_daily = volatility / math.sqrt(252)
        t = horizon_days
        var_pct = -mu_daily * t + z * sigma_daily * math.sqrt(t)
        var_pct = abs(var_pct)
        var_amount = var_pct * portfolio_value
        return json.dumps({
            "model_type": "var",
            "method": "parametric",
            "confidence_level": confidence_level,
            "horizon_days": horizon_days,
            "var_pct": round(var_pct, 4),
            "var_amount": round(var_amount, 4),
            "portfolio_value": round(portfolio_value, 4),
        })

    elif method == "historical":
        if returns is None or len(returns) < 2:
            return json.dumps({"error": "historical method requires returns list with at least 2 observations"})
        sorted_returns = sorted(returns)
        idx = int((1 - confidence_level) * len(sorted_returns))
        idx = max(0, min(idx, len(sorted_returns) - 1))
        var_return = sorted_returns[idx]
        if horizon_days > 1:
            var_return = var_return * math.sqrt(horizon_days)
        var_pct = abs(var_return)
        var_amount = var_pct * portfolio_value
        return json.dumps({
            "model_type": "var",
            "method": "historical",
            "confidence_level": confidence_level,
            "horizon_days": horizon_days,
            "var_pct": round(var_pct, 4),
            "var_amount": round(var_amount, 4),
            "portfolio_value": round(portfolio_value, 4),
            "num_observations": len(returns),
        })

    elif method == "monte_carlo":
        if expected_return is None or volatility is None:
            return json.dumps({"error": "monte_carlo method requires expected_return and volatility"})
        rng = random.Random(seed)
        mu_daily = expected_return / 252
        sigma_daily = volatility / math.sqrt(252)
        terminal_returns = []
        for _ in range(num_simulations):
            cum_value = 1.0
            for _d in range(horizon_days):
                cum_value *= math.exp(
                    (mu_daily - 0.5 * sigma_daily ** 2)
                    + sigma_daily * rng.gauss(0, 1)
                )
            terminal_returns.append(cum_value - 1.0)
        terminal_returns.sort()
        idx = int((1 - confidence_level) * num_simulations)
        idx = max(0, min(idx, num_simulations - 1))
        var_return = terminal_returns[idx]
        var_pct = abs(var_return)
        var_amount = var_pct * portfolio_value
        return json.dumps({
            "model_type": "var",
            "method": "monte_carlo",
            "confidence_level": confidence_level,
            "horizon_days": horizon_days,
            "var_pct": round(var_pct, 4),
            "var_amount": round(var_amount, 4),
            "portfolio_value": round(portfolio_value, 4),
            "num_simulations": num_simulations,
        })

    else:
        return json.dumps({"error": f"unknown method '{method}', use parametric, historical, or monte_carlo"})


def compute_cvar(
    db: Session,
    portfolio_value: float,
    confidence_level: float = 0.95,
    horizon_days: int = 1,
    expected_return: Optional[float] = None,
    volatility: Optional[float] = None,
    returns: Optional[list] = None,
) -> str:
    """
    Compute Conditional Value at Risk (CVaR / Expected Shortfall).

    Auto-selects method: historical if returns provided, else parametric.
    CVaR = E[Loss | Loss > VaR]
    """
    z_scores = {0.90: 1.2816, 0.95: 1.6449, 0.99: 2.3263, 0.975: 1.9600}

    if returns is not None and len(returns) >= 2:
        # Historical CVaR
        sorted_returns = sorted(returns)
        cutoff_idx = int((1 - confidence_level) * len(sorted_returns))
        cutoff_idx = max(1, cutoff_idx)  # at least 1 observation
        tail = sorted_returns[:cutoff_idx]
        var_return = sorted_returns[max(0, cutoff_idx - 1)]
        cvar_return = statistics.mean(tail) if tail else var_return
        if horizon_days > 1:
            var_return = var_return * math.sqrt(horizon_days)
            cvar_return = cvar_return * math.sqrt(horizon_days)
        var_pct = abs(var_return)
        cvar_pct = abs(cvar_return)
        var_amount = var_pct * portfolio_value
        cvar_amount = cvar_pct * portfolio_value
        return json.dumps({
            "model_type": "cvar",
            "method": "historical",
            "confidence_level": confidence_level,
            "horizon_days": horizon_days,
            "var_pct": round(var_pct, 4),
            "var_amount": round(var_amount, 4),
            "cvar_pct": round(cvar_pct, 4),
            "cvar_amount": round(cvar_amount, 4),
            "portfolio_value": round(portfolio_value, 4),
            "num_observations": len(returns),
        })
    elif expected_return is not None and volatility is not None:
        # Parametric CVaR (normal distribution)
        z = z_scores.get(confidence_level)
        if z is None:
            return json.dumps({"error": f"unsupported confidence_level {confidence_level}, use one of {list(z_scores.keys())}"})
        mu_daily = expected_return / 252
        sigma_daily = volatility / math.sqrt(252)
        t = horizon_days
        mu_t = mu_daily * t
        sigma_t = sigma_daily * math.sqrt(t)

        var_pct = abs(-mu_t + z * sigma_t)

        # CVaR for normal: σ × φ(z)/(1-α) - μ  (scaled to horizon)
        # φ(z) = pdf of standard normal at z
        phi_z = (1.0 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * z ** 2)
        alpha = 1 - confidence_level
        cvar_pct = abs(-mu_t + sigma_t * phi_z / alpha)

        var_amount = var_pct * portfolio_value
        cvar_amount = cvar_pct * portfolio_value
        return json.dumps({
            "model_type": "cvar",
            "method": "parametric",
            "confidence_level": confidence_level,
            "horizon_days": horizon_days,
            "var_pct": round(var_pct, 4),
            "var_amount": round(var_amount, 4),
            "cvar_pct": round(cvar_pct, 4),
            "cvar_amount": round(cvar_amount, 4),
            "portfolio_value": round(portfolio_value, 4),
        })
    else:
        return json.dumps({"error": "provide either returns (for historical) or expected_return + volatility (for parametric)"})


def run_monte_carlo(
    db: Session,
    initial_value: float,
    expected_return: float,
    volatility: float,
    horizon_years: float = 1.0,
    num_simulations: int = 10000,
    num_steps: int = 252,
    seed: Optional[int] = None,
) -> str:
    """
    Run Monte Carlo simulation using Geometric Brownian Motion (GBM).

    S(t+dt) = S(t) × exp((μ − σ²/2)dt + σ√dt × Z)
    """
    if initial_value <= 0:
        return json.dumps({"error": "initial_value must be positive"})
    if num_steps < 1:
        return json.dumps({"error": "num_steps must be >= 1"})

    rng = random.Random(seed)
    dt = horizon_years / num_steps
    drift = (expected_return - 0.5 * volatility ** 2) * dt
    diffusion = volatility * math.sqrt(dt)

    terminal_values = []
    for _ in range(num_simulations):
        s = initial_value
        for _step in range(num_steps):
            z = rng.gauss(0, 1)
            s *= math.exp(drift + diffusion * z)
        terminal_values.append(s)

    terminal_values.sort()
    n = len(terminal_values)
    prob_loss = sum(1 for v in terminal_values if v < initial_value) / n

    mean_val = statistics.mean(terminal_values)
    median_val = statistics.median(terminal_values)
    std_val = statistics.pstdev(terminal_values)

    def _percentile(data, pct):
        k = (len(data) - 1) * pct / 100.0
        f = int(k)
        c = f + 1
        if c >= len(data):
            return data[-1]
        return data[f] + (k - f) * (data[c] - data[f])

    return json.dumps({
        "model_type": "monte_carlo",
        "initial_value": round(initial_value, 4),
        "expected_return": round(expected_return, 4),
        "volatility": round(volatility, 4),
        "horizon_years": round(horizon_years, 4),
        "num_simulations": num_simulations,
        "num_steps": num_steps,
        "terminal_stats": {
            "mean": round(mean_val, 4),
            "median": round(median_val, 4),
            "std": round(std_val, 4),
            "min": round(terminal_values[0], 4),
            "max": round(terminal_values[-1], 4),
        },
        "percentile_paths": {
            "p5": round(_percentile(terminal_values, 5), 4),
            "p25": round(_percentile(terminal_values, 25), 4),
            "p50": round(_percentile(terminal_values, 50), 4),
            "p75": round(_percentile(terminal_values, 75), 4),
            "p95": round(_percentile(terminal_values, 95), 4),
        },
        "probability_of_loss": round(prob_loss, 4),
    })


def optimize_portfolio(
    db: Session,
    assets: list,
    correlation_matrix: list,
    risk_free_rate: float = 0.0,
    objective: str = "max_sharpe",
    target_return: Optional[float] = None,
    min_weight: float = 0.0,
    max_weight: float = 1.0,
    num_portfolios: int = 10000,
    seed: Optional[int] = None,
) -> str:
    """
    Portfolio optimization via Monte Carlo random weight generation.

    Objectives: min_variance, max_sharpe, target_return.
    """
    n = len(assets)
    if n == 0:
        return json.dumps({"error": "assets list must not be empty"})
    if len(correlation_matrix) != n:
        return json.dumps({"error": f"correlation_matrix must be {n}x{n}"})
    if objective not in ("min_variance", "max_sharpe", "target_return"):
        return json.dumps({"error": f"unknown objective '{objective}'"})
    if objective == "target_return" and target_return is None:
        return json.dumps({"error": "target_return required when objective is 'target_return'"})

    expected_returns = [a["expected_return"] for a in assets]
    volatilities = [a["volatility"] for a in assets]
    rng = random.Random(seed)

    def _port_metrics(w):
        ret = sum(wi * ri for wi, ri in zip(w, expected_returns))
        var = _portfolio_variance(w, volatilities, correlation_matrix)
        vol = math.sqrt(max(var, 0.0))
        sharpe = (ret - risk_free_rate) / vol if vol > 0 else 0.0
        return ret, vol, sharpe

    best_weights = None
    best_ret = 0.0
    best_vol = float("inf")
    best_sharpe = float("-inf")

    for _ in range(num_portfolios):
        # Generate random weights within bounds
        raw = [rng.uniform(min_weight, max_weight) for _ in range(n)]
        total = sum(raw)
        if total == 0:
            continue
        w = [x / total for x in raw]
        # Check bounds after normalization
        if any(wi < min_weight - 1e-9 or wi > max_weight + 1e-9 for wi in w):
            continue

        ret, vol, sharpe = _port_metrics(w)

        if objective == "min_variance":
            if vol < best_vol:
                best_weights, best_ret, best_vol, best_sharpe = w, ret, vol, sharpe
        elif objective == "max_sharpe":
            if sharpe > best_sharpe:
                best_weights, best_ret, best_vol, best_sharpe = w, ret, vol, sharpe
        elif objective == "target_return":
            # Find portfolio closest to target return with minimum variance
            if abs(ret - target_return) < 0.01:
                if vol < best_vol:
                    best_weights, best_ret, best_vol, best_sharpe = w, ret, vol, sharpe

    if best_weights is None:
        return json.dumps({"error": "could not find feasible portfolio"})

    return json.dumps({
        "model_type": "portfolio_optimization",
        "objective": objective,
        "optimal_weights": [
            {"name": assets[i]["name"], "weight": round(best_weights[i], 4)}
            for i in range(n)
        ],
        "portfolio_return": round(best_ret, 4),
        "portfolio_volatility": round(best_vol, 4),
        "sharpe_ratio": round(best_sharpe, 4),
    })


def compute_efficient_frontier(
    db: Session,
    assets: list,
    correlation_matrix: list,
    risk_free_rate: float = 0.0,
    num_points: int = 50,
) -> str:
    """
    Generate efficient frontier by finding minimum-variance portfolios
    at different target return levels.
    """
    n = len(assets)
    if n == 0:
        return json.dumps({"error": "assets list must not be empty"})
    if len(correlation_matrix) != n:
        return json.dumps({"error": f"correlation_matrix must be {n}x{n}"})

    expected_returns = [a["expected_return"] for a in assets]
    volatilities = [a["volatility"] for a in assets]

    min_ret = min(expected_returns)
    max_ret = max(expected_returns)

    def _port_metrics(w):
        ret = sum(wi * ri for wi, ri in zip(w, expected_returns))
        var = _portfolio_variance(w, volatilities, correlation_matrix)
        vol = math.sqrt(max(var, 0.0))
        sharpe = (ret - risk_free_rate) / vol if vol > 0 else 0.0
        return ret, vol, sharpe

    rng = random.Random(42)  # fixed seed for reproducibility
    num_mc = 5000  # Monte Carlo per target

    if max_ret - min_ret < 1e-8:
        return json.dumps({"error": "all assets have the same expected return; frontier is a single point"})

    frontier_points = []
    step = (max_ret - min_ret) / max(num_points - 1, 1)
    target_returns = [min_ret + i * step for i in range(num_points)]

    global_best_sharpe = float("-inf")
    tangent_portfolio = None
    min_var_vol = float("inf")
    min_var_portfolio = None

    for target in target_returns:
        best_vol = float("inf")
        best_weights = None
        for _ in range(num_mc):
            raw = [rng.random() for _ in range(n)]
            total = sum(raw)
            w = [x / total for x in raw]
            ret, vol, sharpe = _port_metrics(w)
            if abs(ret - target) < step * 0.5 and vol < best_vol:
                best_vol = vol
                best_weights = w

        if best_weights is not None:
            ret, vol, sharpe = _port_metrics(best_weights)
            frontier_points.append({
                "return": round(ret, 4),
                "volatility": round(vol, 4),
            })
            if vol < min_var_vol:
                min_var_vol = vol
                min_var_portfolio = {
                    "weights": [{"name": assets[i]["name"], "weight": round(best_weights[i], 4)} for i in range(n)],
                    "return": round(ret, 4),
                    "volatility": round(vol, 4),
                }
            if sharpe > global_best_sharpe:
                global_best_sharpe = sharpe
                tangent_portfolio = {
                    "weights": [{"name": assets[i]["name"], "weight": round(best_weights[i], 4)} for i in range(n)],
                    "return": round(ret, 4),
                    "volatility": round(vol, 4),
                    "sharpe_ratio": round(sharpe, 4),
                }

    return json.dumps({
        "model_type": "efficient_frontier",
        "num_points": len(frontier_points),
        "frontier_points": frontier_points,
        "min_variance_portfolio": min_var_portfolio,
        "tangent_portfolio": tangent_portfolio,
    })


def compute_risk_parity(
    db: Session,
    assets: list,
    correlation_matrix: list,
) -> str:
    """
    Compute risk parity portfolio weights.

    Method: iterative algorithm starting from inverse-volatility weights,
    adjusting to equalize risk contributions.
    Risk contribution_i = w_i × (Σw)_i / σp
    """
    n = len(assets)
    if n == 0:
        return json.dumps({"error": "assets list must not be empty"})
    if len(correlation_matrix) != n:
        return json.dumps({"error": f"correlation_matrix must be {n}x{n}"})

    volatilities = [a["volatility"] for a in assets]

    # Check for zero volatilities
    if any(v <= 0 for v in volatilities):
        return json.dumps({"error": "all asset volatilities must be positive"})

    # Start with inverse-volatility weights
    inv_vol = [1.0 / v for v in volatilities]
    total_inv = sum(inv_vol)
    weights = [iv / total_inv for iv in inv_vol]

    def _risk_contributions(w):
        """Compute marginal risk contributions."""
        # Portfolio variance components: (Σw)_i
        marginal = []
        for i in range(n):
            mc_i = 0.0
            for j in range(n):
                mc_i += w[j] * volatilities[i] * volatilities[j] * correlation_matrix[i][j]
            marginal.append(mc_i)
        port_var = sum(w[i] * marginal[i] for i in range(n))
        port_vol = math.sqrt(max(port_var, 0.0))
        if port_vol == 0:
            return [0.0] * n, 0.0
        rc = [w[i] * marginal[i] / port_vol for i in range(n)]
        return rc, port_vol

    # Iterative adjustment (simple gradient-like)
    for _iteration in range(200):
        rc, port_vol = _risk_contributions(weights)
        if port_vol == 0:
            break
        target_rc = port_vol / n  # equal risk per asset
        # Adjust weights proportionally to deviation from target
        new_weights = []
        for i in range(n):
            if rc[i] > 0:
                adj = weights[i] * (target_rc / rc[i]) ** 0.5
            else:
                adj = weights[i]
            new_weights.append(adj)
        total_w = sum(new_weights)
        weights = [w / total_w for w in new_weights]

    rc_final, port_vol_final = _risk_contributions(weights)

    return json.dumps({
        "model_type": "risk_parity",
        "weights": [
            {"name": assets[i]["name"], "weight": round(weights[i], 4)}
            for i in range(n)
        ],
        "risk_contributions": [
            {"name": assets[i]["name"], "risk_contribution": round(rc_final[i], 4)}
            for i in range(n)
        ],
        "total_volatility": round(port_vol_final, 4),
    })


def compute_factor_model(
    db: Session,
    asset_returns: list,
    market_returns: list,
    risk_free_rate: float = 0.0,
    smb_returns: Optional[list] = None,
    hml_returns: Optional[list] = None,
) -> str:
    """
    Compute single-factor (CAPM) or Fama-French three-factor regression.

    Single: Rᵢ−Rf = α + β(Rm−Rf) + ε
    Three: Rᵢ−Rf = α + β_m(Rm−Rf) + β_smb×SMB + β_hml×HML + ε
    Uses OLS via normal equations.
    """
    n = len(asset_returns)
    if n != len(market_returns):
        return json.dumps({"error": "asset_returns and market_returns must have same length"})
    if n < 3:
        return json.dumps({"error": "need at least 3 observations"})

    # Excess returns
    y = [asset_returns[i] - risk_free_rate for i in range(n)]
    x_market = [market_returns[i] - risk_free_rate for i in range(n)]

    three_factor = smb_returns is not None and hml_returns is not None
    if three_factor:
        if len(smb_returns) != n or len(hml_returns) != n:
            return json.dumps({"error": "smb_returns and hml_returns must have same length as asset_returns"})

    if not three_factor:
        # Single factor OLS: y = alpha + beta * x_market
        # Normal equations: [Σ1, Σx; Σx, Σx²] [α; β] = [Σy; Σxy]
        sum_x = sum(x_market)
        sum_y = sum(y)
        sum_xy = sum(xi * yi for xi, yi in zip(x_market, y))
        sum_xx = sum(xi * xi for xi in x_market)

        det = n * sum_xx - sum_x * sum_x
        if abs(det) < 1e-15:
            return json.dumps({"error": "singular matrix in regression"})

        alpha = (sum_y * sum_xx - sum_x * sum_xy) / det
        beta = (n * sum_xy - sum_x * sum_y) / det

        # R-squared
        y_pred = [alpha + beta * x_market[i] for i in range(n)]
        ss_res = sum((y[i] - y_pred[i]) ** 2 for i in range(n))
        mean_y = sum(y) / n
        ss_tot = sum((y[i] - mean_y) ** 2 for i in range(n))
        r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
        residual_std = math.sqrt(ss_res / max(n - 2, 1))

        return json.dumps({
            "model_type": "factor_model",
            "factors": "single",
            "alpha": round(alpha, 4),
            "beta_market": round(beta, 4),
            "r_squared": round(r_squared, 4),
            "residual_std": round(residual_std, 4),
            "num_observations": n,
        })
    else:
        # Three-factor OLS via normal equations (4x4 system)
        # y = b0 + b1*x1 + b2*x2 + b3*x3
        # where x1=market, x2=smb, x3=hml
        X = []
        for i in range(n):
            X.append([1.0, x_market[i], smb_returns[i], hml_returns[i]])

        # X'X matrix (4x4) and X'y vector (4x1)
        k = 4
        xtx = [[0.0] * k for _ in range(k)]
        xty = [0.0] * k
        for i in range(n):
            for r in range(k):
                xty[r] += X[i][r] * y[i]
                for c in range(k):
                    xtx[r][c] += X[i][r] * X[i][c]

        # Gaussian elimination with partial pivoting
        aug = [xtx[r][:] + [xty[r]] for r in range(k)]
        for col in range(k):
            # Pivot
            max_row = col
            for row in range(col + 1, k):
                if abs(aug[row][col]) > abs(aug[max_row][col]):
                    max_row = row
            aug[col], aug[max_row] = aug[max_row], aug[col]

            if abs(aug[col][col]) < 1e-15:
                return json.dumps({"error": "singular matrix in 3-factor regression"})

            for row in range(col + 1, k):
                factor = aug[row][col] / aug[col][col]
                for j in range(col, k + 1):
                    aug[row][j] -= factor * aug[col][j]

        # Back substitution
        coeffs = [0.0] * k
        for row in range(k - 1, -1, -1):
            coeffs[row] = aug[row][k]
            for col in range(row + 1, k):
                coeffs[row] -= aug[row][col] * coeffs[col]
            coeffs[row] /= aug[row][row]

        alpha, beta_m, beta_smb, beta_hml = coeffs

        # R-squared
        y_pred = [alpha + beta_m * x_market[i] + beta_smb * smb_returns[i] + beta_hml * hml_returns[i] for i in range(n)]
        ss_res = sum((y[i] - y_pred[i]) ** 2 for i in range(n))
        mean_y = sum(y) / n
        ss_tot = sum((y[i] - mean_y) ** 2 for i in range(n))
        r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
        residual_std = math.sqrt(ss_res / max(n - k, 1))

        return json.dumps({
            "model_type": "factor_model",
            "factors": "three_factor",
            "alpha": round(alpha, 4),
            "beta_market": round(beta_m, 4),
            "beta_smb": round(beta_smb, 4),
            "beta_hml": round(beta_hml, 4),
            "r_squared": round(r_squared, 4),
            "residual_std": round(residual_std, 4),
            "num_observations": n,
        })


def run_stress_test(
    db: Session,
    portfolio: list,
    scenarios: list,
) -> str:
    """
    Run stress test scenarios on a portfolio.

    Each scenario defines shocks (pct changes) per asset.
    Assets not in shocks default to 0% change.
    """
    if not portfolio:
        return json.dumps({"error": "portfolio must not be empty"})
    if not scenarios:
        return json.dumps({"error": "scenarios must not be empty"})

    total_value = sum(p["current_value"] * p["weight"] for p in portfolio)
    if total_value <= 0:
        return json.dumps({"error": "total portfolio value must be positive"})

    scenario_results = []
    for scenario in scenarios:
        name = scenario["name"]
        shocks = scenario.get("shocks", {})
        details = []
        total_pnl = 0.0
        worst_pnl = float("inf")
        best_pnl = float("-inf")
        worst_asset = None
        best_asset = None

        for p in portfolio:
            asset_name = p["asset"]
            asset_value = p["current_value"] * p["weight"]
            shock_pct = shocks.get(asset_name, 0.0)
            pnl = asset_value * shock_pct
            total_pnl += pnl
            details.append({
                "asset": asset_name,
                "weight": round(p["weight"], 4),
                "shock_pct": round(shock_pct, 4),
                "pnl": round(pnl, 4),
            })
            if pnl < worst_pnl:
                worst_pnl = pnl
                worst_asset = asset_name
            if pnl > best_pnl:
                best_pnl = pnl
                best_asset = asset_name

        portfolio_pct_change = total_pnl / total_value if total_value > 0 else 0.0
        scenario_results.append({
            "name": name,
            "portfolio_pnl": round(total_pnl, 4),
            "portfolio_pct_change": round(portfolio_pct_change, 4),
            "worst_asset": worst_asset,
            "best_asset": best_asset,
            "details": details,
        })

    return json.dumps({
        "model_type": "stress_test",
        "portfolio_value": round(total_value, 4),
        "scenario_results": scenario_results,
    })


# ── Tool Definitions & Dispatch ──────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "compute_portfolio_stats",
            "description": (
                "Compute portfolio return, volatility, and diversification ratio. "
                "E(Rp) = Σ wᵢ×E(Rᵢ), σp = √(w'Σw), diversification ratio = (Σwᵢσᵢ)/σp. "
                "Validates weights sum to ~1.0."
            ),
            "parameters": {
                "type": "object",
                "required": ["assets", "correlation_matrix"],
                "properties": {
                    "assets": {
                        "type": "array",
                        "description": "Asset list: [{name, weight, expected_return, volatility}]",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "weight": {"type": "number", "description": "Portfolio weight (0–1)"},
                                "expected_return": {"type": "number", "description": "Expected annual return (decimal)"},
                                "volatility": {"type": "number", "description": "Annual volatility (decimal)"},
                            },
                        },
                    },
                    "correlation_matrix": {
                        "type": "array",
                        "description": "NxN correlation matrix as list of lists",
                        "items": {"type": "array", "items": {"type": "number"}},
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_risk_metrics",
            "description": (
                "Compute risk-adjusted performance metrics: annualized return, volatility, "
                "Sharpe ratio, Sortino ratio, max drawdown, Calmar ratio. "
                "If benchmark provided: beta, Treynor, information ratio, tracking error."
            ),
            "parameters": {
                "type": "object",
                "required": ["returns"],
                "properties": {
                    "returns": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Periodic returns (e.g. monthly)",
                    },
                    "risk_free_rate": {"type": "number", "description": "Annual risk-free rate (decimal). Default 0.0."},
                    "benchmark_returns": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Benchmark periodic returns. Optional.",
                    },
                    "periods_per_year": {"type": "integer", "description": "Periods per year (12=monthly, 252=daily). Default 12."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_var",
            "description": (
                "Compute Value at Risk (VaR) using parametric, historical, or Monte Carlo method. "
                "Parametric: z-score approach with normal distribution. "
                "Historical: percentile of actual returns. "
                "Monte Carlo: simulate random paths and take percentile."
            ),
            "parameters": {
                "type": "object",
                "required": ["portfolio_value"],
                "properties": {
                    "portfolio_value": {"type": "number", "description": "Total portfolio value"},
                    "confidence_level": {"type": "number", "description": "Confidence level (0.90, 0.95, 0.975, 0.99). Default 0.95."},
                    "method": {"type": "string", "enum": ["parametric", "historical", "monte_carlo"], "description": "VaR method. Default: parametric."},
                    "horizon_days": {"type": "integer", "description": "Time horizon in days. Default 1."},
                    "expected_return": {"type": "number", "description": "Annual expected return (for parametric/MC)."},
                    "volatility": {"type": "number", "description": "Annual volatility (for parametric/MC)."},
                    "returns": {"type": "array", "items": {"type": "number"}, "description": "Historical returns (for historical method)."},
                    "num_simulations": {"type": "integer", "description": "Number of MC simulations. Default 10000."},
                    "seed": {"type": "integer", "description": "Random seed for reproducibility."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_cvar",
            "description": (
                "Compute Conditional VaR (CVaR / Expected Shortfall). "
                "CVaR = E[Loss | Loss > VaR]. "
                "Auto-selects: historical if returns provided, else parametric."
            ),
            "parameters": {
                "type": "object",
                "required": ["portfolio_value"],
                "properties": {
                    "portfolio_value": {"type": "number", "description": "Total portfolio value"},
                    "confidence_level": {"type": "number", "description": "Confidence level. Default 0.95."},
                    "horizon_days": {"type": "integer", "description": "Time horizon in days. Default 1."},
                    "expected_return": {"type": "number", "description": "Annual expected return (for parametric)."},
                    "volatility": {"type": "number", "description": "Annual volatility (for parametric)."},
                    "returns": {"type": "array", "items": {"type": "number"}, "description": "Historical returns (for historical method)."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_monte_carlo",
            "description": (
                "Run Monte Carlo simulation using Geometric Brownian Motion (GBM). "
                "S(t+dt) = S(t) × exp((μ − σ²/2)dt + σ√dt × Z). "
                "Returns terminal value statistics, percentile paths, and probability of loss."
            ),
            "parameters": {
                "type": "object",
                "required": ["initial_value", "expected_return", "volatility"],
                "properties": {
                    "initial_value": {"type": "number", "description": "Initial portfolio/asset value"},
                    "expected_return": {"type": "number", "description": "Annual expected return (decimal)"},
                    "volatility": {"type": "number", "description": "Annual volatility (decimal)"},
                    "horizon_years": {"type": "number", "description": "Simulation horizon in years. Default 1.0."},
                    "num_simulations": {"type": "integer", "description": "Number of simulation paths. Default 10000."},
                    "num_steps": {"type": "integer", "description": "Steps per path (e.g. 252 trading days). Default 252."},
                    "seed": {"type": "integer", "description": "Random seed for reproducibility."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "optimize_portfolio",
            "description": (
                "Optimize portfolio weights via Monte Carlo random search. "
                "Objectives: min_variance, max_sharpe, or target_return. "
                "Supports weight constraints (min/max per asset)."
            ),
            "parameters": {
                "type": "object",
                "required": ["assets", "correlation_matrix"],
                "properties": {
                    "assets": {
                        "type": "array",
                        "description": "Asset list: [{name, expected_return, volatility}]",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "expected_return": {"type": "number"},
                                "volatility": {"type": "number"},
                            },
                        },
                    },
                    "correlation_matrix": {
                        "type": "array",
                        "description": "NxN correlation matrix",
                        "items": {"type": "array", "items": {"type": "number"}},
                    },
                    "risk_free_rate": {"type": "number", "description": "Risk-free rate (decimal). Default 0.0."},
                    "objective": {"type": "string", "enum": ["min_variance", "max_sharpe", "target_return"], "description": "Optimization objective. Default: max_sharpe."},
                    "target_return": {"type": "number", "description": "Required when objective=target_return."},
                    "min_weight": {"type": "number", "description": "Minimum weight per asset. Default 0.0."},
                    "max_weight": {"type": "number", "description": "Maximum weight per asset. Default 1.0."},
                    "num_portfolios": {"type": "integer", "description": "Number of random portfolios. Default 10000."},
                    "seed": {"type": "integer", "description": "Random seed."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_efficient_frontier",
            "description": (
                "Generate efficient frontier points by finding minimum-variance portfolios "
                "at different target return levels. Also identifies the tangent (max Sharpe) "
                "and minimum variance portfolios."
            ),
            "parameters": {
                "type": "object",
                "required": ["assets", "correlation_matrix"],
                "properties": {
                    "assets": {
                        "type": "array",
                        "description": "Asset list: [{name, expected_return, volatility}]",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "expected_return": {"type": "number"},
                                "volatility": {"type": "number"},
                            },
                        },
                    },
                    "correlation_matrix": {
                        "type": "array",
                        "description": "NxN correlation matrix",
                        "items": {"type": "array", "items": {"type": "number"}},
                    },
                    "risk_free_rate": {"type": "number", "description": "Risk-free rate. Default 0.0."},
                    "num_points": {"type": "integer", "description": "Number of frontier points. Default 50."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_risk_parity",
            "description": (
                "Compute risk parity portfolio weights where each asset contributes "
                "equally to total portfolio risk. Uses iterative inverse-volatility "
                "weighting to equalize risk contributions."
            ),
            "parameters": {
                "type": "object",
                "required": ["assets", "correlation_matrix"],
                "properties": {
                    "assets": {
                        "type": "array",
                        "description": "Asset list: [{name, volatility}]",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "volatility": {"type": "number", "description": "Annual volatility (decimal)"},
                            },
                        },
                    },
                    "correlation_matrix": {
                        "type": "array",
                        "description": "NxN correlation matrix",
                        "items": {"type": "array", "items": {"type": "number"}},
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_factor_model",
            "description": (
                "Compute single-factor (CAPM) or Fama-French three-factor regression. "
                "Single: Rᵢ−Rf = α + β(Rm−Rf). "
                "Three-factor: add SMB and HML. Solved via OLS normal equations."
            ),
            "parameters": {
                "type": "object",
                "required": ["asset_returns", "market_returns"],
                "properties": {
                    "asset_returns": {"type": "array", "items": {"type": "number"}, "description": "Asset periodic returns"},
                    "market_returns": {"type": "array", "items": {"type": "number"}, "description": "Market periodic returns"},
                    "risk_free_rate": {"type": "number", "description": "Periodic risk-free rate. Default 0.0."},
                    "smb_returns": {"type": "array", "items": {"type": "number"}, "description": "SMB factor returns (for 3-factor)."},
                    "hml_returns": {"type": "array", "items": {"type": "number"}, "description": "HML factor returns (for 3-factor)."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_stress_test",
            "description": (
                "Run stress test scenarios on a portfolio. "
                "Each scenario defines percentage shocks per asset. "
                "Assets not mentioned in a scenario default to 0% shock."
            ),
            "parameters": {
                "type": "object",
                "required": ["portfolio", "scenarios"],
                "properties": {
                    "portfolio": {
                        "type": "array",
                        "description": "Portfolio holdings: [{asset, weight, current_value}]",
                        "items": {
                            "type": "object",
                            "properties": {
                                "asset": {"type": "string"},
                                "weight": {"type": "number"},
                                "current_value": {"type": "number"},
                            },
                        },
                    },
                    "scenarios": {
                        "type": "array",
                        "description": "Stress scenarios: [{name, shocks: {asset: pct_change}}]",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "shocks": {
                                    "type": "object",
                                    "description": "Map of asset name → percentage change (decimal, e.g. -0.20 for -20%)",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
]

TOOL_DISPATCH = {
    "compute_portfolio_stats": compute_portfolio_stats,
    "compute_risk_metrics": compute_risk_metrics,
    "compute_var": compute_var,
    "compute_cvar": compute_cvar,
    "run_monte_carlo": run_monte_carlo,
    "optimize_portfolio": optimize_portfolio,
    "compute_efficient_frontier": compute_efficient_frontier,
    "compute_risk_parity": compute_risk_parity,
    "compute_factor_model": compute_factor_model,
    "run_stress_test": run_stress_test,
}
