export const PRESETS = [
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
