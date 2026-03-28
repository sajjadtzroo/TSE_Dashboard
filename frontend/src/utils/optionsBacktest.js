/**
 * Options Strategy Backtesting Engine
 * Pure JavaScript — zero React dependencies.
 */
import { blackScholesPrice, strategyPayoff } from './blackScholes';

/* ── Helpers ─────────────────────────────────────────────────── */

function _mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function _stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = _mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Compute annualized historical volatility from a window of prices.
 * @param {number[]} prices - Close prices
 * @returns {number} Annualized volatility (decimal)
 */
function historicalVol(prices) {
  if (prices.length < 3) return 0.30; // fallback
  const logReturns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > 0 && prices[i - 1] > 0) {
      logReturns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  if (logReturns.length < 2) return 0.30;
  return _stdDev(logReturns) * Math.sqrt(252);
}

/**
 * Price a multi-leg strategy using Black-Scholes.
 * @param {Array} legs - [{type, direction, strike, qty}]
 * @param {number} S - Spot price
 * @param {number} T - Time to expiry in years
 * @param {number} r - Risk-free rate
 * @param {number} sigma - Volatility
 * @returns {number} Strategy value
 */
function priceStrategy(legs, S, T, r, sigma) {
  let total = 0;
  for (const leg of legs) {
    if (leg.type === 'stock') {
      total += leg.direction * leg.qty * S;
      continue;
    }
    const price = blackScholesPrice(leg.type, S, leg.strike, Math.max(T, 0), r, sigma);
    total += leg.direction * leg.qty * price;
  }
  return total;
}

/**
 * Compute max profit and max loss of a strategy at expiry.
 */
function computeMaxProfitLoss(legs, entrySpot, entryValue) {
  const lo = entrySpot * 0.01;
  const hi = entrySpot * 3;
  const steps = 500;
  const step = (hi - lo) / steps;
  let maxProfit = -Infinity;
  let maxLoss = Infinity;

  for (let i = 0; i <= steps; i++) {
    const price = lo + i * step;
    const payoff = strategyPayoff(legs, price);
    const pnl = payoff - entryValue;
    if (pnl > maxProfit) maxProfit = pnl;
    if (pnl < maxLoss) maxLoss = pnl;
  }

  return {
    maxProfit: maxProfit > 1e10 ? Infinity : maxProfit,
    maxLoss: maxLoss < -1e10 ? -Infinity : maxLoss,
  };
}

/* ── Main Backtest ───────────────────────────────────────────── */

/**
 * Backtest an options strategy over historical data.
 *
 * @param {object} config
 * @param {Array} config.legs - [{type, direction, strike, premium, qty}]
 *   strikes can be ratios (e.g., 1.0=ATM, 1.05=5% OTM) or absolute values
 * @param {number[]} config.historicalPrices - Daily underlying close prices
 * @param {string[]} config.dates - Corresponding date strings
 * @param {number} config.entryDTE - Days to expiry at entry (default 30)
 * @param {number} config.exitDTE - Days to expiry at exit, 0 = hold to expiry (default 0)
 * @param {number} config.r - Risk-free rate (default 0.23)
 * @param {number|null} config.sigma - Override volatility (null = compute from history)
 * @param {number} config.volLookback - Days for historical vol calculation (default 30)
 * @param {number} config.commission - Per contract commission (default 0)
 * @param {number} config.slippage - Per contract slippage (default 0)
 * @param {number|null} config.stopLoss - Fraction of max loss to trigger exit (e.g. 0.5)
 * @param {number|null} config.profitTarget - Fraction of max profit to trigger exit (e.g. 0.8)
 * @returns {{ trades, summary, equityCurve, monthlyReturns }}
 */
