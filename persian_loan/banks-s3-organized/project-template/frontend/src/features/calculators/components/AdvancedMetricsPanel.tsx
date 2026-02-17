/**
 * Advanced Metrics Panel Component
 *
 * Integrates all financial metrics (CAPM, WACC, FCF) for comprehensive analysis
 * and investment decision support.
 */

import { useState } from 'react';
import { Card, Button } from '../../../components/ui';
import { formatPersianAmount, formatPersianNumber } from '../../../utils/persianNumber';
import {
  calculateSharpeRatio,
  calculateTreynorRatio,
  calculateJensensAlpha,
  calculateInformationRatio,
} from '../../../utils/advancedFinancial';
import type {
  CAPMInputs,
  CAPMResults,
  WACCCalculatorInputs,
  WACCResults,
  FCFAnalysisInputs,
  FCFResults,
  AdvancedMetrics,
} from '../../../types/advancedFinancial';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  capmInputs: CAPMInputs;
  capmResults: CAPMResults | null;
  waccInputs: WACCCalculatorInputs;
  waccResults: WACCResults | null;
  fcfInputs: FCFAnalysisInputs;
  fcfResults: FCFResults | null;
  integratedMetrics: AdvancedMetrics | null;
  onCalculate: (metrics: AdvancedMetrics) => void;
}

