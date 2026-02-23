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

/** Extract interest-bearing debt from balance sheet (CFA: only debt that accrues interest) */
const getInterestBearingDebt = (bs) => {
  if (!bs) return 0;
  const ltd = li(bs, 'long_term_borrowings') || li(bs, 'long_term_debt') || li(bs, 'long_term_facilities') || 0;
  const std = li(bs, 'short_term_borrowings') || li(bs, 'short_term_debt') || li(bs, 'current_portion_long_term_debt') || 0;
  if (ltd > 0 || std > 0) return ltd + std;
  // Fallback: non-current liabilities as proxy (excludes trade payables, accrued expenses)
  const cl = li(bs, 'current_liabilities') || 0;
  return bs.total_liabilities != null ? Math.max(bs.total_liabilities - cl, 0) : 0;
};

// ── Ratio Computation ──────────────────────────────────────────────────────

/**
 * Compute profitability ratios from a single period's income statement + balance sheet.
 *
 * CFA L1: ROE = NI / Average Equity, ROA = NI / Average Assets.
 * When prevBs is provided, averages are used; otherwise falls back to point-in-time.
 *
 * CFA L1: ROIC = NOPAT / Invested Capital, where NOPAT = Operating Income × (1 - Tax Rate).
 *
 * @param {Object} inc - income_statement record
 * @param {Object} bs  - balance_sheet record
 * @param {Object|null} prevBs - previous period balance_sheet (for average calculations)
 * @returns {Object} profitability ratios
 */
export function profitabilityRatios(inc, bs, prevBs = null) {
  if (!inc) return {};
  const revenue = inc.revenue;
  const grossProfit = inc.gross_profit;
  const opIncome = inc.operating_income;
  const netIncome = inc.net_income;

  // CFA L1: Use average equity/assets when previous period is available
  const avgEquity = prevBs?.total_equity != null && bs?.total_equity != null
    ? (bs.total_equity + prevBs.total_equity) / 2
    : bs?.total_equity;
  const avgAssets = prevBs?.total_assets != null && bs?.total_assets != null
    ? (bs.total_assets + prevBs.total_assets) / 2
    : bs?.total_assets;

  // EBITDA from line_items if available
  const depreciation = li(inc, 'depreciation_amortization') || li(inc, 'depreciation') || 0;
  const ebitda = opIncome != null ? opIncome + depreciation : null;

  // CFA L1: ROIC = NOPAT / Invested Capital
  // NOPAT = Operating Income × (1 - Tax Rate)
  const ebt = li(inc, 'income_before_tax') || li(inc, 'ebt');
  const rawTaxRate = (opIncome != null && ebt != null && ebt !== 0)
    ? 1 - (netIncome / ebt)
    : 0;
  const taxRate = Math.max(0, Math.min(rawTaxRate, 0.50));
  const nopat = opIncome != null ? opIncome * (1 - (taxRate || 0)) : null;
  const investedCapital = bs?.total_equity != null
    ? bs.total_equity + getInterestBearingDebt(bs)
    : null;

  return {
    grossMargin: div(grossProfit, revenue),
    operatingMargin: div(opIncome, revenue),
    netMargin: div(netIncome, revenue),
    ebitdaMargin: div(ebitda, revenue),
    roe: div(netIncome, avgEquity),
    roa: div(netIncome, avgAssets),
    roic: div(nopat, investedCapital),
    ebitda,
    pretaxMargin: div(ebt, revenue),
  };
}

/**
 * Compute solvency and leverage ratios from balance sheet + income statement.
 */
// NOTE (CFA deviation — intentional): debtToEquity and debtToAssets use total_liabilities
// (includes trade payables, accruals) rather than only interest-bearing debt.
// CFA strict: some debt ratios should use only interest-bearing debt.
// Rationale: TSE balance sheets often don't break out interest-bearing debt reliably.
// getInterestBearingDebt() IS used for ROIC and EV where the distinction matters most.
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
    debtToCapital: div(totalDebt, totalDebt != null && totalEquity != null ? totalDebt + totalEquity : null),
    fixedChargeCoverage: (() => {
      const leasePayments = li(inc, 'lease_payments') || li(inc, 'rental_expense') || 0;
      const ebit = inc?.operating_income || 0;
      const interest = interestExpense != null ? Math.abs(interestExpense) : 0;
      if (interest + leasePayments === 0) return null;
      return (ebit + leasePayments) / (interest + leasePayments);
    })(),
  };
}

/**
 * Compute liquidity ratios from balance sheet, income statement, and previous balance sheet.
 */
