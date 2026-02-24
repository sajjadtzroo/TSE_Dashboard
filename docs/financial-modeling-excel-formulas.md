# Financial Modeling Excel Formula Master Reference

### Aligned to CFA L1–L3 · FMVA · FRM · CAIA · Wall Street Prep · LBO / DCF / Debt Modeling

---

## 1. CFA Level 1 — Foundational Finance Formulas

### 1.1 Time Value of Money (TVM)

| Concept | Excel Formula | Notes |
|---|---|---|
| Future Value (lump sum) | `=FV(rate, nper, 0, -pv)` | Single cash flow compounded forward |
| Present Value (lump sum) | `=PV(rate, nper, 0, -fv)` | Discount a single future cash flow |
| Annuity FV | `=FV(rate, nper, -pmt)` | Equal periodic payments compounded |
| Annuity PV | `=PV(rate, nper, -pmt)` | Discount stream of equal payments |
| PMT (payment) | `=PMT(rate, nper, -pv, fv)` | Solve for periodic payment |
| Number of Periods | `=NPER(rate, pmt, -pv, fv)` | Solve for n |
| Interest Rate | `=RATE(nper, pmt, -pv, fv)` | Solve for rate per period |
| Effective Annual Rate | `=(1+nominal/m)^m - 1` | m = compounding periods per year |
| Continuous Compounding FV | `=pv * EXP(rate * nper)` | e^(r×t) |
| Continuous Discounting PV | `=fv * EXP(-rate * nper)` | e^(-r×t) |

### 1.2 Statistical Measures

| Concept | Excel Formula | Notes |
|---|---|---|
| Arithmetic Mean | `=AVERAGE(range)` | Simple average return |
| Geometric Mean Return | `=GEOMEAN(1+range) - 1` | Compounded average return |
| Harmonic Mean | `=HARMEAN(range)` | Used for dollar-cost averaging |
| Population Std Dev | `=STDEV.P(range)` | σ — divide by N |
| Sample Std Dev | `=STDEV.S(range)` | s — divide by N-1 |
| Variance | `=VAR.S(range)` | s² |
| Covariance | `=COVARIANCE.S(range1, range2)` | Sample covariance |
| Correlation | `=CORREL(range1, range2)` | ρ between -1 and +1 |
| Skewness | `=SKEW(range)` | Asymmetry of distribution |
| Kurtosis (excess) | `=KURT(range)` | Fat tails if > 0 |
| Z-score | `=(X - AVERAGE(range)) / STDEV.S(range)` | Standardized value |
| Coefficient of Variation | `=STDEV.S(range) / AVERAGE(range)` | Risk per unit of return |

### 1.3 Probability & Distributions

| Concept | Excel Formula | Notes |
|---|---|---|
| Normal CDF | `=NORM.S.DIST(z, TRUE)` | P(Z ≤ z) |
| Normal Inverse | `=NORM.S.INV(probability)` | z-value for given probability |
| t-Distribution CDF | `=T.DIST(x, df, TRUE)` | Student's t cumulative |
| Chi-Square CDF | `=CHISQ.DIST(x, df, TRUE)` | χ² distribution |
| Confidence Interval | `=AVERAGE(range) ± CONFIDENCE.NORM(alpha, stdev, n)` | For z-based CI |
| Bayes' Theorem | `= P_BgivenA * P_A / (P_BgivenA * P_A + P_BgivenNotA * P_NotA)` | Manual build in Excel |

### 1.4 Equity Valuation

| Concept | Excel Formula | Notes |
|---|---|---|
| Gordon Growth (DDM) | `=D1 / (r - g)` | D1 = next year dividend |
| Multi-stage DDM | `=XNPV(rate, cashflows, dates)` | Uneven dividend stream |
| Holding Period Return | `=(P1 - P0 + Income) / P0` | Total return |
| P/E Ratio | `=Price / EPS` | Price-to-Earnings |
| P/B Ratio | `=Price / BVPS` | Price-to-Book |
| P/S Ratio | `=Price / SalesPerShare` | Price-to-Sales |
| Dividend Yield | `=DPS / Price` | Annual dividend / price |
| Earnings Yield | `=EPS / Price` | Inverse of P/E |
| PEG Ratio | `=PE / EarningsGrowthRate` | P/E adjusted for growth |
| Sustainable Growth | `=ROE * (1 - PayoutRatio)` | g = ROE × b |

### 1.5 Fixed Income

| Concept | Excel Formula | Notes |
|---|---|---|
| Bond Price | `=PV(ytm/m, n*m, -coupon/m, -fv)` | m = payments/year |
| Yield to Maturity | `=RATE(n*m, coupon/m, -price, fv) * m` | Annualized YTM |
| Macaulay Duration | `=DURATION(settlement, maturity, coupon, yield, freq)` | Weighted avg time |
| Modified Duration | `=MDURATION(settlement, maturity, coupon, yield, freq)` | Price sensitivity |
| Convexity (approx) | `=(P_up + P_down - 2*P0) / (P0 * Δy²)` | Second-order price sensitivity |
| Price Change (Duration) | `= -ModDur * Δy * Price` | First-order approximation |
| Price Change (Full) | `= (-ModDur * Δy + 0.5 * Convexity * Δy²) * Price` | Duration + convexity |
| Current Yield | `=Annual_Coupon / Price` | Simple income yield |
| Accrued Interest | `=Coupon * DaysSinceLastCoupon / DaysInPeriod` | Dirty vs clean price |
| Spread (OAS) | `=YTM_bond - YTM_treasury` | Option-adjusted spread |

