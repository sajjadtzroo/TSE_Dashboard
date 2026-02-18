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
};

export const STATUS_COLORS = {
  embedded: 'green',
  failed: 'red',
  downloaded: 'blue',
  extracting: 'orange',
  embedding: 'orange',
  pending: 'yellow',
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
];
