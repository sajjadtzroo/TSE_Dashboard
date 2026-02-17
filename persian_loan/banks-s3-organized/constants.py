"""
Iranian Banking Loan System - Python Constants
Generated: 2026-02-02
Version: 2.0.0
"""

from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass


# =============================================================================
# ENUMS
# =============================================================================

class BankType(str, Enum):
    TRADITIONAL = "traditional"
    DIGITAL = "digital"
    NEOBANK = "neobank"


class BankOwnership(str, Enum):
    STATE_OWNED = "state-owned"
    PRIVATE = "private"
    PUBLIC = "public"


class CreditRating(str, Enum):
    A = "A"  # Excellent
    B = "B"  # Good
    C = "C"  # Average
    D = "D"  # Poor


class LoanCalculationMethod(str, Enum):
    POINTS_BASED = "points-based"
    AVERAGE_BASED = "average-based"
    STEP_BASED = "step-based"
    DEPOSIT_BASED = "deposit-based"
    SALARY_BASED = "salary-based"
    POS_BASED = "pos-based"
    COLLATERAL_BASED = "collateral-based"


class LoanCategory(str, Enum):
    PERSONAL = "personal"
    CORPORATE = "corporate"
    BUSINESS = "business"
    GOODS_PURCHASE = "goods-purchase"
    CREDIT_CARD = "credit-card"
    GHARZOLHASANEH = "gharzolhasaneh"
    MURABAHA = "murabaha"
    BNPL = "bnpl"


class LoanStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


# =============================================================================
# DATACLASSES
# =============================================================================

@dataclass
class BilingualText:
    en: str
    fa: str

    def __str__(self):
        return f"{self.en} ({self.fa})"


@dataclass
class Bank:
    id: str
    name: BilingualText
    abbr: str
    type: BankType
    ownership: Optional[BankOwnership] = None
    parent_bank: Optional[str] = None
    website: Optional[str] = None


@dataclass
class InterestRate:
    value: float
    description: BilingualText


# =============================================================================
# BANK DEFINITIONS
# =============================================================================

TRADITIONAL_BANKS: Dict[str, Bank] = {
    "bank-meli": Bank(
        id="bank-meli",
        name=BilingualText("Bank Meli Iran", "بانک ملی ایران"),
        abbr="BMI",
        type=BankType.TRADITIONAL,
        ownership=BankOwnership.STATE_OWNED,
        website="https://bmi.ir"
    ),
    "bank-saderat": Bank(
        id="bank-saderat",
        name=BilingualText("Bank Saderat Iran", "بانک صادرات ایران"),
        abbr="BSI",
        type=BankType.TRADITIONAL,
        ownership=BankOwnership.PUBLIC,
        website="https://www.bsi.ir"
    ),
    "bank-pasargad": Bank(
        id="bank-pasargad",
        name=BilingualText("Bank Pasargad", "بانک پاسارگاد"),
        abbr="BPI",
        type=BankType.TRADITIONAL,
        ownership=BankOwnership.PRIVATE,
        website="https://bpi.ir"
    ),
    "bank-parsian": Bank(
        id="bank-parsian",
        name=BilingualText("Bank Parsian", "بانک پارسیان"),
        abbr="BPR",
        type=BankType.TRADITIONAL,
        ownership=BankOwnership.PRIVATE,
        website="https://parsian-bank.ir"
    ),
    "bank-day": Bank(
        id="bank-day",
        name=BilingualText("Bank Day", "بانک دی"),
        abbr="BD",
        type=BankType.TRADITIONAL,
        ownership=BankOwnership.PRIVATE,
        website="https://day24.ir"
    ),
    "bank-karafarin": Bank(
        id="bank-karafarin",
        name=BilingualText("Bank Karafarin", "بانک کارآفرین"),
        abbr="BK",
        type=BankType.TRADITIONAL,
        ownership=BankOwnership.PRIVATE,
        website="https://karafarinbank.ir"
    ),
    "bank-iran-zamin": Bank(
        id="bank-iran-zamin",
        name=BilingualText("Bank Iran Zamin", "بانک ایران زمین"),
        abbr="BIZ",
        type=BankType.TRADITIONAL,
        ownership=BankOwnership.PRIVATE,
        website="https://izbank.ir"
    ),
    "bank-tosee-saderat": Bank(
        id="bank-tosee-saderat",
        name=BilingualText("Export Development Bank", "بانک توسعه صادرات"),
        abbr="EDBI",
        type=BankType.TRADITIONAL,
        ownership=BankOwnership.STATE_OWNED,
        website="https://edbi.ir"
    ),
}

