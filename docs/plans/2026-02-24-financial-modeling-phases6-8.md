# Financial Modeling Phases 6–8 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 23 new financial tools (Portfolio/Risk, Options/Derivatives, Iranian Market/RE) to the RAG financial modeling agent.

**Architecture:** Append pure-compute Python functions to `rag/tools/financial_modeling.py`, extend `TOOL_DEFINITIONS` and `TOOL_DISPATCH` dicts, update agent prompt + router keywords, and extend the frontend tool-type map.

**Tech Stack:** Python stdlib only (math, statistics, random). No scipy/numpy. All tools return `json.dumps(...)`. Tests use pytest + MagicMock for `db`.

---

## Key Patterns (reference for all tasks)

- Every tool: `def tool_name(db: Session, ...params) -> str:` → returns `json.dumps({...})`
- First param is always `db: Session` (convention — many tools don't use it)
- All numeric outputs: `round(value, 4)`
- Validation: return `json.dumps({"error": "message"})` for invalid inputs
- Test class: `class TestToolName:` with `from rag.tools.financial_modeling import tool_name`
- Test DB mock: `db = MagicMock()`
- Currently 3622 lines in `financial_modeling.py`, 21 TOOL_DEFINITIONS, 21 TOOL_DISPATCH entries

---

## Task 1: Phase 6 — Portfolio & Risk Analytics (10 tools)

**Files:**
- Modify: `rag/tools/financial_modeling.py` (append 10 functions + 10 TOOL_DEFINITIONS + 10 TOOL_DISPATCH entries)
- Modify: `tests/unit/test_financial_modeling_tools.py` (add 10 test classes)

### Step 1: Write tests for `compute_portfolio_stats`

```python
class TestPortfolioStats:
    def test_two_asset_portfolio(self):
        from rag.tools.financial_modeling import compute_portfolio_stats
        db = MagicMock()
        result = json.loads(compute_portfolio_stats(
            db,
            assets=[
                {"name": "A", "weight": 0.6, "expected_return": 0.10, "volatility": 0.20},
                {"name": "B", "weight": 0.4, "expected_return": 0.15, "volatility": 0.30},
            ],
            correlation_matrix=[[1.0, 0.3], [0.3, 1.0]],
        ))
        assert result["model_type"] == "portfolio_stats"
        # E(Rp) = 0.6*0.10 + 0.4*0.15 = 0.12
        assert result["portfolio_return"] == pytest.approx(0.12, abs=1e-4)
        assert "portfolio_volatility" in result
        assert result["portfolio_volatility"] > 0

    def test_single_asset(self):
        from rag.tools.financial_modeling import compute_portfolio_stats
        db = MagicMock()
        result = json.loads(compute_portfolio_stats(
            db,
            assets=[{"name": "A", "weight": 1.0, "expected_return": 0.10, "volatility": 0.20}],
            correlation_matrix=[[1.0]],
        ))
        assert result["portfolio_volatility"] == pytest.approx(0.20, abs=1e-4)

    def test_weights_must_sum_to_one(self):
        from rag.tools.financial_modeling import compute_portfolio_stats
        db = MagicMock()
        result = json.loads(compute_portfolio_stats(
            db,
            assets=[
                {"name": "A", "weight": 0.3, "expected_return": 0.10, "volatility": 0.20},
                {"name": "B", "weight": 0.3, "expected_return": 0.15, "volatility": 0.30},
            ],
            correlation_matrix=[[1.0, 0.3], [0.3, 1.0]],
        ))
        assert "error" in result
```

### Step 2: Implement `compute_portfolio_stats`

```python
def compute_portfolio_stats(
    db: Session,
    assets: list,
    correlation_matrix: list,
) -> str:
    """
    Compute portfolio expected return, volatility, and diversification ratio.

    E(Rp) = Σ wᵢ × E(Rᵢ)
    σp = √(w' Σ w)  where Σ = correlation matrix scaled by volatilities
    Diversification ratio = (Σ wᵢσᵢ) / σp
    """
    import math

    n = len(assets)
    weights = [a["weight"] for a in assets]
    returns = [a["expected_return"] for a in assets]
    vols = [a["volatility"] for a in assets]

    # Validate weights sum to ~1
    if abs(sum(weights) - 1.0) > 0.01:
        return json.dumps({"error": "weights must sum to 1.0"})

    # Portfolio return
    port_return = sum(w * r for w, r in zip(weights, returns))

    # Portfolio variance: σp² = ΣΣ wᵢwⱼσᵢσⱼρᵢⱼ
    port_var = 0.0
    for i in range(n):
        for j in range(n):
            port_var += weights[i] * weights[j] * vols[i] * vols[j] * correlation_matrix[i][j]

    port_vol = math.sqrt(max(0, port_var))

    # Weighted average volatility (undiversified)
    weighted_vol = sum(w * v for w, v in zip(weights, vols))
    div_ratio = weighted_vol / port_vol if port_vol > 0 else 1.0

    return json.dumps({
        "model_type": "portfolio_stats",
        "portfolio_return": round(port_return, 4),
        "portfolio_volatility": round(port_vol, 4),
        "weighted_avg_volatility": round(weighted_vol, 4),
        "diversification_ratio": round(div_ratio, 4),
        "assets": [
            {"name": a["name"], "weight": a["weight"], "return": a["expected_return"], "volatility": a["volatility"]}
            for a in assets
        ],
    })
```

### Step 3: Run tests, verify pass

```bash
pytest tests/unit/test_financial_modeling_tools.py::TestPortfolioStats -v
```

### Step 4: Write tests for `compute_risk_metrics`

```python
class TestRiskMetrics:
    def test_basic_sharpe(self):
        from rag.tools.financial_modeling import compute_risk_metrics
        db = MagicMock()
        # Monthly returns: 10 periods of 1% = annualized ~12%
        returns = [0.01] * 12
        result = json.loads(compute_risk_metrics(db, returns=returns, risk_free_rate=0.05))
        assert result["model_type"] == "risk_metrics"
        assert result["sharpe_ratio"] > 0

    def test_all_negative_returns(self):
        from rag.tools.financial_modeling import compute_risk_metrics
        db = MagicMock()
        returns = [-0.02, -0.01, -0.03, -0.02]
        result = json.loads(compute_risk_metrics(db, returns=returns, risk_free_rate=0.05))
        assert result["sharpe_ratio"] < 0

    def test_max_drawdown(self):
        from rag.tools.financial_modeling import compute_risk_metrics
        db = MagicMock()
        # Up 10%, down 20%, up 5%
        returns = [0.10, -0.20, 0.05]
        result = json.loads(compute_risk_metrics(db, returns=returns, risk_free_rate=0.0))
        assert result["max_drawdown"] < 0
```

### Step 5: Implement `compute_risk_metrics`

```python
def compute_risk_metrics(
    db: Session,
    returns: list,
    risk_free_rate: float = 0.0,
    benchmark_returns: Optional[list] = None,
    periods_per_year: int = 12,
) -> str:
    """
    Compute portfolio risk/return metrics from a series of periodic returns.

    Sharpe  = (Rp_ann - Rf) / σp_ann
    Sortino = (Rp_ann - Rf) / σ_downside_ann
    Treynor = (Rp_ann - Rf) / β  (requires benchmark)
    Info Ratio = (Rp_ann - Rb_ann) / tracking_error  (requires benchmark)
    Max Drawdown = max peak-to-trough decline in cumulative returns
    Calmar = Rp_ann / |Max Drawdown|
    """
    import math
    import statistics

    if len(returns) < 2:
        return json.dumps({"error": "need at least 2 return observations"})

    n = len(returns)
    mean_r = statistics.mean(returns)
    std_r = statistics.stdev(returns)

    ann_return = mean_r * periods_per_year
    ann_vol = std_r * math.sqrt(periods_per_year)
    rf_periodic = risk_free_rate / periods_per_year

    # Sharpe
    sharpe = (ann_return - risk_free_rate) / ann_vol if ann_vol > 0 else 0.0

    # Sortino — downside deviation (returns below Rf)
    downside = [min(0, r - rf_periodic) for r in returns]
    downside_var = sum(d ** 2 for d in downside) / n
    downside_std_ann = math.sqrt(downside_var) * math.sqrt(periods_per_year)
    sortino = (ann_return - risk_free_rate) / downside_std_ann if downside_std_ann > 0 else 0.0

    # Max drawdown
    cum = 1.0
    peak = 1.0
    max_dd = 0.0
    for r in returns:
        cum *= (1 + r)
        if cum > peak:
            peak = cum
        dd = (cum - peak) / peak
        if dd < max_dd:
            max_dd = dd

    calmar = ann_return / abs(max_dd) if max_dd != 0 else 0.0

    result = {
        "model_type": "risk_metrics",
        "annualized_return": round(ann_return, 4),
        "annualized_volatility": round(ann_vol, 4),
        "sharpe_ratio": round(sharpe, 4),
        "sortino_ratio": round(sortino, 4),
        "max_drawdown": round(max_dd, 4),
        "calmar_ratio": round(calmar, 4),
        "observations": n,
        "periods_per_year": periods_per_year,
    }

    # Treynor & Information Ratio (if benchmark provided)
    if benchmark_returns and len(benchmark_returns) == n:
        bm_mean = statistics.mean(benchmark_returns)
        # Beta = Cov(Rp, Rb) / Var(Rb)
        cov_sum = sum((returns[i] - mean_r) * (benchmark_returns[i] - bm_mean) for i in range(n))
        var_bm = sum((benchmark_returns[i] - bm_mean) ** 2 for i in range(n))
        beta = cov_sum / var_bm if var_bm > 0 else 1.0
        treynor = (ann_return - risk_free_rate) / beta if beta != 0 else 0.0
        # Tracking error
        excess = [returns[i] - benchmark_returns[i] for i in range(n)]
        te = statistics.stdev(excess) * math.sqrt(periods_per_year) if len(excess) > 1 else 0
        info_ratio = (ann_return - bm_mean * periods_per_year) / te if te > 0 else 0.0
        result["beta"] = round(beta, 4)
        result["treynor_ratio"] = round(treynor, 4)
        result["information_ratio"] = round(info_ratio, 4)
        result["tracking_error"] = round(te, 4)

    return json.dumps(result)
```

### Step 6: Run tests, verify pass

### Step 7: Write tests for `compute_var`

```python
class TestVaR:
    def test_parametric_var(self):
        from rag.tools.financial_modeling import compute_var
        db = MagicMock()
        result = json.loads(compute_var(
            db, portfolio_value=1_000_000,
            expected_return=0.10, volatility=0.20,
            confidence_level=0.95, method="parametric", horizon_days=1,
        ))
        assert result["model_type"] == "var"
        assert result["var_amount"] > 0
        assert result["method"] == "parametric"

    def test_historical_var(self):
        from rag.tools.financial_modeling import compute_var
        db = MagicMock()
        import random
        random.seed(42)
        returns = [random.gauss(0.0005, 0.02) for _ in range(252)]
        result = json.loads(compute_var(
            db, portfolio_value=1_000_000,
            returns=returns,
            confidence_level=0.99, method="historical", horizon_days=1,
        ))
        assert result["var_amount"] > 0
        assert result["method"] == "historical"

    def test_invalid_method(self):
        from rag.tools.financial_modeling import compute_var
        db = MagicMock()
        result = json.loads(compute_var(
            db, portfolio_value=1_000_000,
            expected_return=0.10, volatility=0.20,
            confidence_level=0.95, method="invalid", horizon_days=1,
        ))
        assert "error" in result
```

### Step 8: Implement `compute_var`

```python
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
    Compute Value-at-Risk (VaR).

    Parametric: VaR = |μ_daily × t − z_α × σ_daily × √t| × portfolio_value
    Historical: VaR = percentile(returns) × portfolio_value
    Monte Carlo: simulate GBM paths, take percentile of terminal P&L
    """
    import math
    import random

    valid_methods = ("parametric", "historical", "monte_carlo")
    if method not in valid_methods:
        return json.dumps({"error": f"method must be one of {valid_methods}"})

    # Z-scores for common confidence levels
    z_table = {0.90: 1.2816, 0.95: 1.6449, 0.99: 2.3263, 0.975: 1.9600}
    z_alpha = z_table.get(confidence_level)
    if z_alpha is None:
        # Approximate using Beasley-Springer-Moro for other levels
        # Fallback to 1.6449 (95%)
        z_alpha = 1.6449

    if method == "parametric":
        if expected_return is None or volatility is None:
            return json.dumps({"error": "parametric method requires expected_return and volatility"})
        daily_mu = expected_return / 252
        daily_sigma = volatility / math.sqrt(252)
        var_pct = -(daily_mu * horizon_days) + z_alpha * daily_sigma * math.sqrt(horizon_days)
        var_amount = var_pct * portfolio_value

    elif method == "historical":
        if not returns or len(returns) < 10:
            return json.dumps({"error": "historical method requires at least 10 return observations"})
        sorted_returns = sorted(returns)
        idx = int((1 - confidence_level) * len(sorted_returns))
        idx = max(0, min(idx, len(sorted_returns) - 1))
        var_pct = -sorted_returns[idx] * math.sqrt(horizon_days)
        var_amount = var_pct * portfolio_value

    else:  # monte_carlo
        if expected_return is None or volatility is None:
            return json.dumps({"error": "monte_carlo method requires expected_return and volatility"})
        if seed is not None:
            random.seed(seed)
        daily_mu = expected_return / 252
        daily_sigma = volatility / math.sqrt(252)
        terminal_returns = []
        for _ in range(num_simulations):
            cum = 0.0
            for _d in range(horizon_days):
                cum += daily_mu + daily_sigma * random.gauss(0, 1)
            terminal_returns.append(cum)
        terminal_returns.sort()
        idx = int((1 - confidence_level) * num_simulations)
        var_pct = -terminal_returns[max(0, idx)]
        var_amount = var_pct * portfolio_value

    return json.dumps({
        "model_type": "var",
        "method": method,
        "confidence_level": confidence_level,
        "horizon_days": horizon_days,
        "portfolio_value": portfolio_value,
        "var_amount": round(abs(var_amount), 4),
        "var_pct": round(abs(var_pct), 4),
    })
```

### Step 9: Run tests, verify pass

### Step 10: Write tests for `compute_cvar`

```python
class TestCVaR:
    def test_cvar_historical(self):
        from rag.tools.financial_modeling import compute_cvar
        db = MagicMock()
        import random
        random.seed(42)
        returns = [random.gauss(0.0005, 0.02) for _ in range(252)]
        result = json.loads(compute_cvar(
            db, portfolio_value=1_000_000,
            returns=returns,
            confidence_level=0.95,
        ))
        assert result["model_type"] == "cvar"
        assert result["cvar_amount"] > 0
        # CVaR >= VaR always
        assert result["cvar_amount"] >= result["var_amount"]

    def test_cvar_parametric(self):
        from rag.tools.financial_modeling import compute_cvar
        db = MagicMock()
        result = json.loads(compute_cvar(
            db, portfolio_value=1_000_000,
            expected_return=0.10, volatility=0.20,
            confidence_level=0.95,
        ))
        assert result["cvar_amount"] > 0
```

### Step 11: Implement `compute_cvar`

```python
def compute_cvar(
    db: Session,
    portfolio_value: float,
    confidence_level: float = 0.95,
    expected_return: Optional[float] = None,
    volatility: Optional[float] = None,
    returns: Optional[list] = None,
    horizon_days: int = 1,
) -> str:
    """
    Compute Conditional VaR (Expected Shortfall).

    CVaR = E[Loss | Loss > VaR] — the average loss in the worst (1-α) tail.

    Parametric (normal): CVaR = σ × φ(z_α) / (1-α) − μ  (scaled to horizon)
    Historical: mean of returns below the VaR percentile
    """
    import math

    z_table = {0.90: 1.2816, 0.95: 1.6449, 0.99: 2.3263, 0.975: 1.9600}
    z_alpha = z_table.get(confidence_level, 1.6449)

    if returns and len(returns) >= 10:
        # Historical CVaR
        sorted_returns = sorted(returns)
        cutoff = int((1 - confidence_level) * len(sorted_returns))
        cutoff = max(1, cutoff)
        tail = sorted_returns[:cutoff]
        var_pct = -sorted_returns[cutoff - 1] * math.sqrt(horizon_days)
        cvar_pct = -sum(tail) / len(tail) * math.sqrt(horizon_days)
        method = "historical"
    elif expected_return is not None and volatility is not None:
        # Parametric CVaR (normal distribution)
        daily_mu = expected_return / 252
        daily_sigma = volatility / math.sqrt(252)
        # φ(z) = pdf of standard normal at z
        phi_z = math.exp(-z_alpha ** 2 / 2) / math.sqrt(2 * math.pi)
        var_pct = -(daily_mu * horizon_days) + z_alpha * daily_sigma * math.sqrt(horizon_days)
        cvar_pct = -(daily_mu * horizon_days) + daily_sigma * math.sqrt(horizon_days) * phi_z / (1 - confidence_level)
        method = "parametric"
    else:
        return json.dumps({"error": "provide either returns[] or (expected_return, volatility)"})

    return json.dumps({
        "model_type": "cvar",
        "method": method,
        "confidence_level": confidence_level,
        "horizon_days": horizon_days,
        "portfolio_value": portfolio_value,
        "var_amount": round(abs(var_pct * portfolio_value), 4),
        "var_pct": round(abs(var_pct), 4),
        "cvar_amount": round(abs(cvar_pct * portfolio_value), 4),
        "cvar_pct": round(abs(cvar_pct), 4),
    })
```

### Step 12: Run tests, verify pass

### Step 13: Write tests for `run_monte_carlo`

```python
class TestMonteCarlo:
    def test_basic_gbm(self):
        from rag.tools.financial_modeling import run_monte_carlo
        db = MagicMock()
        result = json.loads(run_monte_carlo(
            db, initial_value=100, expected_return=0.10,
            volatility=0.20, horizon_years=1,
            num_simulations=1000, seed=42,
        ))
        assert result["model_type"] == "monte_carlo"
        assert result["terminal_stats"]["mean"] > 0
        assert len(result["percentile_paths"]) == 5
        assert result["probability_of_loss"] >= 0

    def test_zero_volatility_deterministic(self):
        from rag.tools.financial_modeling import run_monte_carlo
        db = MagicMock()
        result = json.loads(run_monte_carlo(
            db, initial_value=100, expected_return=0.10,
            volatility=0.0, horizon_years=1,
            num_simulations=100, seed=42,
        ))
        # All paths should be ~110.52 (e^0.10 × 100)
        assert result["terminal_stats"]["std"] == pytest.approx(0, abs=0.01)
```

### Step 14: Implement `run_monte_carlo`

```python
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

    Returns percentile paths (5th, 25th, 50th, 75th, 95th),
    terminal distribution stats, and probability of loss.
    """
    import math
    import random
    import statistics

    if seed is not None:
        random.seed(seed)

    dt = horizon_years / num_steps
    drift = (expected_return - 0.5 * volatility ** 2) * dt
    diffusion = volatility * math.sqrt(dt)

    # Run simulations, store terminal values and full paths for percentiles
    terminal_values = []
    # Store paths at ~10 time points for charting
    sample_points = max(1, num_steps // 10)
    path_accumulator = {p: [] for p in [5, 25, 50, 75, 95]}
    all_paths_at_steps = [[] for _ in range(num_steps + 1)]

    for _ in range(num_simulations):
        s = initial_value
        for step in range(num_steps):
            z = random.gauss(0, 1)
            s = s * math.exp(drift + diffusion * z)
            if step % sample_points == 0 or step == num_steps - 1:
                all_paths_at_steps[step + 1].append(s)
        terminal_values.append(s)

    # Terminal stats
    mean_val = statistics.mean(terminal_values)
    median_val = statistics.median(terminal_values)
    std_val = statistics.stdev(terminal_values) if len(terminal_values) > 1 else 0
    prob_loss = sum(1 for v in terminal_values if v < initial_value) / num_simulations

    # Percentile paths at sampled time points
    percentile_paths = {}
    for pct in [5, 25, 50, 75, 95]:
        path = [initial_value]
        for step_idx in range(1, num_steps + 1):
            vals = all_paths_at_steps[step_idx]
            if vals:
                sorted_v = sorted(vals)
                idx = int(pct / 100 * len(sorted_v))
                idx = min(idx, len(sorted_v) - 1)
                path.append(round(sorted_v[idx], 4))
        percentile_paths[f"p{pct}"] = path[-1]  # Just terminal for JSON size

    return json.dumps({
        "model_type": "monte_carlo",
        "initial_value": initial_value,
        "expected_return": expected_return,
        "volatility": volatility,
        "horizon_years": horizon_years,
        "num_simulations": num_simulations,
        "num_steps": num_steps,
        "terminal_stats": {
            "mean": round(mean_val, 4),
            "median": round(median_val, 4),
            "std": round(std_val, 4),
            "min": round(min(terminal_values), 4),
            "max": round(max(terminal_values), 4),
        },
        "percentile_paths": {
            "p5": percentile_paths["p5"],
            "p25": percentile_paths["p25"],
            "p50": percentile_paths["p50"],
            "p75": percentile_paths["p75"],
            "p95": percentile_paths["p95"],
        },
        "probability_of_loss": round(prob_loss, 4),
    })
```

### Step 15: Run tests, verify pass

### Step 16: Write tests for `optimize_portfolio`

```python
class TestOptimizePortfolio:
    def test_min_variance_two_assets(self):
        from rag.tools.financial_modeling import optimize_portfolio
        db = MagicMock()
        result = json.loads(optimize_portfolio(
            db,
            assets=[
                {"name": "A", "expected_return": 0.10, "volatility": 0.15},
                {"name": "B", "expected_return": 0.20, "volatility": 0.30},
            ],
            correlation_matrix=[[1.0, 0.2], [0.2, 1.0]],
            risk_free_rate=0.05,
            objective="min_variance",
        ))
        assert result["model_type"] == "portfolio_optimization"
        assert len(result["optimal_weights"]) == 2
        assert sum(w["weight"] for w in result["optimal_weights"]) == pytest.approx(1.0, abs=0.01)

    def test_max_sharpe_two_assets(self):
        from rag.tools.financial_modeling import optimize_portfolio
        db = MagicMock()
        result = json.loads(optimize_portfolio(
            db,
            assets=[
                {"name": "A", "expected_return": 0.10, "volatility": 0.15},
                {"name": "B", "expected_return": 0.20, "volatility": 0.30},
            ],
            correlation_matrix=[[1.0, 0.2], [0.2, 1.0]],
            risk_free_rate=0.05,
            objective="max_sharpe",
        ))
        assert result["sharpe_ratio"] > 0
```

### Step 17: Implement `optimize_portfolio`

```python
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
    Portfolio optimization via random search (no scipy dependency).

    Objectives:
    - min_variance: minimize portfolio volatility
    - max_sharpe: maximize (Rp − Rf) / σp
    - target_return: minimize volatility subject to E(Rp) ≥ target

    Uses Monte Carlo random weight generation with N=10000 random portfolios.
    """
    import math
    import random

    if seed is not None:
        random.seed(seed)

    n = len(assets)
    rets = [a["expected_return"] for a in assets]
    vols = [a["volatility"] for a in assets]
    corr = correlation_matrix

    def _port_stats(w):
        pr = sum(w[i] * rets[i] for i in range(n))
        pv = 0.0
        for i in range(n):
            for j in range(n):
                pv += w[i] * w[j] * vols[i] * vols[j] * corr[i][j]
        return pr, math.sqrt(max(0, pv))

    best_weights = None
    best_score = None

    for _ in range(num_portfolios):
        # Generate random weights with constraints
        raw = [random.random() for _ in range(n)]
        total = sum(raw)
        w = [r / total for r in raw]
        # Clip to constraints
        w = [max(min_weight, min(max_weight, wi)) for wi in w]
        ws = sum(w)
        w = [wi / ws for wi in w]

        pr, pv = _port_stats(w)

        if objective == "min_variance":
            score = -pv  # maximize negative vol
        elif objective == "max_sharpe":
            score = (pr - risk_free_rate) / pv if pv > 0 else -1e9
        elif objective == "target_return":
            if target_return is not None and pr < target_return - 0.001:
                continue
            score = -pv
        else:
            return json.dumps({"error": f"unknown objective: {objective}"})

        if best_score is None or score > best_score:
            best_score = score
            best_weights = w

    if best_weights is None:
        return json.dumps({"error": "no feasible portfolio found"})

    pr, pv = _port_stats(best_weights)
    sharpe = (pr - risk_free_rate) / pv if pv > 0 else 0

    return json.dumps({
        "model_type": "portfolio_optimization",
        "objective": objective,
        "optimal_weights": [
            {"name": assets[i]["name"], "weight": round(best_weights[i], 4)}
            for i in range(n)
        ],
        "portfolio_return": round(pr, 4),
        "portfolio_volatility": round(pv, 4),
        "sharpe_ratio": round(sharpe, 4),
    })
```

### Step 18: Run tests, verify pass

### Step 19: Write tests for `compute_efficient_frontier`

```python
class TestEfficientFrontier:
    def test_frontier_points(self):
        from rag.tools.financial_modeling import compute_efficient_frontier
        db = MagicMock()
        result = json.loads(compute_efficient_frontier(
            db,
            assets=[
                {"name": "A", "expected_return": 0.10, "volatility": 0.15},
                {"name": "B", "expected_return": 0.20, "volatility": 0.30},
            ],
            correlation_matrix=[[1.0, 0.2], [0.2, 1.0]],
            risk_free_rate=0.05,
            num_points=20,
        ))
        assert result["model_type"] == "efficient_frontier"
        assert len(result["frontier_points"]) == 20
        assert "min_variance_portfolio" in result
        assert "tangent_portfolio" in result
```

### Step 20: Implement `compute_efficient_frontier`

```python
def compute_efficient_frontier(
    db: Session,
    assets: list,
    correlation_matrix: list,
    risk_free_rate: float = 0.0,
    num_points: int = 50,
) -> str:
    """
    Compute the efficient frontier by generating portfolios at different
    target return levels between min-variance return and max single-asset return.
    """
    import math

    n = len(assets)
    rets = [a["expected_return"] for a in assets]
    vols = [a["volatility"] for a in assets]
    corr = correlation_matrix

    def _port_stats(w):
        pr = sum(w[i] * rets[i] for i in range(n))
        pv = 0.0
        for i in range(n):
            for j in range(n):
                pv += w[i] * w[j] * vols[i] * vols[j] * corr[i][j]
        return pr, math.sqrt(max(0, pv))

    def _find_min_vol_for_target(target_r, iterations=5000):
        import random
        best_w, best_vol = None, float("inf")
        for _ in range(iterations):
            raw = [random.random() for _ in range(n)]
            s = sum(raw)
            w = [r / s for r in raw]
            pr, pv = _port_stats(w)
            if abs(pr - target_r) < 0.005 and pv < best_vol:
                best_vol = pv
                best_w = w
        return best_w, best_vol

    min_r = min(rets)
    max_r = max(rets)
    step = (max_r - min_r) / (num_points - 1) if num_points > 1 else 0

    frontier = []
    min_var_port = None
    tangent_port = None
    best_sharpe = -1e9

    for i in range(num_points):
        target = min_r + step * i
        w, vol = _find_min_vol_for_target(target)
        if w is None:
            continue
        ret, vol = _port_stats(w)
        frontier.append({
            "return": round(ret, 4),
            "volatility": round(vol, 4),
        })
        if min_var_port is None or vol < min_var_port["volatility"]:
            min_var_port = {"return": round(ret, 4), "volatility": round(vol, 4)}
        sharpe = (ret - risk_free_rate) / vol if vol > 0 else 0
        if sharpe > best_sharpe:
            best_sharpe = sharpe
            tangent_port = {"return": round(ret, 4), "volatility": round(vol, 4), "sharpe": round(sharpe, 4)}

    return json.dumps({
        "model_type": "efficient_frontier",
        "frontier_points": frontier,
        "min_variance_portfolio": min_var_port,
        "tangent_portfolio": tangent_port,
    })
```

### Step 21: Run tests, verify pass

### Step 22: Write tests for `compute_risk_parity`

```python
class TestRiskParity:
    def test_equal_vol_gives_equal_weights(self):
        from rag.tools.financial_modeling import compute_risk_parity
        db = MagicMock()
        result = json.loads(compute_risk_parity(
            db,
            assets=[
                {"name": "A", "volatility": 0.20},
                {"name": "B", "volatility": 0.20},
            ],
            correlation_matrix=[[1.0, 0.0], [0.0, 1.0]],
        ))
        assert result["model_type"] == "risk_parity"
        assert result["weights"][0]["weight"] == pytest.approx(0.5, abs=0.05)
        assert result["weights"][1]["weight"] == pytest.approx(0.5, abs=0.05)

    def test_higher_vol_gets_lower_weight(self):
        from rag.tools.financial_modeling import compute_risk_parity
        db = MagicMock()
        result = json.loads(compute_risk_parity(
            db,
            assets=[
                {"name": "Bond", "volatility": 0.05},
                {"name": "Equity", "volatility": 0.20},
            ],
            correlation_matrix=[[1.0, 0.3], [0.3, 1.0]],
        ))
        bond_w = result["weights"][0]["weight"]
        equity_w = result["weights"][1]["weight"]
        assert bond_w > equity_w  # Lower vol → higher weight
```

### Step 23: Implement `compute_risk_parity`

```python
def compute_risk_parity(
    db: Session,
    assets: list,
    correlation_matrix: list,
) -> str:
    """
    Compute risk parity (equal risk contribution) portfolio weights.

    Each asset contributes equally to total portfolio variance:
    w_i × (Σw)_i = σ²_p / n  for all i

    Uses inverse-volatility as starting point then iterative adjustment.
    """
    import math

    n = len(assets)
    vols = [a["volatility"] for a in assets]
    corr = correlation_matrix

    # Start with inverse-volatility weights
    inv_vol = [1.0 / v if v > 0 else 1.0 for v in vols]
    s = sum(inv_vol)
    weights = [iv / s for iv in inv_vol]

    def _port_var(w):
        pv = 0.0
        for i in range(n):
            for j in range(n):
                pv += w[i] * w[j] * vols[i] * vols[j] * corr[i][j]
        return pv

    def _marginal_risk(w):
        """Marginal risk contribution of each asset."""
        pvar = _port_var(w)
        pvol = math.sqrt(max(0, pvar))
        if pvol == 0:
            return [1.0 / n] * n
        mrc = []
        for i in range(n):
            deriv = 0.0
            for j in range(n):
                deriv += w[j] * vols[i] * vols[j] * corr[i][j]
            mrc.append(w[i] * deriv / pvol)
        return mrc

    # Iterate to equalize risk contributions
    for _iter in range(200):
        rc = _marginal_risk(weights)
        total_rc = sum(rc)
        if total_rc == 0:
            break
        target_rc = total_rc / n
        # Adjust weights proportionally
        for i in range(n):
            if rc[i] > 0:
                weights[i] *= target_rc / rc[i]
        s = sum(weights)
        weights = [w / s for w in weights]

    final_rc = _marginal_risk(weights)
    port_vol = math.sqrt(max(0, _port_var(weights)))

    return json.dumps({
        "model_type": "risk_parity",
        "weights": [
            {"name": assets[i]["name"], "weight": round(weights[i], 4)}
            for i in range(n)
        ],
        "risk_contributions": [
            {"name": assets[i]["name"], "contribution": round(final_rc[i], 4)}
            for i in range(n)
        ],
        "total_volatility": round(port_vol, 4),
    })
```

### Step 24: Run tests, verify pass

### Step 25: Write tests for `compute_factor_model`

```python
class TestFactorModel:
    def test_single_factor(self):
        from rag.tools.financial_modeling import compute_factor_model
        db = MagicMock()
        # Asset return = 0.01 + 1.2 * market + noise
        market = [0.01, -0.02, 0.03, -0.01, 0.02, 0.015, -0.005, 0.01, -0.015, 0.025]
        asset = [0.01 + 1.2 * m + 0.001 for m in market]
        result = json.loads(compute_factor_model(
            db, asset_returns=asset, market_returns=market, risk_free_rate=0.0,
        ))
        assert result["model_type"] == "factor_model"
        assert result["beta_market"] == pytest.approx(1.2, abs=0.1)
        assert result["r_squared"] > 0.9

    def test_requires_equal_length(self):
        from rag.tools.financial_modeling import compute_factor_model
        db = MagicMock()
        result = json.loads(compute_factor_model(
            db, asset_returns=[0.01, 0.02], market_returns=[0.01],
            risk_free_rate=0.0,
        ))
        assert "error" in result
```

### Step 26: Implement `compute_factor_model`

```python
def compute_factor_model(
    db: Session,
    asset_returns: list,
    market_returns: list,
    risk_free_rate: float = 0.0,
    smb_returns: Optional[list] = None,
    hml_returns: Optional[list] = None,
) -> str:
    """
    OLS factor regression (CAPM or Fama-French 3-factor).

    Single factor: Ri - Rf = α + β(Rm - Rf) + ε
    Three factor:  Ri - Rf = α + β₁(Rm - Rf) + β₂(SMB) + β₃(HML) + ε

    Returns alpha, betas, R², residual std.
    """
    import statistics

    n = len(asset_returns)
    if n != len(market_returns):
        return json.dumps({"error": "asset_returns and market_returns must have equal length"})
    if n < 3:
        return json.dumps({"error": "need at least 3 observations"})

    rf = risk_free_rate / 12  # assume monthly if not specified

    # Excess returns
    y = [asset_returns[i] - rf for i in range(n)]
    x_mkt = [market_returns[i] - rf for i in range(n)]

    # Simple OLS for single or multi-factor
    # For simplicity, implement single-factor first, then extend
    use_ff3 = (smb_returns is not None and hml_returns is not None
               and len(smb_returns) == n and len(hml_returns) == n)

    if not use_ff3:
        # Single factor OLS: y = a + b*x
        mean_y = statistics.mean(y)
        mean_x = statistics.mean(x_mkt)
        ss_xy = sum((x_mkt[i] - mean_x) * (y[i] - mean_y) for i in range(n))
        ss_xx = sum((x_mkt[i] - mean_x) ** 2 for i in range(n))
        beta_mkt = ss_xy / ss_xx if ss_xx > 0 else 0
        alpha = mean_y - beta_mkt * mean_x

        # R²
        y_hat = [alpha + beta_mkt * x_mkt[i] for i in range(n)]
        ss_res = sum((y[i] - y_hat[i]) ** 2 for i in range(n))
        ss_tot = sum((y[i] - mean_y) ** 2 for i in range(n))
        r_sq = 1 - ss_res / ss_tot if ss_tot > 0 else 0
        resid_std = (ss_res / (n - 2)) ** 0.5 if n > 2 else 0

        return json.dumps({
            "model_type": "factor_model",
            "factors": 1,
            "alpha": round(alpha, 6),
            "beta_market": round(beta_mkt, 4),
            "r_squared": round(r_sq, 4),
            "residual_std": round(resid_std, 6),
            "observations": n,
        })
    else:
        # 3-factor: use normal equations (X'X)^-1 X'y
        # Build X matrix: [1, mkt, smb, hml]
        # Use simplified approach with loops
        k = 4  # intercept + 3 factors
        X = [[1, x_mkt[i], smb_returns[i], hml_returns[i]] for i in range(n)]

        # X'X
        XtX = [[sum(X[r][i] * X[r][j] for r in range(n)) for j in range(k)] for i in range(k)]
        # X'y
        Xty = [sum(X[r][i] * y[r] for r in range(n)) for i in range(k)]

        # Solve via Gaussian elimination (4x4 — trivial)
        # Augmented matrix
        aug = [XtX[i][:] + [Xty[i]] for i in range(k)]
        for col in range(k):
            # Pivot
            max_row = max(range(col, k), key=lambda r: abs(aug[r][col]))
            aug[col], aug[max_row] = aug[max_row], aug[col]
            if abs(aug[col][col]) < 1e-12:
                return json.dumps({"error": "singular matrix — factors are collinear"})
            for row in range(k):
                if row != col:
                    factor = aug[row][col] / aug[col][col]
                    for j in range(k + 1):
                        aug[row][j] -= factor * aug[col][j]
        coeffs = [aug[i][k] / aug[i][i] for i in range(k)]
        alpha, beta_mkt, beta_smb, beta_hml = coeffs

        y_hat = [sum(X[i][j] * coeffs[j] for j in range(k)) for i in range(n)]
        mean_y = statistics.mean(y)
        ss_res = sum((y[i] - y_hat[i]) ** 2 for i in range(n))
        ss_tot = sum((y[i] - mean_y) ** 2 for i in range(n))
        r_sq = 1 - ss_res / ss_tot if ss_tot > 0 else 0
        resid_std = (ss_res / (n - k)) ** 0.5 if n > k else 0

        return json.dumps({
            "model_type": "factor_model",
            "factors": 3,
            "alpha": round(alpha, 6),
            "beta_market": round(beta_mkt, 4),
            "beta_smb": round(beta_smb, 4),
            "beta_hml": round(beta_hml, 4),
            "r_squared": round(r_sq, 4),
            "residual_std": round(resid_std, 6),
            "observations": n,
        })
```

### Step 27: Run tests, verify pass

### Step 28: Write tests for `run_stress_test`

```python
class TestStressTest:
    def test_basic_shock(self):
        from rag.tools.financial_modeling import run_stress_test
        db = MagicMock()
        result = json.loads(run_stress_test(
            db,
            portfolio=[
                {"asset": "Equity", "weight": 0.6, "current_value": 600},
                {"asset": "Bond", "weight": 0.4, "current_value": 400},
            ],
            scenarios=[
                {"name": "Market Crash", "shocks": {"Equity": -0.30, "Bond": 0.05}},
                {"name": "Rate Hike", "shocks": {"Equity": -0.10, "Bond": -0.15}},
            ],
        ))
        assert result["model_type"] == "stress_test"
        assert len(result["scenario_results"]) == 2
        crash = result["scenario_results"][0]
        # Equity: 600*(-0.30)=-180, Bond: 400*(0.05)=+20, Net=-160
        assert crash["portfolio_pnl"] == pytest.approx(-160, abs=1)

    def test_no_shock_for_asset(self):
        from rag.tools.financial_modeling import run_stress_test
        db = MagicMock()
        result = json.loads(run_stress_test(
            db,
            portfolio=[
                {"asset": "Equity", "weight": 0.6, "current_value": 600},
                {"asset": "Bond", "weight": 0.4, "current_value": 400},
            ],
            scenarios=[
                {"name": "Equity Only", "shocks": {"Equity": -0.20}},
            ],
        ))
        # Bond not in shocks → 0% change
        pnl = result["scenario_results"][0]["portfolio_pnl"]
        assert pnl == pytest.approx(-120, abs=1)
```

### Step 29: Implement `run_stress_test`

```python
def run_stress_test(
    db: Session,
    portfolio: list,
    scenarios: list,
) -> str:
    """
    Apply user-defined stress scenarios to a portfolio.

    Each scenario specifies percentage shocks per asset.
    Assets not mentioned in a scenario are assumed unchanged (0% shock).
    """
    total_value = sum(p["current_value"] for p in portfolio)
    results = []

    for scenario in scenarios:
        name = scenario["name"]
        shocks = scenario.get("shocks", {})
        pnl = 0.0
        details = []
        for pos in portfolio:
            asset = pos["asset"]
            val = pos["current_value"]
            shock = shocks.get(asset, 0.0)
            asset_pnl = val * shock
            pnl += asset_pnl
            details.append({
                "asset": asset,
                "shock_pct": shock,
                "pnl": round(asset_pnl, 4),
            })

        results.append({
            "name": name,
            "portfolio_pnl": round(pnl, 4),
            "portfolio_pct_change": round(pnl / total_value, 4) if total_value else 0,
            "worst_asset": min(details, key=lambda d: d["pnl"])["asset"] if details else None,
            "best_asset": max(details, key=lambda d: d["pnl"])["asset"] if details else None,
            "details": details,
        })

    return json.dumps({
        "model_type": "stress_test",
        "portfolio_value": round(total_value, 4),
        "scenario_results": results,
    })
```

### Step 30: Run tests, verify pass

### Step 31: Add Phase 6 TOOL_DEFINITIONS and TOOL_DISPATCH

Append to `TOOL_DEFINITIONS`:
```python
TOOL_DEFINITIONS += [
    # ── Phase 6 (was Phase 7 internally): Portfolio & Risk ────────────
    {
        "type": "function",
        "function": {
            "name": "compute_portfolio_stats",
            "description": "Compute portfolio expected return, volatility, and diversification ratio from asset weights, returns, volatilities, and a correlation matrix.",
            "parameters": {
                "type": "object",
                "required": ["assets", "correlation_matrix"],
                "properties": {
                    "assets": {"type": "array", "description": "Asset list: [{name, weight, expected_return, volatility}]", "items": {"type": "object", "properties": {"name": {"type": "string"}, "weight": {"type": "number"}, "expected_return": {"type": "number"}, "volatility": {"type": "number"}}}},
                    "correlation_matrix": {"type": "array", "description": "NxN correlation matrix as nested arrays", "items": {"type": "array", "items": {"type": "number"}}},
                },
            },
        },
    },
    # ... (similar entries for all 10 tools — see design doc for params)
]
```

Append to `TOOL_DISPATCH`:
```python
# Phase 6 — Portfolio & Risk
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
```

### Step 32: Update test counts

In `TestToolDefinitions`:
```python
assert len(TOOL_DEFINITIONS) == 31   # was 21, added 10
assert len(TOOL_DISPATCH) == 31
```

### Step 33: Run full test suite, verify pass

```bash
pytest tests/unit/test_financial_modeling_tools.py -v --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" --tb=short
```

### Step 34: Commit Phase 6

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add phase 6 portfolio & risk analytics (10 tools)"
```

---

## Task 2: Phase 7 — Derivatives & Options (6 tools)

**Files:**
- Modify: `rag/tools/financial_modeling.py` (append 6 functions + 6 TOOL_DEFINITIONS + 6 TOOL_DISPATCH)
- Modify: `tests/unit/test_financial_modeling_tools.py` (add 6 test classes)

### Step 1: Write tests for `price_option_bsm`

```python
class TestBSM:
    def test_call_price(self):
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        # S=100, K=100, T=1, r=0.05, σ=0.20 → C ≈ 10.45
        result = json.loads(price_option_bsm(
            db, spot=100, strike=100, time_to_expiry=1.0,
            risk_free_rate=0.05, volatility=0.20, option_type="call",
        ))
        assert result["model_type"] == "bsm"
        assert result["price"] == pytest.approx(10.45, abs=0.5)

    def test_put_price(self):
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        result = json.loads(price_option_bsm(
            db, spot=100, strike=100, time_to_expiry=1.0,
            risk_free_rate=0.05, volatility=0.20, option_type="put",
        ))
        # Put-call parity: P = C - S + K*e^(-rT)
        assert result["price"] == pytest.approx(5.57, abs=0.5)

    def test_deep_itm_call(self):
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        result = json.loads(price_option_bsm(
            db, spot=200, strike=100, time_to_expiry=0.01,
            risk_free_rate=0.05, volatility=0.20, option_type="call",
        ))
        assert result["price"] == pytest.approx(100, abs=1)

    def test_zero_time(self):
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        result = json.loads(price_option_bsm(
            db, spot=100, strike=100, time_to_expiry=0.0,
            risk_free_rate=0.05, volatility=0.20, option_type="call",
        ))
        # At expiry, ATM call = 0
        assert result["price"] == pytest.approx(0, abs=0.01)
```

### Step 2: Implement `price_option_bsm`

```python
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
    """
    Black-Scholes-Merton option pricing for European calls and puts.

    d1 = [ln(S/K) + (r - q + σ²/2)T] / (σ√T)
    d2 = d1 - σ√T
    Call = S·e^(-qT)·N(d1) - K·e^(-rT)·N(d2)
    Put  = K·e^(-rT)·N(-d2) - S·e^(-qT)·N(-d1)
    """
    import math

    if time_to_expiry <= 0:
        # At expiry: intrinsic value
        if option_type == "call":
            price = max(0, spot - strike)
        else:
            price = max(0, strike - spot)
        return json.dumps({
            "model_type": "bsm", "option_type": option_type,
            "price": round(price, 4), "intrinsic_value": round(price, 4),
            "time_value": 0, "d1": None, "d2": None,
        })

    if volatility <= 0:
        return json.dumps({"error": "volatility must be positive"})

    S, K, T, r, q, sigma = spot, strike, time_to_expiry, risk_free_rate, dividend_yield, volatility

    d1 = (math.log(S / K) + (r - q + sigma ** 2 / 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    # CDF of standard normal (using math.erf)
    def N(x):
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))

    if option_type == "call":
        price = S * math.exp(-q * T) * N(d1) - K * math.exp(-r * T) * N(d2)
        intrinsic = max(0, S - K)
    else:
        price = K * math.exp(-r * T) * N(-d2) - S * math.exp(-q * T) * N(-d1)
        intrinsic = max(0, K - S)

    return json.dumps({
        "model_type": "bsm",
        "option_type": option_type,
        "price": round(price, 4),
        "d1": round(d1, 4),
        "d2": round(d2, 4),
        "intrinsic_value": round(intrinsic, 4),
        "time_value": round(price - intrinsic, 4),
        "inputs": {"spot": S, "strike": K, "time_to_expiry": T, "risk_free_rate": r, "volatility": sigma, "dividend_yield": q},
    })
```

### Step 3: Run tests, verify pass

### Step 4: Write tests for `price_option_binomial`

```python
class TestBinomial:
    def test_european_converges_to_bsm(self):
        from rag.tools.financial_modeling import price_option_binomial, price_option_bsm
        db = MagicMock()
        bsm = json.loads(price_option_bsm(db, spot=100, strike=100, time_to_expiry=1.0, risk_free_rate=0.05, volatility=0.20, option_type="call"))
        binom = json.loads(price_option_binomial(db, spot=100, strike=100, time_to_expiry=1.0, risk_free_rate=0.05, volatility=0.20, option_type="call", steps=200, exercise="european"))
        assert binom["price"] == pytest.approx(bsm["price"], abs=0.3)

    def test_american_put_geq_european(self):
        from rag.tools.financial_modeling import price_option_binomial
        db = MagicMock()
        eur = json.loads(price_option_binomial(db, spot=100, strike=110, time_to_expiry=1.0, risk_free_rate=0.05, volatility=0.30, option_type="put", steps=100, exercise="european"))
        amer = json.loads(price_option_binomial(db, spot=100, strike=110, time_to_expiry=1.0, risk_free_rate=0.05, volatility=0.30, option_type="put", steps=100, exercise="american"))
        assert amer["price"] >= eur["price"] - 0.01
```

### Step 5: Implement `price_option_binomial`

```python
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
    """
    Cox-Ross-Rubinstein binomial tree for European and American options.

    u = e^(σ√Δt), d = 1/u, p = (e^((r-q)Δt) - d) / (u - d)
    """
    import math

    dt = time_to_expiry / steps
    u = math.exp(volatility * math.sqrt(dt))
    d = 1.0 / u
    disc = math.exp(-risk_free_rate * dt)
    p = (math.exp((risk_free_rate - dividend_yield) * dt) - d) / (u - d)
    q = 1.0 - p

    # Build terminal payoffs
    payoffs = []
    for i in range(steps + 1):
        st = spot * (u ** (steps - i)) * (d ** i)
        if option_type == "call":
            payoffs.append(max(0, st - strike))
        else:
            payoffs.append(max(0, strike - st))

    # Backward induction
    for step in range(steps - 1, -1, -1):
        new_payoffs = []
        for i in range(step + 1):
            hold = disc * (p * payoffs[i] + q * payoffs[i + 1])
            if exercise == "american":
                st = spot * (u ** (step - i)) * (d ** i)
                if option_type == "call":
                    ex = max(0, st - strike)
                else:
                    ex = max(0, strike - st)
                hold = max(hold, ex)
            new_payoffs.append(hold)
        payoffs = new_payoffs

    price = payoffs[0]

    return json.dumps({
        "model_type": "binomial_tree",
        "option_type": option_type,
        "exercise": exercise,
        "price": round(price, 4),
        "steps": steps,
        "u": round(u, 4),
        "d": round(d, 4),
        "p": round(p, 4),
    })
```

### Step 6: Run tests, verify pass

### Step 7: Write tests for `compute_greeks`

```python
class TestGreeks:
    def test_atm_call_delta_near_half(self):
        from rag.tools.financial_modeling import compute_greeks
        db = MagicMock()
        result = json.loads(compute_greeks(
            db, spot=100, strike=100, time_to_expiry=1.0,
            risk_free_rate=0.05, volatility=0.20, option_type="call",
        ))
        assert result["model_type"] == "greeks"
        # ATM call delta ≈ 0.5–0.6
        assert 0.4 < result["delta"] < 0.7
        assert result["gamma"] > 0
        assert result["vega"] > 0
        assert result["theta"] < 0  # time decay

    def test_put_delta_negative(self):
        from rag.tools.financial_modeling import compute_greeks
        db = MagicMock()
        result = json.loads(compute_greeks(
            db, spot=100, strike=100, time_to_expiry=1.0,
            risk_free_rate=0.05, volatility=0.20, option_type="put",
        ))
        assert result["delta"] < 0
```

### Step 8: Implement `compute_greeks`

```python
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
    """
    Compute option Greeks using analytical BSM formulas.

    Delta: ∂V/∂S  |  Gamma: ∂²V/∂S²  |  Vega: ∂V/∂σ  |  Theta: ∂V/∂t  |  Rho: ∂V/∂r
    """
    import math

    if time_to_expiry <= 0 or volatility <= 0:
        return json.dumps({"error": "time_to_expiry and volatility must be positive"})

    S, K, T, r, q, sigma = spot, strike, time_to_expiry, risk_free_rate, dividend_yield, volatility
    sqrt_T = math.sqrt(T)

    d1 = (math.log(S / K) + (r - q + sigma ** 2 / 2) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T

    def N(x):
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))

    def n(x):
        return math.exp(-x ** 2 / 2) / math.sqrt(2 * math.pi)

    if option_type == "call":
        delta = math.exp(-q * T) * N(d1)
        theta = (-(S * n(d1) * sigma * math.exp(-q * T)) / (2 * sqrt_T)
                 - r * K * math.exp(-r * T) * N(d2)
                 + q * S * math.exp(-q * T) * N(d1))
        rho = K * T * math.exp(-r * T) * N(d2)
    else:
        delta = math.exp(-q * T) * (N(d1) - 1)
        theta = (-(S * n(d1) * sigma * math.exp(-q * T)) / (2 * sqrt_T)
                 + r * K * math.exp(-r * T) * N(-d2)
                 - q * S * math.exp(-q * T) * N(-d1))
        rho = -K * T * math.exp(-r * T) * N(-d2)

    gamma = math.exp(-q * T) * n(d1) / (S * sigma * sqrt_T)
    vega = S * math.exp(-q * T) * n(d1) * sqrt_T

    return json.dumps({
        "model_type": "greeks",
        "option_type": option_type,
        "delta": round(delta, 4),
        "gamma": round(gamma, 6),
        "vega": round(vega / 100, 4),  # per 1% vol change
        "theta": round(theta / 365, 4),  # per day
        "rho": round(rho / 100, 4),  # per 1% rate change
        "d1": round(d1, 4),
        "d2": round(d2, 4),
    })