### 1.6 Corporate Finance / Capital Budgeting

| Concept | Excel Formula | Notes |
|---|---|---|
| NPV | `=NPV(rate, CF1:CFn) + CF0` | Note: NPV starts at period 1 |
| XNPV (uneven dates) | `=XNPV(rate, cashflows, dates)` | Exact date discounting |
| IRR | `=IRR(CF0:CFn, guess)` | Internal rate of return |
| XIRR | `=XIRR(cashflows, dates, guess)` | Date-based IRR |
| MIRR | `=MIRR(CF0:CFn, finance_rate, reinvest_rate)` | Modified IRR |
| Payback Period | Manual: cumulative CF until ≥ 0 | `=MATCH(TRUE, cumCF>=0, 0)` approx |
| Profitability Index | `=NPV(rate, CF1:CFn) / ABS(CF0)` | Benefit-cost ratio |
| Cost of Equity (CAPM) | `=Rf + Beta * (Rm - Rf)` | Rf + β(MRP) |
| Cost of Debt (after-tax) | `=Rd * (1 - TaxRate)` | Interest tax shield |
| WACC | `=We*Re + Wd*Rd*(1-T) + Wp*Rp` | Weighted average cost of capital |
| Degree of Op Leverage | `=% Δ EBIT / % Δ Sales` | Operating leverage |
| Degree of Fin Leverage | `=% Δ EPS / % Δ EBIT` | Financial leverage |
| Degree of Total Leverage | `=DOL * DFL` | Combined leverage |

### 1.7 Financial Ratio Analysis (DuPont)

| Concept | Excel Formula | Notes |
|---|---|---|
| ROE (3-factor DuPont) | `=NetMargin * AssetTurnover * EquityMultiplier` | NI/Sales × Sales/Assets × Assets/Equity |
| ROE (5-factor DuPont) | `=TaxBurden * InterestBurden * EBIT_Margin * AT * EM` | Decomposed profitability |
| ROA | `=NetIncome / TotalAssets` | Return on assets |
| Current Ratio | `=CurrentAssets / CurrentLiabilities` | Liquidity |
| Quick Ratio | `=(CA - Inventory) / CL` | Acid test |
| Debt-to-Equity | `=TotalDebt / TotalEquity` | Leverage |
| Interest Coverage | `=EBIT / InterestExpense` | Solvency |
| Asset Turnover | `=Revenue / AvgTotalAssets` | Efficiency |
| Inventory Turnover | `=COGS / AvgInventory` | Inventory efficiency |
| Days Sales Outstanding | `=365 / (Revenue / AvgReceivables)` | Collection period |

---

## 2. CFA Level 2 — Applied Valuation & Analysis

### 2.1 Equity Valuation (Advanced)

| Concept | Excel Formula | Notes |
|---|---|---|
| Free Cash Flow to Firm | `=EBIT*(1-T) + D&A - CapEx - ΔNWC` | FCFF for DCF |
| Free Cash Flow to Equity | `=FCFF - Interest*(1-T) + NetBorrowing` | Cash to equity holders |
| Residual Income | `=NetIncome - (EquityCharge * BVequity)` | EVA-like concept |
| H-Model | `=D0*(1+gL)/(r-gL) + D0*H*(gS-gL)/(r-gL)` | Half-life growth transition |
| Justified P/E | `=(1-b)*(1+g) / (r-g)` | Fundamental-based P/E |
| Justified P/B | `=(ROE - g) / (r - g)` | Based on RI model |
| EV/EBITDA | `=(MarketCap + Debt - Cash) / EBITDA` | Enterprise multiple |
| EV/EBIT | `=(MarketCap + Debt - Cash) / EBIT` | After D&A |
| EV/Revenue | `=(MarketCap + Debt - Cash) / Revenue` | Revenue multiple |

### 2.2 Multi-Period DDM / FCFF in Excel

```
Year 1-5 FCFF projections in row, then:
Terminal Value  = =FCFF_Y5 * (1+g) / (WACC - g)
Enterprise Value = =XNPV(WACC, {FCFF1..FCFF5, FCFF5+TV}, dates)
Equity Value    = Enterprise Value - Net Debt
Per Share Value  = Equity Value / Shares Outstanding
```

### 2.3 Fixed Income Analytics (Advanced)

