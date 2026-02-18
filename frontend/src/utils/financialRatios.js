/**
 * CFA Level 1 Financial Ratio Analysis
 *
 * Computes 25+ ratios from FinancialStatement data (income_statement + balance_sheet).
 * All inputs are in million Rials (as stored in the DB).
 *
 * Categories:
 *   1. Profitability  — margins, ROE, ROA, ROIC
 *   2. Solvency       — leverage, coverage
 *   3. Liquidity      — current, quick, cash ratios
 *   4. Efficiency     — turnover ratios
 *   5. Valuation      — P/B, P/S, EV/EBITDA
 *   6. DuPont         — 3-factor and 5-factor decomposition
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/** Safe divide: returns null if divisor is 0/null/undefined */
const div = (a, b) => {
  if (a == null || b == null || b === 0) return null;
  return a / b;
};

/** Extract a value from line_items JSONB by key (case-insensitive match) */
const li = (stmt, key) => {
  if (!stmt?.line_items) return null;
  // Try exact key first
  if (stmt.line_items[key] != null) return stmt.line_items[key];
  // Try case-insensitive
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(stmt.line_items)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
};

// ── Ratio Computation ──────────────────────────────────────────────────────

/**
 * Compute profitability ratios from a single period's income statement + balance sheet.
 * @param {Object} inc - income_statement record
 * @param {Object} bs  - balance_sheet record
 * @returns {Object} profitability ratios
 */
export function profitabilityRatios(inc, bs) {
  if (!inc) return {};
  const revenue = inc.revenue;
  const grossProfit = inc.gross_profit;
  const opIncome = inc.operating_income;
  const netIncome = inc.net_income;
  const totalEquity = bs?.total_equity;
  const totalAssets = bs?.total_assets;

  // EBITDA from line_items if available
  const depreciation = li(inc, 'depreciation_amortization') || li(inc, 'depreciation') || 0;
  const ebitda = opIncome != null ? opIncome + depreciation : null;

  return {
    grossMargin: div(grossProfit, revenue),
    operatingMargin: div(opIncome, revenue),
    netMargin: div(netIncome, revenue),
    ebitdaMargin: div(ebitda, revenue),
    roe: div(netIncome, totalEquity),
    roa: div(netIncome, totalAssets),
    roic: div(opIncome, totalAssets != null && bs?.total_liabilities != null
      ? totalEquity + (bs.total_liabilities - (li(bs, 'current_liabilities') || 0))
      : null),
    ebitda,
  };
}

/**
 * Compute solvency and leverage ratios from balance sheet + income statement.
 */
export function solvencyRatios(bs, inc) {
  if (!bs) return {};
  const totalDebt = bs.total_liabilities;
  const totalEquity = bs.total_equity;
  const totalAssets = bs.total_assets;
  const interestExpense = li(inc, 'interest_expense') || li(inc, 'finance_costs');

  return {
    debtToEquity: div(totalDebt, totalEquity),
    debtToAssets: div(totalDebt, totalAssets),
    equityRatio: div(totalEquity, totalAssets),
    financialLeverage: div(totalAssets, totalEquity),
    interestCoverage: div(inc?.operating_income, interestExpense != null ? Math.abs(interestExpense) : null),
  };
}

/**
 * Compute liquidity ratios from balance sheet.
 */
export function liquidityRatios(bs) {
  if (!bs) return {};
  const currentAssets = li(bs, 'current_assets');
  const currentLiabilities = li(bs, 'current_liabilities');
  const inventory = li(bs, 'inventories') || li(bs, 'inventory') || 0;
  const cash = li(bs, 'cash_and_equivalents') || li(bs, 'cash') || 0;

  return {
    currentRatio: div(currentAssets, currentLiabilities),
    quickRatio: div(currentAssets != null ? currentAssets - inventory : null, currentLiabilities),
    cashRatio: div(cash, currentLiabilities),
  };
}

/**
 * Compute efficiency / activity ratios.
 * Uses average total assets/equity when two periods are available.
 */
