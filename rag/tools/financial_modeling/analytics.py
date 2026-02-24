"""Analytics financial modeling tools."""
from __future__ import annotations

import json
import logging
import math
import statistics
from typing import Optional

from sqlalchemy.orm import Session

from rag.tools.financial_modeling._fm_helpers import _irr, _norm_cdf, _norm_pdf

logger = logging.getLogger(__name__)

# ── Tool Functions ───────────────────────────────────────────────────────────


def compute_dupont(
    db: Session,
    net_income: float,
    sales: float,
    total_assets: float,
    total_equity: float,
    ebit: Optional[float] = None,
    ebt: Optional[float] = None,
    tax: Optional[float] = None,
) -> str:
    """DuPont analysis: 3-factor (basic) or 5-factor (with EBIT/EBT breakdown)."""
    if sales <= 0:
        return json.dumps({"error": "sales must be > 0"})
    if total_assets <= 0:
        return json.dumps({"error": "total_assets must be > 0"})
    if total_equity <= 0:
        return json.dumps({"error": "total_equity must be > 0"})

    asset_turnover = sales / total_assets
    equity_multiplier = total_assets / total_equity

    if (ebit is None) != (ebt is None):
        return json.dumps({"error": "For 5-factor DuPont, both ebit and ebt must be provided"})

    if ebit is not None and ebt is not None:
        # 5-factor DuPont
        if ebit == 0:
            return json.dumps({"error": "ebit must not be zero for 5-factor DuPont"})
        if ebt == 0:
            return json.dumps({"error": "ebt must not be zero for 5-factor DuPont"})

        tax_burden = net_income / ebt
        interest_burden = ebt / ebit
        ebit_margin = ebit / sales

        roe = tax_burden * interest_burden * ebit_margin * asset_turnover * equity_multiplier

        return json.dumps({
            "model_type": "dupont",
            "mode": "5_factor",
            "roe": round(roe, 4),
            "roe_pct": round(roe * 100, 4),
            "components": {
                "tax_burden": round(tax_burden, 4),
                "interest_burden": round(interest_burden, 4),
                "ebit_margin": round(ebit_margin, 4),
                "asset_turnover": round(asset_turnover, 4),
                "equity_multiplier": round(equity_multiplier, 4),
            },
        })
    else:
        # 3-factor DuPont
        profit_margin = net_income / sales
        roe = profit_margin * asset_turnover * equity_multiplier

        return json.dumps({
            "model_type": "dupont",
            "mode": "3_factor",
            "roe": round(roe, 4),
            "roe_pct": round(roe * 100, 4),
            "components": {
                "profit_margin": round(profit_margin, 4),
                "asset_turnover": round(asset_turnover, 4),
                "equity_multiplier": round(equity_multiplier, 4),
            },
        })


def compute_brinson_attribution(
    db: Session,
    sectors: list,
) -> str:
    """Brinson-Fachler performance attribution by sector."""
    if not sectors or len(sectors) == 0:
        return json.dumps({"error": "sectors list must be non-empty"})

    total_benchmark_return = sum(
        s["benchmark_weight"] * s["benchmark_return"] for s in sectors
    )

    wp_sum = sum(s["portfolio_weight"] for s in sectors)
    wb_sum = sum(s["benchmark_weight"] for s in sectors)

    weight_warning = None
    if abs(wp_sum - 1.0) > 0.02 or abs(wb_sum - 1.0) > 0.02:
        weight_warning = (
            f"Weights do not sum to 1: portfolio={round(wp_sum, 4)}, "
            f"benchmark={round(wb_sum, 4)}"
        )

    sector_results = []
    allocation_total = 0.0
    selection_total = 0.0
    interaction_total = 0.0

    for s in sectors:
        wp = s["portfolio_weight"]
        wb = s["benchmark_weight"]
        rp = s["portfolio_return"]
        rb = s["benchmark_return"]

        allocation = (wp - wb) * (rb - total_benchmark_return)
        selection = wb * (rp - rb)
        interaction = (wp - wb) * (rp - rb)

        allocation_total += allocation
        selection_total += selection
        interaction_total += interaction

        sector_results.append({
            "name": s["name"],
            "wp": round(wp, 4),
            "wb": round(wb, 4),
            "rp": round(rp, 4),
            "rb": round(rb, 4),
            "allocation": round(allocation, 4),
            "selection": round(selection, 4),
            "interaction": round(interaction, 4),
        })

    active_return = allocation_total + selection_total + interaction_total

    return json.dumps({
        "model_type": "brinson_attribution",
        "sectors": sector_results,
        "totals": {
            "allocation": round(allocation_total, 4),
            "selection": round(selection_total, 4),
            "interaction": round(interaction_total, 4),
            "active_return": round(active_return, 4),
        },
        "weight_warning": weight_warning,
    })


