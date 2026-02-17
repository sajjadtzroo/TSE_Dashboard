/**
 * Advanced Financial Calculator - CFA Level 1 & 2
 *
 * Implements professional-grade financial analysis:
 * - CAPM (Capital Asset Pricing Model)
 * - WACC (Weighted Average Cost of Capital)
 * - Free Cash Flow Analysis
 * - Integrated Risk-Adjusted Metrics
 */

import { useState } from 'react';
import { Card } from '@/components/ui';
import { Activity } from 'lucide-react';
import { CAPMCalculator } from './components/CAPMCalculator';
import { WACCCalculator } from './components/WACCCalculator';
import { FreeCashFlowAnalyzer } from './components/FreeCashFlowAnalyzer';
import { AdvancedMetricsPanel } from './components/AdvancedMetricsPanel';
import { IRANIAN_MARKET_DEFAULTS } from '@/utils/advancedFinancial';
import type {
  CAPMInputs,
  CAPMResults,
  WACCCalculatorInputs,
  WACCResults,
  FCFAnalysisInputs,
  FCFResults,
  AdvancedMetrics,
} from '@/types/advancedFinancial';

type TabType = 'capm' | 'wacc' | 'fcf' | 'integrated';

const TABS = [
  { id: 'capm' as TabType, label: 'CAPM', description: 'مدل قیمت‌گذاری دارایی سرمایه‌ای' },
  { id: 'wacc' as TabType, label: 'WACC', description: 'میانگین موزون هزینه سرمایه' },
  { id: 'fcf' as TabType, label: 'جریان نقدی آزاد', description: 'تحلیل FCFF و FCFE' },
  { id: 'integrated' as TabType, label: 'تحلیل جامع', description: 'ترکیب همه معیارها' },
];