```

### Step 9: Run tests, verify pass

### Step 10: Write tests for `compute_implied_volatility`

```python
class TestImpliedVol:
    def test_round_trip(self):
        from rag.tools.financial_modeling import price_option_bsm, compute_implied_volatility
        db = MagicMock()
        # Price with known vol=0.25, then recover it
        bsm = json.loads(price_option_bsm(db, spot=100, strike=100, time_to_expiry=1.0, risk_free_rate=0.05, volatility=0.25, option_type="call"))
        iv = json.loads(compute_implied_volatility(db, market_price=bsm["price"], spot=100, strike=100, time_to_expiry=1.0, risk_free_rate=0.05, option_type="call"))
        assert iv["implied_volatility"] == pytest.approx(0.25, abs=0.005)

    def test_convergence_status(self):
        from rag.tools.financial_modeling import compute_implied_volatility
        db = MagicMock()
        result = json.loads(compute_implied_volatility(db, market_price=10, spot=100, strike=100, time_to_expiry=1.0, risk_free_rate=0.05, option_type="call"))
        assert result["convergence"] == "converged"
```

### Step 11: Implement `compute_implied_volatility`

```python
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
    """
    Solve for implied volatility using Newton-Raphson on BSM.

    Uses vega as derivative: σ_{n+1} = σ_n - (BSM(σ_n) - market_price) / vega(σ_n)
    Falls back to bisection if Newton fails.
    """
    import math

    def N(x):
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))

    def n(x):
        return math.exp(-x ** 2 / 2) / math.sqrt(2 * math.pi)

    def bsm_price(sigma):
        if sigma <= 0 or time_to_expiry <= 0:
            return 0
        S, K, T, r, q = spot, strike, time_to_expiry, risk_free_rate, dividend_yield
        d1 = (math.log(S / K) + (r - q + sigma ** 2 / 2) * T) / (sigma * math.sqrt(T))
        d2 = d1 - sigma * math.sqrt(T)
        if option_type == "call":
            return S * math.exp(-q * T) * N(d1) - K * math.exp(-r * T) * N(d2)
        else:
            return K * math.exp(-r * T) * N(-d2) - S * math.exp(-q * T) * N(-d1)

    def bsm_vega(sigma):
        if sigma <= 0 or time_to_expiry <= 0:
            return 0
        S, K, T, r, q = spot, strike, time_to_expiry, risk_free_rate, dividend_yield
        d1 = (math.log(S / K) + (r - q + sigma ** 2 / 2) * T) / (sigma * math.sqrt(T))
        return S * math.exp(-q * T) * n(d1) * math.sqrt(T)

    # Newton-Raphson
    sigma = 0.20  # initial guess
    for i in range(max_iterations):
        price = bsm_price(sigma)
        vega = bsm_vega(sigma)
        if vega < 1e-10:
            break
        diff = price - market_price
        if abs(diff) < tolerance:
            return json.dumps({
                "model_type": "implied_volatility",
                "implied_volatility": round(sigma, 6),
                "iterations": i + 1,
                "convergence": "converged",
            })
        sigma = sigma - diff / vega
        sigma = max(0.001, min(5.0, sigma))  # clamp

    # Bisection fallback
    lo, hi = 0.001, 5.0
    for i in range(100):
        mid = (lo + hi) / 2
        if bsm_price(mid) < market_price:
            lo = mid
        else:
            hi = mid
        if hi - lo < tolerance:
            return json.dumps({
                "model_type": "implied_volatility",
                "implied_volatility": round(mid, 6),
                "iterations": max_iterations + i + 1,
                "convergence": "converged",
            })

    return json.dumps({
        "model_type": "implied_volatility",
        "implied_volatility": round((lo + hi) / 2, 6),
        "iterations": max_iterations + 100,
        "convergence": "not_converged",
    })