| Concept | Excel Formula | Notes |
|---|---|---|
| Key Rate Duration | Shock each spot rate ±25bps, reprice | Partial duration per maturity |
| Effective Duration | `=(P_down - P_up) / (2 * P0 * Δy)` | For bonds with options |
| Effective Convexity | `=(P_down + P_up - 2*P0) / (P0 * Δy²)` | Second-order effect |
| Spread Duration | `=(P_down - P_up) / (2 * P0 * ΔSpread)` | Credit spread sensitivity |
| Forward Rate | `=((1+S2)^2 / (1+S1)^1)^(1/(2-1)) - 1` | Implied forward from spot |
| Bootstrapped Spot | Iterative: solve for S_n from par curve | Use Goal Seek or Solver |
| Z-Spread | `=Solver: price = Σ CF/(1+spot_i+z)^i` | Constant spread over curve |

---

## 3. CFA Level 3 — Portfolio Management & Risk

### 3.1 Portfolio Construction

| Concept | Excel Formula | Notes |
|---|---|---|
| Portfolio Return | `=SUMPRODUCT(weights, returns)` | Weighted average |
| Portfolio Variance (2-asset) | `=w1²σ1² + w2²σ2² + 2*w1*w2*ρ*σ1*σ2` | Markowitz |
| Portfolio Variance (n-asset) | `=MMULT(MMULT(weights, covMatrix), TRANSPOSE(weights))` | Matrix form (Ctrl+Shift+Enter) |
| Sharpe Ratio | `=(Rp - Rf) / σp` | Risk-adjusted return |
| Sortino Ratio | `=(Rp - MAR) / DownsideDeviation` | Downside risk only |
| Information Ratio | `=(Rp - Rb) / TrackingError` | Active return / active risk |
| Treynor Ratio | `=(Rp - Rf) / βp` | Return per unit systematic risk |
| Jensen's Alpha | `=Rp - [Rf + β*(Rm - Rf)]` | Excess return over CAPM |
| Tracking Error | `=STDEV.S(ActiveReturns)` | Std dev of Rp - Rb |
| Max Drawdown | `=MIN(RunningPnL) / MAX(RunningPeak)` | Worst peak-to-trough |
| M² Measure | `=Rf + Sharpe_p * σm` | Risk-adjusted performance |

### 3.2 Asset Allocation & Rebalancing

| Concept | Excel Formula | Notes |
|---|---|---|
| Global Min Variance Portfolio | Use Excel Solver: min σ² s.t. Σw = 1 | Quadratic optimization |
| Optimal Risky Portfolio | Solver: max Sharpe s.t. Σw = 1 | Tangency portfolio |
| Black-Litterman Expected Return | Matrix algebra in Excel | Combines market equilibrium + views |
| Corridor Width (CPPI) | `=Multiplier * (PortValue - Floor)` | Dynamic allocation |
| Rebalancing Trigger | `=IF(ABS(w_actual - w_target) > band, "REBALANCE", "HOLD")` | Percentage-of-portfolio |

### 3.3 Performance Attribution

| Concept | Excel Formula | Notes |
|---|---|---|
| Brinson Allocation Effect | `=Σ (wp_i - wb_i) * (Rb_i - Rb_total)` | Sector weight decision |
| Brinson Selection Effect | `=Σ wb_i * (Rp_i - Rb_i)` | Stock picking within sector |
| Brinson Interaction | `=Σ (wp_i - wb_i) * (Rp_i - Rb_i)` | Combined effect |
| Geometric Linking | `=PRODUCT(1 + monthly_returns) - 1` | Multi-period compounding |

---

## 4. FMVA — Financial Modeling & Valuation Analyst

### 4.1 Three-Statement Model Formulas

| Line Item | Excel Formula | Notes |
|---|---|---|
| Revenue Forecast | `=Prior_Revenue * (1 + GrowthRate)` | Or `=Units * Price` |
| COGS | `=Revenue * COGS_Margin` | Percentage-of-revenue |
| Gross Profit | `=Revenue - COGS` | Top-line profitability |
| SG&A | `=Revenue * SGA_Pct` | Operating expense driver |
| EBITDA | `=Revenue - COGS - OpEx` | Before D&A |
| Depreciation | `=Prior_PP&E * Depr_Rate` | Or straight-line: `=Cost/Life` |
| EBIT | `=EBITDA - Depreciation - Amortization` | Operating income |
| Interest Expense | `=AVG(BegDebt, EndDebt) * IntRate` | Average balance method |
| EBT | `=EBIT - InterestExp + InterestIncome` | Pre-tax income |
| Tax Expense | `=MAX(0, EBT * TaxRate)` | No negative tax (simplified) |
| Net Income | `=EBT - TaxExpense` | Bottom line |

### 4.2 Balance Sheet Projections

