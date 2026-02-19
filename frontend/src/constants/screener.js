export const PRESETS = [
  {
    label: 'صف خرید (+۵٪)',
    apply: () => ({ changeMin: 4.5 }),
  },
  {
    label: 'صف فروش (−۵٪)',
    apply: () => ({ changeMax: -4.5 }),
  },
  {
    label: 'حجم بالا',
    apply: () => ({ volumeMin: 10000000 }),
  },
  {
    label: 'تغییر مثبت',
    apply: () => ({ changeMin: 0.01 }),
  },
  {
    label: 'P/E پایین',
    apply: () => ({ peMax: 10 }),
  },
  {
    label: 'EPS بالا',
    apply: () => ({ epsMin: 500 }),
  },
];