```

### Step 12: Run tests, verify pass

### Step 13: Write tests for `check_put_call_parity`

```python
class TestPutCallParity:
    def test_parity_holds(self):
        from rag.tools.financial_modeling import check_put_call_parity
        import math
        db = MagicMock()
        S, K, r, T = 100, 100, 0.05, 1.0
        C, P = 10.45, 5.57  # approximate BSM values
        result = json.loads(check_put_call_parity(db, call_price=C, put_price=P, spot=S, strike=K, time_to_expiry=T, risk_free_rate=r))
        assert result["model_type"] == "put_call_parity"
        assert abs(result["deviation"]) < 1.0

    def test_arbitrage_detected(self):
        from rag.tools.financial_modeling import check_put_call_parity
        db = MagicMock()
        # Mispriced: C too high
        result = json.loads(check_put_call_parity(db, call_price=20, put_price=5, spot=100, strike=100, time_to_expiry=1.0, risk_free_rate=0.05))
        assert result["arbitrage_opportunity"] is True
```

### Step 14: Implement `check_put_call_parity`

```python
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
    """
    Check put-call parity: C - P = S·e^(-qT) - K·e^(-rT)

    Reports deviation and whether an arbitrage opportunity exists.
    """
    import math

    lhs = call_price - put_price
    rhs = spot * math.exp(-dividend_yield * time_to_expiry) - strike * math.exp(-risk_free_rate * time_to_expiry)
    deviation = lhs - rhs
    threshold = 0.50  # Allow $0.50 for transaction costs

    arb = abs(deviation) > threshold
    if arb:
        if deviation > 0:
            strategy = "Sell call, buy put, buy stock, borrow PV(K) — call overpriced"
        else:
            strategy = "Buy call, sell put, short stock, lend PV(K) — put overpriced"
    else:
        strategy = "No actionable arbitrage"

    return json.dumps({
        "model_type": "put_call_parity",
        "lhs_c_minus_p": round(lhs, 4),
        "rhs_s_minus_pvk": round(rhs, 4),
        "deviation": round(deviation, 4),
        "arbitrage_opportunity": arb,
        "strategy": strategy,
    })
