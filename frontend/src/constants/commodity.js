/**
 * Commodity market constants and configuration.
 * Full list matching tradingeconomics.com/commodities
 * Only includes symbols with Yahoo Finance futures data.
 */

/** All tracked commodities — must match COMMODITY_REGISTRY in commodity_fetcher.py */
export const COMMODITY_SYMBOLS = {
  // ─── Energy ────────────────────────────────────────────────────────────────
  'WTI':       { yf: 'CL=F',  name: 'Crude Oil WTI',       name_fa: 'نفت خام WTI',       unit: 'USD/bbl',   category: 'energy' },
  'BRENT':     { yf: 'BZ=F',  name: 'Brent Crude Oil',     name_fa: 'نفت برنت',           unit: 'USD/bbl',   category: 'energy' },
  'NATGAS':    { yf: 'NG=F',  name: 'Natural Gas',          name_fa: 'گاز طبیعی',         unit: 'USD/MMBtu', category: 'energy' },
  'GASOLINE':  { yf: 'RB=F',  name: 'Gasoline RBOB',        name_fa: 'بنزین',             unit: 'USD/gal',   category: 'energy' },
  'HEAT':      { yf: 'HO=F',  name: 'Heating Oil',          name_fa: 'نفت گرمایشی',       unit: 'USD/gal',   category: 'energy' },
  'ETHANOL':   { yf: 'EH=F',  name: 'Ethanol',              name_fa: 'اتانول',            unit: 'USD/gal',   category: 'energy' },
  'URANIUM':   { yf: 'UX=F',  name: 'Uranium',              name_fa: 'اورانیوم',          unit: 'USD/lb',    category: 'energy' },
  'PROPANE':   { yf: 'B0=F',  name: 'Propane',              name_fa: 'پروپان',            unit: 'USD/gal',   category: 'energy' },
  'TTF_GAS':   { yf: 'TTF=F', name: 'TTF Gas (EU)',         name_fa: 'گاز TTF اروپا',     unit: 'EUR/MWh',   category: 'energy' },

  // ─── Metals ────────────────────────────────────────────────────────────────
  'GOLD':      { yf: 'GC=F',  name: 'Gold',                 name_fa: 'طلا',               unit: 'USD/oz',    category: 'metals' },
  'SILVER':    { yf: 'SI=F',  name: 'Silver',               name_fa: 'نقره',              unit: 'USD/oz',    category: 'metals' },
  'PLATINUM':  { yf: 'PL=F',  name: 'Platinum',             name_fa: 'پلاتین',            unit: 'USD/oz',    category: 'metals' },
  'PALLADIUM': { yf: 'PA=F',  name: 'Palladium',            name_fa: 'پالادیوم',          unit: 'USD/oz',    category: 'metals' },
  'COPPER':    { yf: 'HG=F',  name: 'Copper',               name_fa: 'مس',                unit: 'USD/lb',    category: 'metals' },
  'ALUMINUM':  { yf: 'ALI=F', name: 'Aluminum',             name_fa: 'آلومینیوم',         unit: 'USD/t',     category: 'metals' },
  'ZINC':      { yf: 'ZN=F',  name: 'Zinc',                 name_fa: 'روی',               unit: 'USD/t',     category: 'metals' },
  'NICKEL':    { yf: 'NI=F',  name: 'Nickel',               name_fa: 'نیکل',              unit: 'USD/t',     category: 'metals' },
  'LEAD':      { yf: 'LD=F',  name: 'Lead',                 name_fa: 'سرب',               unit: 'USD/t',     category: 'metals' },
  'TIN':       { yf: 'SN=F',  name: 'Tin',                  name_fa: 'قلع',               unit: 'USD/t',     category: 'metals' },
  'IRON_ORE':  { yf: 'TIO=F', name: 'Iron Ore 62% Fe',      name_fa: 'سنگ‌آهن',           unit: 'USD/t',     category: 'metals' },
  'HRC_STEEL': { yf: 'HRC=F', name: 'HRC Steel',            name_fa: 'فولاد نورد گرم',    unit: 'USD/t',     category: 'metals' },
  'LITHIUM':   { yf: 'LITH=F',name: 'Lithium Carbonate',    name_fa: 'لیتیوم',            unit: 'USD/t',     category: 'metals' },
  'COBALT':    { yf: 'COBALT=F',name: 'Cobalt',             name_fa: 'کبالت',             unit: 'USD/t',     category: 'metals' },

  // ─── Agricultural ──────────────────────────────────────────────────────────
  'CORN':      { yf: 'ZC=F',  name: 'Corn',                 name_fa: 'ذرت',               unit: 'USc/bu',    category: 'agricultural' },
  'WHEAT':     { yf: 'ZW=F',  name: 'Wheat',                name_fa: 'گندم',              unit: 'USc/bu',    category: 'agricultural' },
  'SOYBEAN':   { yf: 'ZS=F',  name: 'Soybeans',             name_fa: 'سویا',              unit: 'USc/bu',    category: 'agricultural' },
  'SOY_OIL':   { yf: 'ZL=F',  name: 'Soybean Oil',          name_fa: 'روغن سویا',         unit: 'USc/lb',    category: 'agricultural' },
  'SOY_MEAL':  { yf: 'ZM=F',  name: 'Soybean Meal',         name_fa: 'کنجاله سویا',       unit: 'USD/t',     category: 'agricultural' },
  'OATS':      { yf: 'ZO=F',  name: 'Oats',                 name_fa: 'جو دوسر',           unit: 'USc/bu',    category: 'agricultural' },
  'RICE':      { yf: 'ZR=F',  name: 'Rough Rice',           name_fa: 'برنج',              unit: 'USc/cwt',   category: 'agricultural' },
  'CANOLA':    { yf: 'RS=F',  name: 'Canola',               name_fa: 'کانولا',            unit: 'CAD/t',     category: 'agricultural' },
  'COFFEE':    { yf: 'KC=F',  name: 'Coffee Arabica',       name_fa: 'قهوه عربیکا',       unit: 'USc/lb',    category: 'agricultural' },
  'SUGAR':     { yf: 'SB=F',  name: 'Sugar #11',            name_fa: 'شکر',               unit: 'USc/lb',    category: 'agricultural' },
  'COTTON':    { yf: 'CT=F',  name: 'Cotton #2',            name_fa: 'پنبه',              unit: 'USc/lb',    category: 'agricultural' },
  'COCOA':     { yf: 'CC=F',  name: 'Cocoa',                name_fa: 'کاکائو',            unit: 'USD/t',     category: 'agricultural' },
  'OJ':        { yf: 'OJ=F',  name: 'Orange Juice',         name_fa: 'آب پرتقال',         unit: 'USc/lb',    category: 'agricultural' },
  'LUMBER':    { yf: 'LBS=F', name: 'Lumber',               name_fa: 'الوار',             unit: 'USD/mbf',   category: 'agricultural' },
  'MILK':      { yf: 'DC=F',  name: 'Class III Milk',       name_fa: 'شیر',               unit: 'USD/cwt',   category: 'agricultural' },
  'CHEESE':    { yf: 'CSC=F', name: 'Cheese',               name_fa: 'پنیر',              unit: 'USD/lb',    category: 'agricultural' },

  // ─── Livestock ─────────────────────────────────────────────────────────────
  'CATTLE':    { yf: 'LE=F',  name: 'Live Cattle',          name_fa: 'گاو زنده',          unit: 'USc/lb',    category: 'livestock' },
  'FEEDER':    { yf: 'GF=F',  name: 'Feeder Cattle',        name_fa: 'گاو پرواری',        unit: 'USc/lb',    category: 'livestock' },
  'HOGS':      { yf: 'HE=F',  name: 'Lean Hogs',            name_fa: 'خوک',               unit: 'USc/lb',    category: 'livestock' },
};