export function backtestStrategy(config) {
  const {
    legs: templateLegs,
    historicalPrices,
    dates,
    entryDTE = 30,
    exitDTE = 0,
    r = 0.23,
    sigma = null,
    volLookback = 30,
    commission = 0,
    slippage = 0,
    stopLoss = null,
    profitTarget = null,
  } = config;

  if (!historicalPrices || historicalPrices.length < entryDTE + volLookback + 5) {
    return { trades: [], summary: _emptySummary(), equityCurve: [], monthlyReturns: [] };
  }

  const holdDays = entryDTE - exitDTE;
  if (holdDays <= 0) {
    return { trades: [], summary: _emptySummary(), equityCurve: [], monthlyReturns: [] };
  }

  const trades = [];
  let i = volLookback; // start after enough lookback data

  while (i + entryDTE < historicalPrices.length) {
    const entrySpot = historicalPrices[i];
    if (!entrySpot || entrySpot <= 0) { i++; continue; }

    // Compute historical vol from lookback window
    const volWindow = historicalPrices.slice(Math.max(0, i - volLookback), i + 1);
    const entryVol = sigma != null ? sigma : historicalVol(volWindow);

    // Build absolute legs from template
    const legs = templateLegs.map((leg) => {
      if (leg.type === 'stock') {
        return { ...leg, strike: entrySpot };
      }
      // If strike is small (< 10), treat as ratio; otherwise treat as absolute
      const absoluteStrike = leg.strike < 10 ? Math.round(entrySpot * leg.strike) : leg.strike;
      return { ...leg, strike: absoluteStrike };
    });

    // Price strategy at entry
    const T_entry = entryDTE / 365;
    const entryValue = priceStrategy(legs, entrySpot, T_entry, r, entryVol);

    // Compute total cost for commissions/slippage
    const totalContracts = legs.reduce((s, l) => s + (l.type !== 'stock' ? l.qty : 0), 0);
    const entryCost = totalContracts * (commission + slippage);

    // Compute max profit/loss for stop/target checks
    const { maxProfit, maxLoss } = computeMaxProfitLoss(legs, entrySpot, entryValue);

    // Track position day by day
    let exitDay = i + holdDays;
    let exitReason = exitDTE === 0 ? 'expiry' : 'close';
    let exitValue = 0;

    for (let d = 1; d <= holdDays && (i + d) < historicalPrices.length; d++) {
      const currentSpot = historicalPrices[i + d];
      if (!currentSpot || currentSpot <= 0) continue;

      const remainingDTE = entryDTE - d;
      const T_current = remainingDTE / 365;

      // Re-price position
      const currentValue = remainingDTE <= 0
        ? strategyPayoff(legs, currentSpot) // at/past expiry use intrinsic
        : priceStrategy(legs, currentSpot, T_current, r, entryVol);

      const unrealizedPnL = currentValue - entryValue;

      // Check stop loss
      if (stopLoss != null && isFinite(maxLoss) && maxLoss < 0) {
        const lossThreshold = stopLoss * Math.abs(maxLoss);
        if (unrealizedPnL <= -lossThreshold) {
          exitDay = i + d;
          exitValue = currentValue;
          exitReason = 'stop-loss';
          break;
        }
      }

      // Check profit target
      if (profitTarget != null && isFinite(maxProfit) && maxProfit > 0) {
        const profitThreshold = profitTarget * maxProfit;
        if (unrealizedPnL >= profitThreshold) {
          exitDay = i + d;
          exitValue = currentValue;
          exitReason = 'profit-target';
          break;
        }
      }

      // At final day, record exit value
      if (d === holdDays || (i + d) === historicalPrices.length - 1) {
        exitDay = i + d;
        if (remainingDTE <= 0) {
          exitValue = strategyPayoff(legs, currentSpot);
        } else {
          exitValue = currentValue;
        }
      }
    }

    // Ensure exitDay is within bounds
    exitDay = Math.min(exitDay, historicalPrices.length - 1);

    // If exitValue was never set (edge case), price at exit day
    if (exitValue === 0 && exitDay > i) {
      const exitSpot = historicalPrices[exitDay];
      const exitRemainingDTE = entryDTE - (exitDay - i);
      if (exitRemainingDTE <= 0) {
        exitValue = strategyPayoff(legs, exitSpot);
      } else {
        exitValue = priceStrategy(legs, exitSpot, exitRemainingDTE / 365, r, entryVol);
      }
    }

    const exitCost = totalContracts * (commission + slippage);
    const pnl = exitValue - entryValue - entryCost - exitCost;
    const pnlPct = Math.abs(entryValue) > 0 ? pnl / Math.abs(entryValue) : 0;
    const daysHeld = exitDay - i;

    trades.push({
      entryDate: dates[i] || `Day ${i}`,
      exitDate: dates[exitDay] || `Day ${exitDay}`,
      entryPrice: Math.round(entryValue * 100) / 100,
      exitPrice: Math.round(exitValue * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      pnlPct: Math.round(pnlPct * 10000) / 10000,
      daysHeld,
      exitReason,
      entryVol: Math.round(entryVol * 10000) / 10000,
      entrySpot,
    });

    // Move to next entry: skip past this trade's exit to avoid overlap
    i = exitDay + 1;
  }

  // Compute summary statistics
  const summary = _computeSummary(trades);

  // Build equity curve
  const equityCurve = _buildEquityCurve(trades);

  // Build monthly returns
  const monthlyReturns = _buildMonthlyReturns(trades);

  return { trades, summary, equityCurve, monthlyReturns };
}

/* ── Monte Carlo Backtest ─────────────────────────────────────── */

/**
 * Run backtest on synthetic GBM price paths.
 *
 * @param {object} config
 * @param {Array} config.legs - Strategy leg templates
 * @param {number} config.S0 - Initial spot price
 * @param {number} config.r - Risk-free rate
 * @param {number} config.sigma - Volatility
 * @param {number} config.numSims - Number of simulations (default 100)
 * @param {number} config.pathLength - Trading days per path (default 252)
 * @param {number} config.entryDTE - Days to expiry (default 30)
 * @param {number} config.commission - Per contract (default 0)
 * @param {number} config.slippage - Per contract (default 0)
 * @param {number|null} config.stopLoss
 * @param {number|null} config.profitTarget
 * @returns {{ simResults, aggregateStats }}
 */
export function monteCarloBacktest(config) {
  const {
    legs,
    S0,
    r = 0.23,
    sigma = 0.30,
    numSims = 100,
    pathLength = 252,
    entryDTE = 30,
    commission = 0,
    slippage = 0,
    stopLoss = null,
    profitTarget = null,
  } = config;

  const simResults = [];
  const allPnLs = [];

  for (let sim = 0; sim < numSims; sim++) {
    // Generate GBM path
    const prices = [S0];
    const dates = [`Day 0`];
    const dailyDrift = (r - 0.5 * sigma * sigma) / 252;
    const dailyVol = sigma / Math.sqrt(252);

    for (let d = 1; d <= pathLength; d++) {
      // Box-Muller
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
      const newPrice = prices[d - 1] * Math.exp(dailyDrift + dailyVol * z);
      prices.push(newPrice);
      dates.push(`Day ${d}`);
    }

    const result = backtestStrategy({
      legs,
      historicalPrices: prices,
      dates,
      entryDTE,
      exitDTE: 0,
      r,
      sigma,
      volLookback: 20,
      commission,
      slippage,
      stopLoss,
      profitTarget,
    });

    simResults.push({
      summary: result.summary,
      equityCurve: result.equityCurve,
    });

    if (result.summary.totalPnL != null) {
      allPnLs.push(result.summary.totalPnL);
    }
  }

  // Aggregate statistics
  const winRates = simResults.map((s) => s.summary.winRate).filter((v) => v != null);
  const sharpes = simResults.map((s) => s.summary.sharpeRatio).filter((v) => v != null && isFinite(v));

  const aggregateStats = {
    avgWinRate: _mean(winRates),
    avgTotalPnL: _mean(allPnLs),
    avgSharpe: _mean(sharpes),
    pnlDistribution: allPnLs.sort((a, b) => a - b),
    pnl5th: allPnLs.length > 0 ? allPnLs[Math.floor(allPnLs.length * 0.05)] : 0,
    pnl95th: allPnLs.length > 0 ? allPnLs[Math.floor(allPnLs.length * 0.95)] : 0,
  };

  return { simResults, aggregateStats };
}

/* ── Rolling Backtest Stats ──────────────────────────────────── */

/**
 * Compute rolling statistics from an equity curve.
 * @param {Array} equityCurve - [{date, equity}]
 * @param {number} window - Rolling window size (default 30)
 * @returns {Array} [{date, rollingReturn, rollingVol, rollingSharpe, drawdown}]
 */
export function rollingBacktestStats(equityCurve, window = 30) {
  if (!equityCurve || equityCurve.length < window + 1) return [];

  const results = [];
  let peak = -Infinity;

  for (let i = window; i < equityCurve.length; i++) {
    const slice = equityCurve.slice(i - window, i + 1);
    const returns = [];
    for (let j = 1; j < slice.length; j++) {
      const prev = slice[j - 1].equity;
      if (prev !== 0) {
        returns.push((slice[j].equity - prev) / Math.abs(prev));
      }
    }

    const rollingReturn = returns.length > 0 ? _mean(returns) * 252 : 0;
    const rollingVol = returns.length > 1 ? _stdDev(returns) * Math.sqrt(252) : 0;
    const rollingSharpe = rollingVol > 0 ? rollingReturn / rollingVol : 0;

    const currentEquity = equityCurve[i].equity;
    if (currentEquity > peak) peak = currentEquity;
    const drawdown = peak > 0 ? (currentEquity - peak) / peak : 0;

    results.push({
      date: equityCurve[i].date,
      rollingReturn: Math.round(rollingReturn * 10000) / 10000,
      rollingVol: Math.round(rollingVol * 10000) / 10000,
      rollingSharpe: Math.round(rollingSharpe * 100) / 100,
      drawdown: Math.round(drawdown * 10000) / 10000,
    });
  }

  return results;
}

/* ── Private helpers ─────────────────────────────────────────── */

function _emptySummary() {
  return {
    totalTrades: 0,
    winners: 0,
    losers: 0,
    winRate: 0,
    avgPnL: 0,
    totalPnL: 0,
    medianPnL: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    profitFactor: 0,
    avgDaysHeld: 0,
    maxConsecutiveLosses: 0,
  };
}

function _computeSummary(trades) {
  if (trades.length === 0) return _emptySummary();

  const pnls = trades.map((t) => t.pnl);
  const winners = pnls.filter((p) => p > 0);
  const losers = pnls.filter((p) => p <= 0);
  const daysHeld = trades.map((t) => t.daysHeld);

  // Median
  const sorted = [...pnls].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianPnL = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  // Max drawdown from cumulative equity
  let equity = 0;
  let peak = 0;
  let maxDD = 0;
  for (const pnl of pnls) {
    equity += pnl;
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? (peak - equity) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  // Sharpe ratio of trades
  const avgDays = _mean(daysHeld) || 1;
  const annualizationFactor = Math.sqrt(252 / avgDays);
  const sharpeRatio = pnls.length > 1
    ? (_mean(pnls) / _stdDev(pnls)) * annualizationFactor
    : 0;

  // Profit factor
  const sumWins = winners.reduce((s, v) => s + v, 0);
  const sumLosses = Math.abs(losers.reduce((s, v) => s + v, 0));
  const profitFactor = sumLosses > 0 ? sumWins / sumLosses : (sumWins > 0 ? Infinity : 0);

  // Max consecutive losses
  let maxConsecLosses = 0;
  let consecLosses = 0;
  for (const pnl of pnls) {
    if (pnl <= 0) {
      consecLosses++;
      if (consecLosses > maxConsecLosses) maxConsecLosses = consecLosses;
    } else {
      consecLosses = 0;
    }
  }

  return {
    totalTrades: trades.length,
    winners: winners.length,
    losers: losers.length,
    winRate: winners.length / trades.length,
    avgPnL: Math.round(_mean(pnls) * 100) / 100,
    totalPnL: Math.round(pnls.reduce((s, v) => s + v, 0) * 100) / 100,
    medianPnL: Math.round(medianPnL * 100) / 100,
    maxDrawdown: Math.round(maxDD * 10000) / 10000,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    profitFactor: profitFactor === Infinity ? Infinity : Math.round(profitFactor * 100) / 100,
    avgDaysHeld: Math.round(_mean(daysHeld) * 10) / 10,
    maxConsecutiveLosses: maxConsecLosses,
  };
}

function _buildEquityCurve(trades) {
  if (trades.length === 0) return [];
  const curve = [{ date: trades[0].entryDate, equity: 0 }];
  let equity = 0;
  for (const trade of trades) {
    equity += trade.pnl;
    curve.push({ date: trade.exitDate, equity: Math.round(equity * 100) / 100 });
  }
  return curve;
}

function _buildMonthlyReturns(trades) {
  if (trades.length === 0) return [];
  const monthMap = {};
  for (const trade of trades) {
    // Extract YYYY-MM from entry date
    const dateStr = trade.entryDate;
    let month;
    if (dateStr.length >= 7 && dateStr.includes('-')) {
      month = dateStr.substring(0, 7);
    } else {
      month = dateStr; // fallback for "Day X" format
    }
    if (!monthMap[month]) monthMap[month] = 0;
    monthMap[month] += trade.pnl;
  }
  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ret]) => ({
      month,
      return: Math.round(ret * 100) / 100,
    }));
}