```

### Step 15: Run tests, verify pass

### Step 16: Write tests for `build_option_strategy`

```python
class TestOptionStrategy:
    def test_long_straddle(self):
        from rag.tools.financial_modeling import build_option_strategy
        db = MagicMock()
        result = json.loads(build_option_strategy(
            db,
            legs=[
                {"type": "call", "position": "long", "strike": 100, "premium": 5},
                {"type": "put", "position": "long", "strike": 100, "premium": 4},
            ],
            underlying_price=100,
            spot_min=80, spot_max=120, spot_steps=5,
        ))
        assert result["model_type"] == "option_strategy"
        assert result["max_loss"] == pytest.approx(-9, abs=0.1)  # total premium paid
        assert len(result["breakevens"]) == 2

    def test_covered_call(self):
        from rag.tools.financial_modeling import build_option_strategy
        db = MagicMock()
        result = json.loads(build_option_strategy(
            db,
            legs=[
                {"type": "call", "position": "short", "strike": 110, "premium": 3},
                {"type": "stock", "position": "long", "strike": 0, "premium": 100},
            ],
            underlying_price=100,
            spot_min=80, spot_max=130, spot_steps=6,
        ))
        assert result["max_profit"] > 0
```

### Step 17: Implement `build_option_strategy`

```python
def build_option_strategy(
    db: Session,
    legs: list,
    underlying_price: float,
    spot_min: float = 0,
    spot_max: float = 0,
    spot_steps: int = 50,
) -> str:
    """
    Build an option strategy payoff diagram from individual legs.

    Each leg: {type: call|put|stock, position: long|short, strike, premium}
    Computes payoff and profit at expiry for a range of spot prices.
    """
    if spot_max <= spot_min:
        spot_min = underlying_price * 0.7
        spot_max = underlying_price * 1.3

    step_size = (spot_max - spot_min) / max(1, spot_steps - 1)
    spot_prices = [spot_min + i * step_size for i in range(spot_steps)]

    payoff_table = []
    for s in spot_prices:
        total_payoff = 0.0
        total_cost = 0.0
        for leg in legs:
            lt = leg["type"]
            pos = 1 if leg["position"] == "long" else -1
            k = leg.get("strike", 0)
            prem = leg.get("premium", 0)

            if lt == "call":
                payoff = pos * max(0, s - k)
                cost = pos * prem
            elif lt == "put":
                payoff = pos * max(0, k - s)
                cost = pos * prem
            elif lt == "stock":
                payoff = pos * (s - underlying_price)
                cost = 0  # already factored in
            else:
                continue
            total_payoff += payoff
            total_cost += cost

        profit = total_payoff - total_cost
        payoff_table.append({
            "spot": round(s, 2),
            "payoff": round(total_payoff, 4),
            "profit": round(profit, 4),
        })

    profits = [p["profit"] for p in payoff_table]
    max_profit = max(profits)
    max_loss = min(profits)

    # Find breakevens (where profit crosses zero)
    breakevens = []
    for i in range(len(payoff_table) - 1):
        p1 = payoff_table[i]["profit"]
        p2 = payoff_table[i + 1]["profit"]
        if p1 * p2 < 0:  # sign change
            # Linear interpolation
            s1 = payoff_table[i]["spot"]
            s2 = payoff_table[i + 1]["spot"]
            be = s1 + (s2 - s1) * abs(p1) / (abs(p1) + abs(p2))
            breakevens.append(round(be, 2))

    return json.dumps({
        "model_type": "option_strategy",
        "legs": legs,
        "underlying_price": underlying_price,
        "max_profit": round(max_profit, 4),
        "max_loss": round(max_loss, 4),
        "breakevens": breakevens,
        "payoff_table": payoff_table,
    })