/** All commodity symbol keys */
export const COMMODITY_KEYS = Object.keys(COMMODITY_SYMBOLS);

/** Category labels (Persian) — matches tradingeconomics.com */
export const COMMODITY_CATEGORIES = {
  energy: 'انرژی',
  metals: 'فلزات',
  agricultural: 'کشاورزی',
  livestock: 'دام',
};

/** Get Persian category name for a symbol */
export function getCommodityCategory(symbol) {
  const meta = COMMODITY_SYMBOLS[symbol];
  return meta ? COMMODITY_CATEGORIES[meta.category] : 'سایر';
}

/** Timeframe options */
export const COMMODITY_TIMEFRAMES = [
  { value: '1mo', label: '۱ ماه' },
  { value: '3mo', label: '۳ ماه' },
  { value: '6mo', label: '۶ ماه' },
  { value: '1y', label: '۱ سال' },
  { value: '2y', label: '۲ سال' },
  { value: '5y', label: '۵ سال' },
];

/** Dashboard section tabs */
export const COMMODITY_DASHBOARD_SECTIONS = [
  { key: 'charts', label: 'نمودارها' },
  { key: 'energy', label: 'انرژی' },
  { key: 'metals', label: 'فلزات' },
  { key: 'agriculture', label: 'کشاورزی' },
  { key: 'table', label: 'جدول' },
];

/** Refresh intervals (ms) */
export const COMMODITY_REFRESH_INTERVAL = 60_000;
export const COMMODITY_STALE_TIME = 30_000;
