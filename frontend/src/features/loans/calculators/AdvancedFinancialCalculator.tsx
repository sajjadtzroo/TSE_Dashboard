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
import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Box,
  UnstyledButton,
} from '@mantine/core';
import { IconActivity } from '@tabler/icons-react';
import rallyColors from '@/theme/rallyColors';
import { CAPMCalculator } from './components/CAPMCalculator';
import { WACCCalculator } from './components/WACCCalculator';
import { FreeCashFlowAnalyzer } from './components/FreeCashFlowAnalyzer';
import { AdvancedMetricsPanel } from './components/AdvancedMetricsPanel';
import { IRANIAN_MARKET_DEFAULTS } from '@/utils/loans/advancedFinancial';
import { toPersianNum } from '@/utils/formatUtils';
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
  {
    id: 'capm' as TabType,
    label: 'CAPM',
    description: 'مدل قیمت‌گذاری دارایی سرمایه‌ای',
  },
  {
    id: 'wacc' as TabType,
    label: 'WACC',
    description: 'میانگین موزون هزینه سرمایه',
  },
  {
    id: 'fcf' as TabType,
    label: 'جریان نقدی آزاد',
    description: 'تحلیل FCFF و FCFE',
  },
  {
    id: 'integrated' as TabType,
    label: 'تحلیل جامع',
    description: 'ترکیب همه معیارها',
  },
];

const glassCard = {
  backgroundColor: rallyColors.glassBg,
  border: `1px solid ${rallyColors.glassBorder}`,
  backdropFilter: 'blur(12px)',
};

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
  const [integratedMetrics, setIntegratedMetrics] =
    useState<AdvancedMetrics | null>(null);

  // Auto-sync CAPM results to WACC cost of equity
  const handleCAPMCalculate = (results: CAPMResults) => {
    setCAPMResults(results);
    setWACCInputs((prev) => ({
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
    <Stack gap="lg">
      {/* Header */}
      <Card padding="lg" radius="md" style={glassCard}>
        <Group gap="sm" mb="md">
          <IconActivity size={32} color={rallyColors.blue} />
          <Box>
            <Title order={2} c={rallyColors.textPrimary}>
              تحلیل مالی پیشرفته (CFA)
            </Title>
            <Text size="sm" c={rallyColors.textSecondary}>
              محاسبات مهندسی مالی استاندارد CFA سطح 1 و 2
            </Text>
          </Box>
        </Group>

        {/* Info Box */}
        <Box
          mt="md"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <Box>
              <Text size="sm" c={rallyColors.textSecondary}>
                نرخ بدون ریسک
              </Text>
              <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                {toPersianNum((IRANIAN_MARKET_DEFAULTS.riskFreeRate * 100).toFixed(0))}٪
              </Text>
            </Box>
            <Box>
              <Text size="sm" c={rallyColors.textSecondary}>
                بازده بازار (TEDPIX)
              </Text>
              <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                {toPersianNum((IRANIAN_MARKET_DEFAULTS.marketReturn * 100).toFixed(0))}٪
              </Text>
            </Box>
            <Box>
              <Text size="sm" c={rallyColors.textSecondary}>
                نرخ مالیات شرکتی
              </Text>
              <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                {toPersianNum((IRANIAN_MARKET_DEFAULTS.corporateTaxRate * 100).toFixed(0))}٪
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      </Card>

      {/* Tab Navigation */}
      <Group gap="sm" wrap="wrap">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <UnstyledButton
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: 150,
                padding: '12px 16px',
                borderRadius: 8,
                transition: 'all 0.2s ease',
                backgroundColor: isActive ? rallyColors.blue : rallyColors.bg,
                border: isActive
                  ? 'none'
                  : `1px solid ${rallyColors.glassBorder}`,
                color: isActive ? '#fff' : rallyColors.textSecondary,
                boxShadow: isActive
                  ? '0 4px 12px rgba(59, 130, 246, 0.25)'
                  : 'none',
              }}
            >
              <Text fw={500}>{tab.label}</Text>
              <Text
                size="xs"
                mt={4}
                c={isActive ? 'rgba(255,255,255,0.8)' : rallyColors.textDimmed}
              >
                {tab.description}
              </Text>
            </UnstyledButton>
          );
        })}
      </Group>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Help Section */}
      <Card
        padding="lg"
        radius="md"
        style={{
          backgroundColor: rallyColors.bg,
          border: `1px solid ${rallyColors.glassBorder}`,
        }}
      >
        <Title order={4} c={rallyColors.textPrimary} mb="sm">
          راهنمای استفاده
        </Title>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Box>
            <Text fw={500} c={rallyColors.blue} size="sm" mb={4}>
              CAPM
            </Text>
            <Text size="sm" c={rallyColors.textSecondary}>
              برای محاسبه بازده مورد انتظار با توجه به ریسک سیستماتیک (بتا) استفاده
              می‌شود.
            </Text>
          </Box>
          <Box>
            <Text fw={500} c={rallyColors.blue} size="sm" mb={4}>
              WACC
            </Text>
            <Text size="sm" c={rallyColors.textSecondary}>
              نرخ تنزیل مناسب برای ارزیابی پروژه‌ها با توجه به ساختار سرمایه.
            </Text>
          </Box>
          <Box>
            <Text fw={500} c={rallyColors.blue} size="sm" mb={4}>
              جریان نقدی آزاد
            </Text>
            <Text size="sm" c={rallyColors.textSecondary}>
              تحلیل جریان نقدی در دسترس برای همه سرمایه‌گذاران (FCFF) و سهامداران
              (FCFE).
            </Text>
          </Box>
          <Box>
            <Text fw={500} c={rallyColors.blue} size="sm" mb={4}>
              تحلیل جامع
            </Text>
            <Text size="sm" c={rallyColors.textSecondary}>
              ترکیب همه معیارها برای تصمیم‌گیری سرمایه‌گذاری آگاهانه.
            </Text>
          </Box>
        </SimpleGrid>

        {/* Formulas Reference */}
        <Box
          mt="lg"
          pt="lg"
          style={{ borderTop: `1px solid ${rallyColors.glassBorder}` }}
        >
          <Text size="sm" fw={500} c={rallyColors.textSecondary} mb="sm">
            فرمول‌های کلیدی
          </Text>
          <Stack gap="xs">
            <Text size="xs" ff="monospace" c={rallyColors.textDimmed}>
              CAPM: E(Ri) = Rf + beta x [E(Rm) - Rf]
            </Text>
            <Text size="xs" ff="monospace" c={rallyColors.textDimmed}>
              WACC: (E/V x Re) + (D/V x Rd x (1-Tc))
            </Text>
            <Text size="xs" ff="monospace" c={rallyColors.textDimmed}>
              FCFF: NI + NCC + Int(1-T) - FCInv - WCInv
            </Text>
            <Text size="xs" ff="monospace" c={rallyColors.textDimmed}>
              FCFE: CFO - FCInv + Net Borrowing
            </Text>
          </Stack>
        </Box>
      </Card>
    </Stack>
  );
}
