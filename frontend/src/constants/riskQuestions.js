/**
 * CFA L3 IPS-based Risk Questionnaire
 * 12 questions across 6 stepper steps (2 per step)
 * Each option scores 1-10, total max = 120
 *
 * Dimensions: personal info, financial status, experience,
 * financial goals, risk tolerance, preferences
 */

export const QUESTIONNAIRE_VERSION = 1;

/** Stepper step metadata */
export const STEPS = [
  { label: 'اطلاعات شخصی', icon: 'IconUser' },
  { label: 'وضعیت مالی', icon: 'IconWallet' },
  { label: 'تجربه سرمایه‌گذاری', icon: 'IconSchool' },
  { label: 'اهداف مالی', icon: 'IconTarget' },
  { label: 'تحمل ریسک', icon: 'IconFlame' },
  { label: 'ترجیحات', icon: 'IconSettings' },
];

/** All 12 questions grouped by step index */
export const QUESTIONS = [
  // ── Step 0: اطلاعات شخصی ──
  {
    id: 'q1',
    step: 0,
    text: 'بازه سنی شما چقدر است؟',
    dimension: 'ability',
    options: [
      { label: 'بالای ۶۰ سال', value: 2 },
      { label: '۵۰ تا ۶۰ سال', value: 4 },
      { label: '۴۰ تا ۵۰ سال', value: 6 },
      { label: '۳۰ تا ۴۰ سال', value: 8 },
      { label: 'زیر ۳۰ سال', value: 10 },
    ],
  },
  {
    id: 'q2',
    step: 0,
    text: 'افق سرمایه‌گذاری مورد نظر شما چقدر است؟',
    dimension: 'ability',
    options: [
      { label: 'کمتر از ۱ سال', value: 2 },
      { label: '۱ تا ۳ سال', value: 4 },
      { label: '۳ تا ۵ سال', value: 6 },
      { label: '۵ تا ۱۰ سال', value: 8 },
      { label: 'بیش از ۱۰ سال', value: 10 },
    ],
  },

  // ── Step 1: وضعیت مالی ──
  {
    id: 'q3',
    step: 1,
    text: 'ثبات درآمد ماهانه شما چگونه است؟',
    dimension: 'ability',
    options: [
      { label: 'بدون درآمد ثابت', value: 2 },
      { label: 'ناپایدار (فصلی/پروژه‌ای)', value: 4 },
      { label: 'نسبتاً پایدار', value: 6 },
      { label: 'پایدار با درآمد جانبی', value: 8 },
      { label: 'بسیار پایدار و متنوع', value: 10 },
    ],
  },
  {
    id: 'q4',
    step: 1,
    text: 'چند ماه ذخیره اضطراری (نقد) دارید؟',
    dimension: 'ability',
    options: [
      { label: 'ذخیره ندارم', value: 1 },
      { label: 'کمتر از ۳ ماه', value: 3 },
      { label: '۳ تا ۶ ماه', value: 5 },
      { label: '۶ تا ۱۲ ماه', value: 8 },
      { label: 'بیش از ۱ سال', value: 10 },
    ],
  },

  // ── Step 2: تجربه سرمایه‌گذاری ──
  {
    id: 'q5',
    step: 2,
    text: 'سابقه فعالیت شما در بازارهای مالی چقدر است؟',
    dimension: 'willingness',
    options: [
      { label: 'هیچ تجربه‌ای ندارم', value: 2 },
      { label: 'کمتر از ۱ سال', value: 4 },
      { label: '۱ تا ۳ سال', value: 6 },
      { label: '۳ تا ۷ سال', value: 8 },
      { label: 'بیش از ۷ سال', value: 10 },
    ],
  },
  {
    id: 'q6',
    step: 2,
    text: 'میزان آشنایی شما با ابزارهای مشتقه (آپشن، آتی) چقدر است؟',
    dimension: 'willingness',
    options: [
      { label: 'اصلاً آشنا نیستم', value: 2 },
      { label: 'فقط نام آنها را شنیده‌ام', value: 4 },
      { label: 'مفاهیم پایه را می‌دانم', value: 6 },
      { label: 'تجربه معاملاتی محدود دارم', value: 8 },
      { label: 'به‌صورت حرفه‌ای معامله می‌کنم', value: 10 },
    ],
  },

  // ── Step 3: اهداف مالی ──
  {
    id: 'q7',
    step: 3,
    text: 'چه درصدی از پس‌انداز خود را قصد دارید سرمایه‌گذاری کنید؟',
    dimension: 'ability',
    options: [
      { label: 'کمتر از ۱۰٪', value: 2 },
      { label: '۱۰٪ تا ۲۵٪', value: 4 },
      { label: '۲۵٪ تا ۵۰٪', value: 6 },
      { label: '۵۰٪ تا ۷۵٪', value: 8 },
      { label: 'بیش از ۷۵٪', value: 10 },
    ],
  },
  {
    id: 'q8',
    step: 3,
    text: 'انتظار بازدهی سالانه شما چقدر است؟',
    dimension: 'willingness',
    options: [
      { label: 'حفظ ارزش پول (هم‌تراز تورم)', value: 2 },
      { label: 'کمی بالاتر از سپرده بانکی', value: 4 },
      { label: 'بازدهی متوسط بازار', value: 6 },
      { label: 'بازدهی بالاتر از شاخص', value: 8 },
      { label: 'حداکثر بازدهی ممکن', value: 10 },
    ],
  },

  // ── Step 4: تحمل ریسک ──
  {
    id: 'q9',
    step: 4,
    text: 'اگر سبد شما ۲۰٪ افت کند، واکنش شما چیست؟',
    dimension: 'willingness',
    options: [
      { label: 'فوراً همه را می‌فروشم', value: 2 },
      { label: 'بخشی را می‌فروشم', value: 4 },
      { label: 'صبر می‌کنم و تغییری نمی‌دهم', value: 6 },
      { label: 'بخشی بیشتر خرید می‌کنم', value: 8 },
      { label: 'فرصت عالی برای خرید بیشتر!', value: 10 },
    ],
  },
  {
    id: 'q10',
    step: 4,
    text: 'حداکثر افت قابل تحمل پورتفو برای شما چقدر است؟',
    dimension: 'willingness',
    options: [
      { label: 'بیش از ۵٪ قابل تحمل نیست', value: 2 },
      { label: 'تا ۱۰٪', value: 4 },
      { label: 'تا ۲۰٪', value: 6 },
      { label: 'تا ۳۵٪', value: 8 },
      { label: 'تا ۵۰٪ یا بیشتر', value: 10 },
    ],
  },

  // ── Step 5: ترجیحات ──
  {
    id: 'q11',
    step: 5,
    text: 'ترجیح شما بین ثبات و رشد چیست؟',
    dimension: 'willingness',
    options: [
      { label: 'حداکثر ثبات، حداقل نوسان', value: 2 },
      { label: 'ثبات بالا با اندکی رشد', value: 4 },
      { label: 'تعادل بین ثبات و رشد', value: 6 },
      { label: 'رشد بالا با پذیرش نوسان', value: 8 },
      { label: 'حداکثر رشد، نوسان مهم نیست', value: 10 },
    ],
  },
  {
    id: 'q12',
    step: 5,
    text: 'هر چند وقت سبد سرمایه‌گذاری خود را بررسی می‌کنید؟',
    dimension: 'willingness',
    options: [
      { label: 'به‌ندرت (سالانه یا کمتر)', value: 2 },
      { label: 'فصلی', value: 4 },
      { label: 'ماهانه', value: 6 },
      { label: 'هفتگی', value: 8 },
      { label: 'روزانه', value: 10 },
    ],
  },
];