DIGITAL_BANKS: Dict[str, Bank] = {
    "bankino": Bank(
        id="bankino",
        name=BilingualText("Bankino", "بانکینو"),
        abbr="BKN",
        type=BankType.NEOBANK,
        parent_bank="bank-khavarmiane",
        website="https://bankino.ir"
    ),
    "blue-bank": Bank(
        id="blue-bank",
        name=BilingualText("Blu Bank", "بلوبانک"),
        abbr="BLU",
        type=BankType.NEOBANK,
        parent_bank="bank-saman",
        website="https://blu.ir"
    ),
    "sepino": Bank(
        id="sepino",
        name=BilingualText("Sepino", "سپینو"),
        abbr="SPN",
        type=BankType.NEOBANK,
        parent_bank="bank-saderat",
        website="http://sepino.bsi.ir"
    ),
    "weepod": Bank(
        id="weepod",
        name=BilingualText("Weepod", "ویپاد"),
        abbr="WPD",
        type=BankType.NEOBANK,
        parent_bank="bank-pasargad",
        website="https://wepod.ir"
    ),
    "qbank": Bank(
        id="qbank",
        name=BilingualText("Qbank", "کیوبانک"),
        abbr="QBK",
        type=BankType.NEOBANK,
        parent_bank="bank-mehr",
        website="https://qmb.ir"
    ),
    "hi-bank": Bank(
        id="hi-bank",
        name=BilingualText("Hi Bank", "های بانک"),
        abbr="HIB",
        type=BankType.NEOBANK,
        website="https://hibank.ir"
    ),
    "neshan-bank": Bank(
        id="neshan-bank",
        name=BilingualText("Neshan Bank", "نشان بانک"),
        abbr="NSH",
        type=BankType.NEOBANK,
        parent_bank="bank-meli",
        website="https://neshanbank.ir"
    ),
}

ALL_BANKS: Dict[str, Bank] = {**TRADITIONAL_BANKS, **DIGITAL_BANKS}


# =============================================================================
# LOAN PRODUCTS
# =============================================================================