def compute_black_litterman(
    db: Session,
    market_caps: list,
    covariance_matrix: list,
    risk_aversion: float,
    tau: float,
    views: list,
    view_confidences: list,
    risk_free_rate: float = 0.0,
) -> str:
    """Black-Litterman asset allocation model."""
    n = len(market_caps)

    if n != len(covariance_matrix):
        return json.dumps({"error": "market_caps length must match covariance_matrix dimension"})
    if n > 10:
        return json.dumps({"error": "Maximum 10 assets supported (matrix inversion limit)"})
    for row in covariance_matrix:
        if len(row) != n:
            return json.dumps({"error": "covariance_matrix must be NxN"})
    if len(views) != len(view_confidences):
        return json.dumps({"error": "views and view_confidences must have same length"})
    if len(views) == 0:
        return json.dumps({"error": "At least one view is required"})

    # ── Matrix helpers ──
    def mat_mult(a, b):
        """Multiply two 2D lists."""
        rows_a, cols_a = len(a), len(a[0])
        cols_b = len(b[0])
        result = [[0.0] * cols_b for _ in range(rows_a)]
        for i in range(rows_a):
            for j in range(cols_b):
                for k in range(cols_a):
                    result[i][j] += a[i][k] * b[k][j]
        return result

    def mat_transpose(a):
        """Transpose a 2D list."""
        rows, cols = len(a), len(a[0])
        return [[a[i][j] for i in range(rows)] for j in range(cols)]

    def mat_scale(a, s):
        """Scale a matrix by a scalar."""
        return [[a[i][j] * s for j in range(len(a[0]))] for i in range(len(a))]

    def mat_add(a, b):
        """Add two matrices."""
        return [[a[i][j] + b[i][j] for j in range(len(a[0]))] for i in range(len(a))]

    def mat_identity(size):
        """Create identity matrix."""
        return [[1.0 if i == j else 0.0 for j in range(size)] for i in range(size)]

    def mat_minor(a, i, j):
        """Get minor matrix by removing row i and column j."""
        return [
            [a[r][c] for c in range(len(a[0])) if c != j]
            for r in range(len(a)) if r != i
        ]

    def mat_det(a):
        """Determinant via cofactor expansion."""
        size = len(a)
        if size == 1:
            return a[0][0]
        if size == 2:
            return a[0][0] * a[1][1] - a[0][1] * a[1][0]
        det = 0.0
        for j in range(size):
            det += ((-1) ** j) * a[0][j] * mat_det(mat_minor(a, 0, j))
        return det

    def mat_inverse(a):
        """Inverse via cofactor method. Returns None if singular."""
        size = len(a)
        det = mat_det(a)
        if abs(det) < 1e-14:
            return None
        if size == 1:
            return [[1.0 / det]]
        # Cofactor matrix
        cofactors = [[0.0] * size for _ in range(size)]
        for i in range(size):
            for j in range(size):
                cofactors[i][j] = ((-1) ** (i + j)) * mat_det(mat_minor(a, i, j))
        # Adjugate = transpose of cofactor
        adjugate = mat_transpose(cofactors)
        return mat_scale(adjugate, 1.0 / det)

    def vec_to_col(v):
        """List to column vector [[v0],[v1],...]."""
        return [[x] for x in v]

    def col_to_vec(m):
        """Column vector [[v0],[v1],...] to list."""
        return [m[i][0] for i in range(len(m))]

    def mat_diag(vals):
        """Create diagonal matrix from list of values."""
        size = len(vals)
        return [[vals[i] if i == j else 0.0 for j in range(size)] for i in range(size)]

    # ── Market weights ──
    total_mc = sum(market_caps)
    if total_mc <= 0:
        return json.dumps({"error": "Total market cap must be > 0"})
    w = [mc / total_mc for mc in market_caps]

    sigma = covariance_matrix
    delta = risk_aversion

    # ── Implied equilibrium returns: pi = delta * Sigma * w ──
    w_col = vec_to_col(w)
    pi_col = mat_mult(mat_scale(sigma, delta), w_col)
    pi = col_to_vec(pi_col)

    # ── Build P matrix (K x N) and Q vector (K x 1) ──
    k = len(views)
    p_matrix = [[0.0] * n for _ in range(k)]
    q_vector = []

    for vi, view in enumerate(views):
        for ai, asset_idx in enumerate(view["assets"]):
            if 0 <= asset_idx < n:
                p_matrix[vi][asset_idx] = view["weights"][ai]
        q_vector.append(view["expected_return"])

    # ── Omega = diag(p_i' * (tau*Sigma) * p_i / confidence_i) ──
    tau_sigma = mat_scale(sigma, tau)
    omega_diag = []
    for vi in range(k):
        p_row = [p_matrix[vi]]  # 1 x N
        p_row_t = vec_to_col(p_matrix[vi])  # N x 1
        var_view = mat_mult(mat_mult(p_row, tau_sigma), p_row_t)  # 1x1
        conf = view_confidences[vi] if view_confidences[vi] > 1e-10 else 1e-10
        omega_diag.append(var_view[0][0] / conf)

    omega = mat_diag(omega_diag)

    # ── BL returns: E[R] = inv(inv(tau*Sigma) + P'.inv(Omega).P) * (inv(tau*Sigma)*pi + P'.inv(Omega)*Q) ──
    tau_sigma_inv = mat_inverse(tau_sigma)
    if tau_sigma_inv is None:
        return json.dumps({"error": "tau*Sigma matrix is singular"})

    omega_inv = mat_inverse(omega)
    if omega_inv is None:
        return json.dumps({"error": "Omega matrix is singular"})

    p_t = mat_transpose(p_matrix)  # N x K

    # inv(tau*Sigma) + P' * inv(Omega) * P
    pt_omega_inv_p = mat_mult(mat_mult(p_t, omega_inv), p_matrix)  # N x N
    lhs_matrix = mat_add(tau_sigma_inv, pt_omega_inv_p)
    lhs_inv = mat_inverse(lhs_matrix)
    if lhs_inv is None:
        return json.dumps({"error": "BL posterior precision matrix is singular"})

    # inv(tau*Sigma) * pi + P' * inv(Omega) * Q
    term1 = mat_mult(tau_sigma_inv, vec_to_col(pi))  # N x 1
    q_col = vec_to_col(q_vector)  # K x 1
    term2 = mat_mult(mat_mult(p_t, omega_inv), q_col)  # N x 1
    rhs = [[term1[i][0] + term2[i][0]] for i in range(n)]

    bl_returns_col = mat_mult(lhs_inv, rhs)
    bl_returns = col_to_vec(bl_returns_col)

    # ── BL weights: w_bl = inv(delta * Sigma) * E[R], normalized ──
    delta_sigma = mat_scale(sigma, delta)
    delta_sigma_inv = mat_inverse(delta_sigma)
    if delta_sigma_inv is None:
        return json.dumps({"error": "delta*Sigma matrix is singular"})

    bl_weights_col = mat_mult(delta_sigma_inv, bl_returns_col)
    bl_weights_raw = col_to_vec(bl_weights_col)
    w_sum = sum(bl_weights_raw)
    if abs(w_sum) < 1e-14:
        bl_weights = bl_weights_raw
    else:
        bl_weights = [x / w_sum for x in bl_weights_raw]

    return json.dumps({
        "model_type": "black_litterman",
        "n_assets": n,
        "n_views": k,
        "market_weights": [round(x, 6) for x in w],
        "implied_returns": [round(x, 6) for x in pi],
        "bl_returns": [round(x, 6) for x in bl_returns],
        "bl_weights": [round(x, 6) for x in bl_weights],
        "risk_aversion": round(delta, 4),
        "tau": round(tau, 4),
    })