/** Maximum possible score = 12 questions × 10 points each */
export const MAX_SCORE = 120;

/**
 * 5 risk categories with target multi-asset allocations
 * Score ranges are percentages of MAX_SCORE (0-100 normalized)
 */
export const RISK_CATEGORIES = [
  {
    key: 'conservative',
    label: 'محافظه‌کار',
    labelEn: 'Conservative',
    range: [0, 20],
    color: '#3B82F6',  // blue
    description: 'تمرکز بر حفظ سرمایه با حداقل نوسان. مناسب افراد نزدیک بازنشستگی یا با افق کوتاه‌مدت.',
    allocation: {
      stocks: 10,
      etfs: 40,
      crypto: 0,
      options: 0,
      bonds: 50,
    },
    metrics: {
      expectedReturn: [8, 15],
      var95: 3,
      sharpe: 0.8,
      maxDrawdown: 8,
    },
  },
  {
    key: 'moderate_conservative',
    label: 'نسبتاً محافظه‌کار',
    labelEn: 'Moderately Conservative',
    range: [21, 40],
    color: '#06B6D4',  // cyan
    description: 'ترکیبی از ثبات و رشد ملایم. مناسب سرمایه‌گذاران محتاط با افق میان‌مدت.',
    allocation: {
      stocks: 25,
      etfs: 35,
      crypto: 0,
      options: 0,
      bonds: 40,
    },
    metrics: {
      expectedReturn: [12, 22],
      var95: 5,
      sharpe: 1.0,
      maxDrawdown: 15,
    },
  },
  {
    key: 'moderate',
    label: 'متعادل',
    labelEn: 'Moderate',
    range: [41, 60],
    color: '#22C55E',  // green
    description: 'تعادل بین ریسک و بازدهی. مناسب اکثر سرمایه‌گذاران با افق ۳ تا ۵ ساله.',
    allocation: {
      stocks: 40,
      etfs: 25,
      crypto: 5,
      options: 0,
      bonds: 30,
    },
    metrics: {
      expectedReturn: [18, 35],
      var95: 8,
      sharpe: 1.2,
      maxDrawdown: 22,
    },
  },
  {
    key: 'moderate_aggressive',
    label: 'نسبتاً تهاجمی',
    labelEn: 'Moderately Aggressive',
    range: [61, 80],
    color: '#F59E0B',  // amber
    description: 'تمرکز بر رشد سرمایه با پذیرش نوسانات قابل توجه. مناسب افراد با تجربه و افق بلندمدت.',
    allocation: {
      stocks: 55,
      etfs: 15,
      crypto: 10,
      options: 5,
      bonds: 15,
    },
    metrics: {
      expectedReturn: [25, 50],
      var95: 12,
      sharpe: 1.1,
      maxDrawdown: 32,
    },
  },
  {
    key: 'aggressive',
    label: 'تهاجمی',
    labelEn: 'Aggressive',
    range: [81, 100],
    color: '#EF4444',  // red
    description: 'حداکثر رشد با پذیرش ریسک بالا. مناسب سرمایه‌گذاران حرفه‌ای با تحمل زیان بالا و افق طولانی.',
    allocation: {
      stocks: 50,
      etfs: 10,
      crypto: 20,
      options: 10,
      bonds: 10,
    },
    metrics: {
      expectedReturn: [35, 70],
      var95: 18,
      sharpe: 1.0,
      maxDrawdown: 45,
    },
  },
];

