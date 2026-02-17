/**
 * Iranian Banking Loan System - TypeScript Constants
 * Generated: 2026-02-02
 * Version: 2.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

export interface BilingualText {
  en: string;
  fa: string;
}

export interface Bank {
  id: string;
  name: BilingualText;
  abbr: string;
  type: BankType;
  ownership?: BankOwnership;
  parentBank?: string;
  website?: string;
}

export interface LoanProduct {
  id: string;
  name: BilingualText;
  bankId: string;
  category: LoanCategory;
  calculationMethod: LoanCalculationMethod;
}

export interface InterestRate {
  value: number;
  description: BilingualText;
}

// =============================================================================
// ENUMS
// =============================================================================

export enum BankType {
  TRADITIONAL = "traditional",
  DIGITAL = "digital",
  NEOBANK = "neobank",
}

export enum BankOwnership {
  STATE_OWNED = "state-owned",
  PRIVATE = "private",
  PUBLIC = "public",
}

export enum CreditRating {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
}

export enum LoanCalculationMethod {
  POINTS_BASED = "points-based",
  AVERAGE_BASED = "average-based",
  STEP_BASED = "step-based",
  DEPOSIT_BASED = "deposit-based",
  SALARY_BASED = "salary-based",
  POS_BASED = "pos-based",
  COLLATERAL_BASED = "collateral-based",
}

export enum LoanCategory {
  PERSONAL = "personal",
  CORPORATE = "corporate",
  BUSINESS = "business",
  GOODS_PURCHASE = "goods-purchase",
  CREDIT_CARD = "credit-card",
  GHARZOLHASANEH = "gharzolhasaneh",
  MURABAHA = "murabaha",
  BNPL = "bnpl",
}

export enum LoanStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
}

// =============================================================================
// BANK DEFINITIONS
// =============================================================================

export const TRADITIONAL_BANKS: Record<string, Bank> = {
  "bank-meli": {
    id: "bank-meli",
    name: { en: "Bank Meli Iran", fa: "بانک ملی ایران" },
    abbr: "BMI",
    type: BankType.TRADITIONAL,
    ownership: BankOwnership.STATE_OWNED,
    website: "https://bmi.ir",
  },
  "bank-saderat": {
    id: "bank-saderat",
    name: { en: "Bank Saderat Iran", fa: "بانک صادرات ایران" },
    abbr: "BSI",
    type: BankType.TRADITIONAL,
    ownership: BankOwnership.PUBLIC,
    website: "https://www.bsi.ir",
  },
  "bank-pasargad": {
    id: "bank-pasargad",
    name: { en: "Bank Pasargad", fa: "بانک پاسارگاد" },
    abbr: "BPI",
    type: BankType.TRADITIONAL,
    ownership: BankOwnership.PRIVATE,
    website: "https://bpi.ir",
  },
  "bank-parsian": {
    id: "bank-parsian",
    name: { en: "Bank Parsian", fa: "بانک پارسیان" },
    abbr: "BPR",
    type: BankType.TRADITIONAL,
    ownership: BankOwnership.PRIVATE,
    website: "https://parsian-bank.ir",
  },
  "bank-day": {
    id: "bank-day",
    name: { en: "Bank Day", fa: "بانک دی" },
    abbr: "BD",
    type: BankType.TRADITIONAL,
    ownership: BankOwnership.PRIVATE,
    website: "https://day24.ir",
  },
  "bank-karafarin": {
    id: "bank-karafarin",
    name: { en: "Bank Karafarin", fa: "بانک کارآفرین" },
    abbr: "BK",
    type: BankType.TRADITIONAL,
    ownership: BankOwnership.PRIVATE,
    website: "https://karafarinbank.ir",
  },
  "bank-iran-zamin": {
    id: "bank-iran-zamin",
    name: { en: "Bank Iran Zamin", fa: "بانک ایران زمین" },
    abbr: "BIZ",
    type: BankType.TRADITIONAL,
    ownership: BankOwnership.PRIVATE,
    website: "https://izbank.ir",
  },
  "bank-tosee-saderat": {
    id: "bank-tosee-saderat",
    name: { en: "Export Development Bank", fa: "بانک توسعه صادرات" },
    abbr: "EDBI",
    type: BankType.TRADITIONAL,
    ownership: BankOwnership.STATE_OWNED,
    website: "https://edbi.ir",
  },
};

export const DIGITAL_BANKS: Record<string, Bank> = {
  bankino: {
    id: "bankino",
    name: { en: "Bankino", fa: "بانکینو" },
    abbr: "BKN",
    type: BankType.NEOBANK,
    parentBank: "bank-khavarmiane",
    website: "https://bankino.ir",
  },
  "blue-bank": {
    id: "blue-bank",
    name: { en: "Blu Bank", fa: "بلوبانک" },
    abbr: "BLU",
    type: BankType.NEOBANK,
    parentBank: "bank-saman",
    website: "https://blu.ir",
  },
  sepino: {
    id: "sepino",
    name: { en: "Sepino", fa: "سپینو" },
    abbr: "SPN",
    type: BankType.NEOBANK,
    parentBank: "bank-saderat",
    website: "http://sepino.bsi.ir",
  },
  weepod: {
    id: "weepod",
    name: { en: "Weepod", fa: "ویپاد" },
    abbr: "WPD",
    type: BankType.NEOBANK,
    parentBank: "bank-pasargad",
    website: "https://wepod.ir",
  },
  qbank: {
    id: "qbank",
    name: { en: "Qbank", fa: "کیوبانک" },
    abbr: "QBK",
    type: BankType.NEOBANK,
    parentBank: "bank-mehr",
    website: "https://qmb.ir",
  },
  "hi-bank": {
    id: "hi-bank",
    name: { en: "Hi Bank", fa: "های بانک" },
    abbr: "HIB",
    type: BankType.NEOBANK,
    website: "https://hibank.ir",
  },
  "neshan-bank": {
    id: "neshan-bank",
    name: { en: "Neshan Bank", fa: "نشان بانک" },
    abbr: "NSH",
    type: BankType.NEOBANK,
    parentBank: "bank-meli",
    website: "https://neshanbank.ir",
  },
};

export const ALL_BANKS: Record<string, Bank> = {
  ...TRADITIONAL_BANKS,
  ...DIGITAL_BANKS,
};

// =============================================================================
// LOAN PRODUCTS
// =============================================================================

export const LOAN_PRODUCTS: Record<string, Record<string, BilingualText>> = {
  bankino: {
    vamino: { en: "Vamino", fa: "وامینو" },
    "vamino-monthly": { en: "Vamino Monthly Credit", fa: "وامینو اعتبار یک ماهه" },
    "vamino-installment": { en: "Vamino Installment", fa: "وامینو اقساطی" },
  },
  "blue-bank": {
    personal: { en: "Personal Loan", fa: "وام شخصی" },
    corporate: { en: "Corporate Loan", fa: "وام سازمانی" },
  },
  sepino: {
    nitro: { en: "Nitro Loan", fa: "وام نیترو" },
    "no-guarantor": { en: "No Guarantor Loan", fa: "تسهیلات بدون ضامن" },
    "sana-2": { en: "Sana 2 Plan", fa: "طرح سنا ۲" },
    "star-sepino": { en: "Star Sepino", fa: "طرح ستاره سپینو" },
    "murabaha-card": { en: "Murabaha Credit Card", fa: "کارت اعتباری مرابحه" },
  },
  weepod: {
    poshtibaneh: { en: "Poshtibaneh", fa: "تسهیلات پشتوانه" },
    barayand: { en: "Barayand", fa: "تسهیلات برآیند" },
    "barayand-chekyar": { en: "Barayand Chekyar", fa: "تسهیلات برآیند چک‌یار" },
    peyman: { en: "Peyman", fa: "تسهیلات پیمان" },
  },
  qbank: {
    nasr: { en: "Nasr Plan", fa: "طرح نصر" },
    niloofar: { en: "Niloofar Plan", fa: "طرح نیلوفر" },
    "no-guarantor": { en: "Instant No-Guarantor", fa: "وام فوری بدون ضامن" },
    "kala-kart": { en: "Kala Kart", fa: "کالا کارت" },
    mehryar: { en: "Mehryar Plan", fa: "طرح مهریار" },
    "mehryar-sazmani": { en: "Mehryar Corporate", fa: "طرح مهریار سازمانی" },
  },
  "hi-bank": {
    "tier-1": { en: "5-20 Million Loan", fa: "تسهیلات ۵ تا ۲۰ میلیونی" },
    "tier-2": { en: "30-50 Million Loan", fa: "تسهیلات ۳۰ تا ۵۰ میلیونی" },
    "tier-3": { en: "75-100 Million Loan", fa: "تسهیلات ۷۵ تا ۱۰۰ میلیونی" },
  },
  "neshan-bank": {
    "corona-support": { en: "COVID Support Loan", fa: "تسهیلات کرونا" },
    "neshan-etebari": { en: "Neshan Credit", fa: "نشان اعتباری" },
    "zar-neshan": { en: "Zar Neshan", fa: "زرنشان" },
  },
  "bank-saderat": {
    "jari-talaei": { en: "Golden Current Account", fa: "جاری طلایی دو" },
    misagh: { en: "Misagh", fa: "میثاق" },
    "saba-sepehr-pos": { en: "Saba Sepehr POS", fa: "صبای سپهر (پایانه فروش)" },
    sana: { en: "Sana", fa: "سنا" },
    "sana-2": { en: "Sana 2", fa: "سنا ۲" },
    "hamyaran-sepehr": { en: "Hamyaran Sepehr", fa: "همیاران سپهر (کارت اعتباری)" },
    "sepas-sepehr": { en: "Sepas Sepehr", fa: "سپاس سپهر" },
    timche: { en: "Timche", fa: "تیمچه" },
    "kharid-kala": { en: "Goods Purchase", fa: "خرید کالا" },
  },
  "bank-meli": {
    kargoshaei: { en: "Kargoshaei Plan", fa: "طرح کارگشای ملی" },
    mehrabani: { en: "Mehrabani", fa: "مهربانی ملی" },
    "etebar-meli": { en: "Etebar Meli", fa: "طرح اعتبار ملی" },
    "tasahilat-tarjihi": { en: "Preferential Rate", fa: "تسهیلات با نرخ ترجیحی" },
    paziraneh: { en: "Paziraneh", fa: "وام پذیرنه ملی" },
  },
  "bank-day": {
    "mahan-plan": { en: "Mahan Plan", fa: "طرح ماهان دی" },
    "business-plan": { en: "Business Plan", fa: "طرح کسب و کار" },
  },
  "bank-pasargad": {
    "arzan-gheimat": { en: "Arzan Gheimat", fa: "ارزان قیمت" },
    "ipg-pos": { en: "IPG/POS Facilities", fa: "مبتنی بر مراوده (IPG/POS)" },
    "cap-card": { en: "Cap Card", fa: "کاپ کارت" },
  },
  "bank-iran-zamin": {
    kalayar: { en: "Kalayar (Home Appliances)", fa: "طرح کالایار (لوازم خانگی)" },
    rahkar: { en: "Rahkar (Solution)", fa: "طرح راهکار" },
    kargozaran: { en: "Kargozaran (Brokers)", fa: "طرح کارگزاران" },
    forsat: { en: "Forsat (Opportunity)", fa: "طرح فرصت" },
    toloo: { en: "Toloo (Sunrise)", fa: "طرح طلوع" },
    faraz: { en: "Faraz (Online)", fa: "طرح غیر حضوری فراز" },
    kara: { en: "Kara (Efficient)", fa: "طرح کارا" },
    rahgosha: { en: "Rahgosha (Problem Solver)", fa: "طرح راهگشا" },
    "kar-nik": { en: "Kar Nik (Vehicle)", fa: "طرح کار نیک (خودرو و موتور)" },
  },
  "bank-karafarin": {
    "nik-afarin-plus": { en: "Nik Afarin Plus", fa: "نیک آفرین پلاس" },
    "kara-personnel": { en: "Kara Personnel", fa: "کارا (ویژه پرسنل)" },
    "hamyaran-sabz": { en: "Hamyaran Sabz", fa: "همیاران سبز" },
    "saba-personnel": { en: "Saba Personnel", fa: "صبا (پرسنل شرکتها)" },
    "omid-afarin": { en: "Omid Afarin", fa: "امید آفرین" },
  },
};

// =============================================================================
// REQUIREMENTS & FEATURES
// =============================================================================

export const REQUIREMENTS: Record<string, BilingualText> = {
  guarantor: { en: "Guarantor", fa: "ضامن" },
  noGuarantor: { en: "No Guarantor Required", fa: "بدون ضامن" },
  check: { en: "Check", fa: "چک" },
  promissoryNote: { en: "Promissory Note", fa: "سفته" },
  digitalPromissoryNote: { en: "Digital Promissory Note", fa: "سفته الکترونیکی" },
  collateral: { en: "Collateral", fa: "وثیقه" },
  creditRating: { en: "Credit Rating", fa: "رتبه اعتباری" },
  noBadChecks: { en: "No Bounced Checks", fa: "نداشتن چک برگشتی" },
  noOverdueDebts: { en: "No Overdue Debts", fa: "نداشتن بدهی معوقه" },
  accountAverage: { en: "Account Average", fa: "میانگین حساب" },
  salaryDeposit: { en: "Salary Deposit", fa: "واریز حقوق" },
  digitalSignature: { en: "Digital Signature", fa: "امضای دیجیتال" },
  onlineCreditCheck: { en: "Online Credit Check", fa: "اعتبارسنجی آنلاین" },
};

export const FEATURES: Record<string, BilingualText> = {
  noGuarantor: { en: "No Guarantor", fa: "بدون ضامن" },
  noCheck: { en: "No Check", fa: "بدون چک" },
  noPromissoryNote: { en: "No Promissory Note", fa: "بدون سفته" },
  fullyOnline: { en: "Fully Online", fa: "کاملاً آنلاین" },
  instantDeposit: { en: "Instant Deposit", fa: "واریز آنی" },
  digitalContract: { en: "Digital Contract", fa: "قرارداد دیجیتال" },
  noBlockedMoney: { en: "No Blocked Money", fa: "بدون مسدودی پول" },
  transferable: { en: "Transferable", fa: "قابل انتقال" },
  pointPurchase: { en: "Point Purchase Available", fa: "قابلیت خرید امتیاز" },
  pointTransfer: { en: "Point Transfer Available", fa: "قابلیت انتقال امتیاز" },
};

// =============================================================================
// FINANCIAL TERMS
// =============================================================================

export const TERMS: Record<string, BilingualText> = {
  interestRate: { en: "Interest Rate", fa: "نرخ سود" },
  fee: { en: "Fee", fa: "کارمزد" },
  repaymentPeriod: { en: "Repayment Period", fa: "مدت بازپرداخت" },
  monthlyPayment: { en: "Monthly Payment", fa: "قسط ماهیانه" },
  minAmount: { en: "Minimum Amount", fa: "حداقل مبلغ" },
  maxAmount: { en: "Maximum Amount", fa: "حداکثر مبلغ" },
  points: { en: "Points", fa: "امتیاز" },
  coins: { en: "Coins", fa: "سکه" },
  deposit: { en: "Deposit", fa: "سپرده" },
  average: { en: "Average", fa: "میانگین" },
  processingTime: { en: "Processing Time", fa: "زمان پردازش" },
  instant: { en: "Instant", fa: "آنی" },
  earlyRepayment: { en: "Early Repayment", fa: "تسویه زودتر" },
};

// =============================================================================
// INTEREST RATES
// =============================================================================

export const INTEREST_RATES: Record<string, InterestRate> = {
  centralBankRate: {
    value: 23,
    description: { en: "Central Bank Rate", fa: "نرخ مصوب بانک مرکزی" },
  },
  gharzolhasanehFee: {
    value: 4,
    description: { en: "Gharzolhasaneh Fee", fa: "کارمزد قرض‌الحسنه" },
  },
  lateFee: {
    value: 12,
    description: { en: "Late Payment Fee", fa: "جریمه دیرکرد" },
  },
  preferentialRate: {
    value: 15,
    description: { en: "Preferential Rate", fa: "نرخ ترجیحی" },
  },
};

// =============================================================================
// CREDIT SYSTEMS
// =============================================================================

export const CREDIT_SYSTEMS: Record<string, BilingualText> = {
  merat: { en: "Merat System", fa: "سامانه مرآت" },
  zeman: { en: "Zeman System", fa: "سامانه ضمان" },
  kara: { en: "Kara System", fa: "سامانه کارا" },
  sahamAdalat: { en: "Justice Shares", fa: "سهام عدالت" },
};

// =============================================================================
// TARGET AUDIENCES
// =============================================================================

export const TARGET_AUDIENCES: Record<string, BilingualText> = {
  general: { en: "General Public", fa: "عموم" },
  women: { en: "Women", fa: "بانوان" },
  teachers: { en: "Teachers", fa: "فرهنگیان" },
  employees: { en: "Employees", fa: "کارکنان" },
  businessOwners: { en: "Business Owners", fa: "صاحبان کسب و کار" },
  posOwners: { en: "POS Owners", fa: "دارندگان کارتخوان" },
  subsidyRecipients: { en: "Subsidy Recipients", fa: "یارانه‌بگیران" },
};

// =============================================================================
// CREDIT RATING DESCRIPTIONS
// =============================================================================

export const CREDIT_RATING_INFO: Record<CreditRating, BilingualText> = {
  [CreditRating.A]: { en: "Excellent", fa: "عالی" },
  [CreditRating.B]: { en: "Good", fa: "خوب" },
  [CreditRating.C]: { en: "Average", fa: "متوسط" },
  [CreditRating.D]: { en: "Poor", fa: "ضعیف" },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getBankById(bankId: string): Bank | undefined {
  return ALL_BANKS[bankId];
}

export function getDigitalBanks(): Bank[] {
  return Object.values(DIGITAL_BANKS);
}

export function getTraditionalBanks(): Bank[] {
  return Object.values(TRADITIONAL_BANKS);
}

export function getLoansByBank(bankId: string): Record<string, BilingualText> {
  return LOAN_PRODUCTS[bankId] || {};
}

export function getBankCalculationMethod(bankId: string): LoanCalculationMethod {
  const methods: Record<string, LoanCalculationMethod> = {
    bankino: LoanCalculationMethod.POINTS_BASED,
    "blue-bank": LoanCalculationMethod.AVERAGE_BASED,
    sepino: LoanCalculationMethod.DEPOSIT_BASED,
    weepod: LoanCalculationMethod.STEP_BASED,
    qbank: LoanCalculationMethod.AVERAGE_BASED,
    "hi-bank": LoanCalculationMethod.STEP_BASED,
    "neshan-bank": LoanCalculationMethod.COLLATERAL_BASED,
  };
  return methods[bankId] || LoanCalculationMethod.AVERAGE_BASED;
}

export function formatAmountFa(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString("fa-IR")} میلیارد تومان`;
  } else if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString("fa-IR")} میلیون تومان`;
  }
  return `${amount.toLocaleString("fa-IR")} تومان`;
}

export function formatAmountEn(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} Billion Toman`;
  } else if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(0)} Million Toman`;
  }
  return `${amount.toLocaleString("en-US")} Toman`;
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  TRADITIONAL_BANKS,
  DIGITAL_BANKS,
  ALL_BANKS,
  LOAN_PRODUCTS,
  REQUIREMENTS,
  FEATURES,
  TERMS,
  INTEREST_RATES,
  CREDIT_SYSTEMS,
  TARGET_AUDIENCES,
  CREDIT_RATING_INFO,
};