```

### Step 18: Run tests, verify pass

### Step 19: Add Phase 7 TOOL_DEFINITIONS + TOOL_DISPATCH (same pattern as Step 31 of Task 1)

### Step 20: Update test counts to 37 (31 + 6)

### Step 21: Run full test suite, verify pass

### Step 22: Commit Phase 7

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add phase 7 derivatives & options (6 tools)"
```

---

## Task 3: Phase 8 — Iranian Market + Real Estate (7 tools)

**Files:**
- Modify: `rag/tools/financial_modeling.py` (append 7 functions + 7 TOOL_DEFINITIONS + 7 TOOL_DISPATCH)
- Modify: `tests/unit/test_financial_modeling_tools.py` (add 7 test classes)

### Step 1: Write tests for `compute_real_estate_noi`

```python
class TestRealEstateNOI:
    def test_basic_noi(self):
        from rag.tools.financial_modeling import compute_real_estate_noi
        db = MagicMock()
        result = json.loads(compute_real_estate_noi(
            db, gross_rental_income=120, vacancy_rate=0.05, operating_expenses=30,
        ))
        assert result["model_type"] == "real_estate_noi"
        # EGI = 120 * (1-0.05) = 114, NOI = 114 - 30 = 84
        assert result["noi"] == pytest.approx(84, abs=0.1)

    def test_cap_rate_from_value(self):
        from rag.tools.financial_modeling import compute_real_estate_noi
        db = MagicMock()
        result = json.loads(compute_real_estate_noi(
            db, gross_rental_income=120, vacancy_rate=0.05,
            operating_expenses=30, property_value=1000,
        ))
        # Cap rate = NOI / Value = 84 / 1000 = 8.4%
        assert result["cap_rate"] == pytest.approx(0.084, abs=0.01)

    def test_implied_value_from_cap_rate(self):
        from rag.tools.financial_modeling import compute_real_estate_noi
        db = MagicMock()
        result = json.loads(compute_real_estate_noi(
            db, gross_rental_income=120, vacancy_rate=0.05,
            operating_expenses=30, cap_rate=0.08,
        ))
        # Implied value = NOI / cap_rate = 84 / 0.08 = 1050
        assert result["implied_value"] == pytest.approx(1050, abs=1)
```

