export const TOOL_LABELS = {
  search_documents: 'جستجوی اسناد',
  get_stock_price: 'قیمت سهم',
  get_stock_history: 'سابقه',
  get_order_book: 'دفتر سفارش',
  get_market_indices: 'شاخص‌ها',
  get_sector_stocks: 'صنعت',
  get_market_prices: 'قیمت بازار',
  get_etf_nav: 'NAV صندوق',
  get_client_type_data: 'حقیقی/حقوقی',
  get_shareholders: 'سهامداران',
  get_codal_announcements: 'کدال',
  compute_technical_indicators: 'اندیکاتورها',
  get_support_resistance: 'حمایت/مقاومت',
  compare_stocks: 'مقایسه',
  screen_stocks: 'فیلتر',
  search_loan_products: 'جستجوی تسهیلات',
  get_loan_details: 'جزئیات تسهیلات',
  list_banks: 'بانک‌ها',
  calculate_loan_installment: 'اقساط',
  get_crypto_price: 'قیمت رمزارز',
  get_crypto_history: 'سابقه رمزارز',
  compare_crypto: 'مقایسه رمزارز',
  get_crypto_market_overview: 'بازار رمزارز',
  get_crypto_fear_greed: 'شاخص ترس/طمع',
  web_search: 'جستجوی اینترنت',
  search_cfa_documents: 'جستجوی CFA',
};

export const TOOL_CATEGORIES = {
  get_stock_price: 'green',
  get_stock_history: 'green',
  get_order_book: 'green',
  get_market_indices: 'green',
  get_sector_stocks: 'green',
  get_market_prices: 'green',
  get_etf_nav: 'green',
  get_client_type_data: 'green',
  get_shareholders: 'green',
  compute_technical_indicators: 'blue',
  get_support_resistance: 'blue',
  search_documents: 'yellow',
  get_codal_announcements: 'yellow',
  compare_stocks: 'cyan',
  screen_stocks: 'cyan',
  search_loan_products: 'violet',
  get_loan_details: 'violet',
  list_banks: 'violet',
  calculate_loan_installment: 'violet',
  get_crypto_price: 'orange',
  get_crypto_history: 'orange',
  compare_crypto: 'orange',
  get_crypto_market_overview: 'orange',
  get_crypto_fear_greed: 'orange',
  web_search: 'teal',
  search_cfa_documents: 'pink',
};

export const STATUS_COLORS = {
  embedded: 'green',
  failed: 'red',
  downloaded: 'blue',
  extracting: 'orange',
  embedding: 'orange',
  pending: 'yellow',
};

export const CONTEXT_PROMPTS = {
  stock: (sym) => [
    { label: 'بازار سهام', prompt: sym ? `قیمت ${sym} چقدره؟` : 'قیمت فولاد چقدره؟', colorName: 'green' },
    { label: 'تحلیل تکنیکال', prompt: sym ? `حمایت و مقاومت ${sym}` : 'حمایت و مقاومت فولاد', colorName: 'blue' },
  ],
  crypto: (sym) => [
    { label: 'رمزارزها', prompt: sym ? `قیمت ${sym} چقدره؟` : 'قیمت بیت‌کوین چقدره؟', colorName: 'orange' },
  ],
  loans: () => [
    { label: 'تسهیلات بانکی', prompt: 'شرایط وام مسکن', colorName: 'purple' },
  ],
};

export const CHAT_CATEGORIES = [
  {
    label: 'بازار سهام',
    prompt: 'قیمت فولاد چقدره؟',
    color: '#10B981',
    colorName: 'green',
  },
  {
    label: 'تسهیلات بانکی',
    prompt: 'شرایط وام مسکن',
    color: '#8B5CF6',
    colorName: 'purple',
  },
  {
    label: 'تحلیل تکنیکال',
    prompt: 'حمایت و مقاومت فولاد',
    color: '#3B82F6',
    colorName: 'blue',
  },
  {
    label: 'رمزارزها',
    prompt: 'قیمت بیت‌کوین چقدره؟',
    color: '#F59E0B',
    colorName: 'orange',
  },
  {
    label: 'مفاهیم CFA',
    prompt: 'مدل CAPM رو توضیح بده',
    color: '#EC4899',
    colorName: 'pink',
  },
];
