# بهینه‌ساز وام (Loan Optimizer)

## نمای کلی

بهینه‌ساز وام یک ابزار جامع برای مقایسه همه وام‌های موجود با استفاده از معیارهای پیشرفته مالی است.

## ویژگی‌ها

### محاسبات پیشرفته مالی
- **NPV (Net Present Value)**: ارزش خالص فعلی وام
- **IRR (Internal Rate of Return)**: نرخ بازده داخلی
- **CAPM (Capital Asset Pricing Model)**: محاسبه نرخ بازده مورد انتظار
- **WACC (Weighted Average Cost of Capital)**: میانگین موزون هزینه سرمایه
- **امتیاز ریسک**: ارزیابی جامع ریسک

### قابلیت‌های کاربری
- مقایسه همزمان 72+ وام
- فیلتر بر اساس بانک
- نمایش فقط وام‌های مناسب
- مرتب‌سازی بر اساس معیارهای مختلف
- نمودارهای بصری مقایسه‌ای
- رنگ‌بندی هوشمند نتایج

### رنگ‌بندی نتایج
- 🟢 **سبز (Teal)**: بهترین 10٪ وام‌ها
- 🔴 **قرمز (Pink)**: ضعیف‌ترین 10٪ وام‌ها
- ⚪ **خاکستری (Gray)**: وام‌های متوسط

## ساختار فایل‌ها

```
loan-optimizer/
├── LoanOptimizerPage.tsx          # صفحه اصلی
├── types.ts                        # تعاریف TypeScript
├── components/
│   ├── OptimizerInputForm.tsx     # فرم ورودی پارامترها
│   ├── OptimizerResultsTable.tsx  # جدول نتایج
│   ├── OptimizerFilters.tsx       # فیلترها
│   ├── OptimizerMetricsCards.tsx  # کارت‌های خلاصه
│   └── OptimizerCharts.tsx        # نمودارها
└── hooks/
    └── useLoanOptimizer.ts         # هوک محاسبات
```

## نحوه استفاده

### برای کاربران

1. **وارد کردن پارامترها**:
   - مبلغ سپرده
   - مدت سپرده (ماه)
   - مبلغ وام مورد نیاز
   - روش محاسبه نرخ تنزیل (CAPM/WACC/دلخواه)
   - تحمل ریسک (کم/متوسط/زیاد)

2. **محاسبه**: کلیک روی دکمه "محاسبه و مقایسه همه وام‌ها"

3. **بررسی نتایج**:
   - 3 کارت خلاصه برترین وام‌ها
   - جدول کامل با قابلیت مرتب‌سازی
   - فیلتر بر اساس بانک
   - نمودارهای مقایسه‌ای

### برای توسعه‌دهندگان

```tsx
import { useLoanOptimizer } from './hooks/useLoanOptimizer';

function MyComponent() {
  const { loans, loading, error } = useLoanOptimizer({
    depositAmount: 10_000_000,
    depositMonths: 3,
    loanAmountNeeded: 50_000_000,
    discountRateMethod: 'capm',
    riskTolerance: 'medium',
  });

  // استفاده از loans
}
```

## معیارهای محاسبه

### NPV (ارزش خالص فعلی)
```
NPV = Σ (CF_t / (1 + r)^t)
```
- CF_t: جریان نقدی در دوره t
- r: نرخ تنزیل (از CAPM یا WACC)
- هرچه NPV بیشتر، وام بهتر است

### IRR (نرخ بازده داخلی)
```
0 = Σ (CF_t / (1 + IRR)^t)
```
- نرخی که NPV را صفر می‌کند
- هرچه IRR بیشتر، وام بهتر است
- IRR > WACC → وام قابل قبول

### CAPM
```
E(R_i) = R_f + β × (R_m - R_f)
```
- R_f: نرخ بدون ریسک (20%)
- β: ضریب بتا (0.8-1.5)
- R_m: بازده بازار (35%)

### WACC
```
WACC = (E/V) × R_e + (D/V) × R_d × (1-T_c)
```
- E: ارزش سهام (سپرده)
- D: ارزش بدهی (وام)
- R_e: هزینه سهام (از CAPM)
- R_d: هزینه بدهی (نرخ وام)
- T_c: نرخ مالیات (25%)

### امتیاز ریسک
امتیاز ترکیبی 0-100 بر اساس:
- NPV (وزن: 30%)
- IRR (وزن: 30%)
- نسبت هزینه (وزن: 20%)
- ریسک (وزن: 20%)

## بهینه‌سازی عملکرد

### Memoization
- استفاده از `useMemo` برای محاسبات سنگین
- cache کردن نتایج تحلیل وام‌ها

### محاسبات سمت کلاینت
- بدون نیاز به API برای محاسبات
- پاسخ فوری به تغییرات فیلتر/مرتب‌سازی

### Lazy Loading
- بارگذاری تنبل صفحه با React.lazy()

## تست

```bash
# اجرای تست‌ها
npm test

# تست‌های مورد نیاز
- محاسبه NPV
- محاسبه IRR
- محاسبه CAPM
- محاسبه WACC
- رنگ‌بندی بر اساا percentile
- فیلتر وام‌ها
- مرتب‌سازی
```

## وابستگی‌ها

### کتابخانه‌های استفاده شده
- React
- React Router
- Lucide React (آیکون‌ها)
- Tailwind CSS (استایل)

### وابستگی‌های داخلی
- `services/loans.service.ts` - دریافت وام‌ها از API
- `features/calculator/calculatorEngine.ts` - محاسبات مالی
- `utils/financialCalculations.ts` - توابع NPV/IRR
- `utils/advancedFinancial.ts` - توابع CAPM/WACC

## پیکربندی پیش‌فرض

```typescript
// نرخ‌های پیش‌فرض بازار ایران
const IRANIAN_MARKET_DEFAULTS = {
  marketReturn: 0.35,        // 35% بازده سالانه بورس
  riskFreeRate: 0.20,        // 20% نرخ بدون ریسک
  corporateTaxRate: 0.25,    // 25% مالیات شرکتی
  defaultBeta: 1.2,          // بتای پیش‌فرض بانک‌ها
};
```

## مسیریابی

- مسیر: `/loan-optimizer`
- نمایش در منوی ناوبری: ابزارها > بهینه‌ساز وام
- آیکون: TrendingUp

## مثال استفاده

```typescript
// ورودی نمونه
const inputs: OptimizerInputs = {
  depositAmount: 10_000_000,      // 10 میلیون تومان
  depositMonths: 3,                // 3 ماه
  loanAmountNeeded: 50_000_000,   // 50 میلیون تومان
  discountRateMethod: 'capm',      // استفاده از CAPM
  riskTolerance: 'medium',         // ریسک متوسط
};

// خروجی نمونه
const results: LoanAnalysisResult[] = [
  {
    loanId: "mellat-gharzolhasaneh",
    bankNameFA: "بانک ملت",
    loanNameFA: "قرض‌الحسنه",
    loanAmount: 60_000_000,
    npv: 5_234_567,
    irr: 0.18,                    // 18%
    monthlyPayment: 1_200_000,
    totalCost: 72_000_000,
    effectiveRate: 0.15,
    discountRate: 0.30,           // از CAPM
    riskScore: 82,
    meetsRequirement: true,
    percentileNPV: 0.05,          // بهترین 5% (سبز)
  },
  // ...
];
```

## پشتیبانی

برای گزارش مشکلات یا پیشنهادات، لطفاً یک issue در GitHub ایجاد کنید.

## نسخه

v1.0.0 - اولین نسخه پایدار
