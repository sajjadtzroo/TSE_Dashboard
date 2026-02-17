/**
 * Free Cash Flow Analyzer Component
 *
 * Calculates FCFF and FCFE:
 * - FCFF: Free Cash Flow to Firm
 * - FCFE: Free Cash Flow to Equity
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Box,
  Button,
  NumberInput,
} from '@mantine/core';
import { BarChartCard } from '@/components/loans/charts';
import { formatPersianAmount, formatPersianNumber } from '@/utils/loans/persianNumber';
import { calculateFCFF, calculateFCFE } from '@/utils/loans/advancedFinancial';
import { calculateNPV, calculateIRR } from '@/utils/loans/timeValueOfMoney';
import rallyColors from '@/theme/rallyColors';
import type {
  FCFAnalysisInputs,
  FCFResults,
  WACCResults,
} from '@/types/advancedFinancial';
import { IconTrendingUp, IconAlertCircle } from '@tabler/icons-react';

const glassCard = {
  backgroundColor: rallyColors.glassBg,
  border: `1px solid ${rallyColors.glassBorder}`,
  backdropFilter: 'blur(12px)',
};

const inputStyles = {
  input: {
    backgroundColor: rallyColors.elevated,
    border: `1px solid ${rallyColors.glassBorder}`,
    color: rallyColors.textPrimary,
    fontSize: 14,
  },
  label: {
    color: rallyColors.textSecondary,
    marginBottom: 4,
    fontSize: 12,
  },
};

interface Props {
  inputs: FCFAnalysisInputs;
  results: FCFResults | null;
  onInputsChange: (inputs: FCFAnalysisInputs) => void;
  onCalculate: (results: FCFResults) => void;
  waccResults: WACCResults | null;
}

export function FreeCashFlowAnalyzer({
  inputs,
  results,
  onInputsChange,
  onCalculate,
  waccResults,
}: Props) {
  const [errors, setErrors] = useState<string[]>([]);

  const handleCalculate = () => {
    setErrors([]);

    try {
      // Calculate EBIT (Earnings Before Interest and Taxes)
      const ebit =
        inputs.revenue -
        inputs.operatingExpenses -
        inputs.depreciation -
        inputs.amortization;
      const netIncome =
        ebit - (inputs.interestExpense || 0) - inputs.taxes;

      // Calculate FCFF
      const fcff = calculateFCFF({
        netIncome: netIncome,
        nonCashCharges: inputs.depreciation + inputs.amortization,
        interestExpense: inputs.interestExpense || 0,
        taxRate:
          inputs.taxes / (ebit - (inputs.interestExpense || 0) || 1),
        fixedCapitalInvestment: inputs.capitalExpenditure,
        workingCapitalInvestment: inputs.changeInWorkingCapital,
      });

      // Calculate FCFE
      const operatingCashFlow =
        netIncome +
        inputs.depreciation +
        inputs.amortization -
        inputs.changeInWorkingCapital;
      const netBorrowing = inputs.debtIssued - inputs.debtRepaid;

      const fcfe = calculateFCFE({
        cashFlowFromOperations: operatingCashFlow,
        fixedCapitalInvestment: inputs.capitalExpenditure,
        netBorrowing: netBorrowing,
      });

      // Generate cash flow schedule (simplified - assumes stable FCF)
      const periods = inputs.loanPeriods || 5;
      const cashFlowSchedule = Array(periods).fill(fcff);

      // Calculate NPV at WACC
      const discountRate = waccResults ? waccResults.wacc : 0.2; // Default 20%
      const npvAtWACC = calculateNPV(cashFlowSchedule, discountRate);

      // Calculate IRR
      const irr = calculateIRR([
        -inputs.capitalExpenditure,
        ...cashFlowSchedule,
      ]);

      const calculatedResults: FCFResults = {
        fcff,
        fcfe,
        operatingCashFlow,
        cashFlowSchedule,
        npvAtWACC,
        irr,
      };

      onCalculate(calculatedResults);
    } catch (error) {
      setErrors([
        'خطا در محاسبه جریان نقدی. لطفاً ورودی‌ها را بررسی کنید.',
      ]);
    }
  };

  // Generate waterfall chart data
  const waterfallData = useMemo(() => {
    if (!results) return [];

    const ebit =
      inputs.revenue -
      inputs.operatingExpenses -
      inputs.depreciation -
      inputs.amortization;
    const taxes = inputs.taxes;
    const nopat = ebit - taxes; // Net Operating Profit After Tax

    return [
      {
        name: 'درآمد',
        value: Number((inputs.revenue / 1_000_000).toFixed(0)),
        cumulative: Number((inputs.revenue / 1_000_000).toFixed(0)),
        isSubtotal: 0,
      },
      {
        name: 'هزینه‌های عملیاتی',
        value: Number(
          (
            -(
              inputs.operatingExpenses +
              inputs.depreciation +
              inputs.amortization
            ) / 1_000_000
          ).toFixed(0)
        ),
        cumulative: Number((ebit / 1_000_000).toFixed(0)),
        isSubtotal: 0,
      },
      {
        name: 'مالیات',
        value: Number((-taxes / 1_000_000).toFixed(0)),
        cumulative: Number((nopat / 1_000_000).toFixed(0)),
        isSubtotal: 1,
      },
      {
        name: 'سرمایه‌گذاری',
        value: Number(
          (
            -(inputs.capitalExpenditure + inputs.changeInWorkingCapital) /
            1_000_000
          ).toFixed(0)
        ),
        cumulative: Number((results.fcff / 1_000_000).toFixed(0)),
        isSubtotal: 0,
      },
      {
        name: 'FCFF',
        value: Number((results.fcff / 1_000_000).toFixed(0)),
        cumulative: Number((results.fcff / 1_000_000).toFixed(0)),
        isSubtotal: 1,
      },
    ];
  }, [results, inputs]);

  return (
    <Stack gap="lg">
      {/* Input Section */}
      <Card padding="lg" radius="md" style={glassCard}>
        <Group gap="sm" mb="md">
          <IconTrendingUp size={20} color={rallyColors.blue} />
          <Title order={3} c={rallyColors.textPrimary}>
            تحلیل جریان نقدی آزاد
          </Title>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Input Fields */}
          <Stack gap="md">
            {/* Operating Performance */}
            <Box
              style={{
                backgroundColor: rallyColors.bg,
                borderRadius: 8,
                padding: 16,
                border: `1px solid ${rallyColors.glassBorder}`,
              }}
            >
              <Text size="sm" fw={500} c={rallyColors.textSecondary} mb="sm">
                عملکرد عملیاتی
              </Text>
              <Stack gap="sm">
                <NumberInput
                  label="درآمد (تومان)"
                  value={inputs.revenue}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      revenue: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />
                <NumberInput
                  label="هزینه‌های عملیاتی"
                  value={inputs.operatingExpenses}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      operatingExpenses: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />
                <NumberInput
                  label="استهلاک"
                  value={inputs.depreciation}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      depreciation: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />
                <NumberInput
                  label="استهلاک اموال غیرملموس"
                  value={inputs.amortization}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      amortization: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />
                <NumberInput
                  label="مالیات"
                  value={inputs.taxes}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      taxes: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />
              </Stack>
            </Box>

            {/* Investment & Financing */}
            <Box
              style={{
                backgroundColor: rallyColors.bg,
                borderRadius: 8,
                padding: 16,
                border: `1px solid ${rallyColors.glassBorder}`,
              }}
            >
              <Text size="sm" fw={500} c={rallyColors.textSecondary} mb="sm">
                سرمایه‌گذاری و تامین مالی
              </Text>
              <Stack gap="sm">
                <NumberInput
                  label="سرمایه‌گذاری ثابت (CAPEX)"
                  value={inputs.capitalExpenditure}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      capitalExpenditure: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />
                <NumberInput
                  label="تغییر سرمایه در گردش"
                  value={inputs.changeInWorkingCapital}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      changeInWorkingCapital: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />
                <NumberInput
                  label="بدهی جدید"
                  value={inputs.debtIssued}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      debtIssued: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />
                <NumberInput
                  label="بازپرداخت بدهی"
                  value={inputs.debtRepaid}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      debtRepaid: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />
              </Stack>
            </Box>

            <Button onClick={handleCalculate} color="blue" fullWidth>
              محاسبه جریان نقدی آزاد
            </Button>

            {errors.length > 0 && (
              <Box
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <Group gap="sm" align="flex-start">
                  <IconAlertCircle
                    size={20}
                    color={rallyColors.red}
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <Stack gap="xs">
                    {errors.map((error, idx) => (
                      <Text key={idx} size="sm" c={rallyColors.red}>
                        {error}
                      </Text>
                    ))}
                  </Stack>
                </Group>
              </Box>
            )}
          </Stack>

          {/* Results */}
          {results && (
            <Stack gap="md">
              <Box
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <Text size="sm" c={rallyColors.textSecondary} mb={4}>
                  FCFF (جریان نقدی آزاد برای شرکت)
                </Text>
                <Text style={{ fontSize: 28 }} fw={700} c={rallyColors.blue}>
                  {formatPersianAmount(results.fcff)}
                </Text>
                <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                  در دسترس همه سرمایه‌گذاران
                </Text>
              </Box>

              <Box
                style={{
                  backgroundColor: 'rgba(20, 184, 166, 0.1)',
                  border: '1px solid rgba(20, 184, 166, 0.2)',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <Text size="sm" c={rallyColors.textSecondary} mb={4}>
                  FCFE (جریان نقدی آزاد برای سهامداران)
                </Text>
                <Text style={{ fontSize: 28 }} fw={700} c="#14b8a6">
                  {formatPersianAmount(results.fcfe)}
                </Text>
                <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                  در دسترس سهامداران
                </Text>
              </Box>

              <SimpleGrid cols={2} spacing="sm">
                <Box
                  style={{
                    backgroundColor: rallyColors.bg,
                    border: `1px solid ${rallyColors.glassBorder}`,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Text size="xs" c={rallyColors.textSecondary} mb={4}>
                    جریان نقدی عملیاتی
                  </Text>
                  <Text size="lg" fw={700} c={rallyColors.blue}>
                    {formatPersianAmount(results.operatingCashFlow)}
                  </Text>
                </Box>

                <Box
                  style={{
                    backgroundColor: rallyColors.bg,
                    border: `1px solid ${rallyColors.glassBorder}`,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Text size="xs" c={rallyColors.textSecondary} mb={4}>
                    NPV (با WACC)
                  </Text>
                  <Text
                    size="lg"
                    fw={700}
                    c={
                      results.npvAtWACC > 0
                        ? rallyColors.green
                        : rallyColors.red
                    }
                  >
                    {formatPersianAmount(results.npvAtWACC)}
                  </Text>
                </Box>
              </SimpleGrid>

              {results.irr !== null && (
                <Box
                  style={{
                    backgroundColor: rallyColors.bg,
                    border: `1px solid ${rallyColors.glassBorder}`,
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <Text size="sm" c={rallyColors.textSecondary} mb={4}>
                    نرخ بازده داخلی (IRR)
                  </Text>
                  <Text size="xl" fw={700} c={rallyColors.textPrimary}>
                    {formatPersianNumber((results.irr * 100).toFixed(2))}٪
                  </Text>
                  {waccResults && (
                    <Text size="xs" c={rallyColors.textDimmed} mt="sm">
                      {results.irr > waccResults.wacc ? (
                        <Text component="span" c={rallyColors.green}>
                          IRR بیشتر از WACC - پروژه قابل قبول
                        </Text>
                      ) : (
                        <Text component="span" c={rallyColors.red}>
                          IRR کمتر از WACC - پروژه رد می‌شود
                        </Text>
                      )}
                    </Text>
                  )}
                </Box>
              )}

              {/* Decision Support */}
              <Box
                style={{
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor:
                    results.npvAtWACC > 0
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${
                    results.npvAtWACC > 0
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)'
                  }`,
                }}
              >
                <Text
                  size="sm"
                  fw={500}
                  mb="xs"
                  c={results.npvAtWACC > 0 ? '#4ade80' : '#f87171'}
                >
                  توصیه سرمایه‌گذاری
                </Text>
                <Text size="xs" c={rallyColors.textSecondary}>
                  {results.npvAtWACC > 0
                    ? 'NPV مثبت است. این پروژه بیشتر از هزینه سرمایه بازده دارد و قابل قبول است.'
                    : 'NPV منفی است. این پروژه کمتر از هزینه سرمایه بازده دارد و باید رد شود.'}
                </Text>
              </Box>
            </Stack>
          )}
        </SimpleGrid>
      </Card>

      {/* Waterfall Chart */}
      {results && waterfallData.length > 0 && (
        <BarChartCard
          title="آبشار جریان نقدی (میلیون تومان)"
          subtitle="از درآمد تا FCFF"
          data={waterfallData}
          dataKey="value"
          height={300}
        />
      )}

      {/* Educational Section */}
      <Card
        padding="lg"
        radius="md"
        style={{
          backgroundColor: rallyColors.bg,
          border: `1px solid ${rallyColors.glassBorder}`,
        }}
      >
        <Title order={4} c={rallyColors.textPrimary} mb="sm">
          درباره جریان نقدی آزاد
        </Title>
        <Stack gap="sm">
          <Box>
            <Text size="sm" c={rallyColors.textSecondary}>
              <Text component="span" fw={700} c={rallyColors.blue}>
                FCFF (Free Cash Flow to Firm):
              </Text>{' '}
              جریان نقدی در دسترس همه سرمایه‌گذاران (سهامداران و طلبکاران) پس از
              سرمایه‌گذاری‌های لازم.
            </Text>
          </Box>
          <Box
            style={{
              backgroundColor: rallyColors.elevated,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Text size="xs" ff="monospace">
              FCFF = NI + NCC + Int(1-T) - FCInv - WCInv
            </Text>
          </Box>
          <Box>
            <Text size="sm" c={rallyColors.textSecondary}>
              <Text component="span" fw={700} c="#14b8a6">
                FCFE (Free Cash Flow to Equity):
              </Text>{' '}
              جریان نقدی در دسترس سهامداران پس از پرداخت همه تعهدات و
              سرمایه‌گذاری‌ها.
            </Text>
          </Box>
          <Box
            style={{
              backgroundColor: rallyColors.elevated,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Text size="xs" ff="monospace">
              FCFE = CFO - FCInv + Net Borrowing
            </Text>
          </Box>
        </Stack>
      </Card>
    </Stack>
  );
}
