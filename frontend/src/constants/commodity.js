/**
 * Commodity market constants and configuration.
 * Full list matching investing.com/commodities + scheduler/commodity_fetcher.py
 */

/** All tracked commodities — must match COMMODITY_REGISTRY in commodity_fetcher.py */
export const COMMODITY_SYMBOLS = {
  // Energy
  'BRENT':    { yf: 'BZ=F',  name: 'Brent Crude Oil',     name_fa: 'نفت برنت',          unit: 'USD/bbl',   category: 'energy' },
  'WTI':      { yf: 'CL=F',  name: 'WTI Crude Oil',       name_fa: 'نفت خام WTI',      unit: 'USD/bbl',   category: 'energy' },
  'NATGAS':   { yf: 'NG=F',  name: 'Natural Gas',          name_fa: 'گاز طبیعی',        unit: 'USD/MMBtu', category: 'energy' },
  'HEAT':     { yf: 'HO=F',  name: 'Heating Oil',          name_fa: 'نفت گرمایشی',      unit: 'USD/gal',   category: 'energy' },
  'GASOLINE': { yf: 'RB=F',  name: 'Gasoline (RBOB)',      name_fa: 'بنزین',            unit: 'USD/gal',   category: 'energy' },
  'ETHANOL':  { yf: 'EH=F',  name: 'Ethanol',              name_fa: 'اتانول',           unit: 'USD/gal',   category: 'energy' },

  // Precious Metals
  'GOLD':     { yf: 'GC=F',  name: 'Gold',                 name_fa: 'طلا',              unit: 'USD/oz',    category: 'precious' },
  'SILVER':   { yf: 'SI=F',  name: 'Silver',               name_fa: 'نقره',             unit: 'USD/oz',    category: 'precious' },
  'PLATINUM': { yf: 'PL=F',  name: 'Platinum',             name_fa: 'پلاتین',           unit: 'USD/oz',    category: 'precious' },
  'PALLADIUM':{ yf: 'PA=F',  name: 'Palladium',            name_fa: 'پالادیوم',         unit: 'USD/oz',    category: 'precious' },

  // Industrial / Base Metals
  'COPPER':   { yf: 'HG=F',  name: 'Copper',               name_fa: 'مس',               unit: 'USD/lb',    category: 'industrial' },
  'ALUMINUM': { yf: 'ALI=F', name: 'Aluminum',             name_fa: 'آلومینیوم',        unit: 'USD/t',     category: 'industrial' },
  'ZINC':     { yf: 'ZN=F',  name: 'Zinc',                 name_fa: 'روی',              unit: 'USD/t',     category: 'industrial' },
  'NICKEL':   { yf: 'NI=F',  name: 'Nickel',               name_fa: 'نیکل',             unit: 'USD/t',     category: 'industrial' },
  'LEAD':     { yf: 'LD=F',  name: 'Lead',                 name_fa: 'سرب',              unit: 'USD/t',     category: 'industrial' },
  'TIN':      { yf: 'SN=F',  name: 'Tin',                  name_fa: 'قلع',              unit: 'USD/t',     category: 'industrial' },
  'IRON_ORE': { yf: 'TIO=F', name: 'Iron Ore 62% Fe',      name_fa: 'سنگ‌آهن',          unit: 'USD/t',     category: 'industrial' },
  'STEEL':    { yf: 'STE=F', name: 'US Midwest Steel',     name_fa: 'فولاد',            unit: 'USD/t',     category: 'industrial' },
  'LITHIUM':  { yf: 'LITH=F',name: 'Lithium Carbonate',    name_fa: 'لیتیوم',           unit: 'USD/t',     category: 'industrial' },
  'URANIUM':  { yf: 'UX=F',  name: 'Uranium',              name_fa: 'اورانیوم',         unit: 'USD/lb',    category: 'industrial' },

  // Agriculture — Grains & Oilseeds
  'WHEAT':    { yf: 'ZW=F',  name: 'Wheat',                name_fa: 'گندم',             unit: 'USc/bu',    category: 'agriculture' },
  'CORN':     { yf: 'ZC=F',  name: 'Corn',                 name_fa: 'ذرت',              unit: 'USc/bu',    category: 'agriculture' },
  'SOYBEAN':  { yf: 'ZS=F',  name: 'Soybeans',             name_fa: 'سویا',             unit: 'USc/bu',    category: 'agriculture' },
  'SOY_OIL':  { yf: 'ZL=F',  name: 'Soybean Oil',          name_fa: 'روغن سویا',        unit: 'USc/lb',    category: 'agriculture' },
  'SOY_MEAL': { yf: 'ZM=F',  name: 'Soybean Meal',         name_fa: 'کنجاله سویا',      unit: 'USD/t',     category: 'agriculture' },
  'OATS':     { yf: 'ZO=F',  name: 'Oats',                 name_fa: 'جو دوسر',          unit: 'USc/bu',    category: 'agriculture' },
  'RICE':     { yf: 'ZR=F',  name: 'Rough Rice',           name_fa: 'برنج',             unit: 'USc/cwt',   category: 'agriculture' },

  // Agriculture — Softs
  'COFFEE':   { yf: 'KC=F',  name: 'Coffee (Arabica)',     name_fa: 'قهوه عربیکا',      unit: 'USc/lb',    category: 'agriculture' },
  'SUGAR':    { yf: 'SB=F',  name: 'Sugar #11',            name_fa: 'شکر',              unit: 'USc/lb',    category: 'agriculture' },
  'COTTON':   { yf: 'CT=F',  name: 'Cotton #2',            name_fa: 'پنبه',             unit: 'USc/lb',    category: 'agriculture' },
  'COCOA':    { yf: 'CC=F',  name: 'Cocoa',                name_fa: 'کاکائو',           unit: 'USD/t',     category: 'agriculture' },
  'OJ':       { yf: 'OJ=F',  name: 'Orange Juice',         name_fa: 'آب پرتقال',        unit: 'USc/lb',    category: 'agriculture' },
  'LUMBER':   { yf: 'LBS=F', name: 'Lumber',               name_fa: 'الوار',            unit: 'USD/mbf',   category: 'agriculture' },

  // Livestock
  'CATTLE':   { yf: 'LE=F',  name: 'Live Cattle',          name_fa: 'گاو زنده',         unit: 'USc/lb',    category: 'livestock' },
  'FEEDER':   { yf: 'GF=F',  name: 'Feeder Cattle',        name_fa: 'گاو پرواری',       unit: 'USc/lb',    category: 'livestock' },
  'HOGS':     { yf: 'HE=F',  name: 'Lean Hogs',            name_fa: 'خوک',              unit: 'USc/lb',    category: 'livestock' },
};

/** All commodity symbol keys */
export const COMMODITY_KEYS = Object.keys(COMMODITY_SYMBOLS);

/** Category labels (Persian) */
export const COMMODITY_CATEGORIES = {
  energy: 'انرژی',
  precious: 'فلزات گرانبها',
  industrial: 'فلزات صنعتی',
  agriculture: 'کشاورزی',
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