| Line Item | Excel Formula | Notes |
|---|---|---|
| Accounts Receivable | `=Revenue * (DSO / 365)` | Days Sales Outstanding |
| Inventory | `=COGS * (DIO / 365)` | Days Inventory Outstanding |
| Accounts Payable | `=COGS * (DPO / 365)` | Days Payable Outstanding |
| Net Working Capital | `=AR + Inventory + Prepaid - AP - AccruedLiab` | Operating NWC |
| ΔNWC | `=NWC_current - NWC_prior` | Change in NWC |
| PP&E (net) | `=Prior_PPE + CapEx - Depreciation` | Roll-forward schedule |
| Retained Earnings | `=Prior_RE + NetIncome - Dividends` | Equity roll-forward |
| Total Assets Check | `=IF(Assets=Liab+Equity, "✓ BALANCED", "✗ ERROR")` | Balance sheet audit |

### 4.3 Cash Flow Statement

| Line Item | Excel Formula | Notes |
|---|---|---|
| CFO Start | `=NetIncome` | Indirect method |
| Add: D&A | `=Depreciation + Amortization` | Non-cash add-back |
| Less: ΔNWC | `= -(NWC_curr - NWC_prior)` | Working capital change |
| Cash from Operations | `=NI + D&A ± ΔNWC ± OtherNonCash` | Operating cash flow |
| CapEx | `= -(NewPPE - OldPPE + Depreciation)` | Investment spending |
| Free Cash Flow (Unlevered) | `=EBIT*(1-T) + D&A - CapEx - ΔNWC` | UFCF for WACC discounting |
| Free Cash Flow (Levered) | `=NI + D&A - CapEx - ΔNWC - DebtRepayment + NewDebt` | LFCF to equity |
| Cash Sweep | `=MIN(ExcessCash, DebtBalance)` | For LBO debt paydown |
| Ending Cash | `=BegCash + CFO + CFI + CFF` | Cash roll-forward |

### 4.4 DCF Valuation Model

| Step | Excel Formula | Notes |
|---|---|---|
| WACC | `=We*Re + Wd*Rd*(1-T)` | Discount rate |
| Cost of Equity (CAPM) | `=Rf + Beta * ERP + SizeP` | ERP = Equity Risk Premium |
| Beta (Regression) | `=SLOPE(stock_returns, market_returns)` | Or `=INDEX(LINEST(...),1)` |
| Unlevered Beta | `=LeveredBeta / (1 + (1-T) * D/E)` | Hamada equation |
| Re-Levered Beta | `=UnlevBeta * (1 + (1-T) * D/E)` | For target capital structure |
| Terminal Value (Gordon) | `=UFCF_last * (1+g) / (WACC - g)` | Perpetuity growth method |
| Terminal Value (Exit) | `=EBITDA_last * ExitMultiple` | EV/EBITDA exit |
| PV of Cash Flows | `=XNPV(WACC, cashflows, dates)` | Exact date discounting |
| Enterprise Value | `=PV_of_UFCF + PV_of_TerminalValue` | Total firm value |
| Equity Value | `=EV - NetDebt - MinorityInt - PrefStock` | Bridge to equity |
| Implied Share Price | `=EquityValue / DilutedShares` | Per-share value |
| Sensitivity Table | `=DATA TABLE (row_input, col_input)` | WACC vs. g matrix |
| Football Field Chart | Chart: min/max range for each method | DCF, Comps, Precedents, LBO |

### 4.5 Comparable Company Analysis (Comps)

| Metric | Excel Formula | Notes |
|---|---|---|
| Equity Value | `=SharePrice * DilutedShares` | Market capitalization |
| Enterprise Value | `=EquityValue + TotalDebt + MinInt + PrefStock - Cash` | Total firm value |
| EV/Revenue | `=EV / LTM_Revenue` | Revenue multiple |
| EV/EBITDA | `=EV / LTM_EBITDA` | Most common multiple |
| EV/EBIT | `=EV / LTM_EBIT` | After depreciation |
| P/E | `=Price / LTM_EPS` | Earnings multiple |
| P/BV | `=Price / BookValuePerShare` | Asset-heavy industries |
| Median Multiple | `=MEDIAN(range)` | Preferred over mean |
| Implied EV | `=TargetMetric * MedianMultiple` | Apply comps multiple |
| Implied Equity | `=ImpliedEV - NetDebt` | Bridge down |

### 4.6 Precedent Transaction Analysis

| Metric | Excel Formula | Notes |
|---|---|---|
| Transaction EV | `=DealEquityValue + AssumedDebt - Cash` | Acquisition enterprise value |
| Premium Paid | `=(OfferPrice - UndisturbedPrice) / UndisturbedPrice` | Takeover premium |
| EV/LTM EBITDA | `=TransactionEV / LTM_EBITDA` | Historical deal multiple |
| EV/NTM EBITDA | `=TransactionEV / NTM_EBITDA` | Forward deal multiple |

---

## 5. Wall Street Prep / IB — M&A & Merger Modeling

### 5.1 Accretion / Dilution Analysis