export function efficiencyRatios(inc, bs, prevBs) {
  if (!inc || !bs) return {};
  const revenue = inc.revenue;
  const avgAssets = prevBs?.total_assets != null
    ? (bs.total_assets + prevBs.total_assets) / 2
    : bs.total_assets;
  const avgEquity = prevBs?.total_equity != null
    ? (bs.total_equity + prevBs.total_equity) / 2
    : bs.total_equity;

  const costOfRevenue = inc.cost_of_revenue;
  const avgInventory = (() => {
    const cur = li(bs, 'inventories') || li(bs, 'inventory');
    const prev = prevBs ? (li(prevBs, 'inventories') || li(prevBs, 'inventory')) : null;
    if (cur == null) return null;
    return prev != null ? (cur + prev) / 2 : cur;
  })();

  const avgReceivables = (() => {
    const cur = li(bs, 'trade_receivables') || li(bs, 'receivables') || li(bs, 'accounts_receivable');
    const prev = prevBs
      ? (li(prevBs, 'trade_receivables') || li(prevBs, 'receivables') || li(prevBs, 'accounts_receivable'))
      : null;
    if (cur == null) return null;
    return prev != null ? (cur + prev) / 2 : cur;
  })();

  const assetTurnover = div(revenue, avgAssets);
  const inventoryTurnover = div(costOfRevenue, avgInventory);
  const receivablesTurnover = div(revenue, avgReceivables);

  return {
    assetTurnover,
    equityTurnover: div(revenue, avgEquity),
    inventoryTurnover,
    receivablesTurnover,
    daysInventory: inventoryTurnover != null ? div(365, inventoryTurnover) : null,
    daysSalesOutstanding: receivablesTurnover != null ? div(365, receivablesTurnover) : null,
  };
}

/**
 * Compute valuation ratios.
 * @param {Object} bs - balance_sheet
 * @param {Object} inc - income_statement
 * @param {Object} market - { market_cap, pe_ratio, close, total_shares } from DailyOHLCV + Security
 */
export function valuationRatios(bs, inc, market) {
  if (!market) return {};
  const marketCap = market.market_cap;
  const totalEquity = bs?.total_equity;
  const revenue = inc?.revenue;
  const cash = li(bs, 'cash_and_equivalents') || li(bs, 'cash') || 0;
  const totalDebt = bs?.total_liabilities || 0;

  // Enterprise Value = Market Cap + Total Debt - Cash
  const ev = marketCap != null ? marketCap + totalDebt - cash : null;

  // EBITDA
  const depreciation = li(inc, 'depreciation_amortization') || li(inc, 'depreciation') || 0;
  const ebitda = inc?.operating_income != null ? inc.operating_income + depreciation : null;

  // Book value per share
  const totalShares = market.total_shares;
  const bookValuePerShare = div(totalEquity, totalShares);
  const priceToBook = div(market.close, bookValuePerShare);

  return {
    peRatio: market.pe_ratio,
    priceToBook,
    priceToSales: div(marketCap, revenue),
    evToEbitda: div(ev, ebitda),
    enterpriseValue: ev,
    bookValuePerShare,
    earningsYield: market.pe_ratio ? div(1, market.pe_ratio) : null,
    dividendYield: div(li(inc, 'dividends_per_share') || li(inc, 'dps'), market.close),
  };
}

/**
 * DuPont 3-factor decomposition:
 *   ROE = Net Profit Margin x Asset Turnover x Financial Leverage
 *       = (NI/Revenue)      x (Revenue/TA)  x (TA/Equity)
 *
 * DuPont 5-factor decomposition:
 *   ROE = Tax Burden x Interest Burden x EBIT Margin x Asset Turnover x Leverage
 *       = (NI/EBT)   x (EBT/EBIT)     x (EBIT/Rev)  x (Rev/TA)      x (TA/Eq)
 */