def compute_pe_fund_metrics(
    db: Session,
    contributions: list,
    distributions: list,
    nav: float,
    dates: Optional[list] = None,
) -> str:
    """Private equity fund performance metrics: TVPI, DPI, RVPI, and optionally IRR."""
    if not contributions or len(contributions) == 0:
        return json.dumps({"error": "contributions list must be non-empty"})
    if not distributions or len(distributions) == 0:
        return json.dumps({"error": "distributions list must be non-empty"})

    paid_in = sum(contributions)
    if paid_in <= 0:
        return json.dumps({"error": "Total paid-in capital must be > 0"})

    total_distributed = sum(distributions)
    tvpi = (total_distributed + nav) / paid_in
    dpi = total_distributed / paid_in
    rvpi = nav / paid_in

    mwr = None
    if dates is not None:
        # Build net cash flow series: negative for contributions, positive for distributions
        max_len = max(len(contributions), len(distributions))
        net_cash_flows = []
        for i in range(max_len):
            cf = 0.0
            if i < len(contributions):
                cf -= contributions[i]
            if i < len(distributions):
                cf += distributions[i]
            net_cash_flows.append(cf)
        # Final cash flow: add NAV
        net_cash_flows.append(nav)
        mwr = _irr(net_cash_flows)
        if mwr is not None:
            mwr = round(mwr, 6)

    vintage_summary = (
        f"TVPI {round(tvpi, 2)}x | DPI {round(dpi, 2)}x | RVPI {round(rvpi, 2)}x"
    )

    return json.dumps({
        "model_type": "pe_fund_metrics",
        "paid_in_capital": round(paid_in, 4),
        "total_distributed": round(total_distributed, 4),
        "nav": round(nav, 4),
        "tvpi": round(tvpi, 4),
        "dpi": round(dpi, 4),
        "rvpi": round(rvpi, 4),
        "mwr": mwr,
        "vintage_summary": vintage_summary,
    })