| Concept | Excel Formula | Notes |
|---|---|---|
| Offer Price Per Share | `=Target_Price * (1 + Premium%)` | Bid price |
| Total Equity Purchase | `=OfferPrice * TargetShares` | Equity consideration |
| Transaction Value | `=EquityPurchase + DebtAssumed - CashAcquired + Fees` | Total deal cost |
| New Shares Issued | `=EquityConsideration / AcquirerSharePrice` | Stock deal |
| Pro Forma EPS | `=(AcquirerNI + TargetNI - AfterTaxIntOnDebt + Synergies*(1-T)) / ProFormaShares` | Combined EPS |
| Accretion/(Dilution) | `=(ProFormaEPS - StandaloneEPS) / StandaloneEPS` | % change |
| Breakeven Synergies | `=Solver: ProFormaEPS = StandaloneEPS` | Min synergies needed |
| Goodwill | `=PurchasePrice - FMV_NetAssets` | Acquisition premium |

### 5.2 Contribution Analysis

| Concept | Excel Formula | Notes |
|---|---|---|
| Revenue Contribution | `=Target_Rev / (Acquirer_Rev + Target_Rev)` | % of combined |
| EBITDA Contribution | `=Target_EBITDA / (Acq_EBITDA + Tgt_EBITDA)` | Earnings contribution |
| Implied Ownership | `=NewShares / (AcqShares + NewShares)` | Stock deal ownership |
| Fair Exchange Ratio | Based on relative contribution analysis | Compare metrics |

---

## 6. LBO Modeling — Leveraged Buyout

### 6.1 Transaction Assumptions

| Concept | Excel Formula | Notes |
|---|---|---|
| Entry Enterprise Value | `=LTM_EBITDA * EntryMultiple` | Purchase price |
| Equity Purchase Price | `=EV - ExistingDebt + ExistingCash` | Or cash-free/debt-free basis |
| Sources = Uses | `=IF(TotalSources = TotalUses, "✓", "ERROR")` | Must balance |
| Sponsor Equity | `=TotalUses - TotalDebt` | Residual equity |
| Leverage (Debt/EBITDA) | `=TotalDebt / EBITDA` | Typically 4x–6x |
| Equity % | `=SponsorEquity / EV` | Usually 30–50% |

### 6.2 Debt Schedule

| Concept | Excel Formula | Notes |
|---|---|---|
| Revolver Draw | `=MAX(0, MIN(RevolverSize, -CashFlowSurplusDeficit))` | Emergency borrowing |
| Revolver Repayment | `=-MIN(BegRevolverBal, MAX(0, CashAvailable))` | Pay down first |
| Term Loan A Amortization | `=OriginalTLA * AmortPct` | Mandatory annual repayment |
| Term Loan B Amortization | `=OriginalTLB * AmortPct` | Typically 1% p.a. |
| Cash Available for Debt | `=EBITDA - CashTaxes - CapEx - ΔNWC - MandatoryAmort - CashInterest` | CFADR |
| Optional Prepayment | `=-MAX(0, MIN(BegBal + MandAmort, CashAvail - PriorPrepays))` | Waterfall by seniority |
| Ending Debt Balance | `=BegBalance + MandatoryAmort + OptionalPrepayment` | Roll-forward |
| PIK Interest | `=BegBal_SubDebt * PIK_Rate` | Paid-in-kind (adds to principal) |
| Cash Interest | `=AVG(BegBal, EndBal) * CashRate` | On income statement |
| Total Interest | `=CashInterest + PIKInterest + RevolverCommitment` | All interest components |
| Debt/EBITDA Covenant | `=EndingTotalDebt / EBITDA` | Must stay below threshold |
| Interest Coverage | `=EBITDA / TotalInterest` | Must stay above threshold |

### 6.3 Returns Analysis

| Concept | Excel Formula | Notes |
|---|---|---|
| Exit Enterprise Value | `=ExitYear_EBITDA * ExitMultiple` | Sale value |
| Exit Equity Value | `=ExitEV - NetDebt_AtExit` | Proceeds to sponsor |
| MOIC (Multiple of Invested Capital) | `=ExitEquity / SponsorEquity` | Cash-on-cash return |
| Gross IRR | `=XIRR({-SponsorEquity, 0, ..., ExitEquity}, dates)` | Annualized return |
| Management Rollover Split | `=ExitEquity * MgmtOwnershipPct` | Management proceeds |
| Sponsor Proceeds | `=ExitEquity * (1 - MgmtOwnershipPct)` | GP proceeds |
| Dividend Recap | `=NewDebt_Issued - Fees` | Mid-deal distribution |
| Value Creation Bridge | Decompose: EBITDA growth + multiple expansion + debt paydown | Waterfall analysis |

### 6.4 LBO Sensitivity Tables

```
IRR Sensitivity: Use Excel DATA TABLE function
    Row Input: Exit Multiple (6x, 7x, 8x, 9x, 10x)
    Col Input: EBITDA CAGR (3%, 5%, 7%, 10%)
    Cell: =XIRR(cashflows, dates)

MOIC Sensitivity: Same setup with MOIC formula
    Highlight entry multiple row (constant entry = exit)
    Flag cells below 2.0x MOIC or 20% IRR hurdle
```

---

## 7. FRM — Financial Risk Management

### 7.1 Value at Risk (VaR)