export function AdvancedMetricsPanel({
  capmInputs,
  capmResults,
  waccInputs,
  waccResults,
  fcfResults,
  integratedMetrics,
  onCalculate,
}: Props) {
  const [portfolioStdDev, setPortfolioStdDev] = useState(0.15); // 15% default
  const [benchmarkReturn, setBenchmarkReturn] = useState(0.35); // 35% default
  const [trackingError, setTrackingError] = useState(0.05); // 5% default

  const handleCalculateIntegrated = () => {
    if (!capmResults || !waccResults || !fcfResults) {
      return;
    }

    // Assume actual portfolio return equals IRR if available, otherwise use CAPM
    const portfolioReturn = fcfResults.irr || capmResults.expectedReturn;

    // Calculate risk-adjusted metrics
    const sharpeRatio = calculateSharpeRatio(
      portfolioReturn,
      capmInputs.riskFreeRate,
      portfolioStdDev
    );

    const treynorRatio = calculateTreynorRatio(
      portfolioReturn,
      capmInputs.riskFreeRate,
      capmInputs.beta
    );

    const jensensAlpha = calculateJensensAlpha(
      portfolioReturn,
      capmInputs.riskFreeRate,
      capmInputs.beta,
      capmInputs.marketReturn
    );

    const informationRatio = calculateInformationRatio(
      portfolioReturn,
      benchmarkReturn,
      trackingError
    );

    // Determine recommendation
    const npvPositive = fcfResults.npvAtWACC > 0;
    const irrExceedsWACC = fcfResults.irr ? fcfResults.irr > waccResults.wacc : false;
    const irrExceedsCAPM = fcfResults.irr ? fcfResults.irr > capmResults.expectedReturn : false;
    const positiveAlpha = jensensAlpha > 0;

    let recommendation: 'accept' | 'reject' | 'investigate';
    let recommendationScore = 0;

    // Scoring system
    if (npvPositive) recommendationScore += 30;
    if (irrExceedsWACC) recommendationScore += 25;
    if (irrExceedsCAPM) recommendationScore += 20;
    if (positiveAlpha) recommendationScore += 15;
    if (sharpeRatio > 0.5) recommendationScore += 10;

    if (recommendationScore >= 70) {
      recommendation = 'accept';
    } else if (recommendationScore >= 40) {
      recommendation = 'investigate';
    } else {
      recommendation = 'reject';
    }

    // Generate key insights
    const keyInsights: string[] = [];
    const warnings: string[] = [];

    if (npvPositive) {
      keyInsights.push(`NPV مثبت: پروژه ${formatPersianAmount(fcfResults.npvAtWACC)} ارزش می‌آفریند`);
    } else {
      warnings.push(`NPV منفی: پروژه ${formatPersianAmount(Math.abs(fcfResults.npvAtWACC))} ارزش از بین می‌برد`);
    }

    if (irrExceedsWACC) {
      keyInsights.push(
        `IRR (${formatPersianNumber((fcfResults.irr! * 100).toFixed(1))}٪) بیشتر از WACC (${formatPersianNumber((waccResults.wacc * 100).toFixed(1))}٪)`
      );
    } else if (fcfResults.irr) {
      warnings.push(
        `IRR (${formatPersianNumber((fcfResults.irr * 100).toFixed(1))}٪) کمتر از WACC (${formatPersianNumber((waccResults.wacc * 100).toFixed(1))}٪)`
      );
    }

    if (positiveAlpha) {
      keyInsights.push(
        `آلفای مثبت: ${formatPersianNumber((jensensAlpha * 100).toFixed(2))}٪ بازده اضافی نسبت به CAPM`
      );
    }

    if (sharpeRatio > 0.5) {
      keyInsights.push(`نسبت شارپ بالا: ${formatPersianNumber(sharpeRatio.toFixed(2))} - ریسک‌تعدیل‌شده خوب`);
    } else if (sharpeRatio < 0) {
      warnings.push('نسبت شارپ منفی - بازده کمتر از نرخ بدون ریسک');
    }

    // Debt-to-equity warning
    const debtToEquity = waccInputs.debtValue / waccInputs.equityValue;
    if (debtToEquity > 2) {
      warnings.push(`نسبت بدهی به سهام بالا: ${formatPersianNumber(debtToEquity.toFixed(2))} - ریسک مالی زیاد`);
    }

    const metrics: AdvancedMetrics = {
      capm: capmResults,
      wacc: waccResults,
      fcf: fcfResults,
      riskAdjusted: {
        sharpeRatio,
        treynorRatio,
        jensensAlpha,
        informationRatio,
      },
      recommendation,
      recommendationScore,
      keyInsights,
      warnings,
    };

    onCalculate(metrics);
  };

  const canCalculate = capmResults && waccResults && fcfResults;

  return (
    <div className="space-y-6">
      {/* Prerequisites Check */}
      <Card className="p-6 bg-bg-dark border border-border-dark">
        <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-400" />
          تحلیل جامع
        </h3>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {capmResults ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            )}
            <span className={capmResults ? 'text-gray-300' : 'text-gray-500'}>
              محاسبه CAPM {capmResults ? '✓' : '(در انتظار)'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {waccResults ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            )}
            <span className={waccResults ? 'text-gray-300' : 'text-gray-500'}>
              محاسبه WACC {waccResults ? '✓' : '(در انتظار)'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {fcfResults ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            )}
            <span className={fcfResults ? 'text-gray-300' : 'text-gray-500'}>
              محاسبه جریان نقدی {fcfResults ? '✓' : '(در انتظار)'}
            </span>
          </div>
        </div>

        {!canCalculate && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-300">
            لطفاً ابتدا محاسبات CAPM، WACC و جریان نقدی آزاد را در تب‌های مربوطه تکمیل کنید.
          </div>
        )}
      </Card>

      {canCalculate && (
        <>
          {/* Risk Metrics Inputs */}
          <Card className="p-6">
            <h4 className="text-lg font-bold text-gray-100 mb-4">پارامترهای معیارهای ریسک</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  انحراف معیار پرتفوی (σ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={portfolioStdDev * 100}
                    onChange={(e) => setPortfolioStdDev(Number(e.target.value) / 100)}
                    className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">%</div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  بازده بنچمارک
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={benchmarkReturn * 100}
                    onChange={(e) => setBenchmarkReturn(Number(e.target.value) / 100)}
                    className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">%</div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Tracking Error
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={trackingError * 100}
                    onChange={(e) => setTrackingError(Number(e.target.value) / 100)}
                    className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">%</div>
                </div>
              </div>
            </div>

            <Button onClick={handleCalculateIntegrated} variant="primary" className="w-full mt-4">
              محاسبه معیارهای جامع
            </Button>
          </Card>

          {/* Integrated Results */}
          {integratedMetrics && (
            <>
              {/* Recommendation Banner */}
              <Card
                className={`p-6 ${
                  integratedMetrics.recommendation === 'accept'
                    ? 'bg-green-500/10 border-green-500/30'
                    : integratedMetrics.recommendation === 'reject'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  {integratedMetrics.recommendation === 'accept' ? (
                    <CheckCircle2 className="w-12 h-12 text-green-400 flex-shrink-0" />
                  ) : integratedMetrics.recommendation === 'reject' ? (
                    <TrendingDown className="w-12 h-12 text-red-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-12 h-12 text-yellow-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-gray-100 mb-1">
                      {integratedMetrics.recommendation === 'accept'
                        ? 'توصیه: قبول پروژه'
                        : integratedMetrics.recommendation === 'reject'
                        ? 'توصیه: رد پروژه'
                        : 'توصیه: نیاز به بررسی بیشتر'}
                    </div>
                    <div className="text-sm text-gray-300">
                      امتیاز کلی: {formatPersianNumber(integratedMetrics.recommendationScore)} از 100
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold" style={{
                      color: integratedMetrics.recommendation === 'accept'
                        ? '#4ade80'
                        : integratedMetrics.recommendation === 'reject'
                        ? '#f87171'
                        : '#fbbf24'
                    }}>
                      {formatPersianNumber(integratedMetrics.recommendationScore)}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Key Insights */}
              {integratedMetrics.keyInsights.length > 0 && (
                <Card className="p-6 bg-green-500/5 border border-green-500/20">
                  <h4 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    نقاط قوت
                  </h4>
                  <ul className="space-y-2">
                    {integratedMetrics.keyInsights.map((insight, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-green-400 flex-shrink-0">✓</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Warnings */}
              {integratedMetrics.warnings.length > 0 && (
                <Card className="p-6 bg-red-500/5 border border-red-500/20">
                  <h4 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    هشدارها
                  </h4>
                  <ul className="space-y-2">
                    {integratedMetrics.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-red-400 flex-shrink-0">!</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Risk-Adjusted Metrics */}
              <Card className="p-6">
                <h4 className="text-lg font-bold text-gray-100 mb-4">معیارهای تعدیل‌شده با ریسک</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-bg-dark border border-border-dark rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">نسبت شارپ</div>
                    <div className="text-2xl font-bold text-primary-400">
                      {formatPersianNumber(integratedMetrics.riskAdjusted.sharpeRatio?.toFixed(2) || '0')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">(Rp - Rf) / σ</div>
                  </div>

                  <div className="bg-bg-dark border border-border-dark rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">نسبت ترینور</div>
                    <div className="text-2xl font-bold text-teal-400">
                      {formatPersianNumber(integratedMetrics.riskAdjusted.treynorRatio?.toFixed(2) || '0')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">(Rp - Rf) / β</div>
                  </div>

                  <div className="bg-bg-dark border border-border-dark rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">آلفای جنسن</div>
                    <div className={`text-2xl font-bold ${(integratedMetrics.riskAdjusted.jensensAlpha || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPersianNumber((integratedMetrics.riskAdjusted.jensensAlpha! * 100).toFixed(2))}٪
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Rp - CAPM</div>
                  </div>

                  <div className="bg-bg-dark border border-border-dark rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">نسبت اطلاعات</div>
                    <div className="text-2xl font-bold text-purple-400">
                      {formatPersianNumber(integratedMetrics.riskAdjusted.informationRatio?.toFixed(2) || '0')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">(Rp - Rb) / TE</div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p>• نسبت شارپ: بازده به ازای هر واحد ریسک کل</p>
                  <p>• نسبت ترینور: بازده به ازای هر واحد ریسک سیستماتیک</p>
                  <p>• آلفای جنسن: بازده اضافی نسبت به بازده مورد انتظار CAPM</p>
                  <p>• نسبت اطلاعات: بازده فعال به ازای هر واحد ریسک فعال</p>
                </div>
              </Card>

              {/* Summary Table */}
              <Card className="p-6">
                <h4 className="text-lg font-bold text-gray-100 mb-4">خلاصه مقایسه‌ای</h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-dark">
                        <th className="text-right py-2 px-3 text-gray-400 font-medium">معیار</th>
                        <th className="text-right py-2 px-3 text-gray-400 font-medium">مقدار</th>
                        <th className="text-right py-2 px-3 text-gray-400 font-medium">توضیح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-dark">
                      <tr>
                        <td className="py-2 px-3 text-gray-300">بازده مورد انتظار (CAPM)</td>
                        <td className="py-2 px-3 text-primary-400 font-medium">
                          {formatPersianNumber((capmResults!.expectedReturn * 100).toFixed(2))}٪
                        </td>
                        <td className="py-2 px-3 text-gray-500 text-xs">حداقل بازده قابل قبول</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-gray-300">WACC</td>
                        <td className="py-2 px-3 text-primary-400 font-medium">
                          {formatPersianNumber((waccResults!.wacc * 100).toFixed(2))}٪
                        </td>
                        <td className="py-2 px-3 text-gray-500 text-xs">نرخ تنزیل مناسب</td>
                      </tr>
                      {fcfResults!.irr && (
                        <tr>
                          <td className="py-2 px-3 text-gray-300">IRR</td>
                          <td className="py-2 px-3 text-teal-400 font-medium">
                            {formatPersianNumber((fcfResults!.irr * 100).toFixed(2))}٪
                          </td>
                          <td className="py-2 px-3 text-gray-500 text-xs">بازده واقعی پروژه</td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-2 px-3 text-gray-300">NPV (با WACC)</td>
                        <td className={`py-2 px-3 font-medium ${fcfResults!.npvAtWACC > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPersianAmount(fcfResults!.npvAtWACC)}
                        </td>
                        <td className="py-2 px-3 text-gray-500 text-xs">ارزش خالص فعلی</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