export function AdvancedFinancialCalculator() {
  const [activeTab, setActiveTab] = useState<TabType>('capm');

  // CAPM State
  const [capmInputs, setCAPMInputs] = useState<CAPMInputs>({
    riskFreeRate: IRANIAN_MARKET_DEFAULTS.riskFreeRate,
    marketReturn: IRANIAN_MARKET_DEFAULTS.marketReturn,
    beta: IRANIAN_MARKET_DEFAULTS.defaultBeta,
  });
  const [capmResults, setCAPMResults] = useState<CAPMResults | null>(null);

  // WACC State
  const [waccInputs, setWACCInputs] = useState<WACCCalculatorInputs>({
    equityValue: 100_000_000,
    debtValue: 50_000_000,
    costOfEquity: 0.38, // Will be calculated from CAPM
    costOfDebt: 0.23,
    taxRate: IRANIAN_MARKET_DEFAULTS.corporateTaxRate,
  });
  const [waccResults, setWACCResults] = useState<WACCResults | null>(null);

  // FCF State
  const [fcfInputs, setFCFInputs] = useState<FCFAnalysisInputs>({
    revenue: 500_000_000,
    operatingExpenses: 300_000_000,
    taxes: 50_000_000,
    capitalExpenditure: 30_000_000,
    changeInWorkingCapital: 10_000_000,
    debtIssued: 20_000_000,
    debtRepaid: 15_000_000,
    depreciation: 20_000_000,
    amortization: 5_000_000,
  });
  const [fcfResults, setFCFResults] = useState<FCFResults | null>(null);

  // Integrated Analysis State
  const [integratedMetrics, setIntegratedMetrics] = useState<AdvancedMetrics | null>(null);

  // Auto-sync CAPM results to WACC cost of equity
  const handleCAPMCalculate = (results: CAPMResults) => {
    setCAPMResults(results);
    setWACCInputs(prev => ({
      ...prev,
      costOfEquity: results.expectedReturn,
    }));
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'capm':
        return (
          <CAPMCalculator
            inputs={capmInputs}
            results={capmResults}
            onInputsChange={setCAPMInputs}
            onCalculate={handleCAPMCalculate}
          />
        );
      case 'wacc':
        return (
          <WACCCalculator
            inputs={waccInputs}
            results={waccResults}
            onInputsChange={setWACCInputs}
            onCalculate={setWACCResults}
            capmResults={capmResults}
          />
        );
      case 'fcf':
        return (
          <FreeCashFlowAnalyzer
            inputs={fcfInputs}
            results={fcfResults}
            onInputsChange={setFCFInputs}
            onCalculate={setFCFResults}
            waccResults={waccResults}
          />
        );
      case 'integrated':
        return (
          <AdvancedMetricsPanel
            capmInputs={capmInputs}
            capmResults={capmResults}
            waccInputs={waccInputs}
            waccResults={waccResults}
            fcfInputs={fcfInputs}
            fcfResults={fcfResults}
            integratedMetrics={integratedMetrics}
            onCalculate={setIntegratedMetrics}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-8 h-8 text-primary-400" />
          <div>
            <h2 className="text-2xl font-bold text-gray-100">تحلیل مالی پیشرفته (CFA)</h2>
            <p className="text-sm text-gray-400">محاسبات مهندسی مالی استاندارد CFA سطح 1 و 2</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400">نرخ بدون ریسک</div>
              <div className="text-gray-100 font-medium">{(IRANIAN_MARKET_DEFAULTS.riskFreeRate * 100).toFixed(0)}٪</div>
            </div>
            <div>
              <div className="text-gray-400">بازده بازار (TEDPIX)</div>
              <div className="text-gray-100 font-medium">{(IRANIAN_MARKET_DEFAULTS.marketReturn * 100).toFixed(0)}٪</div>
            </div>
            <div>
              <div className="text-gray-400">نرخ مالیات شرکتی</div>
              <div className="text-gray-100 font-medium">{(IRANIAN_MARKET_DEFAULTS.corporateTaxRate * 100).toFixed(0)}٪</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 min-w-[150px] px-4 py-3 rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-bg-dark border border-border-dark text-gray-300 hover:border-primary-500/50'
                }
              `}
            >
              <div className="font-medium">{tab.label}</div>
              <div className={`text-xs mt-1 ${isActive ? 'text-primary-100' : 'text-gray-500'}`}>
                {tab.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Help Section */}
      <Card className="p-6 bg-bg-dark border border-border-dark">
        <h3 className="text-lg font-bold text-gray-100 mb-3">راهنمای استفاده</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <div className="font-medium text-primary-400 mb-1">CAPM</div>
            <p>برای محاسبه بازده مورد انتظار با توجه به ریسک سیستماتیک (بتا) استفاده می‌شود.</p>
          </div>
          <div>
            <div className="font-medium text-primary-400 mb-1">WACC</div>
            <p>نرخ تنزیل مناسب برای ارزیابی پروژه‌ها با توجه به ساختار سرمایه.</p>
          </div>
          <div>
            <div className="font-medium text-primary-400 mb-1">جریان نقدی آزاد</div>
            <p>تحلیل جریان نقدی در دسترس برای همه سرمایه‌گذاران (FCFF) و سهامداران (FCFE).</p>
          </div>
          <div>
            <div className="font-medium text-primary-400 mb-1">تحلیل جامع</div>
            <p>ترکیب همه معیارها برای تصمیم‌گیری سرمایه‌گذاری آگاهانه.</p>
          </div>
        </div>

        {/* Formulas Reference */}
        <div className="mt-6 pt-6 border-t border-border-dark">
          <h4 className="text-sm font-medium text-gray-400 mb-3">فرمول‌های کلیدی</h4>
          <div className="space-y-2 text-xs font-mono text-gray-500">
            <div>CAPM: E(Ri) = Rf + β × [E(Rm) - Rf]</div>
            <div>WACC: (E/V × Re) + (D/V × Rd × (1-Tc))</div>
            <div>FCFF: NI + NCC + Int(1-T) - FCInv - WCInv</div>
            <div>FCFE: CFO - FCInv + Net Borrowing</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