### Step 2: Implement `compute_real_estate_noi`

```python
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
    """
    Compute Net Operating Income (NOI) and related real estate metrics.

    NOI = (Gross Rental Income × (1 - Vacancy)) - Operating Expenses
    Cap Rate = NOI / Property Value   OR   Implied Value = NOI / Cap Rate
    DSCR = NOI / Debt Service
    Cash-on-Cash = (NOI - Debt Service) / Equity Invested
    GRM = Property Value / Gross Rental Income
    """
    egi = gross_rental_income * (1 - vacancy_rate)
    noi = egi - operating_expenses

    result = {
        "model_type": "real_estate_noi",
        "gross_rental_income": round(gross_rental_income, 4),
        "effective_gross_income": round(egi, 4),
        "operating_expenses": round(operating_expenses, 4),
        "noi": round(noi, 4),
    }

    if property_value and property_value > 0:
        result["cap_rate"] = round(noi / property_value, 4)
        result["grm"] = round(property_value / gross_rental_income, 2) if gross_rental_income > 0 else None
    elif cap_rate and cap_rate > 0:
        result["implied_value"] = round(noi / cap_rate, 4)
        result["cap_rate"] = cap_rate

    if debt_service and debt_service > 0:
        result["dscr"] = round(noi / debt_service, 4)
        cash_after_debt = noi - debt_service
        result["cash_after_debt_service"] = round(cash_after_debt, 4)
        if equity_invested and equity_invested > 0:
            result["cash_on_cash_return"] = round(cash_after_debt / equity_invested, 4)

    return json.dumps(result)
```