def compute_omega_ratio(
    db: Session,
    returns: list,
    threshold: float = 0.0,
) -> str:
    """Omega ratio and related downside risk metrics."""
    if len(returns) < 2:
        return json.dumps({"error": "At least 2 return observations required"})

    gains = sum(max(r - threshold, 0) for r in returns)
    losses = sum(max(threshold - r, 0) for r in returns)
    omega = gains / losses if losses > 1e-10 else 9999.99

    n = len(returns)
    pct_above = len([r for r in returns if r > threshold]) / n
    pct_below = 1.0 - pct_above
    mean_return = statistics.mean(returns)

    downside_returns = [min(r - threshold, 0) ** 2 for r in returns]
    downside_dev = math.sqrt(sum(downside_returns) / n)

    sortino_vs_threshold = (
        (mean_return - threshold) / downside_dev
        if downside_dev > 1e-10
        else 9999.99
    )

    upside_potential = statistics.mean([max(r - threshold, 0) for r in returns])
    upside_potential_ratio = (
        upside_potential / downside_dev
        if downside_dev > 1e-10
        else 9999.99
    )

    return json.dumps({
        "model_type": "omega_ratio",
        "omega": round(omega, 4),
        "threshold": round(threshold, 6),
        "n_periods": n,
        "mean_return": round(mean_return, 6),
        "pct_above": round(pct_above, 4),
        "pct_below": round(pct_below, 4),
        "upside_potential_ratio": round(upside_potential_ratio, 4),
        "sortino_vs_threshold": round(sortino_vs_threshold, 4),
        "gains_sum": round(gains, 6),
        "losses_sum": round(losses, 6),
    })