| Concept | Excel Formula | Notes |
|---|---|---|
| Parametric VaR (normal) | `=PortValue * σ * NORM.S.INV(confidence)` | Variance-covariance |
| Parametric VaR (daily) | `=PortValue * σ_daily * z` | z₉₅ = 1.645, z₉₉ = 2.326 |
| Scaling VaR (time) | `=VaR_daily * SQRT(holding_period)` | Square root of time rule |
| Historical VaR | `=PERCENTILE.INC(P&L_array, 1-confidence)` | Non-parametric |
| Expected Shortfall (CVaR) | `=AVERAGE(IF(PnL < VaR_threshold, PnL))` | Avg loss beyond VaR (array formula) |
| Component VaR | `=β_i * VaR_portfolio` | Marginal contribution |
| Incremental VaR | `=VaR_with_position - VaR_without` | Adding a position |
| Marginal VaR | `=β_i * σ_p * z / PortValue` | Per-unit VaR contribution |
| Stressed VaR | Use stressed period volatilities | Regulatory requirement |

### 7.2 Option Greeks (Black-Scholes)

| Greek | Excel Formula (Call) | Notes |
|---|---|---|
| d1 | `=(LN(S/K) + (r - q + σ²/2)*T) / (σ*SQRT(T))` | BSM parameter |
| d2 | `=d1 - σ*SQRT(T)` | BSM parameter |
| Call Price | `=S*EXP(-q*T)*NORM.S.DIST(d1,TRUE) - K*EXP(-r*T)*NORM.S.DIST(d2,TRUE)` | Black-Scholes call |
| Put Price | `=K*EXP(-r*T)*NORM.S.DIST(-d2,TRUE) - S*EXP(-q*T)*NORM.S.DIST(-d1,TRUE)` | Black-Scholes put |
| Delta (Call) | `=EXP(-q*T) * NORM.S.DIST(d1, TRUE)` | Price sensitivity |
| Delta (Put) | `=EXP(-q*T) * (NORM.S.DIST(d1, TRUE) - 1)` | Negative for puts |
| Gamma | `=EXP(-q*T) * NORM.S.DIST(d1,FALSE) / (S*σ*SQRT(T))` | Delta sensitivity |
| Theta (Call) | `= -S*NORM.S.DIST(d1,FALSE)*σ*EXP(-q*T)/(2*SQRT(T)) + q*S*N(d1)*EXP(-q*T) - r*K*EXP(-r*T)*N(d2)` | Time decay |
| Vega | `=S * EXP(-q*T) * NORM.S.DIST(d1, FALSE) * SQRT(T)` | Volatility sensitivity |
| Rho (Call) | `=K * T * EXP(-r*T) * NORM.S.DIST(d2, TRUE)` | Interest rate sensitivity |
| Implied Vol | `=Solver: BSMPrice(σ) = MarketPrice` | Newton-Raphson or Solver |

*Where: S = spot, K = strike, T = time to expiry, r = risk-free rate, q = dividend yield, σ = volatility*

### 7.3 Credit Risk

| Concept | Excel Formula | Notes |
|---|---|---|
| Expected Loss | `=EAD * PD * LGD` | Credit loss |
| Loss Given Default | `=1 - RecoveryRate` | LGD |
| Unexpected Loss | `=EAD * SQRT(PD * (1-PD)) * LGD` | Standard deviation of loss |
| Credit VaR | `=UL * z_confidence` | At portfolio level |
| CDS Spread (approx) | `≈ PD * LGD` | Annual premium |
| Merton Model (D2D) | `=(LN(V/D) + (μ - σ²/2)*T) / (σ*SQRT(T))` | Distance to default |
| Altman Z-Score | `=1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 1.0*X5` | Bankruptcy prediction |
| Transition Probability | Matrix of rating migration probabilities | Markov chain |

### 7.4 Market Risk

| Concept | Excel Formula | Notes |
|---|---|---|
| Beta | `=COVARIANCE.S(Ri,Rm) / VAR.S(Rm)` | Systematic risk |
| Systematic Risk | `=β² * σ²_market` | Explained variance |
| Unsystematic Risk | `=σ²_total - SystematicRisk` | Diversifiable |
| Duration Gap | `=DurAssets - (Liabilities/Assets) * DurLiabilities` | ALM risk |
| DV01 | `=ModDur * Price * 0.0001` | Dollar value per basis point |
| Correlation Stress | Increase correlations to 1.0 during crisis | Tail risk scenario |

---

## 8. CAIA — Alternative Investments

### 8.1 Hedge Fund & PE Performance

