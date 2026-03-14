/**
 * Returns up to 4 contextual follow-up suggestions based on the tools used
 * in the assistant's response, source types, and the current symbol context.
 */
const TOOL_TEMPLATES = {
  get_stock_price: (sym) =>
    sym
      ? [`دفتر سفارش ${sym}`, `سهامداران عمده ${sym}`]
      : ['دفتر سفارش این نماد', 'سهامداران عمده'],
  compute_technical_indicators: (sym) =>
    sym
      ? [`سطح حمایت و مقاومت ${sym}`, `RSI و MACD ${sym}`]
      : ['سطح حمایت و مقاومت', 'تحلیل RSI و MACD'],
  get_market_indices: () => ['وضعیت صنایع مختلف', 'نمادهای پرتراکنش'],
  search_documents: (sym) =>
    sym
      ? [`گزارش مالی ${sym} رو خلاصه کن`, 'بیشتر از این سند نشون بده']
      : ['خلاصه گزارش مالی', 'بیشتر از این سند نشون بده'],
  get_codal_announcements: (sym) =>
    sym
      ? [`گزارش مالی ${sym} رو خلاصه کن`]
      : ['آخرین اطلاعیه‌های کدال'],
  get_crypto_price: (sym) =>
    sym
      ? [`شاخص ترس و طمع`, `نمودار ${sym} در ۳۰ روز`]
      : ['شاخص ترس و طمع', 'نمودار بیت‌کوین در ۳۰ روز'],
  search_loan_products: () => ['مقایسه وام‌ها', 'محاسبه قسط ماهانه'],
  web_search: () => ['اطلاعات بیشتر'],
  search_cfa_documents: () => ['مثال عددی بزن', 'مفهوم مرتبط بعدی'],
  get_stock_history: (sym) =>
    sym
      ? [`تحلیل تکنیکال ${sym}`, `مقایسه با شاخص`]
      : ['تحلیل تکنیکال', 'مقایسه با شاخص'],
  get_order_book: (sym) =>
    sym
      ? [`حقیقی/حقوقی ${sym}`]
      : ['حقیقی/حقوقی'],
  get_client_type_data: (sym) =>
    sym
      ? [`سابقه معاملاتی ${sym}`]
      : ['سابقه معاملاتی'],
  get_shareholders: (sym) =>
    sym
      ? [`تغییرات سهامداران ${sym}`]
      : ['تغییرات سهامداران'],
  compare_stocks: () => ['نمودار مقایسه‌ای', 'بهترین نماد کدومه؟'],
  compare_crypto: () => ['نمودار مقایسه‌ای', 'کدوم بهتره؟'],
};

const FALLBACK = ['سوال دیگه‌ای دارم', 'خلاصه‌تر توضیح بده'];

export function getFollowUpSuggestions({ toolsUsed = [], sources = [], symbol }) {
  const suggestions = [];

  for (const tool of toolsUsed) {
    const templateFn = TOOL_TEMPLATES[tool];
    if (templateFn) {
      suggestions.push(...templateFn(symbol));
    }
  }

  // Document-specific follow-ups when search_documents was used and sources exist
  if (
    toolsUsed.includes('search_documents') &&
    sources.length > 0 &&
    !suggestions.includes('بیشتر از این سند نشون بده')
  ) {
    suggestions.push('بیشتر از این سند نشون بده');
  }

  // Comparison follow-ups when multiple symbols are mentioned in sources
  const uniqueSymbols = new Set(sources.filter((s) => s.symbol).map((s) => s.symbol));
  if (uniqueSymbols.size >= 2) {
    suggestions.push('مقایسه این نمادها');
  }

  // Deduplicate
  const unique = [...new Set(suggestions)];

  if (unique.length === 0) {
    return FALLBACK.slice(0, 2);
  }

  return unique.slice(0, 4);
}