def compute_credit_risk(
    db: Session,
    ead: float,
    pd: float,
    lgd: float,
    asset_value: Optional[float] = None,
    debt_face: Optional[float] = None,
    asset_volatility: Optional[float] = None,
    time_horizon: Optional[float] = None,
    risk_free_rate: Optional[float] = None,
) -> str:
    """Credit risk metrics (EL, UL, Credit VaR) with optional Merton structural model."""
    if ead <= 0:
        return json.dumps({"error": "ead must be > 0"})
    if pd < 0 or pd > 1:
        return json.dumps({"error": "pd must be between 0 and 1"})
    if lgd < 0 or lgd > 1:
        return json.dumps({"error": "lgd must be between 0 and 1"})

    expected_loss = ead * pd * lgd
    unexpected_loss = ead * math.sqrt(pd * (1 - pd)) * lgd
    credit_var_99 = unexpected_loss * 2.326
    loss_rate = pd * lgd

    result = {
        "model_type": "credit_risk",
        "ead": round(ead, 4),
        "pd": round(pd, 6),
        "lgd": round(lgd, 4),
        "expected_loss": round(expected_loss, 4),
        "unexpected_loss": round(unexpected_loss, 4),
        "credit_var_99": round(credit_var_99, 4),
        "loss_rate": round(loss_rate, 6),
    }

    # Merton structural model (optional)
    if (asset_value is not None and debt_face is not None
            and asset_volatility is not None and time_horizon is not None):
        if asset_value <= 0:
            return json.dumps({"error": "asset_value must be > 0 for Merton model"})
        if debt_face <= 0:
            return json.dumps({"error": "debt_face must be > 0 for Merton model"})
        if asset_volatility <= 0:
            return json.dumps({"error": "asset_volatility must be > 0 for Merton model"})
        if time_horizon <= 0:
            return json.dumps({"error": "time_horizon must be > 0 for Merton model"})

        r = risk_free_rate if risk_free_rate is not None else 0.0

        d2 = (
            (math.log(asset_value / debt_face) + (r - asset_volatility ** 2 / 2) * time_horizon)
            / (asset_volatility * math.sqrt(time_horizon))
        )
        d1 = d2 + asset_volatility * math.sqrt(time_horizon)

        distance_to_default = d2
        pd_merton = 1 - _norm_cdf(d2)
        equity_value = (
            asset_value * _norm_cdf(d1)
            - debt_face * math.exp(-r * time_horizon) * _norm_cdf(d2)
        )

        result["distance_to_default"] = round(distance_to_default, 4)
        result["pd_merton"] = round(pd_merton, 6)
        result["equity_value"] = round(equity_value, 4)
        result["d1"] = round(d1, 4)
        result["d2"] = round(d2, 4)

    return json.dumps(result)


