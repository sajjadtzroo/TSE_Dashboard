/**
 * Financial statements page configuration — labels, tabs, and field mappings
 */

// ── Hot field labels (Persian) ──────────────────────────────────────────────

export const HOT_FIELD_LABELS = {
  revenue: 'درآمد عملیاتی',
  cost_of_revenue: 'بهای تمام شده',
  gross_profit: 'سود ناخالص',
  operating_income: 'سود عملیاتی',
  net_income: 'سود خالص',
  total_assets: 'جمع دارایی‌ها',
  total_liabilities: 'جمع بدهی‌ها',
  total_equity: 'جمع حقوق مالکانه',
  eps: 'سود هر سهم',
};

// ── Hot fields per statement type ───────────────────────────────────────────

export const HOT_FIELDS_BY_TYPE = {
  income_statement: ['revenue', 'cost_of_revenue', 'gross_profit', 'operating_income', 'net_income', 'eps'],
  balance_sheet: ['total_assets', 'total_liabilities', 'total_equity'],
  cash_flow: ['net_income'],
  comprehensive_income: ['net_income'],
  equity_changes: ['total_equity'],
};

// ── Statement type tabs ─────────────────────────────────────────────────────

export const STATEMENT_TYPE_TABS = [
  { value: 'income_statement', label: 'سود و زیان' },
  { value: 'balance_sheet', label: 'ترازنامه' },
  { value: 'cash_flow', label: 'جریان وجوه نقد' },
  { value: 'comprehensive_income', label: 'سود جامع' },
  { value: 'equity_changes', label: 'تغییرات حقوق مالکانه' },
];

// ── Period filter options ───────────────────────────────────────────────────

export const PERIOD_OPTIONS = [
  { value: '', label: 'همه' },
  { value: '3', label: '۳ ماهه' },
  { value: '6', label: '۶ ماهه' },
  { value: '12', label: 'سالانه' },
];
