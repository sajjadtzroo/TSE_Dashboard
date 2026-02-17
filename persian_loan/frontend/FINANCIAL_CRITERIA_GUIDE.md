# راهنمای معیارهای مالی (Financial Criteria Guide)

این راهنما نحوه استفاده از فیلدهای **معیارهای مالی** در ساختار داده‌های وام را توضیح می‌دهد.

## فهرست مطالب

1. [محاسبات سپرده (Deposit Calculations)](#1-محاسبات-سپرده)
2. [تحلیل جریان نقدی (Cash Flow Analysis)](#2-تحلیل-جریان-نقدی)
3. [محاسبه سود (Interest Calculation)](#3-محاسبه-سود)
4. [برنامه پرداخت (Payment Schedule)](#4-برنامه-پرداخت)
5. [محاسبه سود بانک (Profit Calculation)](#5-محاسبه-سود-بانک)
6. [کارمزد و هزینه‌ها (Fees and Charges)](#6-کارمزد-و-هزینهها)
7. [محاسبه APR (APR Calculation)](#7-محاسبه-apr)
8. [استهلاک (Amortization)](#8-استهلاک)
9. [ارزیابی ریسک (Risk Assessment)](#9-ارزیابی-ریسک)

---

## 1. محاسبات سپرده (Deposit Calculations)

### روش‌های محاسبه سپرده

#### 1.1 روش درصدی (Percentage)
```json
{
  "depositCalculation": {
    "method": "percentage",
    "methodFA": "درصدی",
    "percentage": 10,
    "formula": "principal * (percentage / 100)",
    "formulaFA": "مبلغ اصلی × (درصد / ۱۰۰)",
    "description": "Deposit is 10% of loan amount",
    "descriptionFA": "سپرده ۱۰٪ مبلغ وام است"
  }
}
```

**مثال:** برای وام 100 میلیون تومانی با سپرده 10%:
- سپرده = 100,000,000 × 0.10 = 10,000,000 تومان

#### 1.2 روش ثابت (Fixed)
```json
{
  "depositCalculation": {
    "method": "fixed",
    "methodFA": "ثابت",
    "fixedAmount": 5000000,
    "formula": "fixedAmount",
    "formulaFA": "مبلغ ثابت",
    "descriptionFA": "سپرده ثابت ۵ میلیون تومان"
  }
}
```

#### 1.3 روش ضریبی (Coefficient)
```json
{
  "depositCalculation": {
    "method": "coefficient",
    "methodFA": "ضریبی",
    "coefficient": 0.15,
    "formula": "principal * coefficient",
    "formulaFA": "مبلغ اصلی × ضریب",
    "descriptionFA": "سپرده با ضریب ۰.۱۵"
  }
}
```

#### 1.4 بدون سپرده (No Deposit)
```json
{
  "depositCalculation": {
    "method": "none",
    "methodFA": "بدون سپرده",
    "formula": "0",
    "descriptionFA": "این وام نیاز به سپرده ندارد"
  }
}
```

---

## 2. تحلیل جریان نقدی (Cash Flow Analysis)

### 2.1 ارزش فعلی خالص (NPV - Net Present Value)
```json
{
  "cashFlowAnalysis": {
    "method": "npv",
    "methodFA": "ارزش فعلی خالص",
    "discountRate": 15,
    "inflationRate": 40,
    "formula": "Σ(CF_t / (1 + r)^t)",
    "formulaFA": "مجموع (جریان نقدی / (۱ + نرخ تنزیل)^زمان)"
  }
}
```

**فرمول:**
```
NPV = Σ(CF_t / (1 + r)^t) - Initial Investment
```
- CF_t = جریان نقدی در زمان t
- r = نرخ تنزیل
- t = دوره زمانی

### 2.2 نرخ بازده داخلی (IRR - Internal Rate of Return)
```json
{
  "cashFlowAnalysis": {
    "method": "irr",
    "methodFA": "نرخ بازده داخلی",
    "formula": "NPV = 0 at IRR",
    "formulaFA": "نرخی که ارزش فعلی خالص را صفر می‌کند"
  }
}
```

### 2.3 دوره بازگشت سرمایه (Payback Period)
```json
{
  "cashFlowAnalysis": {
    "method": "payback",
    "methodFA": "دوره بازگشت سرمایه",
    "formula": "Initial Investment / Annual Cash Flow",
    "formulaFA": "سرمایه اولیه / جریان نقدی سالانه"
  }
}
```

---

## 3. محاسبه سود (Interest Calculation)

### 3.1 سود ساده (Simple Interest)
```json
{
  "interestCalculation": {
    "method": "simple",
    "methodFA": "سود ساده",
    "formula": "P × r × t",
    "formulaFA": "اصل × نرخ × زمان",
    "effectiveRate": false
  }
}
```

**فرمول:**
```
I = P × r × t
```
- P = مبلغ اصلی (Principal)
- r = نرخ سود سالانه
- t = مدت زمان (سال)

**مثال:** وام 100 میلیون تومانی با نرخ 18% برای 2 سال:
```
I = 100,000,000 × 0.18 × 2 = 36,000,000 تومان
```

### 3.2 سود مرکب (Compound Interest)
```json
{
  "interestCalculation": {
    "method": "compound",
    "methodFA": "سود مرکب",
    "compoundingFrequency": "monthly",
    "compoundingFrequencyFA": "ماهانه",
    "formula": "P × (1 + r/n)^(n×t)",
    "formulaFA": "اصل × (۱ + نرخ/تعداد)^(تعداد×زمان)",
    "effectiveRate": true
  }
}
```

**فرمول:**
```
A = P × (1 + r/n)^(n×t)
I = A - P
```
- n = تعداد دفعات ترکیب در سال
- A = مبلغ نهایی

**مثال:** وام 100 میلیون با نرخ 18% ترکیب ماهانه برای 2 سال:
```
A = 100,000,000 × (1 + 0.18/12)^(12×2)
A = 100,000,000 × (1.015)^24
A = 142,950,000 تومان
I = 42,950,000 تومان
```

### 3.3 کاهنده (Reducing Balance)
```json
{
  "interestCalculation": {
    "method": "reducing_balance",
    "methodFA": "نرخ کاهنده",
    "formula": "remaining_principal × r / 12",
    "formulaFA": "باقیمانده اصل × نرخ / ۱۲",
    "effectiveRate": true
  }
}
```

**محاسبه:** سود هر ماه بر اساس باقیمانده اصل محاسبه می‌شود.

### 3.4 نرخ ثابت (Flat Rate)
```json
{
  "interestCalculation": {
    "method": "flat_rate",
    "methodFA": "نرخ ثابت",
    "formula": "(P × r × t) / total_months",
    "formulaFA": "(اصل × نرخ × زمان) / کل ماه‌ها"
  }
}
```

### 3.5 سالیانه (Annuity)
```json
{
  "interestCalculation": {
    "method": "annuity",
    "methodFA": "سالیانه",
    "formula": "P × [r(1+r)^n] / [(1+r)^n - 1]",
    "formulaFA": "فرمول آنوئیتی استاندارد"
  }
}
```

---

## 4. برنامه پرداخت (Payment Schedule)

### 4.1 اقساط مساوی (Equal Installments)
```json
{
  "paymentSchedule": {
    "type": "equal_installments",
    "typeFA": "اقساط مساوی",
    "formula": "P × [r(1+r)^n] / [(1+r)^n - 1]",
    "formulaFA": "فرمول اقساط مساوی (آنوئیتی)",
    "gracePeriod": 0,
    "gracePeriodFA": "بدون دوره تنفس"
  }
}
```

**فرمول محاسبه قسط ماهانه:**
```
PMT = P × [r(1+r)^n] / [(1+r)^n - 1]
```
- PMT = قسط ماهانه
- P = مبلغ اصل وام
- r = نرخ سود ماهانه (نرخ سالانه / 12)
- n = تعداد کل اقساط

**مثال:** وام 100 میلیون تومانی، 18% سالانه، 24 ماه:
```
r_monthly = 0.18 / 12 = 0.015
PMT = 100,000,000 × [0.015(1.015)^24] / [(1.015)^24 - 1]
PMT = 100,000,000 × 0.02139 / 0.4295
PMT ≈ 4,980,000 تومان/ماه
```

### 4.2 کاهنده (Reducing Balance)
```json
{
  "paymentSchedule": {
    "type": "reducing_balance",
    "typeFA": "کاهنده",
    "formula": "(P/n) + (remaining_P × r/12)",
    "formulaFA": "(اصل/تعداد) + (باقیمانده × نرخ/۱۲)"
  }
}
```

**جدول پرداخت:**
| ماه | باقیمانده اصل | اصل قسط | سود قسط | کل قسط |
|-----|---------------|----------|---------|--------|
| 1   | 100,000,000   | 4,166,667| 1,500,000| 5,666,667|
| 2   | 95,833,333    | 4,166,667| 1,437,500| 5,604,167|
| ... | ...           | ...      | ...     | ...    |

### 4.3 تدریجی (Graduated)
```json
{
  "paymentSchedule": {
    "type": "graduated",
    "typeFA": "تدریجی (افزایشی)",
    "formula": "PMT_n = PMT_1 × (1 + g)^(n-1)",
    "formulaFA": "قسط ماه n = قسط اول × (۱ + نرخ رشد)^(n-۱)",
    "gracePeriod": 3,
    "gracePeriodFA": "۳ ماه دوره تنفس"
  }
}
```

### 4.4 بالونی (Balloon)
```json
{
  "paymentSchedule": {
    "type": "balloon",
    "typeFA": "بالونی",
    "formula": "Small monthly payments + Large final payment",
    "formulaFA": "اقساط ماهانه کوچک + پرداخت نهایی بزرگ"
  }
}
```

### 4.5 فقط سود (Interest Only)
```json
{
  "paymentSchedule": {
    "type": "interest_only",
    "typeFA": "فقط سود",
    "formula": "P × r / 12 (monthly interest only)",
    "formulaFA": "فقط پرداخت سود ماهانه، اصل در پایان"
  }
}
```

---

## 5. محاسبه سود بانک (Profit Calculation)

### 5.1 روش اسلامی (Islamic Banking)
```json
{
  "profitCalculation": {
    "method": "islamic",
    "methodFA": "روش اسلامی",
    "profitRate": 18,
    "profitRateFA": "۱۸٪",
    "formula": "Profit-sharing based on Islamic principles",
    "formulaFA": "سودی بر اساس اصول اسلامی"
  }
}
```

### 5.2 مرابحه (Murabaha)
```json
{
  "profitCalculation": {
    "method": "murabaha",
    "methodFA": "مرابحه",
    "profitRate": 15,
    "formula": "Cost + Agreed Profit Margin",
    "formulaFA": "قیمت تمام شده + حاشیه سود توافقی"
  }
}
```

### 5.3 مشارکت (Musharaka)
```json
{
  "profitCalculation": {
    "method": "musharaka",
    "methodFA": "مشارکت",
    "profitRate": 20,
    "formula": "Profit/Loss sharing based on capital ratio",
    "formulaFA": "تقسیم سود/زیان بر اساس نسبت سرمایه"
  }
}
```

### 5.4 اجاره (Ijara)
```json
{
  "profitCalculation": {
    "method": "ijara",
    "methodFA": "اجاره به شرط تملیک",
    "profitRate": 16,
    "formula": "Rental payments + Transfer of ownership",
    "formulaFA": "اجاره بها + انتقال مالکیت"
  }
}
```

---

## 6. کارمزد و هزینه‌ها (Fees and Charges)

### 6.1 کارمزد پردازش (Processing Fee)
```json
{
  "feesAndCharges": {
    "processingFee": {
      "type": "percentage",
      "amount": 1,
      "formula": "principal × 0.01"
    }
  }
}
```

**مثال:** وام 100 میلیون با کارمزد 1%:
```
Processing Fee = 100,000,000 × 0.01 = 1,000,000 تومان
```

### 6.2 کارمزد اداری (Administrative Fee)
```json
{
  "feesAndCharges": {
    "administrativeFee": {
      "type": "fixed",
      "amount": 500000,
      "formula": "500000 (fixed)"
    }
  }
}
```

### 6.3 جریمه پرداخت زودتر (Early Payment Penalty)
```json
{
  "feesAndCharges": {
    "earlyPaymentPenalty": {
      "applicable": true,
      "type": "percentage",
      "amount": 2,
      "formula": "remaining_principal × 0.02"
    }
  }
}
```

### 6.4 جریمه تاخیر (Late Payment Penalty)
```json
{
  "feesAndCharges": {
    "latePaymentPenalty": {
      "type": "daily_interest",
      "amount": 0.1,
      "formula": "overdue_amount × 0.001 × days_late"
    }
  }
}
```

**مثال:** قسط 5 میلیون با 10 روز تاخیر:
```
Penalty = 5,000,000 × 0.001 × 10 = 50,000 تومان
```

---

## 7. محاسبه APR (Annual Percentage Rate)

### نرخ درصد سالانه (APR)
```json
{
  "aprCalculation": {
    "includesFees": true,
    "includesInsurance": true,
    "formula": "((Total Paid - Principal) / Principal) / Years × 100",
    "formulaFA": "((کل پرداختی - اصل) / اصل) / سال × ۱۰۰",
    "effectiveAPR": 22.5
  }
}
```

**فرمول محاسبه APR واقعی:**
```
APR = (Total Interest + Total Fees) / Principal / Loan Term × 365 × 100
```

**مثال:**
- وام: 100 میلیون تومان
- سود کل: 20 میلیون
- کارمزد: 2 میلیون
- مدت: 2 سال

```
APR = (20,000,000 + 2,000,000) / 100,000,000 / 2 × 100
APR = 0.22 / 2 × 100 = 11% سالانه
```

---

## 8. استهلاک (Amortization)

### 8.1 خط مستقیم (Straight Line)
```json
{
  "amortization": {
    "method": "straight_line",
    "methodFA": "خط مستقیم",
    "formula": "(Cost - Salvage Value) / Useful Life",
    "formulaFA": "(قیمت - ارزش اسقاط) / عمر مفید"
  }
}
```

### 8.2 کاهنده (Declining Balance)
```json
{
  "amortization": {
    "method": "declining_balance",
    "methodFA": "کاهنده",
    "formula": "Book Value × Depreciation Rate",
    "formulaFA": "ارزش دفتری × نرخ استهلاک"
  }
}
```

### 8.3 آنوئیتی (Annuity)
```json
{
  "amortization": {
    "method": "annuity",
    "methodFA": "آنوئیتی",
    "formula": "Standard annuity amortization",
    "formulaFA": "استهلاک آنوئیتی استاندارد"
  }
}
```

---

## 9. ارزیابی ریسک (Risk Assessment)

### 9.1 نسبت بدهی به درآمد (Debt-to-Income Ratio)
```json
{
  "riskAssessment": {
    "debtToIncomeRatio": {
      "maximum": 0.40,
      "formula": "Total Monthly Debt / Gross Monthly Income"
    }
  }
}
```

**فرمول:**
```
DTI = (Total Monthly Debt Payments / Gross Monthly Income) × 100
```

**مثال:**
- درآمد ماهانه: 30 میلیون تومان
- بدهی ماهانه: 10 میلیون تومان

```
DTI = (10,000,000 / 30,000,000) × 100 = 33.3%
```

✅ قابل قبول (زیر 40%)

### 9.2 نسبت وام به ارزش (Loan-to-Value Ratio)
```json
{
  "riskAssessment": {
    "loanToValueRatio": {
      "maximum": 0.80,
      "formula": "Loan Amount / Property Value"
    }
  }
}
```

**فرمول:**
```
LTV = (Loan Amount / Property Appraised Value) × 100
```

**مثال:**
- ارزش ملک: 500 میلیون تومان
- مبلغ وام: 350 میلیون تومان

```
LTV = (350,000,000 / 500,000,000) × 100 = 70%
```

✅ قابل قبول (زیر 80%)

### 9.3 امتیاز اعتباری (Credit Score)
```json
{
  "riskAssessment": {
    "creditScoreRequirement": {
      "minimum": 650,
      "methodology": "FICO or custom scoring model"
    }
  }
}
```

---

## نمونه کامل (Complete Example)

```json
{
  "id": "loan-001",
  "nameFA": "وام خرید خودرو",
  "nameEN": "Car Purchase Loan",
  "minAmount": "50000000",
  "maxAmount": "500000000",
  "interestRate": "18",
  "repaymentPeriod": "12-60 ماه",

  "financialCriteria": {
    "depositCalculation": {
      "method": "percentage",
      "methodFA": "درصدی",
      "percentage": 20,
      "formula": "principal × 0.20",
      "formulaFA": "مبلغ اصلی × ۰.۲۰",
      "descriptionFA": "سپرده ۲۰٪ مبلغ وام"
    },

    "cashFlowAnalysis": {
      "method": "npv",
      "methodFA": "ارزش فعلی خالص",
      "discountRate": 15,
      "inflationRate": 40
    },

    "interestCalculation": {
      "method": "reducing_balance",
      "methodFA": "کاهنده",
      "formula": "remaining_principal × 0.18 / 12",
      "effectiveRate": true
    },

    "paymentSchedule": {
      "type": "equal_installments",
      "typeFA": "اقساط مساوی",
      "formula": "P × [r(1+r)^n] / [(1+r)^n - 1]",
      "gracePeriod": 0
    },

    "feesAndCharges": {
      "processingFee": {
        "type": "percentage",
        "amount": 1,
        "formula": "principal × 0.01"
      },
      "latePaymentPenalty": {
        "type": "daily_interest",
        "amount": 0.1,
        "formula": "overdue × 0.001 × days"
      }
    },

    "aprCalculation": {
      "includesFees": true,
      "includesInsurance": false,
      "effectiveAPR": 19.5
    },

    "riskAssessment": {
      "debtToIncomeRatio": {
        "maximum": 0.40,
        "formula": "monthly_debt / monthly_income"
      },
      "creditScoreRequirement": {
        "minimum": 600
      }
    }
  }
}
```

---

## استفاده در کد (Usage in Code)

### محاسبه سپرده
```typescript
function calculateDeposit(loanAmount: number, criteria: FinancialCriteria): number {
  const deposit = criteria.depositCalculation;

  switch (deposit?.method) {
    case 'percentage':
      return loanAmount * (deposit.percentage! / 100);
    case 'fixed':
      return deposit.fixedAmount!;
    case 'coefficient':
      return loanAmount * deposit.coefficient!;
    case 'none':
    default:
      return 0;
  }
}
```

### محاسبه قسط ماهانه
```typescript
function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number,
  criteria: FinancialCriteria
): number {
  const r = annualRate / 12 / 100; // Monthly rate
  const n = months;

  switch (criteria.paymentSchedule?.type) {
    case 'equal_installments':
      return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    case 'reducing_balance':
      // First month payment
      return (principal / n) + (principal * r);

    case 'interest_only':
      return principal * r;

    default:
      return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
}
```

### محاسبه APR
```typescript
function calculateAPR(
  principal: number,
  totalPaid: number,
  years: number,
  criteria: FinancialCriteria
): number {
  const totalInterest = totalPaid - principal;
  return (totalInterest / principal / years) * 100;
}
```

---

## منابع و مراجع

1. **فرمول‌های مالی استاندارد**: [Investopedia](https://www.investopedia.com/)
2. **محاسبات وام**: [Khan Academy - Interest and Debt](https://www.khanacademy.org/economics-finance-domain/core-finance)
3. **بانکداری اسلامی**: Islamic Finance Standards (AAOIFI)
4. **ارزیابی ریسک**: Basel III Banking Regulations

---

## تماس و پشتیبانی

برای سوالات بیشتر یا پیشنهادات، لطفاً با تیم توسعه تماس بگیرید.
