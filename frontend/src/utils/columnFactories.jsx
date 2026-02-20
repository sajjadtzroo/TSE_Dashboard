import PercentChangeCell from '../components/cells/PercentChangeCell';
import { toJalali } from './dateUtils';
import { formatNum, toPersianNum, formatTrillion } from './formatUtils';

// ── Generic column factories ──────────────────────────────────────────────

export const priceCol = (accessor, title, w = 90) => ({
  accessor, title, width: w, textAlign: 'end', sortable: true,
  render: (r) => formatNum(r[accessor]),
});

export const pctChangeCol = (accessor, title, w = 90) => ({
  accessor, title, width: w, textAlign: 'end', sortable: true,
  render: (r) => <PercentChangeCell value={r[accessor]} />,
});

export const numCol = (accessor, title, w = 80) => ({
  accessor, title, width: w, textAlign: 'end', sortable: true,
  render: (r) => formatNum(r[accessor]),
});

export const textCol = (accessor, title, w = 100) => ({
  accessor, title, width: w, sortable: true,
});

export const dateCol = (accessor, title, w = 90) => ({
  accessor, title, width: w, sortable: true,
  render: (r) => toJalali(r[accessor]),
});

export const trillionCol = (accessor, title, w = 110) => ({
  accessor, title, width: w, textAlign: 'end', sortable: true,
  render: (r) => formatTrillion(r[accessor]),
});

export const peCol = (accessor = 'pe_ratio', title = 'P/E', w = 65) => ({
  accessor, title, width: w, textAlign: 'end', sortable: true,
  render: (r) => r[accessor] != null ? toPersianNum(r[accessor].toFixed(2)) : '-',
});

// ── TSE-specific composite columns ────────────────────────────────────────

export const symbolCol = (w = 100) => textCol('symbol', 'نماد', w);
export const nameFaCol = (w = 160) => textCol('name_fa', 'نام', w);
export const sectorCol = (w = 160) => textCol('sector_name_fa', 'صنعت', w);
export const closeCol = (w = 100) => priceCol('close', 'قیمت پایانی', w);
export const closePctCol = (w = 90) => pctChangeCol('close_change_pct', 'تغییر ٪', w);
export const volumeCol = (w = 110) => numCol('volume', 'حجم', w);
export const tradesCol = (w = 75) => numCol('trades', 'تعداد معاملات', w);
export const epsCol = (w = 80) => numCol('eps', 'EPS', w);
export const marketCapCol = (w = 110) => trillionCol('market_cap', 'ارزش بازار', w);
export const lowCol = (w = 80) => priceCol('low', 'کمترین', w);
export const highCol = (w = 80) => priceCol('high', 'بیشترین', w);
