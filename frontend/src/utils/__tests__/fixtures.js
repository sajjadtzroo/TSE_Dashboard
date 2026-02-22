/**
 * Shared mock data for CFA/FRM formula verification tests.
 * All monetary values in million Rials (matching DB convention).
 */

// ── Income Statement ───────────────────────────────────────────
export const mockIncomeStatement = {
  period_end_date: '2024-03-20',
  period_end_jalali: '1402/12/29',
  period_months: 12,
  is_audited: true,
  revenue: 1000,
  cost_of_revenue: 600,
  gross_profit: 400,
  operating_income: 200,
  net_income: 120,
  eps: 12,
  line_items: {
    depreciation_amortization: 30,
    interest_expense: -40,
    income_before_tax: 160,
    lease_payments: 10,
    dividends_per_share: 6,
    rental_expense: 0,
  },
};

// ── Balance Sheet ──────────────────────────────────────────────
export const mockBalanceSheet = {
  period_end_date: '2024-03-20',
  period_end_jalali: '1402/12/29',
  period_months: 12,
  is_audited: true,
  total_assets: 5000,
  total_equity: 2000,
  total_liabilities: 3000,
  line_items: {
    current_assets: 1500,
    current_liabilities: 1000,
    inventories: 300,
    cash_and_equivalents: 200,
    trade_receivables: 400,
    trade_payables: 250,
    long_term_borrowings: 800,
    short_term_borrowings: 200,
  },
};

// ── Previous Balance Sheet (for average calculations) ──────────
export const mockPrevBalanceSheet = {
  period_end_date: '2023-03-21',
  period_end_jalali: '1401/12/29',
  period_months: 12,
  is_audited: true,
  total_assets: 4500,
  total_equity: 1800,
  total_liabilities: 2700,
  line_items: {
    current_assets: 1300,
    current_liabilities: 900,
    inventories: 260,
    cash_and_equivalents: 180,
    trade_receivables: 360,
    trade_payables: 220,
    long_term_borrowings: 700,
    short_term_borrowings: 180,
  },
};

// ── Cash Flow Statement ────────────────────────────────────────
export const mockCashFlowStatement = {
  period_end_date: '2024-03-20',
  period_end_jalali: '1402/12/29',
  period_months: 12,
  is_audited: true,
  line_items: {
    operating_cash_flow: 180,
    capital_expenditures: -50,
    depreciation_amortization: 30,
  },
};

// ── Market Data ────────────────────────────────────────────────
export const mockMarket = {
  market_cap: 10000,
  pe_ratio: 15,
  close: 500,
  total_shares: 20,
};

// ── Price History (30 days, deterministic) ─────────────────────
// Start at 100, known daily returns embedded
const basePrices = [
  100, 101, 99, 102, 103, 101, 100, 104, 105, 103,
  106, 107, 105, 108, 109, 107, 110, 111, 109, 112,
  113, 111, 114, 115, 113, 116, 117, 115, 118, 120,
];

export const mockPriceHistory = basePrices.map((close, i) => ({
  date: `2024-02-${String(i + 1).padStart(2, '0')}`,
  close,
  adj_close: close,
  volume: 1000000 + i * 10000,
}));

// ── Benchmark History (aligned dates) ──────────────────────────
const benchPrices = [
  1000, 1005, 998, 1010, 1015, 1008, 1002, 1020, 1025, 1018,
  1030, 1035, 1028, 1040, 1045, 1038, 1050, 1055, 1048, 1060,
  1065, 1058, 1070, 1075, 1068, 1080, 1085, 1078, 1090, 1100,
];

export const mockBenchmarkHistory = benchPrices.map((close, i) => ({
  date: `2024-02-${String(i + 1).padStart(2, '0')}`,
  close,
  adj_close: close,
  volume: 50000000 + i * 100000,
}));

// ── Order Book ─────────────────────────────────────────────────
export const mockOrderBook = [
  { demand_price: 498, supply_price: 502 },
  { demand_price: 497, supply_price: 503 },
  { demand_price: 496, supply_price: 504 },
];

// ── Helper: compute simple returns from price array ────────────
export function simpleReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

// Pre-computed return arrays for convenience
export const stockReturns = simpleReturns(basePrices);
export const benchReturns = simpleReturns(benchPrices);
