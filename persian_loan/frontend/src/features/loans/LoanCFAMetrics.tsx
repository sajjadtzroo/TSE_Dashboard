/**
 * Loan CFA Metrics Component
 *
 * Displays CFA Level 1 & 2 financial analysis for individual loans:
 * - CAPM analysis with loan-specific beta
 * - WACC calculation using deposit/loan structure
 * - Free Cash Flow analysis with actual monthly cash flows
 * - Risk-adjusted performance metrics
 * - Investment recommendation
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui';
import { LineChartCard, PieChartCard, BarChartCard } from '@/components/charts';
import { formatPersianAmount, formatPersianNumber } from '@/utils/persianNumber';
import {
  calculateCAPM,
  calculateWACC,
  calculateFCFF,
  calculateSharpeRatio,
  calculateTreynorRatio,
  calculateJensensAlpha,
  IRANIAN_MARKET_DEFAULTS,
} from '@/utils/advancedFinancial';
import { calculateIRR, calculateNPV, generateLoanCashFlow } from '@/utils/financialCalculations';
import type { LoanWithBank } from '@/types';
import { Activity, TrendingUp, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';

interface LoanCFAMetricsProps {
  loan: LoanWithBank;
  depositAmount: number;
  depositMonths: number;
  loanMonths: number;
  commission?: number;
}

export function LoanCFAMetrics({
  loan,
  depositAmount,
  depositMonths,
  loanMonths,
  commission = 0,
}: LoanCFAMetricsProps) {
  // Calculate loan metrics using CFA standards
  const cfaAnalysis = useMemo(() => {
    const interestRate = (loan.interestRateNumeric || 0) / 100;

    // 1. Determine loan amount from coefficient table
    let loanAmount = 0;
    if (loan.coefficientTable && depositAmount > 0) {
      const matchingCoeff = loan.coefficientTable.find(
        (row) => row.depositMonths === depositMonths
      );
      if (matchingCoeff) {
        const coefficient = parseFloat(matchingCoeff.loanPercent || '100') / 100;
        loanAmount = depositAmount * coefficient;
      } else {
        // Use deposit ratio if available
        const ratio = parseFloat(loan.depositToFacilityRatio || '2');
        loanAmount = depositAmount * ratio;
      }
    }

    if (loanAmount === 0) return null;

    // 2. Generate monthly cash flows with deposit timing
    const cashFlows = generateLoanCashFlow(
      loanAmount,
      depositAmount,
      depositMonths,
      interestRate,
      loanMonths,
      commission
    );

    // 3. Calculate CAPM (Cost of Equity)
    // Use higher beta for deposit-based loans due to liquidity constraints
    const beta = loan.category?.includes('deposit') ? 1.3 : IRANIAN_MARKET_DEFAULTS.defaultBeta;
    const capm = calculateCAPM(
      IRANIAN_MARKET_DEFAULTS.riskFreeRate,
      beta,
      IRANIAN_MARKET_DEFAULTS.marketReturn
    );

    // 4. Calculate WACC using deposit as equity, loan as debt
    const wacc = calculateWACC({
      equityValue: depositAmount,
      debtValue: loanAmount,
      costOfEquity: capm.expectedReturn,
      costOfDebt: interestRate,
      taxRate: IRANIAN_MARKET_DEFAULTS.corporateTaxRate,
    });

    // 5. Calculate Free Cash Flow metrics
    // Net borrowing = loan received - total repaid
    const totalRepayment = cashFlows.slice(depositMonths + 1).reduce((sum, cf) => sum + Math.abs(cf), 0);
    const netBorrowing = loanAmount - totalRepayment;

    // Operating cash flow proxy: monthly income needed to service loan
    const monthlyPayment = Math.abs(cashFlows[depositMonths + 1] || 0);
    const operatingCashFlow = monthlyPayment * loanMonths * 1.5; // 1.5x coverage ratio

    // Calculate FCFF (simplified for loan context)
    const fcff = calculateFCFF({
      netIncome: operatingCashFlow * 0.7, // After operating expenses
      nonCashCharges: 0,
      interestExpense: totalRepayment - loanAmount,
      taxRate: IRANIAN_MARKET_DEFAULTS.corporateTaxRate,
      fixedCapitalInvestment: 0,
      workingCapitalInvestment: depositAmount,
    });

    // 6. Calculate NPV and IRR
    const npvAtWACC = calculateNPV(cashFlows, wacc.wacc);
    const npvAtCAPM = calculateNPV(cashFlows, capm.expectedReturn);
    const irr = calculateIRR(cashFlows);

    // 7. Risk-adjusted metrics
    const portfolioReturn = irr || 0;
    const portfolioStdDev = Math.abs(npvAtWACC / loanAmount) * 0.3; // Approximate volatility

    const sharpeRatio = calculateSharpeRatio(
      portfolioReturn,
      IRANIAN_MARKET_DEFAULTS.riskFreeRate,
      portfolioStdDev
    );

    const treynorRatio = calculateTreynorRatio(
      portfolioReturn,
      IRANIAN_MARKET_DEFAULTS.riskFreeRate,
      beta
    );

    const jensensAlpha = calculateJensensAlpha(
      portfolioReturn,
      IRANIAN_MARKET_DEFAULTS.riskFreeRate,
      beta,
      IRANIAN_MARKET_DEFAULTS.marketReturn
    );

    // 8. Investment recommendation
    const npvPositive = npvAtWACC > 0;
    const irrExceedsWACC = irr ? irr > wacc.wacc : false;
    const irrExceedsCAPM = irr ? irr > capm.expectedReturn : false;
    const positiveAlpha = jensensAlpha > 0;

    let recommendationScore = 50;
    if (npvPositive) recommendationScore += 20;
    if (irrExceedsWACC) recommendationScore += 15;
    if (irrExceedsCAPM) recommendationScore += 10;
    if (positiveAlpha) recommendationScore += 10;
    if (sharpeRatio > 0.5) recommendationScore += 5;

    const recommendation: 'accept' | 'reject' | 'investigate' =
      recommendationScore >= 70 ? 'accept' : recommendationScore >= 50 ? 'investigate' : 'reject';

    // 9. Generate insights
    const insights: string[] = [];
    const warnings: string[] = [];

    if (npvPositive) {
      insights.push(`NPV مثبت در نرخ WACC: ${formatPersianAmount(npvAtWACC)}`);
    } else {
      warnings.push(`NPV منفی: پروژه ارزش از بین می‌برد`);
    }

    if (irr && irrExceedsWACC) {
      insights.push(`IRR (${formatPersianNumber((irr * 100).toFixed(1))}٪) > WACC (${formatPersianNumber((wacc.wacc * 100).toFixed(1))}٪)`);
    }

    if (positiveAlpha) {
      insights.push(`آلفای مثبت: ${formatPersianNumber((jensensAlpha * 100).toFixed(2))}٪ بازده اضافی`);
    }

    const debtToEquity = loanAmount / depositAmount;
    if (debtToEquity > 3) {
      warnings.push(`نسبت بدهی به سپرده بالا: ${formatPersianNumber(debtToEquity.toFixed(1))}x`);
    }

    return {
      loanAmount,
      cashFlows,
      capm: {
        expectedReturn: capm.expectedReturn,
        riskPremium: capm.riskPremium,
        beta,
      },
      wacc,
      fcf: {
        fcff,
        netBorrowing,
        operatingCashFlow,
        monthlyPayment,
      },
      performance: {
        npvAtWACC,
        npvAtCAPM,
        irr,
        sharpeRatio,
        treynorRatio,
        jensensAlpha,
      },
      recommendation,
      recommendationScore,
      insights,
      warnings,
      debtToEquity,
    };
  }, [loan, depositAmount, depositMonths, loanMonths, commission]);

  if (!cfaAnalysis) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          لطفاً مبلغ سپرده و مدت‌های مورد نظر را وارد کنید تا تحلیل مالی پیشرفته نمایش داده شود.
        </div>
      </Card>
    );
  }

  // Chart data
  const capitalStructureData = [
    {
      name: 'سپرده (حقوق صاحبان سهام)',
      value: depositAmount,
      fill: '#3b82f6',
    },
    {
      name: 'وام (بدهی)',
      value: cfaAnalysis.loanAmount,
      fill: '#8b5cf6',
    },
  ];

  const metricsData = [
    { name: 'نسبت شارپ', value: Number(cfaAnalysis.performance.sharpeRatio.toFixed(2)) },
    { name: 'نسبت ترینور', value: Number(cfaAnalysis.performance.treynorRatio.toFixed(2)) },
    { name: 'آلفای جنسن', value: Number((cfaAnalysis.performance.jensensAlpha * 100).toFixed(2)) },
  ];

  const cashFlowByYear: { year: string; inflow: number; outflow: number; net: number }[] = [];
  const yearsCount = Math.ceil((depositMonths + loanMonths) / 12);

  for (let year = 0; year < yearsCount; year++) {
    const startMonth = year * 12;
    const endMonth = Math.min((year + 1) * 12, cfaAnalysis.cashFlows.length);
    const yearCashFlows = cfaAnalysis.cashFlows.slice(startMonth, endMonth);

    const inflow = yearCashFlows.filter((cf) => cf > 0).reduce((sum, cf) => sum + cf, 0);
    const outflow = Math.abs(yearCashFlows.filter((cf) => cf < 0).reduce((sum, cf) => sum + cf, 0));

    cashFlowByYear.push({
      year: `سال ${formatPersianNumber(year + 1)}`,
      inflow: Math.round(inflow / 1_000_000),
      outflow: Math.round(outflow / 1_000_000),
      net: Math.round((inflow - outflow) / 1_000_000),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-primary-500/10 to-transparent border border-primary-500/20">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-8 h-8 text-primary-400" />
          <div>
            <h3 className="text-2xl font-bold text-gray-100">تحلیل مالی پیشرفته (CFA)</h3>
            <p className="text-sm text-gray-400">ارزیابی ریسک و بازده با استانداردهای CFA</p>
          </div>
        </div>
      </Card>

      {/* Recommendation Banner */}
      <Card
        className={`p-6 ${
          cfaAnalysis.recommendation === 'accept'
            ? 'bg-green-500/10 border-green-500/30'
            : cfaAnalysis.recommendation === 'reject'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}
      >
        <div className="flex items-center gap-4">
          {cfaAnalysis.recommendation === 'accept' ? (
            <CheckCircle2 className="w-12 h-12 text-green-400 flex-shrink-0" />
          ) : cfaAnalysis.recommendation === 'reject' ? (
            <TrendingDown className="w-12 h-12 text-red-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-12 h-12 text-yellow-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="text-2xl font-bold text-gray-100 mb-1">
              {cfaAnalysis.recommendation === 'accept'
                ? 'توصیه: قبول وام'
                : cfaAnalysis.recommendation === 'reject'
                ? 'توصیه: رد وام'
                : 'توصیه: نیاز به بررسی دقیق‌تر'}
            </div>
            <div className="text-sm text-gray-300">
              امتیاز ارزیابی: {formatPersianNumber(cfaAnalysis.recommendationScore)} از 100
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-4xl font-bold"
              style={{
                color:
                  cfaAnalysis.recommendation === 'accept'
                    ? '#4ade80'
                    : cfaAnalysis.recommendation === 'reject'
                    ? '#f87171'
                    : '#fbbf24',
              }}
            >
              {formatPersianNumber(cfaAnalysis.recommendationScore)}
            </div>
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-primary-500/10 border border-primary-500/20">
          <div className="text-xs text-gray-400 mb-1">بازده مورد انتظار (CAPM)</div>
          <div className="text-2xl font-bold text-primary-400">
            {formatPersianNumber((cfaAnalysis.capm.expectedReturn * 100).toFixed(2))}٪
          </div>
          <div className="text-xs text-gray-500 mt-1">β = {formatPersianNumber(cfaAnalysis.capm.beta.toFixed(2))}</div>
        </Card>

        <Card className="p-4 bg-teal-500/10 border border-teal-500/20">
          <div className="text-xs text-gray-400 mb-1">WACC</div>
          <div className="text-2xl font-bold text-teal-400">
            {formatPersianNumber((cfaAnalysis.wacc.wacc * 100).toFixed(2))}٪
          </div>
          <div className="text-xs text-gray-500 mt-1">نرخ تنزیل مناسب</div>
        </Card>

        <Card className="p-4 bg-blue-500/10 border border-blue-500/20">
          <div className="text-xs text-gray-400 mb-1">NPV (در WACC)</div>
          <div
            className={`text-2xl font-bold ${cfaAnalysis.performance.npvAtWACC > 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {formatPersianAmount(cfaAnalysis.performance.npvAtWACC)}
          </div>
          <div className="text-xs text-gray-500 mt-1">ارزش خالص فعلی</div>
        </Card>

        <Card className="p-4 bg-purple-500/10 border border-purple-500/20">
          <div className="text-xs text-gray-400 mb-1">IRR</div>
          <div className="text-2xl font-bold text-purple-400">
            {cfaAnalysis.performance.irr
              ? formatPersianNumber((cfaAnalysis.performance.irr * 100).toFixed(2)) + '٪'
              : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">نرخ بازده داخلی</div>
        </Card>
      </div>

      {/* Insights and Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cfaAnalysis.insights.length > 0 && (
          <Card className="p-4 bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h4 className="font-bold text-green-400">نقاط قوت</h4>
            </div>
            <ul className="space-y-2">
              {cfaAnalysis.insights.map((insight, idx) => (
                <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {cfaAnalysis.warnings.length > 0 && (
          <Card className="p-4 bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h4 className="font-bold text-red-400">هشدارها</h4>
            </div>
            <ul className="space-y-2">
              {cfaAnalysis.warnings.map((warning, idx) => (
                <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-red-400 flex-shrink-0">!</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title="ساختار سرمایه"
          subtitle={`نسبت بدهی به سپرده: ${formatPersianNumber(cfaAnalysis.debtToEquity.toFixed(2))}`}
          data={capitalStructureData}
          height={300}
        />

        <BarChartCard
          title="معیارهای ریسک-بازده"
          subtitle="عملکرد تعدیل‌شده با ریسک"
          data={metricsData}
          dataKey="value"
          height={300}
        />
      </div>

      <LineChartCard
        title="جریان نقدی سالانه (میلیون تومان)"
        subtitle="ورودی و خروجی نقدینگی در طول دوره وام"
        data={cashFlowByYear}
        xAxisKey="year"
        dataKeys={[
          { key: 'inflow', name: 'ورودی', color: '#10b981' },
          { key: 'outflow', name: 'خروجی', color: '#ef4444' },
          { key: 'net', name: 'خالص', color: '#3b82f6' },
        ]}
        height={300}
      />

      {/* Detailed Metrics Table */}
      <Card className="p-6">
        <h4 className="text-lg font-bold text-gray-100 mb-4">جزئیات تحلیل CFA</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-dark">
                <th className="text-right py-2 px-3 text-gray-400 font-medium">معیار</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">مقدار</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">تفسیر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              <tr>
                <td className="py-2 px-3 text-gray-300">مبلغ سپرده</td>
                <td className="py-2 px-3 text-blue-400 font-medium">{formatPersianAmount(depositAmount)}</td>
                <td className="py-2 px-3 text-gray-500 text-xs">سرمایه اولیه (حقوق صاحبان سهام)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-300">مبلغ وام</td>
                <td className="py-2 px-3 text-purple-400 font-medium">
                  {formatPersianAmount(cfaAnalysis.loanAmount)}
                </td>
                <td className="py-2 px-3 text-gray-500 text-xs">بدهی دریافتی</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-300">قسط ماهانه</td>
                <td className="py-2 px-3 text-orange-400 font-medium">
                  {formatPersianAmount(cfaAnalysis.fcf.monthlyPayment)}
                </td>
                <td className="py-2 px-3 text-gray-500 text-xs">پرداخت ماهانه بدهی</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-300">وام خالص</td>
                <td className="py-2 px-3 text-teal-400 font-medium">
                  {formatPersianAmount(cfaAnalysis.fcf.netBorrowing)}
                </td>
                <td className="py-2 px-3 text-gray-500 text-xs">دریافتی منهای بازپرداختی</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-300">نسبت شارپ</td>
                <td className="py-2 px-3 text-primary-400 font-medium">
                  {formatPersianNumber(cfaAnalysis.performance.sharpeRatio.toFixed(3))}
                </td>
                <td className="py-2 px-3 text-gray-500 text-xs">بازده به ازای واحد ریسک کل</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-300">نسبت ترینور</td>
                <td className="py-2 px-3 text-primary-400 font-medium">
                  {formatPersianNumber(cfaAnalysis.performance.treynorRatio.toFixed(3))}
                </td>
                <td className="py-2 px-3 text-gray-500 text-xs">بازده به ازای ریسک سیستماتیک</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-300">آلفای جنسن</td>
                <td
                  className={`py-2 px-3 font-medium ${cfaAnalysis.performance.jensensAlpha > 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {formatPersianNumber((cfaAnalysis.performance.jensensAlpha * 100).toFixed(3))}٪
                </td>
                <td className="py-2 px-3 text-gray-500 text-xs">بازده اضافی نسبت به CAPM</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Methodology Note */}
      <Card className="p-4 bg-bg-dark border border-border-dark">
        <div className="text-xs text-gray-500 space-y-2">
          <p>
            <strong className="text-gray-400">روش‌شناسی:</strong> این تحلیل بر اساس استانداردهای CFA
            Level 1 و 2 انجام شده است.
          </p>
          <ul className="list-disc list-inside mr-4 space-y-1">
            <li>CAPM برای محاسبه هزینه سهام (با βبتا={formatPersianNumber(cfaAnalysis.capm.beta.toFixed(2))})</li>
            <li>WACC با در نظر گرفتن سپر مالیاتی ({formatPersianNumber((IRANIAN_MARKET_DEFAULTS.corporateTaxRate * 100).toFixed(0))}٪)</li>
            <li>سپرده به عنوان حقوق صاحبان سهام و وام به عنوان بدهی در نظر گرفته شده</li>
            <li>جریان‌های نقدی واقعی ماهانه برای محاسبه NPV و IRR</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
