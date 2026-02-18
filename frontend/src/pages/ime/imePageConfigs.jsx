import { Badge } from '@mantine/core';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import { toJalali } from '../../utils/dateUtils';
import { formatNum } from '../../utils/formatUtils';

// ── IME Options ─────────────────────────────────────────────────────────────

export const imeOptionsConfig = {
  endpoint: '/api/ime/options',
  title: 'اختیار بورس کالا',
  exportFilename: 'ime_options',
  badgeLabel: 'اختیار',
  pinLeftColumns: true,
  filters: [
    {
      key: 'commodity',
      param: 'commodity',
      placeholder: 'کالا',
      width: 160,
      deriveOptions: (data) =>
        [...new Set(data.map((o) => o.commodity).filter(Boolean))].sort(),
    },
    {
      key: 'optionType',
      param: 'option_type',
      placeholder: 'نوع اختیار',
      width: 130,
      staticOptions: [
        { value: 'call', label: 'خرید' },
        { value: 'put', label: 'فروش' },
      ],
    },
  ],
  extraBadges: (data) => {
    const callCount = data.filter((o) => o.option_type === 'call').length;
    const putCount = data.filter((o) => o.option_type === 'put').length;
    return [
      { label: `${formatNum(callCount)} خرید`, color: 'rally-green' },
      { label: `${formatNum(putCount)} فروش`, color: 'rally-orange' },
    ];
  },
  columns: [
    { accessor: 'contract_code', title: 'کد', width: 110 },
    {
      accessor: 'option_type', title: 'نوع', width: 60,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.option_type === 'call' ? 'rally-green' : 'rally-orange'}>
          {r.option_type === 'call' ? 'خرید' : 'فروش'}
        </Badge>
      ),
    },
    { accessor: 'commodity', title: 'کالا', width: 80 },
    { accessor: 'price_strike', title: 'قیمت اعمال', width: 90, textAlign: 'end', render: (r) => formatNum(r.price_strike) },
    { accessor: 'date_end', title: 'سررسید', width: 90, render: (r) => toJalali(r.date_end) },
    { accessor: 'day_remain', title: 'روز مانده', width: 70, textAlign: 'end' },
    { accessor: 'last', title: 'آخرین', width: 85, textAlign: 'end', render: (r) => formatNum(r.last) },
    { accessor: 'last_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'interest_open', title: 'موقعیت باز', width: 95, textAlign: 'end', render: (r) => formatNum(r.interest_open) },
    { accessor: 'settlement_price', title: 'تسویه', width: 90, textAlign: 'end', render: (r) => formatNum(r.settlement_price) },
    { accessor: 'bid_price_1', title: 'خرید', width: 80, textAlign: 'end', render: (r) => formatNum(r.bid_price_1) },
    { accessor: 'ask_price_1', title: 'فروش', width: 80, textAlign: 'end', render: (r) => formatNum(r.ask_price_1) },
  ],
};

// ── IME Futures ─────────────────────────────────────────────────────────────