LOAN_PRODUCTS: Dict[str, Dict[str, BilingualText]] = {
    "bankino": {
        "vamino": BilingualText("Vamino", "وامینو"),
        "vamino-monthly": BilingualText("Vamino Monthly Credit", "وامینو اعتبار یک ماهه"),
        "vamino-installment": BilingualText("Vamino Installment", "وامینو اقساطی"),
    },
    "blue-bank": {
        "personal": BilingualText("Personal Loan", "وام شخصی"),
        "corporate": BilingualText("Corporate Loan", "وام سازمانی"),
    },
    "sepino": {
        "nitro": BilingualText("Nitro Loan", "وام نیترو"),
        "no-guarantor": BilingualText("No Guarantor Loan", "تسهیلات بدون ضامن"),
        "sana-2": BilingualText("Sana 2 Plan", "طرح سنا ۲"),
        "star-sepino": BilingualText("Star Sepino", "طرح ستاره سپینو"),
        "murabaha-card": BilingualText("Murabaha Credit Card", "کارت اعتباری مرابحه"),
    },
    "weepod": {
        "poshtibaneh": BilingualText("Poshtibaneh", "تسهیلات پشتوانه"),
        "barayand": BilingualText("Barayand", "تسهیلات برآیند"),
        "barayand-chekyar": BilingualText("Barayand Chekyar", "تسهیلات برآیند چک‌یار"),
        "peyman": BilingualText("Peyman", "تسهیلات پیمان"),
    },
    "qbank": {
        "nasr": BilingualText("Nasr Plan", "طرح نصر"),
        "niloofar": BilingualText("Niloofar Plan", "طرح نیلوفر"),
        "no-guarantor": BilingualText("Instant No-Guarantor", "وام فوری بدون ضامن"),
        "kala-kart": BilingualText("Kala Kart", "کالا کارت"),
        "mehryar": BilingualText("Mehryar Plan", "طرح مهریار"),
        "mehryar-sazmani": BilingualText("Mehryar Corporate", "طرح مهریار سازمانی"),
    },
    "hi-bank": {
        "tier-1": BilingualText("5-20 Million Loan", "تسهیلات ۵ تا ۲۰ میلیونی"),
        "tier-2": BilingualText("30-50 Million Loan", "تسهیلات ۳۰ تا ۵۰ میلیونی"),
        "tier-3": BilingualText("75-100 Million Loan", "تسهیلات ۷۵ تا ۱۰۰ میلیونی"),
    },
    "neshan-bank": {
        "corona-support": BilingualText("COVID Support Loan", "تسهیلات کرونا"),
        "neshan-etebari": BilingualText("Neshan Credit", "نشان اعتباری"),
        "zar-neshan": BilingualText("Zar Neshan", "زرنشان"),
    },
    "bank-saderat": {
        "jari-talaei": BilingualText("Golden Current Account", "جاری طلایی دو"),
        "misagh": BilingualText("Misagh", "میثاق"),
        "saba-sepehr-pos": BilingualText("Saba Sepehr POS", "صبای سپهر (پایانه فروش)"),
        "sana": BilingualText("Sana", "سنا"),
        "sana-2": BilingualText("Sana 2", "سنا ۲"),
        "hamyaran-sepehr": BilingualText("Hamyaran Sepehr", "همیاران سپهر (کارت اعتباری)"),
        "sepas-sepehr": BilingualText("Sepas Sepehr", "سپاس سپهر"),
        "timche": BilingualText("Timche", "تیمچه"),
        "kharid-kala": BilingualText("Goods Purchase", "خرید کالا"),
    },
    "bank-meli": {
        "kargoshaei": BilingualText("Kargoshaei Plan", "طرح کارگشای ملی"),
        "mehrabani": BilingualText("Mehrabani", "مهربانی ملی"),
        "etebar-meli": BilingualText("Etebar Meli", "طرح اعتبار ملی"),
        "tasahilat-tarjihi": BilingualText("Preferential Rate", "تسهیلات با نرخ ترجیحی"),
        "paziraneh": BilingualText("Paziraneh", "وام پذیرنه ملی"),
    },
    "bank-day": {
        "mahan-plan": BilingualText("Mahan Plan", "طرح ماهان دی"),
        "business-plan": BilingualText("Business Plan", "طرح کسب و کار"),
    },
    "bank-pasargad": {
        "arzan-gheimat": BilingualText("Arzan Gheimat", "ارزان قیمت"),
        "ipg-pos": BilingualText("IPG/POS Facilities", "مبتنی بر مراوده (IPG/POS)"),
        "cap-card": BilingualText("Cap Card", "کاپ کارت"),
    },
    "bank-iran-zamin": {
        "kalayar": BilingualText("Kalayar (Home Appliances)", "طرح کالایار (لوازم خانگی)"),
        "rahkar": BilingualText("Rahkar (Solution)", "طرح راهکار"),
        "kargozaran": BilingualText("Kargozaran (Brokers)", "طرح کارگزاران"),
        "forsat": BilingualText("Forsat (Opportunity)", "طرح فرصت"),
        "toloo": BilingualText("Toloo (Sunrise)", "طرح طلوع"),
        "faraz": BilingualText("Faraz (Online)", "طرح غیر حضوری فراز"),
        "kara": BilingualText("Kara (Efficient)", "طرح کارا"),
        "rahgosha": BilingualText("Rahgosha (Problem Solver)", "طرح راهگشا"),
        "kar-nik": BilingualText("Kar Nik (Vehicle)", "طرح کار نیک (خودرو و موتور)"),
    },
    "bank-karafarin": {
        "nik-afarin-plus": BilingualText("Nik Afarin Plus", "نیک آفرین پلاس"),
        "kara-personnel": BilingualText("Kara Personnel", "کارا (ویژه پرسنل)"),
        "hamyaran-sabz": BilingualText("Hamyaran Sabz", "همیاران سبز"),
        "saba-personnel": BilingualText("Saba Personnel", "صبا (پرسنل شرکتها)"),
        "omid-afarin": BilingualText("Omid Afarin", "امید آفرین"),
    },
}


