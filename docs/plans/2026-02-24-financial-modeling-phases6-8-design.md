# Financial Modeling Phases 6–8 Design

**Date**: 2026-02-24
**Scope**: 23 new tools across 3 phases
**Dependencies**: Phases 1–5 complete (29 tools + web_search)

---

## Phase 6: Full Quant Suite — Portfolio & Risk Analytics (10 tools)

### 1. `compute_portfolio_stats`
- **Inputs**: `assets[]` {name, weight, expected_return, volatility}, `correlation_matrix[][]`
- **Outputs**: portfolio_return, portfolio_volatility, diversification_ratio
- **Formula**: E(Rp) = Σ wᵢ×E(Rᵢ), σp = √(w'Σw)

### 2. `compute_risk_metrics`
- **Inputs**: `returns[]`, `risk_free_rate`, `benchmark_returns[]` (opt)
- **Outputs**: sharpe_ratio, sortino_ratio, treynor_ratio, information_ratio, max_drawdown, calmar_ratio
- **Formulas**: Sharpe = (Rp−Rf)/σp, Sortino = (Rp−Rf)/σ_down, Treynor = (Rp−Rf)/β

### 3. `compute_var`
- **Inputs**: `portfolio_value`, `returns[]` or (`expected_return`, `volatility`), `confidence_level` (0.95/0.99), `method` (parametric/historical/monte_carlo), `horizon_days`
- **Outputs**: var_amount, var_pct, method_used
- **Parametric**: VaR = −μ + z_α × σ × √t
- **Historical**: percentile of sorted returns
- **Monte Carlo**: simulate N paths, take percentile

### 4. `compute_cvar`
- **Inputs**: same as VaR
- **Outputs**: cvar_amount, cvar_pct (expected shortfall = mean of losses beyond VaR)

### 5. `run_monte_carlo`
- **Inputs**: `initial_value`, `expected_return`, `volatility`, `horizon_years`, `num_simulations` (default 10000), `num_steps` (default 252), `seed` (opt)
- **Model**: GBM: S(t+dt) = S(t) × exp((μ − σ²/2)dt + σ√dt × Z)
- **Outputs**: percentile_paths (5th, 25th, 50th, 75th, 95th), terminal_stats, probability_of_loss

### 6. `optimize_portfolio`
- **Inputs**: `assets[]` {name, expected_return, volatility}, `correlation_matrix[][]`, `risk_free_rate`, `objective` (min_variance/max_sharpe/target_return), `target_return` (opt), `constraints` {min_weight, max_weight}
- **Method**: Analytical (2-asset) or iterative optimization (N-asset)
- **Outputs**: optimal_weights[], portfolio_return, portfolio_volatility, sharpe_ratio

### 7. `compute_efficient_frontier`
- **Inputs**: same as optimize + `num_points` (default 50)
- **Outputs**: frontier_points[] {return, volatility, weights}, tangent_portfolio, min_variance_portfolio

### 8. `compute_risk_parity`
- **Inputs**: `assets[]` {name, volatility}, `correlation_matrix[][]`
- **Method**: Equal Risk Contribution — iterate until each asset contributes equally
- **Outputs**: weights[], risk_contributions[], total_volatility

### 9. `compute_factor_model`
- **Inputs**: `asset_returns[]`, `market_returns[]`, `smb_returns[]` (opt), `hml_returns[]` (opt), `risk_free_rate`
- **Method**: OLS regression: Rᵢ − Rf = α + β₁(Rm−Rf) + β₂SMB + β₃HML + ε
- **Outputs**: alpha, beta_market, beta_smb, beta_hml, r_squared, residual_std

### 10. `run_stress_test`
- **Inputs**: `portfolio[]` {asset, weight, current_value}, `scenarios[]` {name, shocks: {asset: pct_change}}
- **Outputs**: scenario_results[] {name, portfolio_pnl, portfolio_pct_change, worst_asset, best_asset}

---

## Phase 7: Derivatives & Options (6 tools)

### 1. `price_option_bsm`
- **Inputs**: `spot`, `strike`, `time_to_expiry` (years), `risk_free_rate`, `volatility`, `option_type` (call/put), `dividend_yield` (opt)
- **Formulas**: d1 = [ln(S/K) + (r−q+σ²/2)T] / (σ√T), d2 = d1 − σ√T
- **Call**: C = Se^(−qT)N(d1) − Ke^(−rT)N(d2)
- **Put**: P = Ke^(−rT)N(−d2) − Se^(−qT)N(−d1)
- **Outputs**: price, d1, d2, intrinsic_value, time_value

### 2. `price_option_binomial`
- **Inputs**: same as BSM + `steps` (default 100), `exercise` (european/american)
- **Method**: CRR: u = e^(σ√Δt), d = 1/u, p = (e^((r−q)Δt) − d) / (u − d)
- **Outputs**: price, early_exercise_premium, tree_summary

### 3. `compute_greeks`
- **Inputs**: same as BSM
- **Outputs**: delta, gamma, vega, theta, rho
- **Formulas**: Δ = N(d1), Γ = n(d1)/(Sσ√T), V = Sn(d1)√T

### 4. `compute_implied_volatility`
- **Inputs**: `market_price`, `spot`, `strike`, `time_to_expiry`, `risk_free_rate`, `option_type`, `dividend_yield` (opt)
- **Method**: Newton-Raphson (vega-based) with bisection fallback
- **Outputs**: implied_volatility, iterations, convergence_status

### 5. `check_put_call_parity`
- **Inputs**: `call_price`, `put_price`, `spot`, `strike`, `time_to_expiry`, `risk_free_rate`, `dividend_yield` (opt)
- **Formula**: C − P = Se^(−qT) − Ke^(−rT)
- **Outputs**: parity_lhs, parity_rhs, deviation, arbitrage_opportunity, strategy

### 6. `build_option_strategy`
- **Inputs**: `legs[]` {type, position, strike, premium}, `spot_range` {min, max, steps}, `underlying_price`
- **Pre-built templates**: straddle, strangle, bull_spread, bear_spread, collar, butterfly, iron_condor
- **Outputs**: payoff_table[], max_profit, max_loss, breakevens[]

---

## Phase 8: Iranian Market + Real Estate (7 tools)

### 1. `compute_real_estate_noi`
- **Inputs**: `gross_rental_income`, `vacancy_rate`, `operating_expenses`, `property_value` (opt), `cap_rate` (opt), `debt_service` (opt)
- **Outputs**: noi, cap_rate or implied_value, dscr, cash_on_cash_return, gross_rent_multiplier

### 2. `build_development_proforma`
- **Inputs**: `land_cost`, `construction_cost_per_sqm`, `total_sqm`, `sellable_pct`, `sale_price_per_sqm`, `construction_months`, `absorption_months`, `financing_rate`, `equity_pct`
- **Outputs**: total_development_cost, gross_profit, developer_irr, equity_multiple, breakeven_price_per_sqm

### 3. `build_sukuk_model`
- **Inputs**: `face_value`, `profit_rate`, `periods`, `sukuk_type` (ijara/murabaha/musharaka), `market_yield` (opt)
- **Outputs**: price, yield, periodic_payments[], duration

### 4. `build_murabaha_schedule`
- **Inputs**: `cost_price`, `markup_rate`, `installments`, `grace_months` (opt)
- **Formula**: Total = Cost × (1 + markup), Payment = Total / installments
- **Outputs**: total_price, profit_amount, installment_amount, schedule[]

### 5. `build_ijara_model`
- **Inputs**: `asset_value`, `lease_term_months`, `monthly_rent`, `transfer_price`, `maintenance_pct` (opt)
- **Outputs**: total_rental_income, net_yield, effective_annual_rate, schedule[]

### 6. `compute_inflation_adjusted_valuation`
- **Inputs**: `nominal_values[]` {year, value}, `cpi_values[]` or `inflation_rates[]`, `base_year`, `metric_name` (opt)
- **Outputs**: real_values[], nominal_cagr, real_cagr, inflation_impact_pct

### 7. `build_tehran_housing_model`
- **Inputs**: `area_sqm`, `price_per_sqm`, `monthly_rent_per_sqm`, `mortgage_amount` (opt), `mortgage_rate` (opt), `mortgage_term_months` (opt), `annual_appreciation_pct`, `maintenance_cost_pct`, `vacancy_months_per_year` (opt)
- **Outputs**: property_value, annual_rental_income, gross_yield, net_yield, mortgage_payment, buy_vs_rent_breakeven_years, 5yr_total_return

---

## Architecture Decisions

1. **No new dependencies** — stdlib `math`, `statistics`, `random` only. Portfolio optimization uses iterative approach (no scipy).
2. **Same file** — append to `rag/tools/financial_modeling.py`, extend `TOOL_DEFINITIONS` and `TOOL_DISPATCH`.
3. **Agent prompt** — update `rag/agents/financial_modeling.py` system prompt with new tools and workflow chains.
4. **Router keywords** — add portfolio, options, derivatives, Islamic finance, real estate keywords (EN + FA).
5. **Frontend** — extend `FM_TOOL_TO_TYPE` in `ModelChatArea.jsx`.
6. **No Excel export** for Phase 6–7 (pure numeric). Phase 8 RE/housing tools may get Excel.
7. **max_tool_rounds**: bump to 12 (portfolio optimization chains can be long).

## New Workflow Chains

### Full Portfolio Analysis (Phase 6)
```
compute_portfolio_stats → compute_risk_metrics → compute_var → compute_cvar → run_monte_carlo
```

### Portfolio Construction (Phase 6)
```
compute_factor_model → optimize_portfolio → compute_efficient_frontier → run_stress_test
```

### Options Pricing (Phase 7)
```
compute_implied_volatility → price_option_bsm → compute_greeks → build_option_strategy
```

### Islamic Finance (Phase 8)
```
web_search → build_sukuk_model → build_murabaha_schedule → compute_inflation_adjusted_valuation
```

### Tehran Real Estate (Phase 8)
```
web_search → build_development_proforma → compute_real_estate_noi → build_tehran_housing_model
```

## Router Keywords to Add

**English**: monte carlo, portfolio optimization, var value at risk, sharpe ratio, efficient frontier, risk parity, black scholes, option pricing, greeks, implied volatility, put call parity, sukuk, murabaha, ijara, islamic finance, real estate noi, cap rate, development proforma, tehran housing, inflation adjusted

**Persian**: مونت‌کارلو، بهینه‌سازی پرتفوی، ارزش در معرض خطر، نسبت شارپ، مرز کارا، ریسک پریتی، بلک شولز، قیمت‌گذاری اختیار، یونانی‌ها، نوسان ضمنی، صکوک، مرابحه، اجاره، مالی اسلامی، املاک، نرخ سقف، پروفرما توسعه، مسکن تهران، تورم‌زدایی
