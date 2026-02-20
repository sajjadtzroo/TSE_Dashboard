import { Badge } from '@mantine/core';
import { priceCol, pctChangeCol, dateCol, numCol, textCol } from '../../utils/columnFactories';
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
    textCol('contract_code', 'کد', 110),
    {
      accessor: 'option_type', title: 'نوع', width: 60,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.option_type === 'call' ? 'rally-green' : 'rally-orange'}>
          {r.option_type === 'call' ? 'خرید' : 'فروش'}
        </Badge>
      ),
    },
    textCol('commodity', 'کالا', 80),
    priceCol('price_strike', 'قیمت اعمال'),
    dateCol('date_end', 'سررسید'),
    { accessor: 'day_remain', title: 'روز مانده', width: 70, textAlign: 'end' },
    priceCol('last', 'آخرین', 85),
    pctChangeCol('last_change_pct', 'تغییر٪'),
    numCol('volume', 'حجم'),
    numCol('interest_open', 'موقعیت باز', 95),
    priceCol('settlement_price', 'تسویه'),
    priceCol('bid_price_1', 'خرید', 80),
    priceCol('ask_price_1', 'فروش', 80),
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
    textCol('contract_code', 'کد'),
    textCol('contract_description', 'شرح', 160),
    dateCol('date_end', 'سررسید'),
    { accessor: 'day_remain', title: 'روز مانده', width: 70, textAlign: 'end' },
    priceCol('last', 'آخرین'),
    pctChangeCol('last_change_pct', 'تغییر٪'),
    priceCol('settlement_price', 'تسویه'),
    numCol('volume', 'حجم'),
    numCol('interest_open', 'موقعیت باز', 95),
    priceCol('margin_initial', 'وجه تضمین'),
    priceCol('bid_price_1', 'خرید', 80),
    priceCol('ask_price_1', 'فروش', 80),
    numCol('trades', 'معاملات', 65),
  ],
};

// ── IME Forwards ────────────────────────────────────────────────────────────

export const imeForwardsConfig = {
  endpoint: '/api/ime/forwards',
  title: 'سلف بورس کالا',
  exportFilename: 'ime_forwards',
  badgeLabel: 'سلف',
  columns: [
    textCol('symbol', 'نماد'),
    textCol('name', 'نام', 160),
    priceCol('last', 'آخرین'),
    pctChangeCol('last_change_pct', 'تغییر٪'),
    priceCol('settlement_price', 'تسویه'),
    priceCol('close', 'پایانی'),
    numCol('volume', 'حجم'),
    numCol('trades', 'معاملات', 65),
    priceCol('bid_price_1', 'خرید', 80),
    priceCol('ask_price_1', 'فروش', 80),
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
    textCol('symbol', 'نماد'),
    textCol('name', 'نام', 160),
    priceCol('last', 'آخرین'),
    pctChangeCol('last_change_pct', 'تغییر٪'),
    priceCol('settlement_price', 'تسویه'),
    priceCol('close', 'پایانی'),
    numCol('volume', 'حجم'),
    numCol('trades', 'معاملات', 65),
    priceCol('bid_price_1', 'خرید', 80),
    priceCol('ask_price_1', 'فروش', 80),
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
    textCol('symbol', 'نماد', 90),
    textCol('name', 'نام', 160),
    textCol('code_offer', 'کد عرضه', 90),
    textCol('producer', 'تولیدکننده', 130),
    priceCol('price_last', 'آخرین قیمت'),
    priceCol('price_base_offer', 'قیمت پایه'),
    numCol('volume_contract', 'حجم قرارداد'),
    numCol('demand', 'تقاضا'),
    priceCol('value', 'ارزش'),
    textCol('settlement_type', 'تسویه', 80),
    textCol('market_hall', 'تالار', 80),
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
    textCol('contract_code', 'کد'),
    textCol('name', 'نام', 160),
    textCol('commodity', 'کالا'),
    priceCol('last', 'آخرین'),
    pctChangeCol('last_change_pct', 'تغییر٪'),
    priceCol('settlement_price', 'تسویه'),
    priceCol('close', 'پایانی'),
    numCol('volume', 'حجم'),
    numCol('trades', 'معاملات', 65),
    priceCol('bid_price_1', 'خرید', 80),
    priceCol('ask_price_1', 'فروش', 80),
  ],
};
