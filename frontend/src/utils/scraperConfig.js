export const SCRAPER_ACTIONS = [
  {
    key: 'prices',
    label: 'بروزرسانی قیمت‌ها (~۲ دقیقه)',
    description: 'اسکرپر قیمت‌ها اجرا می‌شود. ممکن است تا ۲ دقیقه طول بکشد.',
    spider: 'market_watch',
    delayMs: 30000,
  },
  {
    key: 'financials',
    label: 'بروزرسانی مالی (~۵ دقیقه)',
    description: 'اسکرپر اطلاعات مالی اجرا می‌شود. ممکن است تا ۵ دقیقه طول بکشد.',
    spider: 'instrument_details',
    delayMs: 30000,
  },
  {
    key: 'all',
    label: 'بروزرسانی همه (~۵ دقیقه)',
    description: 'همه اسکرپرها به صورت همزمان اجرا می‌شوند. ممکن است تا ۵ دقیقه طول بکشد.',
    spider: null,
    delayMs: 180000,
  },
];