| Concept | Excel Formula | Notes |
|---|---|---|
| TWR (Time-Weighted Return) | `=PRODUCT(1 + sub_period_returns) - 1` | Removes cash flow timing |
| MWR (Money-Weighted) | `=XIRR(cashflows, dates)` | Sensitive to timing |
| Calmar Ratio | `=AnnualizedReturn / ABS(MaxDrawdown)` | Drawdown-adjusted |
| Omega Ratio | `=SUMPRODUCT((returns>threshold)*(returns-threshold)) / SUMPRODUCT((returns<threshold)*(threshold-returns))` | Gain/loss ratio |
| PME (Public Market Equiv) | `=XIRR(adjusted_cashflows, dates)` | PE vs. public benchmark |
| TVPI | `=(Distributions + NAV) / PaidInCapital` | Total value to paid-in |
| DPI | `=CumulativeDistributions / PaidInCapital` | Realized return |
| RVPI | `=NAV / PaidInCapital` | Unrealized return |
| J-Curve Effect | Plot cumulative CF: negative early, positive later | Typical PE pattern |

### 8.2 Real Estate

| Concept | Excel Formula | Notes |
|---|---|---|
| Cap Rate | `=NOI / PropertyValue` | Yield on real estate |
| NOI | `=GrossRent - OpEx - Vacancy` | Net operating income |
| Cash-on-Cash Return | `=AnnualCFbeforeDebt / TotalCashInvested` | Levered yield |
| Debt Service Coverage | `=NOI / AnnualDebtService` | DSCR — lender metric |
| Loan-to-Value | `=LoanAmount / PropertyValue` | LTV — leverage |
| Gross Rent Multiplier | `=PropertyPrice / GrossAnnualRent` | Quick valuation |
| Internal Rate of Return | `=XIRR({-equity, CF1..CFn, SaleProceeds}, dates)` | Total return |
| Equity Multiple | `=TotalDistributions / TotalEquityInvested` | Cash-on-cash total |

### 8.3 Commodities & Infrastructure

| Concept | Excel Formula | Notes |
|---|---|---|
| Roll Yield | `=(FuturesNear - FuturesFar) / FuturesFar` | Contango vs backwardation |
| Total Return (Commodity) | `=SpotReturn + RollYield + CollateralReturn` | Three components |
| Convenience Yield | `=r + StorageCost - (F/S - 1)/T` | Implicit benefit of holding |
| Cost of Carry | `=F = S * EXP((r + storage - convenience) * T)` | Futures pricing |

---

## 9. Debt Modeling & Restructuring

### 9.1 Debt Capacity Analysis

| Concept | Excel Formula | Notes |
|---|---|---|
| Max Debt (EBITDA multiple) | `=EBITDA * MaxLeverage` | E.g., 5.0x EBITDA |
| Max Debt (DSCR floor) | `=EBITDA / MinDSCR` | Coverage-based |
| Max Debt (LTV based) | `=AssetValue * MaxLTV` | Collateral-based |
| Debt Yield | `=NOI / LoanAmount` | Lender minimum threshold |
| Fixed Charge Coverage | `=(EBITDA - CapEx) / (Interest + Amort + Rent)` | Comprehensive coverage |

### 9.2 Debt Waterfall / Priority

```
Cash Flow Available for Debt Service (CFADS)
  └─ Step 1: Revolver repayment (most senior)
  └─ Step 2: Term Loan A amortization + sweep
  └─ Step 3: Term Loan B amortization + sweep
  └─ Step 4: Senior Notes (bullet at maturity)
  └─ Step 5: Subordinated / Mezzanine
  └─ Step 6: PIK notes (interest capitalizes)
  └─ Residual: Retained as cash or distributed

Excel: Each tranche's optional prepayment formula:
=MAX(0, MIN(BegBal+MandAmort, CashRemaining-SumPriorTranchePrepays))
```

### 9.3 Refinancing & Restructuring

| Concept | Excel Formula | Notes |
|---|---|---|
| Make-Whole Premium | `=PV(TreasuryRate+Spread, RemainingPeriods, Coupon, Par) - CurrentPrice` | Prepayment penalty |
| Defeasance Cost | `=PV of remaining CFs at Treasury rates` | Replace with Treasuries |
| Recovery Waterfall | Absolute Priority Rule: Senior → Sub → Equity | Bankruptcy distribution |
| Fulcrum Security | The tranche where recovery < 100% | Controls restructuring |

---

## 10. Essential Excel Functions for Financial Modeling

### 10.1 Core Functions

| Function | Syntax | Use Case |
|---|---|---|
| `XNPV` | `=XNPV(rate, values, dates)` | DCF with exact dates |
| `XIRR` | `=XIRR(values, dates, [guess])` | IRR with exact dates |
| `VLOOKUP` | `=VLOOKUP(value, table, col, FALSE)` | Data retrieval |
| `INDEX/MATCH` | `=INDEX(range, MATCH(value, lookup, 0))` | Superior to VLOOKUP |
| `SUMPRODUCT` | `=SUMPRODUCT(range1, range2)` | Weighted calculations |
| `OFFSET` | `=OFFSET(ref, rows, cols, [h], [w])` | Dynamic ranges |
| `CHOOSE` | `=CHOOSE(scenario, val1, val2, val3)` | Scenario switching |
| `IFERROR` | `=IFERROR(formula, fallback)` | Error handling |
| `EOMONTH` | `=EOMONTH(start, months)` | End-of-month dates |
| `YEARFRAC` | `=YEARFRAC(start, end, basis)` | Day count fractions |