export function liquidityRatios(bs, inc, prevBs) {
  if (!bs) return {};
  const currentAssets = li(bs, 'current_assets');
  const currentLiabilities = li(bs, 'current_liabilities');
  const inventory = li(bs, 'inventories') || li(bs, 'inventory') || 0;
  const cash = li(bs, 'cash_and_equivalents') || li(bs, 'cash') || 0;
  const receivables = li(bs, 'trade_receivables') || li(bs, 'receivables') || li(bs, 'accounts_receivable') || 0;

  // CFA L1: Defensive Interval = Liquid Assets / Daily Cash Operating Expenses
  // Exclude non-cash items (depreciation/amortization) from operating expenses
  const depreciation = li(inc, 'depreciation_amortization') || li(inc, 'depreciation') || 0;
  const dailyExpenses = inc?.revenue != null && inc?.operating_income != null
    ? (inc.revenue - inc.operating_income - depreciation) / 365
    : null;
  const defensiveInterval = dailyExpenses != null && dailyExpenses > 0
    ? (cash + receivables) / dailyExpenses
    : null;

  // Cash Conversion Cycle = DOH + DSO - DPO
  let cashConversionCycle = null;
  if (inc) {
    const avgInv = prevBs
      ? ((li(bs, 'inventories') || li(bs, 'inventory') || 0) + (li(prevBs, 'inventories') || li(prevBs, 'inventory') || 0)) / 2
      : inventory;
    const avgRec = prevBs
      ? (receivables + (li(prevBs, 'trade_receivables') || li(prevBs, 'receivables') || li(prevBs, 'accounts_receivable') || 0)) / 2
      : receivables;
    const payables = li(bs, 'trade_payables') || li(bs, 'accounts_payable') || 0;
    const avgPay = prevBs
      ? (payables + (li(prevBs, 'trade_payables') || li(prevBs, 'accounts_payable') || 0)) / 2
      : payables;

    const invT = div(inc.cost_of_revenue, avgInv);
    const recT = div(inc.revenue, avgRec);
    const payT = div(inc.cost_of_revenue, avgPay);

    const doh = invT != null ? 365 / invT : null;
    const dso = recT != null ? 365 / recT : null;
    const dpo = payT != null ? 365 / payT : null;

    if (doh != null && dso != null && dpo != null) {
      cashConversionCycle = doh + dso - dpo;
    }
  }

  return {
    currentRatio: div(currentAssets, currentLiabilities),
    quickRatio: div(currentAssets != null ? currentAssets - inventory : null, currentLiabilities),
    cashRatio: div(cash, currentLiabilities),
    defensiveInterval,
    cashConversionCycle,
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

  const avgPayables = (() => {
    const cur = li(bs, 'trade_payables') || li(bs, 'accounts_payable');
    const prev = prevBs ? (li(prevBs, 'trade_payables') || li(prevBs, 'accounts_payable')) : null;
    if (cur == null) return null;
    return prev != null ? (cur + prev) / 2 : cur;
  })();

  const workingCapital = (() => {
    const ca = li(bs, 'current_assets');
    const cl = li(bs, 'current_liabilities');
    if (ca == null || cl == null) return null;
    const prevCa = prevBs ? li(prevBs, 'current_assets') : null;
    const prevCl = prevBs ? li(prevBs, 'current_liabilities') : null;
    const curWc = ca - cl;
    if (prevCa != null && prevCl != null) return (curWc + (prevCa - prevCl)) / 2;
    return curWc;
  })();

  const assetTurnover = div(revenue, avgAssets);
  const inventoryTurnover = div(costOfRevenue, avgInventory);
  const receivablesTurnover = div(revenue, avgReceivables);
  // NOTE (CFA deviation — intentional): Payables Turnover uses COGS as a proxy for Purchases.
  // CFA strict: Payables Turnover = Purchases / Avg Payables (Purchases = COGS + ΔInventory).
  // TSE data rarely provides a Purchases line item, so COGS is used as the best available proxy.
  const payablesTurnover = div(costOfRevenue, avgPayables);

  return {
    assetTurnover,
    equityTurnover: div(revenue, avgEquity),
    inventoryTurnover,
    receivablesTurnover,
    daysInventory: inventoryTurnover != null ? div(365, inventoryTurnover) : null,
    daysSalesOutstanding: receivablesTurnover != null ? div(365, receivablesTurnover) : null,
    payablesTurnover,
    daysPayable: payablesTurnover != null ? div(365, payablesTurnover) : null,
    workingCapitalTurnover: div(revenue, workingCapital),
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
  const interestDebt = getInterestBearingDebt(bs);

  // Enterprise Value = Market Cap + Interest-Bearing Debt - Cash (CFA L1)
  const ev = marketCap != null ? marketCap + interestDebt - cash : null;

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
    evToEbit: div(ev, inc?.operating_income),
    dividendPayout: div(li(inc, 'dividends_per_share') || li(inc, 'dps'), inc?.eps),
    retentionRate: (() => {
      const payout = div(li(inc, 'dividends_per_share') || li(inc, 'dps'), inc?.eps);
      return payout != null ? 1 - payout : null;
    })(),
    sustainableGrowthRate: (() => {
      const roe = div(inc?.net_income, bs?.total_equity);
      const payout = div(li(inc, 'dividends_per_share') || li(inc, 'dps'), inc?.eps);
      if (roe == null || payout == null) return null;
      return roe * (1 - payout);
    })(),
    priceToCashFlow: null, // populated in computeAllRatios when cash flow data available
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
export function dupontAnalysis(inc, bs, prevBs = null) {
  if (!inc || !bs) return { threeFactor: null, fiveFactor: null };

  const netIncome = inc.net_income;
  const revenue = inc.revenue;
  // CFA L1: DuPont uses average total assets and average equity
  const totalAssets = prevBs?.total_assets != null
    ? (bs.total_assets + prevBs.total_assets) / 2
    : bs.total_assets;
  const totalEquity = prevBs?.total_equity != null
    ? (bs.total_equity + prevBs.total_equity) / 2
    : bs.total_equity;
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

/**
 * Compute cash flow quality ratios (CFA L1/L2).
 * @param {Object} cf  - cash_flow statement record
 * @param {Object} inc - income_statement record
 * @param {Object} bs  - balance_sheet record
 * @returns {Object} cash flow ratios
 */
export function cashFlowRatios(cf, inc, bs) {
  if (!cf) return {};
  const cfo = li(cf, 'operating_cash_flow') || li(cf, 'cash_from_operations') || li(cf, 'net_cash_from_operating');
  const capex = Math.abs(li(cf, 'capital_expenditures') || li(cf, 'purchase_of_fixed_assets') || li(cf, 'capex') || 0);
  const depreciation = li(inc, 'depreciation_amortization') || li(inc, 'depreciation') || li(cf, 'depreciation_amortization') || li(cf, 'depreciation') || 0;

  const fcf = cfo != null ? cfo - capex : null;

  return {
    cfoToNetIncome: div(cfo, inc?.net_income),
    cfoToRevenue: div(cfo, inc?.revenue),
    fcf,
    fcfMargin: div(fcf, inc?.revenue),
    capexToCfo: div(capex, cfo),
    cashToIncome: div(cfo, inc?.operating_income),
    reinvestmentRatio: div(capex, depreciation || null),
  };
}

// ── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Compute all financial ratios for a single reporting period.
 *
 * @param {Object} params
 * @param {Object} params.incomeStatement   - income_statement for the period
 * @param {Object} params.balanceSheet      - balance_sheet for the period
 * @param {Object|null} params.prevBalanceSheet - previous period's balance_sheet (for averages)
 * @param {Object|null} params.cashFlowStatement - cash_flow statement for the period
 * @param {Object|null} params.market       - { market_cap, pe_ratio, close, total_shares }
 * @returns {Object} all ratios grouped by category
 */
export function computeAllRatios({ incomeStatement, balanceSheet, prevBalanceSheet = null, cashFlowStatement = null, market = null }) {
  const valRatios = valuationRatios(balanceSheet, incomeStatement, market);

  // Compute P/CF if cash flow data is available
  if (cashFlowStatement && market?.close && market?.total_shares) {
    const cfo = li(cashFlowStatement, 'operating_cash_flow') || li(cashFlowStatement, 'cash_from_operations') || li(cashFlowStatement, 'net_cash_from_operating');
    if (cfo != null && market.total_shares > 0) {
      valRatios.priceToCashFlow = div(market.close, cfo / market.total_shares);
    }
  }

  return {
    period: incomeStatement?.period_end_jalali || balanceSheet?.period_end_jalali || null,
    periodDate: incomeStatement?.period_end_date || balanceSheet?.period_end_date || null,
    periodMonths: incomeStatement?.period_months || balanceSheet?.period_months || null,
    isAudited: incomeStatement?.is_audited || balanceSheet?.is_audited || false,
    profitability: profitabilityRatios(incomeStatement, balanceSheet, prevBalanceSheet),
    solvency: solvencyRatios(balanceSheet, incomeStatement),
    liquidity: liquidityRatios(balanceSheet, incomeStatement, prevBalanceSheet),
    efficiency: efficiencyRatios(incomeStatement, balanceSheet, prevBalanceSheet),
    valuation: valRatios,
    dupont: dupontAnalysis(incomeStatement, balanceSheet, prevBalanceSheet),
    cashFlow: cashFlowRatios(cashFlowStatement, incomeStatement, balanceSheet),
  };
}

/**
 * Compute ratios for multiple periods and return a time-series.
 *
 * @param {Object} params
 * @param {Array} params.incomeStatements  - sorted by period_end_date ASC
 * @param {Array} params.balanceSheets     - sorted by period_end_date ASC
 * @param {Array} params.cashFlowStatements - sorted by period_end_date ASC
 * @param {Object|null} params.market      - latest market data for valuation
 * @returns {Array<Object>} array of ratio objects per period
 */
export function computeRatioTimeSeries({ incomeStatements = [], balanceSheets = [], cashFlowStatements = [], market = null }) {
  const bsByDate = {};
  for (const bs of balanceSheets) {
    bsByDate[bs.period_end_date] = bs;
  }

  const cfByDate = {};
  for (const cf of cashFlowStatements) {
    cfByDate[cf.period_end_date] = cf;
  }

  const results = [];
  const sortedInc = [...incomeStatements].sort(
    (a, b) => new Date(a.period_end_date) - new Date(b.period_end_date),
  );

  for (let i = 0; i < sortedInc.length; i++) {
    const inc = sortedInc[i];
    const bs = bsByDate[inc.period_end_date] || null;
    const prevBs = i > 0 ? (bsByDate[sortedInc[i - 1].period_end_date] || null) : null;
    const cf = cfByDate[inc.period_end_date] || null;

    const isLatest = i === sortedInc.length - 1;

    results.push(computeAllRatios({
      incomeStatement: inc,
      balanceSheet: bs,
      prevBalanceSheet: prevBs,
      cashFlowStatement: cf,
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
  pretaxMargin: { label: 'حاشیه سود قبل از مالیات', tip: 'سود قبل از مالیات تقسیم بر درآمد', format: 'pct' },

  // Solvency
  debtToEquity: { label: 'بدهی به حقوق صاحبان سهام', tip: 'کل بدهی تقسیم بر حقوق صاحبان سهام', format: 'x' },
  debtToAssets: { label: 'بدهی به دارایی', tip: 'کل بدهی تقسیم بر کل دارایی', format: 'pct' },
  equityRatio: { label: 'نسبت حقوق صاحبان سهام', tip: 'حقوق صاحبان سهام تقسیم بر کل دارایی', format: 'pct' },
  financialLeverage: { label: 'اهرم مالی', tip: 'کل دارایی تقسیم بر حقوق صاحبان سهام', format: 'x' },
  interestCoverage: { label: 'پوشش بهره', tip: 'سود عملیاتی تقسیم بر هزینه بهره', format: 'x' },
  debtToCapital: { label: 'بدهی به سرمایه', tip: 'بدهی تقسیم بر (بدهی + حقوق صاحبان سهام)', format: 'pct' },
  fixedChargeCoverage: { label: 'پوشش هزینه ثابت', tip: '(EBIT + اجاره) تقسیم بر (بهره + اجاره)', format: 'x' },

  // Liquidity
  currentRatio: { label: 'نسبت جاری', tip: 'دارایی جاری تقسیم بر بدهی جاری', format: 'x' },
  quickRatio: { label: 'نسبت آنی', tip: '(دارایی جاری - موجودی) تقسیم بر بدهی جاری', format: 'x' },
  cashRatio: { label: 'نسبت نقدی', tip: 'وجه نقد تقسیم بر بدهی جاری', format: 'x' },
  defensiveInterval: { label: 'فاصله تدافعی', tip: '(وجه نقد + مطالبات) تقسیم بر هزینه روزانه', format: 'day' },
  cashConversionCycle: { label: 'چرخه تبدیل وجه نقد', tip: 'DOH + DSO - DPO', format: 'day' },

  // Efficiency
  assetTurnover: { label: 'گردش دارایی', tip: 'درآمد تقسیم بر کل دارایی', format: 'x' },
  equityTurnover: { label: 'گردش حقوق صاحبان سهام', tip: 'درآمد تقسیم بر حقوق صاحبان سهام', format: 'x' },
  inventoryTurnover: { label: 'گردش موجودی', tip: 'بهای تمام شده تقسیم بر موجودی', format: 'x' },
  receivablesTurnover: { label: 'گردش مطالبات', tip: 'درآمد تقسیم بر مطالبات', format: 'x' },
  daysInventory: { label: 'روزهای موجودی', tip: '۳۶۵ تقسیم بر گردش موجودی', format: 'day' },
  daysSalesOutstanding: { label: 'دوره وصول مطالبات', tip: '۳۶۵ تقسیم بر گردش مطالبات', format: 'day' },
  payablesTurnover: { label: 'گردش حساب‌های پرداختنی', tip: 'بهای تمام شده تقسیم بر حساب‌های پرداختنی', format: 'x' },
  daysPayable: { label: 'دوره پرداخت', tip: '۳۶۵ تقسیم بر گردش حساب‌های پرداختنی', format: 'day' },
  workingCapitalTurnover: { label: 'گردش سرمایه در گردش', tip: 'درآمد تقسیم بر سرمایه در گردش', format: 'x' },

  // Valuation
  peRatio: { label: 'P/E', tip: 'قیمت تقسیم بر سود هر سهم', format: 'x' },
  priceToBook: { label: 'P/B', tip: 'قیمت تقسیم بر ارزش دفتری هر سهم', format: 'x' },
  priceToSales: { label: 'P/S', tip: 'ارزش بازار تقسیم بر درآمد', format: 'x' },
  evToEbitda: { label: 'EV/EBITDA', tip: 'ارزش شرکت تقسیم بر EBITDA', format: 'x' },
  earningsYield: { label: 'بازده سود', tip: 'معکوس P/E', format: 'pct' },
  dividendYield: { label: 'بازده سود نقدی', tip: 'سود نقدی هر سهم تقسیم بر قیمت', format: 'pct' },
  bookValuePerShare: { label: 'ارزش دفتری هر سهم', tip: 'حقوق صاحبان سهام تقسیم بر تعداد سهام', format: 'num' },
  evToEbit: { label: 'EV/EBIT', tip: 'ارزش شرکت تقسیم بر سود عملیاتی', format: 'x' },
  dividendPayout: { label: 'نسبت پرداخت سود', tip: 'سود نقدی هر سهم تقسیم بر EPS', format: 'pct' },
  retentionRate: { label: 'نسبت نگهداشت سود', tip: '۱ - نسبت پرداخت سود', format: 'pct' },
  sustainableGrowthRate: { label: 'نرخ رشد پایدار', tip: 'ROE × نسبت نگهداشت', format: 'pct' },
  priceToCashFlow: { label: 'P/CF', tip: 'قیمت تقسیم بر جریان نقدی عملیاتی هر سهم', format: 'x' },

  // DuPont components
  taxBurden: { label: 'بار مالیاتی', tip: 'سود خالص تقسیم بر سود قبل از مالیات', format: 'pct' },
  interestBurden: { label: 'بار بهره', tip: 'سود قبل از مالیات تقسیم بر سود عملیاتی', format: 'pct' },
  ebitMargin: { label: 'حاشیه EBIT', tip: 'سود عملیاتی تقسیم بر درآمد', format: 'pct' },
  leverage: { label: 'اهرم مالی', tip: 'کل دارایی تقسیم بر حقوق صاحبان سهام', format: 'x' },

  // Cash Flow
  cfoToNetIncome: { label: 'CFO به سود خالص', tip: 'جریان نقدی عملیاتی تقسیم بر سود خالص (کیفیت سود)', format: 'x' },
  cfoToRevenue: { label: 'CFO به درآمد', tip: 'جریان نقدی عملیاتی تقسیم بر درآمد', format: 'pct' },
  fcf: { label: 'جریان نقدی آزاد (FCF)', tip: 'CFO منهای مخارج سرمایه‌ای', format: 'num' },
  fcfMargin: { label: 'حاشیه FCF', tip: 'جریان نقدی آزاد تقسیم بر درآمد', format: 'pct' },
  capexToCfo: { label: 'CapEx به CFO', tip: 'مخارج سرمایه‌ای تقسیم بر جریان نقدی عملیاتی', format: 'pct' },
  cashToIncome: { label: 'نقد به سود عملیاتی', tip: 'CFO تقسیم بر سود عملیاتی', format: 'x' },
  reinvestmentRatio: { label: 'نسبت سرمایه‌گذاری مجدد', tip: 'مخارج سرمایه‌ای تقسیم بر استهلاک', format: 'x' },
};