export function dupontAnalysis(inc, bs) {
  if (!inc || !bs) return { threeFactory: null, fiveFactor: null };

  const netIncome = inc.net_income;
  const revenue = inc.revenue;
  const totalAssets = bs.total_assets;
  const totalEquity = bs.total_equity;
  const opIncome = inc.operating_income; // proxy for EBIT
  const ebt = li(inc, 'income_before_tax') || li(inc, 'ebt');

  // 3-factor
  const netMargin = div(netIncome, revenue);
  const assetTurnover = div(revenue, totalAssets);
  const leverage = div(totalAssets, totalEquity);
  const roeCalc = netMargin != null && assetTurnover != null && leverage != null
    ? netMargin * assetTurnover * leverage
    : null;

  const threeFactor = {
    netMargin,
    assetTurnover,
    leverage,
    roe: roeCalc,
  };

  // 5-factor
  const taxBurden = div(netIncome, ebt); // NI / EBT
  const interestBurden = div(ebt, opIncome); // EBT / EBIT
  const ebitMargin = div(opIncome, revenue); // EBIT / Revenue

  const fiveFactor = {
    taxBurden,
    interestBurden,
    ebitMargin,
    assetTurnover,
    leverage,
    roe: taxBurden != null && interestBurden != null && ebitMargin != null
      && assetTurnover != null && leverage != null
      ? taxBurden * interestBurden * ebitMargin * assetTurnover * leverage
      : null,
  };

  return { threeFactor, fiveFactor };
}

// ── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Compute all financial ratios for a single reporting period.
 *
 * @param {Object} params
 * @param {Object} params.incomeStatement   - income_statement for the period
 * @param {Object} params.balanceSheet      - balance_sheet for the period
 * @param {Object|null} params.prevBalanceSheet - previous period's balance_sheet (for averages)
 * @param {Object|null} params.market       - { market_cap, pe_ratio, close, total_shares }
 * @returns {Object} all ratios grouped by category
 */
export function computeAllRatios({ incomeStatement, balanceSheet, prevBalanceSheet = null, market = null }) {
  return {
    period: incomeStatement?.period_end_jalali || balanceSheet?.period_end_jalali || null,
    periodDate: incomeStatement?.period_end_date || balanceSheet?.period_end_date || null,
    periodMonths: incomeStatement?.period_months || balanceSheet?.period_months || null,
    isAudited: incomeStatement?.is_audited || balanceSheet?.is_audited || false,
    profitability: profitabilityRatios(incomeStatement, balanceSheet),
    solvency: solvencyRatios(balanceSheet, incomeStatement),
    liquidity: liquidityRatios(balanceSheet),
    efficiency: efficiencyRatios(incomeStatement, balanceSheet, prevBalanceSheet),
    valuation: valuationRatios(balanceSheet, incomeStatement, market),
    dupont: dupontAnalysis(incomeStatement, balanceSheet),
  };
}

/**
 * Compute ratios for multiple periods and return a time-series.
 *
 * @param {Object} params
 * @param {Array} params.incomeStatements  - sorted by period_end_date ASC
 * @param {Array} params.balanceSheets     - sorted by period_end_date ASC
 * @param {Object|null} params.market      - latest market data for valuation
 * @returns {Array<Object>} array of ratio objects per period
 */
export function computeRatioTimeSeries({ incomeStatements = [], balanceSheets = [], market = null }) {
  // Match income statements to balance sheets by period_end_date
  const bsByDate = {};
  for (const bs of balanceSheets) {
    bsByDate[bs.period_end_date] = bs;
  }

  const results = [];
  const sortedInc = [...incomeStatements].sort(
    (a, b) => new Date(a.period_end_date) - new Date(b.period_end_date),
  );

  for (let i = 0; i < sortedInc.length; i++) {
    const inc = sortedInc[i];
    const bs = bsByDate[inc.period_end_date] || null;
    const prevBs = i > 0 ? (bsByDate[sortedInc[i - 1].period_end_date] || null) : null;

    // Only use market data for the latest period
    const isLatest = i === sortedInc.length - 1;

    results.push(computeAllRatios({
      incomeStatement: inc,
      balanceSheet: bs,
      prevBalanceSheet: prevBs,
      market: isLatest ? market : null,
    }));
  }

  return results;
}

// ── Labels & metadata ──────────────────────────────────────────────────────