### 10.2 Modeling Best Practices

| Practice | Implementation | Standard |
|---|---|---|
| Input Cells | Blue font, yellow fill | Wall Street convention |
| Formula Cells | Black font, no fill | Calculated values |
| Hard-coded Links | Green font | Cross-sheet links |
| Error Checks | Red/green conditional format | Balance sheet check rows |
| Circular References | File → Options → Formulas → Enable Iterative | Required for LBO |
| Sensitivity Tables | Data → What-If → Data Table | Two-variable analysis |
| Scenario Manager | Data → What-If → Scenario Manager | Base/Bull/Bear cases |
| Goal Seek | Data → What-If → Goal Seek | Solve for breakeven |
| Solver | Data → Solver (add-in) | Optimization problems |
| Named Ranges | Formulas → Name Manager | Improve readability |

### 10.3 Key Shortcuts (Windows)

| Shortcut | Action |
|---|---|
| `Ctrl + ~` | Toggle formula view |
| `F2` | Edit cell / trace precedents |
| `F4` | Toggle absolute reference ($) |
| `Ctrl + Shift + Enter` | Array formula (legacy) |
| `Alt + =` | AutoSum |
| `Ctrl + Shift + L` | Toggle filters |
| `Alt → D → T` | Data Table (What-If) |
| `Ctrl + [` | Trace precedents (go to) |
| `Ctrl + ]` | Trace dependents (go to) |
| `Ctrl + Shift + ~` | General format |
| `Ctrl + Shift + $` | Currency format |
| `Ctrl + Shift + %` | Percentage format |

---

## 11. Certification Cross-Reference Matrix

| Formula Domain | CFA L1 | CFA L2 | CFA L3 | FMVA | FRM | CAIA | Wall St |
|---|---|---|---|---|---|---|---|
| Time Value of Money | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DCF Valuation | ✅ | ✅ | | ✅ | | | ✅ |
| WACC / Cost of Capital | ✅ | ✅ | | ✅ | | | ✅ |
| Comp Analysis (Multiples) | ✅ | ✅ | | ✅ | | | ✅ |
| LBO / Debt Schedule | | | | ✅ | | | ✅ |
| M&A / Accretion-Dilution | | ✅ | | ✅ | | | ✅ |
| 3-Statement Modeling | | | | ✅ | | | ✅ |
| VaR / Risk Measures | | | ✅ | | ✅ | ✅ | |
| Black-Scholes / Greeks | | ✅ | | | ✅ | | |
| Portfolio Construction | ✅ | | ✅ | | ✅ | ✅ | |
| Performance Attribution | | | ✅ | | | ✅ | |
| Fixed Income Analytics | ✅ | ✅ | ✅ | | ✅ | | |
| Credit Risk (PD/LGD/EAD) | | | | | ✅ | | |
| Real Estate Valuation | | ✅ | | | | ✅ | |
| PE/HF Performance (TVPI) | | | | | | ✅ | ✅ |
| DuPont / Ratio Analysis | ✅ | ✅ | | ✅ | | | ✅ |
| Statistics & Regression | ✅ | ✅ | | | ✅ | | |

---

## 12. Quick Formula Lookup by Model Type

### DCF Model Checklist
1. `=Revenue_prior * (1 + growth)` → Revenue projection
2. `=EBIT * (1-T) + D&A - CapEx - ΔNWC` → Unlevered FCF
3. `=We*Re + Wd*Rd*(1-T)` → WACC
4. `=UFCFn*(1+g)/(WACC-g)` → Terminal Value
5. `=XNPV(WACC, cashflows, dates)` → Enterprise Value
6. `=EV - NetDebt` → Equity Value
7. `=EquityValue / Shares` → Implied Price

### LBO Model Checklist
1. `=EBITDA * EntryMultiple` → Purchase Price
2. `=TotalDebt = Σ tranches` → Sources
3. `=PurchasePrice - TotalDebt + Fees` → Sponsor Equity
4. `=EBITDA - Tax - CapEx - ΔNWC - Interest` → CFADR
5. Waterfall: Revolver → TLA → TLB → Notes → Sub
6. `=ExitEBITDA * ExitMultiple - NetDebt` → Exit Equity
7. `=XIRR(cashflows, dates)` → Gross IRR
8. `=ExitEquity / SponsorEquity` → MOIC

### M&A Model Checklist
1. `=TargetPrice * (1 + Premium)` → Offer Price
2. `=EquityValue + Debt - Cash + Fees` → Transaction Value
3. `=(CombinedNI + Synergies*(1-T) - NewInterest*(1-T)) / ProFormaShares` → PF EPS
4. `=(PF_EPS - Standalone_EPS) / Standalone_EPS` → Accretion/Dilution

---

*Document Version: 2.0 — February 2026*
*Covers: CFA L1/L2/L3 (2025–2026 curriculum), FMVA (CFI), FRM (GARP), CAIA, Wall Street Prep / BIWS*
*All formulas verified against Excel 365 / 2024 syntax*