def compute_forward_rates(
    db: Session,
    spot_rates: Optional[list] = None,
    maturities: Optional[list] = None,
    par_rates: Optional[list] = None,
    cash_flows: Optional[list] = None,
    price: Optional[float] = None,
) -> str:
    """Forward rate computation, spot rate bootstrap, and z-spread calculation."""
    # ── Mode B: Bootstrap spots from par rates ──
    if par_rates is not None:
        n = len(par_rates)
        if n == 0:
            return json.dumps({"error": "par_rates list must be non-empty"})
        mats = maturities if maturities is not None else list(range(1, n + 1))
        if len(mats) != n:
            return json.dumps({"error": "maturities length must match par_rates length"})

        spots = [0.0] * n
        spots[0] = par_rates[0]

        for i in range(1, n):
            coupon = par_rates[i]
            # 1 = sum(c / (1+s_j)^t_j for j<i) + (1+c) / (1+s_i)^t_i
            pv_coupons = sum(
                coupon / (1 + spots[j]) ** mats[j] for j in range(i)
            )
            remaining = 1.0 - pv_coupons
            if remaining <= 0:
                return json.dumps({"error": f"Bootstrap failed at maturity {mats[i]}: non-positive residual"})
            # remaining = (1 + coupon) / (1 + s_i)^t_i
            # (1 + s_i)^t_i = (1 + coupon) / remaining
            spots[i] = ((1 + coupon) / remaining) ** (1.0 / mats[i]) - 1

        # Compute forwards from bootstrapped spots
        forwards = []
        for i in range(1, n):
            t1, t2 = mats[i - 1], mats[i]
            dt = t2 - t1
            if dt <= 0:
                forwards.append(None)
                continue
            fwd = ((1 + spots[i]) ** t2 / (1 + spots[i - 1]) ** t1) ** (1.0 / dt) - 1
            forwards.append(round(fwd, 6))

        discount_factors = [round(1.0 / (1 + spots[i]) ** mats[i], 6) for i in range(n)]

        return json.dumps({
            "model_type": "forward_rates",
            "mode": "bootstrap",
            "spot_rates": [round(s, 6) for s in spots],
            "forward_rates": forwards,
            "discount_factors": discount_factors,
            "z_spread": None,
            "maturities": mats,
        })

    # ── Require spot_rates for Mode A and Mode C ──
    if spot_rates is None or len(spot_rates) == 0:
        return json.dumps({"error": "spot_rates or par_rates must be provided"})

    n = len(spot_rates)
    mats = maturities if maturities is not None else list(range(1, n + 1))
    if len(mats) != n:
        return json.dumps({"error": "maturities length must match spot_rates length"})

    # ── Mode C: Z-Spread ──
    if cash_flows is not None and price is not None:
        if len(cash_flows) == 0:
            return json.dumps({"error": "cash_flows list must be non-empty"})
        # Use spot rates for each cash flow period; if fewer spots than CFs, reuse last
        def calc_price(z):
            pv = 0.0
            for i, cf in enumerate(cash_flows):
                t = mats[i] if i < len(mats) else mats[-1] + (i - len(mats) + 1)
                s = spot_rates[i] if i < n else spot_rates[-1]
                pv += cf / (1 + s + z) ** t
            return pv

        lo, hi = -0.5, 0.5
        z_spread = None
        for _ in range(200):
            mid = (lo + hi) / 2.0
            calc_p = calc_price(mid)
            if abs(calc_p - price) < 0.0001:
                z_spread = mid
                break
            if calc_p > price:
                lo = mid
            else:
                hi = mid
        else:
            z_spread = (lo + hi) / 2.0

        # Also compute forwards and discount factors
        forwards = []
        for i in range(1, n):
            t1, t2 = mats[i - 1], mats[i]
            dt = t2 - t1
            if dt <= 0:
                forwards.append(None)
                continue
            fwd = ((1 + spot_rates[i]) ** t2 / (1 + spot_rates[i - 1]) ** t1) ** (1.0 / dt) - 1
            forwards.append(round(fwd, 6))

        discount_factors = [round(1.0 / (1 + spot_rates[i]) ** mats[i], 6) for i in range(n)]

        return json.dumps({
            "model_type": "forward_rates",
            "mode": "z_spread",
            "spot_rates": [round(s, 6) for s in spot_rates],
            "forward_rates": forwards,
            "discount_factors": discount_factors,
            "z_spread": round(z_spread, 6) if z_spread is not None else None,
            "maturities": mats,
        })

    # ── Mode A: Forward rates from spot rates ──
    forwards = []
    for i in range(1, n):
        t1, t2 = mats[i - 1], mats[i]
        dt = t2 - t1
        if dt <= 0:
            forwards.append(None)
            continue
        fwd = ((1 + spot_rates[i]) ** t2 / (1 + spot_rates[i - 1]) ** t1) ** (1.0 / dt) - 1
        forwards.append(round(fwd, 6))

    discount_factors = [round(1.0 / (1 + spot_rates[i]) ** mats[i], 6) for i in range(n)]

    return json.dumps({
        "model_type": "forward_rates",
        "mode": "forward",
        "spot_rates": [round(s, 6) for s in spot_rates],
        "forward_rates": forwards,
        "discount_factors": discount_factors,
        "z_spread": None,
        "maturities": mats,
    })