export const RATIO_LABELS = {
  // Profitability
  grossMargin: { label: 'حاشیه سود ناخالص', tip: 'سود ناخالص تقسیم بر درآمد', format: 'pct' },
  operatingMargin: { label: 'حاشیه سود عملیاتی', tip: 'سود عملیاتی تقسیم بر درآمد', format: 'pct' },
  netMargin: { label: 'حاشیه سود خالص', tip: 'سود خالص تقسیم بر درآمد', format: 'pct' },
  ebitdaMargin: { label: 'حاشیه EBITDA', tip: 'EBITDA تقسیم بر درآمد', format: 'pct' },
  roe: { label: 'بازده حقوق صاحبان سهام (ROE)', tip: 'سود خالص تقسیم بر حقوق صاحبان سهام', format: 'pct' },
  roa: { label: 'بازده دارایی‌ها (ROA)', tip: 'سود خالص تقسیم بر کل دارایی‌ها', format: 'pct' },
  roic: { label: 'بازده سرمایه (ROIC)', tip: 'سود عملیاتی تقسیم بر سرمایه به‌کار گرفته‌شده', format: 'pct' },

  // Solvency
  debtToEquity: { label: 'بدهی به حقوق صاحبان سهام', tip: 'کل بدهی تقسیم بر حقوق صاحبان سهام', format: 'x' },
  debtToAssets: { label: 'بدهی به دارایی', tip: 'کل بدهی تقسیم بر کل دارایی', format: 'pct' },
  equityRatio: { label: 'نسبت حقوق صاحبان سهام', tip: 'حقوق صاحبان سهام تقسیم بر کل دارایی', format: 'pct' },
  financialLeverage: { label: 'اهرم مالی', tip: 'کل دارایی تقسیم بر حقوق صاحبان سهام', format: 'x' },
  interestCoverage: { label: 'پوشش بهره', tip: 'سود عملیاتی تقسیم بر هزینه بهره', format: 'x' },

  // Liquidity
  currentRatio: { label: 'نسبت جاری', tip: 'دارایی جاری تقسیم بر بدهی جاری', format: 'x' },
  quickRatio: { label: 'نسبت آنی', tip: '(دارایی جاری - موجودی) تقسیم بر بدهی جاری', format: 'x' },
  cashRatio: { label: 'نسبت نقدی', tip: 'وجه نقد تقسیم بر بدهی جاری', format: 'x' },

  // Efficiency
  assetTurnover: { label: 'گردش دارایی', tip: 'درآمد تقسیم بر کل دارایی', format: 'x' },
  equityTurnover: { label: 'گردش حقوق صاحبان سهام', tip: 'درآمد تقسیم بر حقوق صاحبان سهام', format: 'x' },
  inventoryTurnover: { label: 'گردش موجودی', tip: 'بهای تمام شده تقسیم بر موجودی', format: 'x' },
  receivablesTurnover: { label: 'گردش مطالبات', tip: 'درآمد تقسیم بر مطالبات', format: 'x' },
  daysInventory: { label: 'روزهای موجودی', tip: '۳۶۵ تقسیم بر گردش موجودی', format: 'day' },
  daysSalesOutstanding: { label: 'دوره وصول مطالبات', tip: '۳۶۵ تقسیم بر گردش مطالبات', format: 'day' },

  // Valuation
  peRatio: { label: 'P/E', tip: 'قیمت تقسیم بر سود هر سهم', format: 'x' },
  priceToBook: { label: 'P/B', tip: 'قیمت تقسیم بر ارزش دفتری هر سهم', format: 'x' },
  priceToSales: { label: 'P/S', tip: 'ارزش بازار تقسیم بر درآمد', format: 'x' },
  evToEbitda: { label: 'EV/EBITDA', tip: 'ارزش شرکت تقسیم بر EBITDA', format: 'x' },
  earningsYield: { label: 'بازده سود', tip: 'معکوس P/E', format: 'pct' },
  dividendYield: { label: 'بازده سود نقدی', tip: 'سود نقدی هر سهم تقسیم بر قیمت', format: 'pct' },
  bookValuePerShare: { label: 'ارزش دفتری هر سهم', tip: 'حقوق صاحبان سهام تقسیم بر تعداد سهام', format: 'num' },

  // DuPont components
  taxBurden: { label: 'بار مالیاتی', tip: 'سود خالص تقسیم بر سود قبل از مالیات', format: 'pct' },
  interestBurden: { label: 'بار بهره', tip: 'سود قبل از مالیات تقسیم بر سود عملیاتی', format: 'pct' },
  ebitMargin: { label: 'حاشیه EBIT', tip: 'سود عملیاتی تقسیم بر درآمد', format: 'pct' },
  leverage: { label: 'اهرم مالی', tip: 'کل دارایی تقسیم بر حقوق صاحبان سهام', format: 'x' },
};