### Step 3: Run tests, verify pass

### Step 4: Write tests for `build_development_proforma`

```python
class TestDevelopmentProforma:
    def test_basic_proforma(self):
        from rag.tools.financial_modeling import build_development_proforma
        db = MagicMock()
        result = json.loads(build_development_proforma(
            db,
            land_cost=500, construction_cost_per_sqm=10,
            total_sqm=1000, sellable_pct=0.85,
            sale_price_per_sqm=20, construction_months=18,
            absorption_months=6, financing_rate=0.20, equity_pct=0.40,
        ))
        assert result["model_type"] == "development_proforma"
        assert result["total_development_cost"] > 0
        assert result["gross_profit"] > 0

    def test_breakeven_price(self):
        from rag.tools.financial_modeling import build_development_proforma
        db = MagicMock()
        result = json.loads(build_development_proforma(
            db,
            land_cost=500, construction_cost_per_sqm=10,
            total_sqm=1000, sellable_pct=0.85,
            sale_price_per_sqm=20, construction_months=18,
            absorption_months=6, financing_rate=0.20, equity_pct=0.40,
        ))
        assert result["breakeven_price_per_sqm"] > 0
        assert result["breakeven_price_per_sqm"] < 20  # Must be less than sale price for profit
```

### Step 5: Implement `build_development_proforma`

```python
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
    """
    Real estate development pro-forma.

    Total Cost = Land + Construction + Financing
    Revenue = Sellable Area × Sale Price
    Profit = Revenue - Total Cost
    IRR: simplified as (Equity Multiple)^(12/months) - 1
    """
    construction_cost = construction_cost_per_sqm * total_sqm
    hard_costs = land_cost + construction_cost

    # Financing: debt portion accrues interest during construction + absorption
    debt_amount = hard_costs * (1 - equity_pct)
    equity_amount = hard_costs * equity_pct
    total_months = construction_months + absorption_months
    monthly_rate = financing_rate / 12
    # Simple interest on average outstanding (draw schedule approximation)
    financing_cost = debt_amount * monthly_rate * total_months * 0.5  # avg 50% drawn

    total_cost = hard_costs + financing_cost
    sellable_area = total_sqm * sellable_pct
    revenue = sellable_area * sale_price_per_sqm
    gross_profit = revenue - total_cost
    margin = gross_profit / revenue if revenue > 0 else 0

    # Equity multiple and IRR
    equity_return = gross_profit + equity_amount  # total cash back to equity
    equity_multiple = equity_return / equity_amount if equity_amount > 0 else 0
    irr = (equity_multiple ** (12 / total_months) - 1) if equity_multiple > 0 and total_months > 0 else None

    # Breakeven
    breakeven_price = total_cost / sellable_area if sellable_area > 0 else 0

    return json.dumps({
        "model_type": "development_proforma",
        "land_cost": round(land_cost, 4),
        "construction_cost": round(construction_cost, 4),
        "financing_cost": round(financing_cost, 4),
        "total_development_cost": round(total_cost, 4),
        "sellable_area": round(sellable_area, 2),
        "revenue": round(revenue, 4),
        "gross_profit": round(gross_profit, 4),
        "margin": round(margin, 4),
        "equity_invested": round(equity_amount, 4),
        "equity_multiple": round(equity_multiple, 4),
        "developer_irr": round(irr, 4) if irr else None,
        "breakeven_price_per_sqm": round(breakeven_price, 4),
        "total_months": total_months,
    })
```

### Step 6: Run tests, verify pass

### Step 7: Write tests + implement `build_sukuk_model`

(Same TDD pattern — test first, then implement)

```python
class TestSukuk:
    def test_ijara_sukuk(self):
        from rag.tools.financial_modeling import build_sukuk_model
        db = MagicMock()
        result = json.loads(build_sukuk_model(
            db, face_value=1000, profit_rate=0.20, periods=5, sukuk_type="ijara",
        ))
        assert result["model_type"] == "sukuk"
        assert result["periodic_payment"] > 0

    def test_murabaha_sukuk(self):
        from rag.tools.financial_modeling import build_sukuk_model
        db = MagicMock()
        result = json.loads(build_sukuk_model(
            db, face_value=1000, profit_rate=0.18, periods=4, sukuk_type="murabaha",
        ))
        assert result["total_payments"] > 1000  # Includes profit

    def test_pricing_at_market_yield(self):
        from rag.tools.financial_modeling import build_sukuk_model
        db = MagicMock()
        result = json.loads(build_sukuk_model(
            db, face_value=1000, profit_rate=0.20, periods=5,
            sukuk_type="ijara", market_yield=0.22,
        ))
        assert result["price"] < 1000  # Discount when yield > coupon
```

### Step 8: Implement `build_sukuk_model`

