export const CRYPTO_PRESETS = [
  {
    label: 'صعودی (+۵٪)',
    apply: () => ({ changeMin: 5 }),
  },
  {
    label: 'نزولی (−۵٪)',
    apply: () => ({ changeMax: -5 }),
  },
  {
    label: 'حجم بالا',
    apply: () => ({ volumeMin: 100000000 }),
  },
  {
    label: 'ارزش بازار بالا',
    apply: () => ({ mcapMin: 10000000000 }),
  },
];