# ── Tool Definitions & Dispatch ──────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "compute_dupont",
            "description": (
                "Perform DuPont ROE decomposition. Supports 3-factor (profit margin × "
                "asset turnover × equity multiplier) and 5-factor (adds tax burden and "
                "interest burden) analysis."
            ),
            "parameters": {
                "type": "object",
                "required": ["net_income", "sales", "total_assets", "total_equity"],
                "properties": {
                    "net_income": {"type": "number", "description": "Net income"},
                    "sales": {"type": "number", "description": "Total sales / revenue"},
                    "total_assets": {"type": "number", "description": "Total assets"},
                    "total_equity": {"type": "number", "description": "Total shareholders' equity"},
                    "ebit": {"type": "number", "description": "EBIT (for 5-factor mode, optional)"},
                    "ebt": {"type": "number", "description": "Earnings before tax (for 5-factor mode, optional)"},
                    "tax": {"type": "number", "description": "Tax expense (optional)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_brinson_attribution",
            "description": (
                "Brinson-Fachler performance attribution. Decomposes active return into "
                "allocation, selection, and interaction effects across sectors."
            ),
            "parameters": {
                "type": "object",
                "required": ["sectors"],
                "properties": {
                    "sectors": {
                        "type": "array",
                        "description": "List of sector data for attribution analysis.",
                        "items": {
                            "type": "object",
                            "required": ["name", "portfolio_weight", "benchmark_weight", "portfolio_return", "benchmark_return"],
                            "properties": {
                                "name": {"type": "string", "description": "Sector name"},
                                "portfolio_weight": {"type": "number", "description": "Portfolio weight in this sector (decimal)"},
                                "benchmark_weight": {"type": "number", "description": "Benchmark weight in this sector (decimal)"},
                                "portfolio_return": {"type": "number", "description": "Portfolio return in this sector (decimal)"},
                                "benchmark_return": {"type": "number", "description": "Benchmark return in this sector (decimal)"},
                            },
                        },
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_black_litterman",
            "description": (
                "Black-Litterman asset allocation model. Combines market equilibrium with "
                "investor views to produce posterior expected returns and optimal weights. "
                "Limited to 10 assets maximum."
            ),
            "parameters": {
                "type": "object",
                "required": ["market_caps", "covariance_matrix", "risk_aversion", "tau", "views", "view_confidences"],
                "properties": {
                    "market_caps": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Market capitalizations for each asset",
                    },
                    "covariance_matrix": {
                        "type": "array",
                        "description": "NxN covariance matrix (list of lists)",
                        "items": {"type": "array", "items": {"type": "number"}},
                    },
                    "risk_aversion": {"type": "number", "description": "Risk aversion coefficient (delta, typically 2-4)"},
                    "tau": {"type": "number", "description": "Scaling factor for uncertainty in equilibrium (typically 0.025-0.05)"},
                    "views": {
                        "type": "array",
                        "description": "Investor views. Each view: {assets: [indices], weights: [floats], expected_return: float}",
                        "items": {
                            "type": "object",
                            "required": ["assets", "weights", "expected_return"],
                            "properties": {
                                "assets": {"type": "array", "items": {"type": "integer"}, "description": "Asset indices in the view"},
                                "weights": {"type": "array", "items": {"type": "number"}, "description": "View weights (sum to 0 for relative, 1 for absolute)"},
                                "expected_return": {"type": "number", "description": "Expected return for this view (decimal)"},
                            },
                        },
                    },
                    "view_confidences": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Confidence in each view (0 to 1, higher = more confident)",
                    },
                    "risk_free_rate": {"type": "number", "description": "Risk-free rate (decimal). Default 0.0."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_pe_fund_metrics",
            "description": (
                "Compute private equity fund performance metrics: TVPI, DPI, RVPI, "
                "and optionally money-weighted return (IRR)."
            ),
            "parameters": {
                "type": "object",
                "required": ["contributions", "distributions", "nav"],
                "properties": {
                    "contributions": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "List of capital contributions (positive amounts)",
                    },
                    "distributions": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "List of distributions to LPs (positive amounts)",
                    },
                    "nav": {"type": "number", "description": "Current net asset value (residual value)"},
                    "dates": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "ISO date strings for each cash flow period (optional, triggers IRR calculation)",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_omega_ratio",
            "description": (
                "Compute the Omega ratio and related downside risk metrics. "
                "Measures the probability-weighted ratio of gains to losses relative to a threshold."
            ),
            "parameters": {
                "type": "object",
                "required": ["returns"],
                "properties": {
                    "returns": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "List of periodic returns (decimals, e.g. 0.05 for 5%)",
                    },
                    "threshold": {"type": "number", "description": "Return threshold (decimal). Default 0.0."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_credit_risk",
            "description": (
                "Compute credit risk metrics: expected loss, unexpected loss, Credit VaR. "
                "Optionally runs Merton structural model for distance-to-default and "
                "market-implied probability of default."
            ),
            "parameters": {
                "type": "object",
                "required": ["ead", "pd", "lgd"],
                "properties": {
                    "ead": {"type": "number", "description": "Exposure at default"},
                    "pd": {"type": "number", "description": "Probability of default (0 to 1)"},
                    "lgd": {"type": "number", "description": "Loss given default (0 to 1)"},
                    "asset_value": {"type": "number", "description": "Firm asset value for Merton model (optional)"},
                    "debt_face": {"type": "number", "description": "Face value of debt for Merton model (optional)"},
                    "asset_volatility": {"type": "number", "description": "Asset volatility for Merton model (decimal, optional)"},
                    "time_horizon": {"type": "number", "description": "Time horizon in years for Merton model (optional)"},
                    "risk_free_rate": {"type": "number", "description": "Risk-free rate for Merton model (decimal, optional)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_forward_rates",
            "description": (
                "Compute forward rates from spot rates, bootstrap spot rates from par rates, "
                "or solve for Z-spread given bond cash flows and market price."
            ),
            "parameters": {
                "type": "object",
                "required": [],
                "properties": {
                    "spot_rates": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Spot rates at each maturity (decimals)",
                    },
                    "maturities": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Maturities in years. Default [1, 2, 3, ...].",
                    },
                    "par_rates": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Par coupon rates for bootstrap mode (decimals)",
                    },
                    "cash_flows": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Bond cash flows for Z-spread calculation",
                    },
                    "price": {"type": "number", "description": "Bond market price for Z-spread calculation"},
                },
            },
        },
    },
]

TOOL_DISPATCH = {
    "compute_dupont": compute_dupont,
    "compute_brinson_attribution": compute_brinson_attribution,
    "compute_black_litterman": compute_black_litterman,
    "compute_pe_fund_metrics": compute_pe_fund_metrics,
    "compute_omega_ratio": compute_omega_ratio,
    "compute_credit_risk": compute_credit_risk,
    "compute_forward_rates": compute_forward_rates,
}