# =============================================================================
# REQUIREMENTS & FEATURES
# =============================================================================

REQUIREMENTS: Dict[str, BilingualText] = {
    "guarantor": BilingualText("Guarantor", "ضامن"),
    "no_guarantor": BilingualText("No Guarantor Required", "بدون ضامن"),
    "check": BilingualText("Check", "چک"),
    "promissory_note": BilingualText("Promissory Note", "سفته"),
    "digital_promissory_note": BilingualText("Digital Promissory Note", "سفته الکترونیکی"),
    "collateral": BilingualText("Collateral", "وثیقه"),
    "credit_rating": BilingualText("Credit Rating", "رتبه اعتباری"),
    "no_bad_checks": BilingualText("No Bounced Checks", "نداشتن چک برگشتی"),
    "no_overdue_debts": BilingualText("No Overdue Debts", "نداشتن بدهی معوقه"),
    "account_average": BilingualText("Account Average", "میانگین حساب"),
    "salary_deposit": BilingualText("Salary Deposit", "واریز حقوق"),
    "digital_signature": BilingualText("Digital Signature", "امضای دیجیتال"),
    "online_credit_check": BilingualText("Online Credit Check", "اعتبارسنجی آنلاین"),
}

FEATURES: Dict[str, BilingualText] = {
    "no_guarantor": BilingualText("No Guarantor", "بدون ضامن"),
    "no_check": BilingualText("No Check", "بدون چک"),
    "no_promissory_note": BilingualText("No Promissory Note", "بدون سفته"),
    "fully_online": BilingualText("Fully Online", "کاملاً آنلاین"),
    "instant_deposit": BilingualText("Instant Deposit", "واریز آنی"),
    "digital_contract": BilingualText("Digital Contract", "قرارداد دیجیتال"),
    "no_blocked_money": BilingualText("No Blocked Money", "بدون مسدودی پول"),
    "transferable": BilingualText("Transferable", "قابل انتقال"),
    "point_purchase": BilingualText("Point Purchase Available", "قابلیت خرید امتیاز"),
    "point_transfer": BilingualText("Point Transfer Available", "قابلیت انتقال امتیاز"),
}


# =============================================================================
# FINANCIAL TERMS
# =============================================================================

TERMS: Dict[str, BilingualText] = {
    "interest_rate": BilingualText("Interest Rate", "نرخ سود"),
    "fee": BilingualText("Fee", "کارمزد"),
    "repayment_period": BilingualText("Repayment Period", "مدت بازپرداخت"),
    "monthly_payment": BilingualText("Monthly Payment", "قسط ماهیانه"),
    "min_amount": BilingualText("Minimum Amount", "حداقل مبلغ"),
    "max_amount": BilingualText("Maximum Amount", "حداکثر مبلغ"),
    "points": BilingualText("Points", "امتیاز"),
    "coins": BilingualText("Coins", "سکه"),
    "deposit": BilingualText("Deposit", "سپرده"),
    "average": BilingualText("Average", "میانگین"),
    "processing_time": BilingualText("Processing Time", "زمان پردازش"),
    "instant": BilingualText("Instant", "آنی"),
    "early_repayment": BilingualText("Early Repayment", "تسویه زودتر"),
}


# =============================================================================
# INTEREST RATES
# =============================================================================