export const imeFuturesConfig = {
  endpoint: '/api/ime/futures',
  title: 'آتی بورس کالا',
  exportFilename: 'ime_futures',
  badgeLabel: 'قرارداد',
  pinLeftColumns: true,
  columns: [
    { accessor: 'contract_code', title: 'کد', width: 100 },
    { accessor: 'contract_description', title: 'شرح', width: 160 },
    { accessor: 'date_end', title: 'سررسید', width: 90, render: (r) => toJalali(r.date_end) },
    { accessor: 'day_remain', title: 'روز مانده', width: 70, textAlign: 'end' },
    { accessor: 'last', title: 'آخرین', width: 90, textAlign: 'end', render: (r) => formatNum(r.last) },
    { accessor: 'last_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'settlement_price', title: 'تسویه', width: 90, textAlign: 'end', render: (r) => formatNum(r.settlement_price) },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'interest_open', title: 'موقعیت باز', width: 95, textAlign: 'end', render: (r) => formatNum(r.interest_open) },
    { accessor: 'margin_initial', title: 'وجه تضمین', width: 90, textAlign: 'end', render: (r) => formatNum(r.margin_initial) },
    { accessor: 'bid_price_1', title: 'خرید', width: 80, textAlign: 'end', render: (r) => formatNum(r.bid_price_1) },
    { accessor: 'ask_price_1', title: 'فروش', width: 80, textAlign: 'end', render: (r) => formatNum(r.ask_price_1) },
    { accessor: 'trades', title: 'معاملات', width: 65, textAlign: 'end', render: (r) => formatNum(r.trades) },
  ],
};

// ── IME Forwards ────────────────────────────────────────────────────────────

export const imeForwardsConfig = {
  endpoint: '/api/ime/forwards',
  title: 'سلف بورس کالا',
  exportFilename: 'ime_forwards',
  badgeLabel: 'سلف',
  columns: [
    { accessor: 'symbol', title: 'نماد', width: 100 },
    { accessor: 'name', title: 'نام', width: 160 },
    { accessor: 'last', title: 'آخرین', width: 90, textAlign: 'end', render: (r) => formatNum(r.last) },
    { accessor: 'last_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'settlement_price', title: 'تسویه', width: 90, textAlign: 'end', render: (r) => formatNum(r.settlement_price) },
    { accessor: 'close', title: 'پایانی', width: 90, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'معاملات', width: 65, textAlign: 'end', render: (r) => formatNum(r.trades) },
    { accessor: 'bid_price_1', title: 'خرید', width: 80, textAlign: 'end', render: (r) => formatNum(r.bid_price_1) },
    { accessor: 'ask_price_1', title: 'فروش', width: 80, textAlign: 'end', render: (r) => formatNum(r.ask_price_1) },
  ],
};

// ── IME Funds ───────────────────────────────────────────────────────────────

export const imeFundsConfig = {
  endpoint: '/api/ime/funds',
  title: 'صندوق کالایی',
  exportFilename: 'ime_funds',
  badgeLabel: 'صندوق',
  pinLeftColumns: true,
  columns: [
    { accessor: 'symbol', title: 'نماد', width: 100 },
    { accessor: 'name', title: 'نام', width: 160 },
    { accessor: 'last', title: 'آخرین', width: 90, textAlign: 'end', render: (r) => formatNum(r.last) },
    { accessor: 'last_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'settlement_price', title: 'تسویه', width: 90, textAlign: 'end', render: (r) => formatNum(r.settlement_price) },
    { accessor: 'close', title: 'پایانی', width: 90, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'معاملات', width: 65, textAlign: 'end', render: (r) => formatNum(r.trades) },
    { accessor: 'bid_price_1', title: 'خرید', width: 80, textAlign: 'end', render: (r) => formatNum(r.bid_price_1) },
    { accessor: 'ask_price_1', title: 'فروش', width: 80, textAlign: 'end', render: (r) => formatNum(r.ask_price_1) },
  ],
};

// ── IME Physical ────────────────────────────────────────────────────────────

export const imePhysicalConfig = {
  endpoint: '/api/ime/physical',
  title: 'فیزیکی بورس کالا',
  exportFilename: 'ime_physical',
  badgeLabel: 'مورد',
  pinLeftColumns: true,
  columns: [
    { accessor: 'symbol', title: 'نماد', width: 90 },
    { accessor: 'name', title: 'نام', width: 160 },
    { accessor: 'code_offer', title: 'کد عرضه', width: 90 },
    { accessor: 'producer', title: 'تولیدکننده', width: 130 },
    { accessor: 'price_last', title: 'آخرین قیمت', width: 90, textAlign: 'end', render: (r) => formatNum(r.price_last) },
    { accessor: 'price_base_offer', title: 'قیمت پایه', width: 90, textAlign: 'end', render: (r) => formatNum(r.price_base_offer) },
    { accessor: 'volume_contract', title: 'حجم قرارداد', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume_contract) },
    { accessor: 'demand', title: 'تقاضا', width: 80, textAlign: 'end', render: (r) => formatNum(r.demand) },
    { accessor: 'value', title: 'ارزش', width: 90, textAlign: 'end', render: (r) => formatNum(r.value) },
    { accessor: 'settlement_type', title: 'تسویه', width: 80 },
    { accessor: 'market_hall', title: 'تالار', width: 80 },
  ],
};

// ── IME Certificates ────────────────────────────────────────────────────────

export const imeCertificatesConfig = {
  endpoint: '/api/ime/certificates',
  title: 'گواهی سپرده کالایی',
  exportFilename: 'ime_certificates',
  badgeLabel: 'گواهی',
  pinLeftColumns: true,
  clientFilter: {
    key: 'certType',
    type: 'segmented',
    defaultValue: 'all',
    data: [
      { label: 'همه', value: 'all' },
      { label: 'عمومی', value: '1' },
      { label: 'سکه/زعفران', value: '2' },
    ],
    filterFn: (data, value) =>
      value === 'all' ? data : data.filter((r) => String(r.cert_type) === value),
  },
  columns: [
    { accessor: 'contract_code', title: 'کد', width: 100 },
    { accessor: 'name', title: 'نام', width: 160 },
    { accessor: 'commodity', title: 'کالا', width: 100 },
    { accessor: 'last', title: 'آخرین', width: 90, textAlign: 'end', render: (r) => formatNum(r.last) },
    { accessor: 'last_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'settlement_price', title: 'تسویه', width: 90, textAlign: 'end', render: (r) => formatNum(r.settlement_price) },
    { accessor: 'close', title: 'پایانی', width: 90, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'معاملات', width: 65, textAlign: 'end', render: (r) => formatNum(r.trades) },
    { accessor: 'bid_price_1', title: 'خرید', width: 80, textAlign: 'end', render: (r) => formatNum(r.bid_price_1) },
    { accessor: 'ask_price_1', title: 'فروش', width: 80, textAlign: 'end', render: (r) => formatNum(r.ask_price_1) },
  ],
};