```python
def build_sukuk_model(
    db: Session,
    face_value: float,
    profit_rate: float,
    periods: int,
    sukuk_type: str = "ijara",
    market_yield: Optional[float] = None,
) -> str:
    """
    Sukuk (Islamic bond) pricing and cash flow schedule.

    Types:
    - ijara: Periodic rental payments + face value at maturity (like conventional bond)
    - murabaha: Cost-plus amortization (profit embedded in payments)
    - musharaka: Declining balance with profit sharing

    If market_yield provided, compute present value (price).
    """
    valid_types = ("ijara", "murabaha", "musharaka")
    if sukuk_type not in valid_types:
        return json.dumps({"error": f"sukuk_type must be one of {valid_types}"})

    schedule = []

    if sukuk_type == "ijara":
        rental = face_value * profit_rate
        for t in range(1, periods + 1):
            cf = rental + (face_value if t == periods else 0)
            schedule.append({"period": t, "rental": round(rental, 4), "principal": round(face_value if t == periods else 0, 4), "cash_flow": round(cf, 4)})
        total_payments = rental * periods + face_value
        periodic_payment = rental

    elif sukuk_type == "murabaha":
        total_cost = face_value * (1 + profit_rate * periods / periods)  # Simple markup
        profit_amount = face_value * profit_rate
        total_price = face_value + profit_amount
        installment = total_price / periods
        remaining = total_price
        for t in range(1, periods + 1):
            remaining -= installment
            schedule.append({"period": t, "installment": round(installment, 4), "remaining": round(max(0, remaining), 4)})
        total_payments = total_price
        periodic_payment = installment

    else:  # musharaka
        # Declining balance: each period, investor sells back portion + receives profit share
        balance = face_value
        portion = face_value / periods
        for t in range(1, periods + 1):
            profit_share = balance * profit_rate
            balance -= portion
            cf = portion + profit_share
            schedule.append({"period": t, "buyback": round(portion, 4), "profit_share": round(profit_share, 4), "cash_flow": round(cf, 4), "remaining_balance": round(max(0, balance), 4)})
        total_payments = sum(s["cash_flow"] for s in schedule)
        periodic_payment = schedule[0]["cash_flow"] if schedule else 0

    # Price at market yield
    price = face_value  # par if no market yield
    if market_yield and market_yield > 0:
        price = sum(s["cash_flow"] / (1 + market_yield) ** s["period"] for s in schedule)

    # Duration (Macaulay)
    if market_yield and market_yield > 0 and price > 0:
        duration = sum(s["period"] * s["cash_flow"] / (1 + market_yield) ** s["period"] for s in schedule) / price
    else:
        duration = periods / 2  # rough estimate

    return json.dumps({
        "model_type": "sukuk",
        "sukuk_type": sukuk_type,
        "face_value": face_value,
        "profit_rate": profit_rate,
        "periods": periods,
        "periodic_payment": round(periodic_payment, 4),
        "total_payments": round(total_payments, 4),
        "price": round(price, 4),
        "duration": round(duration, 4),
        "schedule": schedule,
    })
```

### Step 9: Run tests, verify pass

### Step 10: Write tests + implement `build_murabaha_schedule`

```python
class TestMurabaha:
    def test_basic_schedule(self):
        from rag.tools.financial_modeling import build_murabaha_schedule
        db = MagicMock()
        result = json.loads(build_murabaha_schedule(
            db, cost_price=1000, markup_rate=0.20, installments=12,
        ))
        assert result["model_type"] == "murabaha_schedule"
        assert result["total_price"] == pytest.approx(1200, abs=1)
        assert result["installment_amount"] == pytest.approx(100, abs=1)
        assert len(result["schedule"]) == 12

    def test_with_grace_period(self):
        from rag.tools.financial_modeling import build_murabaha_schedule
        db = MagicMock()
        result = json.loads(build_murabaha_schedule(
            db, cost_price=1000, markup_rate=0.20, installments=12, grace_months=3,
        ))
        assert len(result["schedule"]) == 15  # 3 grace + 12 payment
        # Grace months: payment = 0
        assert result["schedule"][0]["payment"] == 0
```

### Step 11: Implement `build_murabaha_schedule` + tests for remaining 3 tools (ijara, inflation, tehran housing)

(Same TDD pattern for each — tests first, then minimal implementation)

### Step 12: Add Phase 8 TOOL_DEFINITIONS + TOOL_DISPATCH

### Step 13: Update test counts to 44 (37 + 7)

### Step 14: Run full test suite, verify pass

### Step 15: Commit Phase 8

```bash
git add rag/tools/financial_modeling.py tests/unit/test_financial_modeling_tools.py
git commit -m "feat(financial-modeling): add phase 8 Iranian market & real estate (7 tools)"
```

---

## Task 4: Agent & Router & Frontend Integration

**Files:**
- Modify: `rag/agents/financial_modeling.py` (system prompt, tool count comment)
- Modify: `rag/agents/router.py` (add keywords)
- Modify: `frontend/src/features/financial-modeling/components/ModelChatArea.jsx` (FM_TOOL_TO_TYPE)

### Step 1: Update agent system prompt

Add new tool sections to `SYSTEM_PROMPT`:

```python
**Portfolio & Risk Analytics:**
22. `compute_portfolio_stats`     — Portfolio return, volatility, diversification
23. `compute_risk_metrics`        — Sharpe, Sortino, Treynor, Max DD, Calmar
24. `compute_var`                 — Value-at-Risk (parametric, historical, MC)
25. `compute_cvar`                — Expected Shortfall (CVaR)
26. `run_monte_carlo`             — GBM simulation with percentile paths
27. `optimize_portfolio`          — Markowitz: min-var, max-Sharpe, target-return
28. `compute_efficient_frontier`  — Efficient frontier with tangent portfolio
29. `compute_risk_parity`         — Equal risk contribution weights
30. `compute_factor_model`        — CAPM or Fama-French 3-factor regression
31. `run_stress_test`             — Scenario-based portfolio P&L impact

**Derivatives & Options:**
32. `price_option_bsm`           — Black-Scholes European call/put
33. `price_option_binomial`      — CRR binomial (European + American)
34. `compute_greeks`             — Delta, Gamma, Vega, Theta, Rho
35. `compute_implied_volatility` — Newton-Raphson IV solver
36. `check_put_call_parity`      — Parity check + arbitrage detection
37. `build_option_strategy`      — Multi-leg payoff: straddle, spread, etc.

**Real Estate & Islamic Finance:**
38. `compute_real_estate_noi`             — NOI, cap rate, DSCR
39. `build_development_proforma`          — RE development IRR, equity multiple
40. `build_sukuk_model`                   — Sukuk pricing (Ijara, Murabaha, Musharaka)
41. `build_murabaha_schedule`             — Islamic cost-plus amortization
42. `build_ijara_model`                   — Islamic lease-to-own
43. `compute_inflation_adjusted_valuation`— Real vs nominal, CPI-deflated metrics
44. `build_tehran_housing_model`          — Tehran housing: yield, mortgage, buy vs rent
```

Add new workflow chains:
```
### Portfolio Analysis (6 calls)
`compute_portfolio_stats` → `compute_risk_metrics` → `compute_var` → `compute_cvar` → `run_monte_carlo` → `run_stress_test`

### Options Analysis (4 calls)
`compute_implied_volatility` → `price_option_bsm` → `compute_greeks` → `build_option_strategy`

### Islamic Finance (3 calls)
`web_search` → `build_sukuk_model` → `build_murabaha_schedule`

### Tehran Real Estate (4 calls)
`web_search` → `build_development_proforma` → `compute_real_estate_noi` → `build_tehran_housing_model`
```

### Step 2: Update `max_tool_rounds` to 12

### Step 3: Update router keywords

Add to `router.py` intent keywords (both EN and FA):
- "monte carlo", "portfolio optimization", "var ", "value at risk", "sharpe ratio", "efficient frontier", "risk parity"
- "black scholes", "option pricing", "greeks", "implied volatility", "put call parity", "option strategy"
- "sukuk", "murabaha", "ijara", "islamic finance", "صکوک", "مرابحه", "اجاره به شرط تملیک"
- "real estate noi", "cap rate", "development proforma", "tehran housing", "مسکن تهران"
- "مونت‌کارلو", "بهینه‌سازی پرتفوی", "ارزش در معرض خطر", "نسبت شارپ", "بلک شولز", "تورم‌زدایی"

### Step 4: Update frontend `FM_TOOL_TO_TYPE`

```javascript
// Phase 6
compute_portfolio_stats: 'portfolio_stats',
compute_risk_metrics: 'risk_metrics',
compute_var: 'var',
compute_cvar: 'cvar',
run_monte_carlo: 'monte_carlo',
optimize_portfolio: 'portfolio_optimization',
compute_efficient_frontier: 'efficient_frontier',
compute_risk_parity: 'risk_parity',
compute_factor_model: 'factor_model',
run_stress_test: 'stress_test',
// Phase 7
price_option_bsm: 'option_bsm',
price_option_binomial: 'option_binomial',
compute_greeks: 'greeks',
compute_implied_volatility: 'implied_vol',
check_put_call_parity: 'put_call_parity',
build_option_strategy: 'option_strategy',
// Phase 8
compute_real_estate_noi: 'real_estate_noi',
build_development_proforma: 'development_proforma',
build_sukuk_model: 'sukuk',
build_murabaha_schedule: 'murabaha',
build_ijara_model: 'ijara',
compute_inflation_adjusted_valuation: 'inflation_adjusted',
build_tehran_housing_model: 'tehran_housing',
```

### Step 5: Run full test suite

### Step 6: Commit integration

```bash
git add rag/agents/financial_modeling.py rag/agents/router.py \
  frontend/src/features/financial-modeling/components/ModelChatArea.jsx
git commit -m "feat(financial-modeling): integrate phases 6-8 into agent, router, and frontend"
```

---

## Execution Summary

| Task | Tools | Lines of code (est.) | Commit |
|------|-------|---------------------|--------|
| 1: Phase 6 | 10 portfolio/risk | ~600 impl + ~300 test | `feat(financial-modeling): add phase 6 portfolio & risk analytics (10 tools)` |
| 2: Phase 7 | 6 options/derivatives | ~400 impl + ~200 test | `feat(financial-modeling): add phase 7 derivatives & options (6 tools)` |
| 3: Phase 8 | 7 Iranian/RE | ~400 impl + ~200 test | `feat(financial-modeling): add phase 8 Iranian market & real estate (7 tools)` |
| 4: Integration | Agent + Router + FE | ~100 lines | `feat(financial-modeling): integrate phases 6-8 into agent, router, and frontend` |