/** Asset class labels (Persian) */
export const ASSET_CLASS_LABELS = {
  stocks: 'سهام',
  etfs: 'صندوق‌های ETF',
  crypto: 'رمزارز',
  options: 'اختیار معامله',
  bonds: 'اوراق و نقد',
};

/** Asset class colors for charts */
export const ASSET_CLASS_COLORS = {
  stocks: '#3B82F6',
  etfs: '#8B5CF6',
  crypto: '#F59E0B',
  options: '#EF4444',
  bonds: '#22C55E',
};

/** Suggested symbols per asset class per risk category */
export const SUGGESTED_SYMBOLS = {
  conservative: {
    stocks: ['فملی', 'فولاد', 'شبندر'],
    etfs: ['دارا یکم', 'پالایش یکم', 'کیان'],
    bonds: ['اراد ۱۰۱', 'اخزا'],
  },
  moderate_conservative: {
    stocks: ['فملی', 'فولاد', 'شپنا', 'کگل'],
    etfs: ['دارا یکم', 'پالایش یکم', 'کیان', 'آگاس'],
    bonds: ['اراد ۱۰۱', 'اخزا'],
  },
  moderate: {
    stocks: ['فملی', 'فولاد', 'شپنا', 'کگل', 'خودرو', 'وبملت'],
    etfs: ['دارا یکم', 'پالایش یکم', 'آگاس'],
    crypto: ['BTC'],
    bonds: ['اراد ۱۰۱'],
  },
  moderate_aggressive: {
    stocks: ['فملی', 'فولاد', 'شپنا', 'خودرو', 'وبملت', 'خساپا', 'کگل'],
    etfs: ['دارا یکم', 'آگاس'],
    crypto: ['BTC', 'ETH'],
    options: ['اختیار فملی'],
    bonds: ['اراد ۱۰۱'],
  },
  aggressive: {
    stocks: ['فملی', 'خودرو', 'خساپا', 'وبملت', 'شتران', 'فولاد'],
    etfs: ['آگاس'],
    crypto: ['BTC', 'ETH', 'SOL'],
    options: ['اختیار فملی', 'اختیار فولاد'],
    bonds: ['اراد ۱۰۱'],
  },
};

/** Rationale per asset class (shared across categories) */
export const ASSET_CLASS_RATIONALE = {
  stocks: 'سهام بورس تهران — پتانسیل رشد بالا، همبستگی با تورم',
  etfs: 'صندوق‌های سرمایه‌گذاری — تنوع‌بخشی آسان، مدیریت حرفه‌ای',
  crypto: 'رمزارزها — رشد بالقوه بالا، همبستگی پایین با بازار داخلی',
  options: 'اختیار معامله — اهرم و پوشش ریسک، مناسب سرمایه‌گذاران باتجربه',
  bonds: 'اوراق بدهی و نقد — ثبات و نقدشوندگی بالا، پوشش در برابر افت بازار',
};