INTEREST_RATES = {
    "central_bank_rate": InterestRate(23.0, BilingualText("Central Bank Rate", "نرخ مصوب بانک مرکزی")),
    "gharzolhasaneh_fee": InterestRate(4.0, BilingualText("Gharzolhasaneh Fee", "کارمزد قرض‌الحسنه")),
    "late_fee": InterestRate(12.0, BilingualText("Late Payment Fee", "جریمه دیرکرد")),
    "preferential_rate": InterestRate(15.0, BilingualText("Preferential Rate", "نرخ ترجیحی")),
}


# =============================================================================
# AMOUNT FORMATTING
# =============================================================================

def format_amount_fa(amount: int, unit: str = "toman") -> str:
    """Format amount in Persian style."""
    if unit == "toman":
        if amount >= 1_000_000_000:
            return f"{amount // 1_000_000_000:,} میلیارد تومان"
        elif amount >= 1_000_000:
            return f"{amount // 1_000_000:,} میلیون تومان"
        else:
            return f"{amount:,} تومان"
    return f"{amount:,} {unit}"


def format_amount_en(amount: int, unit: str = "toman") -> str:
    """Format amount in English style."""
    if unit == "toman":
        if amount >= 1_000_000_000:
            return f"{amount / 1_000_000_000:.1f} Billion Toman"
        elif amount >= 1_000_000:
            return f"{amount / 1_000_000:.0f} Million Toman"
        else:
            return f"{amount:,} Toman"
    return f"{amount:,} {unit}"


# =============================================================================
# CREDIT SYSTEMS
# =============================================================================

CREDIT_SYSTEMS: Dict[str, BilingualText] = {
    "merat": BilingualText("Merat System", "سامانه مرآت"),
    "zeman": BilingualText("Zeman System", "سامانه ضمان"),
    "kara": BilingualText("Kara System", "سامانه کارا"),
    "saham_adalat": BilingualText("Justice Shares", "سهام عدالت"),
}


# =============================================================================
# TARGET AUDIENCES
# =============================================================================

TARGET_AUDIENCES: Dict[str, BilingualText] = {
    "general": BilingualText("General Public", "عموم"),
    "women": BilingualText("Women", "بانوان"),
    "teachers": BilingualText("Teachers", "فرهنگیان"),
    "employees": BilingualText("Employees", "کارکنان"),
    "business_owners": BilingualText("Business Owners", "صاحبان کسب و کار"),
    "pos_owners": BilingualText("POS Owners", "دارندگان کارتخوان"),
    "subsidy_recipients": BilingualText("Subsidy Recipients", "یارانه‌بگیران"),
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_bank_by_id(bank_id: str) -> Optional[Bank]:
    """Get bank by ID from all banks."""
    return ALL_BANKS.get(bank_id)


def get_digital_banks() -> List[Bank]:
    """Get list of all digital banks."""
    return list(DIGITAL_BANKS.values())


def get_traditional_banks() -> List[Bank]:
    """Get list of all traditional banks."""
    return list(TRADITIONAL_BANKS.values())


def get_loans_by_bank(bank_id: str) -> Dict[str, BilingualText]:
    """Get all loans for a specific bank."""
    return LOAN_PRODUCTS.get(bank_id, {})


def get_bank_calculation_method(bank_id: str) -> LoanCalculationMethod:
    """Get the primary calculation method for a bank."""
    methods = {
        "bankino": LoanCalculationMethod.POINTS_BASED,
        "blue-bank": LoanCalculationMethod.AVERAGE_BASED,
        "sepino": LoanCalculationMethod.DEPOSIT_BASED,
        "weepod": LoanCalculationMethod.STEP_BASED,
        "qbank": LoanCalculationMethod.AVERAGE_BASED,
        "hi-bank": LoanCalculationMethod.STEP_BASED,
        "neshan-bank": LoanCalculationMethod.COLLATERAL_BASED,
    }
    return methods.get(bank_id, LoanCalculationMethod.AVERAGE_BASED)
