// Static coin metadata for the introduction section on fundamentals pages.
// All text is in Persian (Farsi). Keyed by uppercase symbol.

export const COIN_METADATA = {
  BTC: {
    name_fa: 'بیت\u200Cکوین',
    name_en: 'Bitcoin',
    description:
      'بیت\u200Cکوین نخستین ارز دیجیتال غیرمتمرکز جهان است که بر بستر فناوری بلاک\u200Cچین ساخته شده و به\u200Cعنوان «طلای دیجیتال» شناخته می\u200Cشود. این شبکه بدون نیاز به واسطه امکان انتقال ارزش همتا\u200Cبه\u200Cهمتا را در سراسر جهان فراهم می\u200Cکند.',
    founded: 2009,
    founder: 'ساتوشی ناکاموتو',
    consensus: 'اثبات کار (PoW)',
    category: 'لایه ۱',
    useCase: 'ذخیره ارزش و انتقال همتابه‌همتا',
    website: 'https://bitcoin.org',
  },
  ETH: {
    name_fa: 'اتریوم',
    name_en: 'Ethereum',
    description:
      'اتریوم بزرگ\u200Cترین پلتفرم قراردادهای هوشمند است که امکان ساخت برنامه\u200Cهای غیرمتمرکز (dApp) را فراهم می\u200Cکند. پس از مهاجرت به اثبات سهام در سال ۲۰۲۲، مصرف انرژی آن بیش از ۹۹٪ کاهش یافت.',
    founded: 2015,
    founder: 'ویتالیک بوترین',
    consensus: 'اثبات سهام (PoS)',
    category: 'لایه ۱',
    useCase: 'قراردادهای هوشمند و برنامه‌های غیرمتمرکز',
    website: 'https://ethereum.org',
  },
  SOL: {
    name_fa: 'سولانا',
    name_en: 'Solana',
    description:
      'سولانا یک بلاک\u200Cچین لایه ۱ با سرعت بالا و کارمزد پایین است که از مکانیزم اثبات تاریخ برای رسیدن به توان عملیاتی بالا استفاده می\u200Cکند. اکوسیستم سولانا در حوزه\u200Cهای دیفای، NFT و بازی\u200Cهای بلاک\u200Cچینی رشد چشمگیری داشته است.',
    founded: 2020,
    founder: 'آناتولی یاکوونکو',
    consensus: 'اثبات تاریخ + اثبات سهام (PoH+PoS)',
    category: 'لایه ۱',
    useCase: 'تراکنش‌های پرسرعت و کم‌هزینه',
    website: 'https://solana.com',
  },
  ADA: {
    name_fa: 'کاردانو',
    name_en: 'Cardano',
    description:
      'کاردانو یک بلاک\u200Cچین لایه ۱ است که با رویکرد علمی و تحقیقاتی توسعه یافته و از پروتکل اجماع Ouroboros استفاده می\u200Cکند. این پروژه بر تأیید رسمی کد و امنیت بالا تمرکز دارد.',
    founded: 2017,
    founder: 'چارلز هاسکینسون',
    consensus: 'اثبات سهام (Ouroboros)',
    category: 'لایه ۱',
    useCase: 'قراردادهای هوشمند با رویکرد آکادمیک',
    website: 'https://cardano.org',
  },
  AVAX: {
    name_fa: 'آوالانچ',
    name_en: 'Avalanche',
    description:
      'آوالانچ یک پلتفرم بلاک\u200Cچینی با قابلیت ساخت زیرشبکه\u200Cهای سفارشی است که زمان نهایی\u200Cسازی تراکنش\u200Cها را به کمتر از یک ثانیه رسانده است. ساختار سه\u200Cزنجیره\u200Cای آن انعطاف بالایی برای توسعه\u200Cدهندگان فراهم می\u200Cکند.',
    founded: 2020,
    founder: 'امین گون سیرر',
    consensus: 'اجماع آوالانچ (PoS)',
    category: 'لایه ۱',
    useCase: 'زیرشبکه‌های سفارشی و دیفای',
    website: 'https://avax.network',
  },
  DOT: {
    name_fa: 'پولکادات',
    name_en: 'Polkadot',
    description:
      'پولکادات یک پروتکل چندزنجیره\u200Cای است که امکان اتصال و تعامل بلاک\u200Cچین\u200Cهای مختلف را فراهم می\u200Cکند. پاراچین\u200Cها می\u200Cتوانند از امنیت مشترک شبکه اصلی بهره\u200Cمند شوند.',
    founded: 2020,
    founder: 'گوین وود',
    consensus: 'اثبات سهام نامزدشده (NPoS)',
    category: 'لایه ۱',
    useCase: 'قابلیت همکاری بین زنجیره‌ای',
    website: 'https://polkadot.network',
  },
  NEAR: {
    name_fa: 'نیر پروتکل',
    name_en: 'NEAR Protocol',
    description:
      'نیر یک بلاک\u200Cچین لایه ۱ با فناوری شاردینگ (Nightshade) است که تجربه کاربری ساده\u200Cای را برای توسعه\u200Cدهندگان و کاربران فراهم می\u200Cکند. آدرس\u200Cهای خوانا و هزینه\u200Cهای پایین از ویژگی\u200Cهای بارز آن هستند.',
    founded: 2020,
    founder: 'ایلیا پولوسوخین و الکساندر اسکیداف',
    consensus: 'اثبات سهام + شاردینگ (Nightshade)',
    category: 'لایه ۱',
    useCase: 'برنامه‌های غیرمتمرکز با تجربه کاربری ساده',
    website: 'https://near.org',
  },
  APT: {
    name_fa: 'آپتوس',
    name_en: 'Aptos',
    description:
      'آپتوس یک بلاک\u200Cچین لایه ۱ نسل جدید است که توسط تیم سابق پروژه Diem (فیسبوک) ساخته شده و از زبان برنامه\u200Cنویسی Move استفاده می\u200Cکند. هدف آن دستیابی به مقیاس\u200Cپذیری و امنیت بالاست.',
    founded: 2022,
    founder: 'مو شیخ و آوری چینگ',
    consensus: 'اثبات سهام بیزانسی (AptosBFT)',
    category: 'لایه ۱',
    useCase: 'بلاک‌چین مقیاس‌پذیر با زبان Move',
    website: 'https://aptosfoundation.org',
  },
  SUI: {
    name_fa: 'سوئی',
    name_en: 'Sui',
    description:
      'سوئی بلاک\u200Cچین لایه ۱ شی\u200Cگرا است که مانند آپتوس از زبان Move بهره می\u200Cبرد و بر پردازش موازی تراکنش\u200Cها تمرکز دارد. طراحی منحصربه\u200Cفرد آن امکان تأیید آنی تراکنش\u200Cهای ساده را فراهم می\u200Cکند.',
    founded: 2023,
    founder: 'تیم Mysten Labs',
    consensus: 'اثبات سهام بیزانسی (Narwhal+Bullshark)',
    category: 'لایه ۱',
    useCase: 'بلاک‌چین شی‌گرا با تراکنش آنی',
    website: 'https://sui.io',
  },
  SEI: {
    name_fa: 'سی',
    name_en: 'Sei',
    description:
      'سی یک بلاک\u200Cچین لایه ۱ بهینه\u200Cشده برای معاملات است که سرعت پردازش سفارشات را از طریق موتور تطبیق داخلی به حداکثر می\u200Cرساند. طراحی آن به\u200Cطور خاص برای صرافی\u200Cهای غیرمتمرکز بهینه شده است.',
    founded: 2023,
    founder: 'جفری فنگ و جیجون یو',
    consensus: 'اثبات سهام (Twin-Turbo)',
    category: 'لایه ۱',
    useCase: 'بهینه‌سازی شده برای معاملات و صرافی‌های غیرمتمرکز',
    website: 'https://sei.io',
  },
  ATOM: {
    name_fa: 'کازماس',
    name_en: 'Cosmos',
    description:
      'کازماس با عنوان «اینترنت بلاک\u200Cچین\u200Cها» شناخته می\u200Cشود و با پروتکل IBC امکان ارتباط بین زنجیره\u200Cهای مستقل را فراهم می\u200Cکند. Cosmos SDK ابزاری قدرتمند برای ساخت بلاک\u200Cچین\u200Cهای سفارشی است.',
    founded: 2019,
    founder: 'جی کوان و اتان بوکمن',
    consensus: 'اثبات سهام (Tendermint BFT)',
    category: 'لایه ۱',
    useCase: 'قابلیت همکاری و ساخت زنجیره‌های مستقل',
    website: 'https://cosmos.network',
  },
  MATIC: {
    name_fa: 'پالیگان',
    name_en: 'Polygon',
    description:
      'پالیگان یک اکوسیستم مقیاس\u200Cپذیری لایه ۲ برای اتریوم است که با ارائه راه\u200Cحل\u200Cهای مختلف (PoS، zkEVM) هزینه و زمان تراکنش\u200Cها را به\u200Cشدت کاهش می\u200Cدهد. صدها پروژه دیفای و NFT روی این شبکه فعال هستند.',
    founded: 2017,
    founder: 'سندیپ نایلوال و جینتی کاناتی',
    consensus: 'اثبات سهام + اثبات دانش صفر (zkEVM)',
    category: 'لایه ۲',
    useCase: 'مقیاس‌پذیری اتریوم با هزینه پایین',
    website: 'https://polygon.technology',
  },
  ARB: {
    name_fa: 'آربیتروم',
    name_en: 'Arbitrum',
    description:
      'آربیتروم بزرگ\u200Cترین راه\u200Cحل لایه ۲ اتریوم بر پایه فناوری Optimistic Rollup است که تراکنش\u200Cها را خارج از زنجیره اصلی پردازش کرده و امنیت اتریوم را حفظ می\u200Cکند. اکوسیستم دیفای گسترده\u200Cای روی آن ساخته شده است.',
    founded: 2021,
    founder: 'اد فلتن (Offchain Labs)',
    consensus: 'Optimistic Rollup',
    category: 'لایه ۲',
    useCase: 'مقیاس‌پذیری اتریوم با Optimistic Rollup',
    website: 'https://arbitrum.io',
  },
  OP: {
    name_fa: 'آپتیمیزم',
    name_en: 'Optimism',
    description:
      'آپتیمیزم یک راه\u200Cحل مقیاس\u200Cپذیری لایه ۲ برای اتریوم است که با استفاده از Optimistic Rollup هزینه گس را تا ۱۰۰ برابر کاهش می\u200Cدهد. پروژه Superchain آن به ساخت شبکه\u200Cای از زنجیره\u200Cهای لایه ۲ متصل می\u200Cپردازد.',
    founded: 2021,
    founder: 'جینگلن وانگ و کارل فلوئرش',
    consensus: 'Optimistic Rollup',
    category: 'لایه ۲',
    useCase: 'مقیاس‌پذیری اتریوم و Superchain',
    website: 'https://optimism.io',
  },
  UNI: {
    name_fa: 'یونی\u200Cسواپ',
    name_en: 'Uniswap',
    description:
      'یونی\u200Cسواپ بزرگ\u200Cترین صرافی غیرمتمرکز (DEX) جهان است که با استفاده از مدل بازارساز خودکار (AMM) امکان مبادله توکن\u200Cها بدون واسطه را فراهم می\u200Cکند. نسخه ۳ آن با نقدینگی متمرکز کارایی سرمایه را بهبود بخشید.',
    founded: 2018,
    founder: 'هایدن آدامز',
    consensus: 'توکن حاکمیتی (ERC-20)',
    category: 'دیفای',
    useCase: 'صرافی غیرمتمرکز و بازارسازی خودکار',
    website: 'https://uniswap.org',
  },
  AAVE: {
    name_fa: 'آوه',
    name_en: 'Aave',
    description:
      'آوه بزرگ\u200Cترین پروتکل وام\u200Cدهی غیرمتمرکز است که به کاربران امکان وام\u200Cدهی و وام\u200Cگیری رمزارزها را بدون نیاز به واسطه می\u200Cدهد. ویژگی وام\u200Cهای آنی (Flash Loans) از نوآوری\u200Cهای منحصربه\u200Cفرد آن است.',
    founded: 2017,
    founder: 'استانی کولچوف',
    consensus: 'توکن حاکمیتی (ERC-20)',
    category: 'دیفای',
    useCase: 'وام‌دهی و وام‌گیری غیرمتمرکز',
    website: 'https://aave.com',
  },
  INJ: {
    name_fa: 'اینجکتیو',
    name_en: 'Injective',
    description:
      'اینجکتیو یک بلاک\u200Cچین بهینه\u200Cشده برای امور مالی غیرمتمرکز است که معاملات مشتقه، آتی و آپشن را بدون کارمزد گس پشتیبانی می\u200Cکند. موتور تطبیق سفارشات آن در سطح بلاک\u200Cچین عمل می\u200Cکند.',
    founded: 2020,
    founder: 'اریک چن و آلبرت چون',
    consensus: 'اثبات سهام (Tendermint)',
    category: 'دیفای',
    useCase: 'معاملات مشتقه غیرمتمرکز',
    website: 'https://injective.com',
  },
  JUP: {
    name_fa: 'ژوپیتر',
    name_en: 'Jupiter',
    description:
      'ژوپیتر بزرگ\u200Cترین تجمیع\u200Cکننده صرافی\u200Cهای غیرمتمرکز در شبکه سولاناست که بهترین نرخ مبادله را از میان منابع نقدینگی مختلف پیدا می\u200Cکند. محصولات آن شامل سفارشات محدود، DCA و معاملات perpetual است.',
    founded: 2021,
    founder: 'تیم میو (Meow)',
    consensus: 'توکن حاکمیتی (SPL)',
    category: 'دیفای',
    useCase: 'تجمیع‌کننده DEX در سولانا',
    website: 'https://jup.ag',
  },
  LINK: {
    name_fa: 'چین\u200Cلینک',
    name_en: 'Chainlink',
    description:
      'چین\u200Cلینک بزرگ\u200Cترین شبکه اوراکل غیرمتمرکز است که داده\u200Cهای دنیای واقعی (قیمت\u200Cها، آب\u200Cوهوا، نتایج ورزشی) را به قراردادهای هوشمند متصل می\u200Cکند. بیش از هزار پروژه در دیفای از خدمات این شبکه استفاده می\u200Cکنند.',
    founded: 2017,
    founder: 'سرگئی نظاروف',
    consensus: 'شبکه اوراکل غیرمتمرکز',
    category: 'دیفای',
    useCase: 'اتصال داده‌های خارجی به بلاک‌چین',
    website: 'https://chain.link',
  },
  FET: {
    name_fa: 'فچ ای\u200Cآی',
    name_en: 'Fetch.ai',
    description:
      'فچ یک پلتفرم هوش مصنوعی غیرمتمرکز است که عامل\u200Cهای هوشمند مستقل را برای اتوماسیون وظایف اقتصادی ایجاد می\u200Cکند. این عامل\u200Cها می\u200Cتوانند به\u200Cصورت خودکار مذاکره و معامله کنند.',
    founded: 2019,
    founder: 'هوماون شیخ و توبی سیمپسون',
    consensus: 'اثبات سهام (Cosmos SDK)',
    category: 'هوش مصنوعی',
    useCase: 'عامل‌های هوش مصنوعی غیرمتمرکز',
    website: 'https://fetch.ai',
  },
  RENDER: {
    name_fa: 'رندر',
    name_en: 'Render',
    description:
      'رندر یک شبکه غیرمتمرکز رندرینگ GPU است که قدرت پردازش گرافیکی بلااستفاده را به هنرمندان و استودیوها متصل می\u200Cکند. این پروژه کاربردهای گسترده\u200Cای در متاورس، هوش مصنوعی و تولید محتوای سه\u200Cبعدی دارد.',
    founded: 2017,
    founder: 'ژول اوربک',
    consensus: 'اثبات رندر (PoR)',
    category: 'هوش مصنوعی',
    useCase: 'رندرینگ غیرمتمرکز GPU',
    website: 'https://rendernetwork.com',
  },
  TAO: {
    name_fa: 'بیت\u200Cتنسور',
    name_en: 'Bittensor',
    description:
      'بیت\u200Cتنسور یک شبکه غیرمتمرکز یادگیری ماشین است که مدل\u200Cهای هوش مصنوعی را از طریق بازار آزاد به اشتراک می\u200Cگذارد. ماینرها با ارائه خروجی\u200Cهای هوشمند پاداش دریافت می\u200Cکنند.',
    founded: 2021,
    founder: 'یاکوب رابرت استیوز',
    consensus: 'اثبات هوش (PoI)',
    category: 'هوش مصنوعی',
    useCase: 'بازار غیرمتمرکز مدل‌های هوش مصنوعی',
    website: 'https://bittensor.com',
  },
  WLD: {
    name_fa: 'ورلدکوین',
    name_en: 'Worldcoin',
    description:
      'ورلدکوین پروژه\u200Cای برای ایجاد هویت دیجیتال جهانی با استفاده از اسکن عنبیه چشم (Orb) است. هدف آن ارائه درآمد پایه جهانی و اثبات انسان بودن در عصر هوش مصنوعی است.',
    founded: 2023,
    founder: 'سم آلتمن و الکس بلانیا',
    consensus: 'اثبات شخصیت (Proof of Personhood)',
    category: 'هوش مصنوعی',
    useCase: 'هویت دیجیتال و اثبات انسان بودن',
    website: 'https://worldcoin.org',
  },
  DOGE: {
    name_fa: 'دوج\u200Cکوین',
    name_en: 'Dogecoin',
    description:
      'دوج\u200Cکوین نخستین و محبوب\u200Cترین میم\u200Cکوین جهان است که با الهام از میم شیبا اینو ساخته شد. با وجود شروع طنزآمیز، جامعه فعال و حمایت شخصیت\u200Cهای مطرح آن را به یکی از ارزهای شناخته\u200Cشده تبدیل کرده است.',
    founded: 2013,
    founder: 'بیلی مارکوس و جکسون پالمر',
    consensus: 'اثبات کار (Scrypt)',
    category: 'میم\u200Cکوین',
    useCase: 'انعام‌دهی و پرداخت‌های خرد',
    website: 'https://dogecoin.com',
  },
  PEPE: {
    name_fa: 'پپه',
    name_en: 'Pepe',
    description:
      'پپه یک میم\u200Cکوین مبتنی بر اتریوم است که از شخصیت اینترنتی «پپه قورباغه» الهام گرفته شده. این توکن بدون کاربرد فنی خاص، بر قدرت جامعه و فرهنگ اینترنتی تکیه دارد.',
    founded: 2023,
    founder: 'ناشناس',
    consensus: 'توکن ERC-20 (اتریوم)',
    category: 'میم\u200Cکوین',
    useCase: 'توکن فرهنگی و اجتماعی',
    website: 'https://pepe.vip',
  },
  FIL: {
    name_fa: 'فایل\u200Cکوین',
    name_en: 'Filecoin',
    description:
      'فایل\u200Cکوین یک شبکه ذخیره\u200Cسازی غیرمتمرکز است که به کاربران امکان اجاره فضای ذخیره\u200Cسازی بلااستفاده خود را می\u200Cدهد. این پروژه جایگزین غیرمتمرکزی برای سرویس\u200Cهای ابری متمرکز مانند AWS S3 ارائه می\u200Cدهد.',
    founded: 2020,
    founder: 'خوان بنت (Protocol Labs)',
    consensus: 'اثبات ذخیره‌سازی + اثبات فضا-زمان',
    category: 'ذخیره\u200Cسازی',
    useCase: 'ذخیره‌سازی غیرمتمرکز فایل',
    website: 'https://filecoin.io',
  },
  BNB: {
    name_fa: 'بایننس\u200Cکوین',
    name_en: 'BNB',
    description:
      'BNB توکن اصلی اکوسیستم بایننس و بلاک\u200Cچین BNB Chain است. علاوه بر کاهش کارمزد معاملات در صرافی بایننس، به\u200Cعنوان سوخت شبکه BNB Chain برای تراکنش\u200Cها و قراردادهای هوشمند استفاده می\u200Cشود.',
    founded: 2017,
    founder: 'چانگ\u200Cپنگ ژائو (CZ)',
    consensus: 'اثبات سهام اعتباری (PoSA)',
    category: 'سایر',
    useCase: 'سوخت اکوسیستم بایننس و BNB Chain',
    website: 'https://bnbchain.org',
  },
  XRP: {
    name_fa: 'ریپل',
    name_en: 'XRP',
    description:
      'ریپل یک شبکه پرداخت بین\u200Cبانکی است که انتقال پول بین\u200Cالمللی را در چند ثانیه و با هزینه\u200Cای ناچیز انجام می\u200Cدهد. بانک\u200Cها و مؤسسات مالی بزرگ از فناوری RippleNet استفاده می\u200Cکنند.',
    founded: 2012,
    founder: 'کریس لارسن و جد مک\u200Cکالب',
    consensus: 'پروتکل اجماع ریپل (RPCA)',
    category: 'سایر',
    useCase: 'پرداخت‌های بین‌المللی و بین‌بانکی',
    website: 'https://ripple.com',
  },
  LTC: {
    name_fa: 'لایت\u200Cکوین',
    name_en: 'Litecoin',
    description:
      'لایت\u200Cکوین با عنوان «نقره دیجیتال» شناخته می\u200Cشود و یکی از قدیمی\u200Cترین آلت\u200Cکوین\u200Cهاست. با زمان بلاک ۲.۵ دقیقه\u200Cای، سرعت تراکنش آن ۴ برابر بیت\u200Cکوین است.',
    founded: 2011,
    founder: 'چارلی لی',
    consensus: 'اثبات کار (Scrypt)',
    category: 'سایر',
    useCase: 'پرداخت‌های سریع و روزمره',
    website: 'https://litecoin.org',
  },
  TIA: {
    name_fa: 'سلستیا',
    name_en: 'Celestia',
    description:
      'سلستیا نخستین بلاک\u200Cچین ماژولار است که لایه دسترسی به داده\u200Cها را از لایه اجرا جدا می\u200Cکند. این رویکرد به بلاک\u200Cچین\u200Cهای دیگر امکان می\u200Cدهد از سلستیا به\u200Cعنوان لایه داده مقیاس\u200Cپذیر استفاده کنند.',
    founded: 2023,
    founder: 'مصطفی البسام و ایسماعیل خوفی',
    consensus: 'اثبات سهام (Tendermint)',
    category: 'سایر',
    useCase: 'لایه دسترسی داده ماژولار',
    website: 'https://celestia.org',
  },
};

/**
 * Look up coin metadata by symbol.
 * Returns the metadata object or null if not found.
 */
export function getCoinMetadata(symbol) {
  if (!symbol) return null;
  return COIN_METADATA[symbol.toUpperCase()] || null;
}
