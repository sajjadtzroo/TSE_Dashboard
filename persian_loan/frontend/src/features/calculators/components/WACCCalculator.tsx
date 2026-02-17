/**
 * WACC Calculator Component
 *
 * Calculates Weighted Average Cost of Capital:
 * WACC = (E/V x Re) + (D/V x Rd x (1-Tc))
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
  Button,
  NumberInput,
} from '@mantine/core';
import { PieChartCard, BarChartCard } from '@/components/charts';
import { formatPersianAmount, formatPersianNumber } from '@/utils/persianNumber';
import { calculateWACC, validateWACCInputs } from '@/utils/advancedFinancial';
import rallyColors from '@/theme/rallyColors';
import type {
  WACCCalculatorInputs,
  WACCResults,
  CAPMResults,
} from '@/types/advancedFinancial';
import { IconCurrencyDollar, IconAlertCircle, IconCheck } from '@tabler/icons-react';

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
  },
  label: {
    color: rallyColors.textSecondary,
    marginBottom: 8,
  },
};

interface Props {
  inputs: WACCCalculatorInputs;
  results: WACCResults | null;
  onInputsChange: (inputs: WACCCalculatorInputs) => void;
  onCalculate: (results: WACCResults) => void;
  capmResults: CAPMResults | null;
}

export function WACCCalculator({
  inputs,
  results,
  onInputsChange,
  onCalculate,
  capmResults,
}: Props) {
  const [errors, setErrors] = useState<string[]>([]);

  const handleCalculate = () => {
    // Validate inputs
    const validationErrors = validateWACCInputs(inputs);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    // Calculate WACC
    const waccResults = calculateWACC({
      equityValue: inputs.equityValue,
      debtValue: inputs.debtValue,
      costOfEquity: inputs.costOfEquity,
      costOfDebt: inputs.costOfDebt,
      taxRate: inputs.taxRate,
    });

    onCalculate(waccResults);
  };

  // Use CAPM cost of equity if available
  const handleUseCAPM = () => {
    if (capmResults) {
      onInputsChange({ ...inputs, costOfEquity: capmResults.expectedReturn });
    }
  };

  // Generate capital structure pie chart data
  const capitalStructureData = results
    ? [
        {
          name: 'سهام (E)',
          value: results.equityWeight * 100,
          fill: '#3b82f6',
        },
        {
          name: 'بدهی (D)',
          value: results.debtWeight * 100,
          fill: '#8b5cf6',
        },
      ]
    : [];

  // Generate WACC components bar chart
  const waccComponentsData = results
    ? [
        {
          name: 'هزینه سهام',
          value: Number((results.equityComponent * 100).toFixed(2)),
          percentage: Number((results.equityWeight * 100).toFixed(1)),
        },
        {
          name: 'هزینه بدهی (پس از مالیات)',
          value: Number((results.debtComponent * 100).toFixed(2)),
          percentage: Number((results.debtWeight * 100).toFixed(1)),
        },
      ]
    : [];

  return (
    <Stack gap="lg">
      {/* Input Section */}
      <Card padding="lg" radius="md" style={glassCard}>
        <Group gap="sm" mb="md">
          <IconCurrencyDollar size={20} color={rallyColors.blue} />
          <Title order={3} c={rallyColors.textPrimary}>
            محاسبه WACC
          </Title>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Input Fields */}
          <Stack gap="md">
            {/* Capital Structure */}
            <Box
              style={{
                backgroundColor: rallyColors.bg,
                borderRadius: 8,
                padding: 16,
                border: `1px solid ${rallyColors.glassBorder}`,
              }}
            >
              <Text size="sm" fw={500} c={rallyColors.textSecondary} mb="sm">
                ساختار سرمایه
              </Text>

              <Stack gap="sm">
                <NumberInput
                  label="ارزش سهام (E) - تومان"
                  value={inputs.equityValue}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      equityValue: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />

                <NumberInput
                  label="ارزش بدهی (D) - تومان"
                  value={inputs.debtValue}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      debtValue: Number(value),
                    })
                  }
                  styles={inputStyles}
                  hideControls
                />

                <Text
                  size="xs"
                  c={rallyColors.textDimmed}
                  pt="sm"
                  style={{
                    borderTop: `1px solid ${rallyColors.glassBorder}`,
                  }}
                >
                  ارزش شرکت (V):{' '}
                  {formatPersianAmount(inputs.equityValue + inputs.debtValue)}
                </Text>
              </Stack>
            </Box>

            {/* Cost Components */}
            <Box
              style={{
                backgroundColor: rallyColors.bg,
                borderRadius: 8,
                padding: 16,
                border: `1px solid ${rallyColors.glassBorder}`,
              }}
            >
              <Text size="sm" fw={500} c={rallyColors.textSecondary} mb="sm">
                هزینه‌های سرمایه
              </Text>

              <Stack gap="sm">
                <Box>
                  <Group gap="sm" mb="xs">
                    <Text size="sm" c={rallyColors.textSecondary}>
                      هزینه سهام (Re)
                    </Text>
                    {capmResults && (
                      <Button
                        onClick={handleUseCAPM}
                        variant="subtle"
                        size="compact-xs"
                      >
                        استفاده از CAPM
                      </Button>
                    )}
                  </Group>
                  <NumberInput
                    value={inputs.costOfEquity * 100}
                    onChange={(value) =>
                      onInputsChange({
                        ...inputs,
                        costOfEquity: Number(value) / 100,
                      })
                    }
                    step={0.01}
                    decimalScale={2}
                    suffix="%"
                    styles={inputStyles}
                    hideControls
                  />
                </Box>

                <NumberInput
                  label="هزینه بدهی (Rd)"
                  value={inputs.costOfDebt * 100}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      costOfDebt: Number(value) / 100,
                    })
                  }
                  step={0.01}
                  decimalScale={2}
                  suffix="%"
                  styles={inputStyles}
                  hideControls
                />

                <NumberInput
                  label="نرخ مالیات (Tc)"
                  value={inputs.taxRate * 100}
                  onChange={(value) =>
                    onInputsChange({
                      ...inputs,
                      taxRate: Number(value) / 100,
                    })
                  }
                  step={0.01}
                  decimalScale={2}
                  suffix="%"
                  styles={inputStyles}
                  hideControls
                />
              </Stack>
            </Box>

            <Button onClick={handleCalculate} color="blue" fullWidth>
              محاسبه WACC
            </Button>

            {/* Errors */}
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
                  WACC
                </Text>
                <Text style={{ fontSize: 28 }} fw={700} c={rallyColors.blue}>
                  {formatPersianNumber((results.wacc * 100).toFixed(2))}٪
                </Text>
                <Text size="xs" c={rallyColors.textDimmed} mt="sm">
                  نرخ تنزیل مناسب برای ارزیابی پروژه
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
                    وزن سهام
                  </Text>
                  <Text size="lg" fw={700} c={rallyColors.blue}>
                    {formatPersianNumber(
                      (results.equityWeight * 100).toFixed(1)
                    )}
                    ٪
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
                    وزن بدهی
                  </Text>
                  <Text size="lg" fw={700} c={rallyColors.purple}>
                    {formatPersianNumber(
                      (results.debtWeight * 100).toFixed(1)
                    )}
                    ٪
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
                    هزینه سهام
                  </Text>
                  <Text size="lg" fw={700} c={rallyColors.blue}>
                    {formatPersianNumber(
                      (inputs.costOfEquity * 100).toFixed(2)
                    )}
                    ٪
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
                    هزینه بدهی (پس از مالیات)
                  </Text>
                  <Text size="lg" fw={700} c={rallyColors.purple}>
                    {formatPersianNumber(
                      (results.afterTaxCostOfDebt * 100).toFixed(2)
                    )}
                    ٪
                  </Text>
                </Box>
              </SimpleGrid>

              {/* Formula Breakdown */}
              <Box
                style={{
                  backgroundColor: rallyColors.bg,
                  border: `1px solid ${rallyColors.glassBorder}`,
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <Text size="sm" fw={500} c={rallyColors.textSecondary} mb="xs">
                  محاسبه تفصیلی
                </Text>
                <Stack gap="xs">
                  <Text size="xs" ff="monospace" c={rallyColors.textSecondary}>
                    WACC = (E/V x Re) + (D/V x Rd x (1-Tc))
                  </Text>
                  <Text size="xs" ff="monospace" c={rallyColors.textDimmed}>
                    = (
                    {formatPersianNumber(
                      (results.equityWeight * 100).toFixed(1)
                    )}
                    ٪ x{' '}
                    {formatPersianNumber(
                      (inputs.costOfEquity * 100).toFixed(2)
                    )}
                    ٪) + (
                    {formatPersianNumber(
                      (results.debtWeight * 100).toFixed(1)
                    )}
                    ٪ x{' '}
                    {formatPersianNumber(
                      (inputs.costOfDebt * 100).toFixed(2)
                    )}
                    ٪ x (1 -{' '}
                    {formatPersianNumber(
                      (inputs.taxRate * 100).toFixed(0)
                    )}
                    ٪))
                  </Text>
                  <Text size="xs" ff="monospace" c={rallyColors.blue}>
                    ={' '}
                    {formatPersianNumber(
                      (results.equityComponent * 100).toFixed(2)
                    )}
                    ٪ +{' '}
                    {formatPersianNumber(
                      (results.debtComponent * 100).toFixed(2)
                    )}
                    ٪
                  </Text>
                  <Text
                    size="xs"
                    ff="monospace"
                    c={rallyColors.blue}
                    fw={700}
                  >
                    ={' '}
                    {formatPersianNumber((results.wacc * 100).toFixed(2))}٪
                  </Text>
                </Stack>
              </Box>

              {/* Tax Shield Benefit */}
              <Box
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <Group gap="sm" align="flex-start">
                  <IconCheck
                    size={20}
                    color={rallyColors.green}
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <Box>
                    <Text size="sm" fw={500} c={rallyColors.green} mb={4}>
                      مزیت سپر مالیاتی
                    </Text>
                    <Text size="xs" c={rallyColors.textSecondary}>
                      هزینه بدهی از{' '}
                      {formatPersianNumber(
                        (inputs.costOfDebt * 100).toFixed(2)
                      )}
                      ٪ به{' '}
                      {formatPersianNumber(
                        (results.afterTaxCostOfDebt * 100).toFixed(2)
                      )}
                      ٪ کاهش یافت. صرفه‌جویی مالیاتی:{' '}
                      <Text component="span" c={rallyColors.green} fw={500}>
                        {formatPersianNumber(
                          (
                            (inputs.costOfDebt -
                              results.afterTaxCostOfDebt) *
                            100
                          ).toFixed(2)
                        )}
                        ٪
                      </Text>
                    </Text>
                  </Box>
                </Group>
              </Box>
            </Stack>
          )}
        </SimpleGrid>
      </Card>

      {/* Charts */}
      {results && (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <PieChartCard
            title="ساختار سرمایه"
            subtitle="نسبت سهام به بدهی"
            data={capitalStructureData}
            height={300}
          />

          <BarChartCard
            title="اجزای WACC"
            subtitle="سهم هر منبع تامین مالی در هزینه سرمایه"
            data={waccComponentsData}
            dataKey="value"
            height={300}
          />
        </SimpleGrid>
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
          درباره WACC
        </Title>
        <Stack gap="sm">
          <Text size="sm" c={rallyColors.textSecondary}>
            <Text component="span" fw={700} c={rallyColors.blue}>
              میانگین موزون هزینه سرمایه (WACC)
            </Text>{' '}
            نرخ تنزیل مناسب برای ارزیابی پروژه‌های سرمایه‌گذاری است که ساختار
            سرمایه شرکت را در نظر می‌گیرد.
          </Text>
          <Box
            style={{
              backgroundColor: rallyColors.elevated,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Text size="xs" ff="monospace">
              WACC = (E/V x Re) + (D/V x Rd x (1-Tc))
            </Text>
          </Box>
          <Stack gap="xs">
            <Box>
              <Text size="xs" fw={700} c={rallyColors.textSecondary}>
                چرا WACC مهم است؟
              </Text>
              <Box
                component="ul"
                style={{ paddingRight: 16, margin: '4px 0 0' }}
              >
                <Text component="li" size="xs" c={rallyColors.textDimmed}>
                  نرخ بازده حداقلی که پروژه باید کسب کند
                </Text>
                <Text component="li" size="xs" c={rallyColors.textDimmed}>
                  در محاسبه NPV به‌عنوان نرخ تنزیل استفاده می‌شود
                </Text>
                <Text component="li" size="xs" c={rallyColors.textDimmed}>
                  معیاری برای ارزیابی عملکرد شرکت
                </Text>
                <Text component="li" size="xs" c={rallyColors.textDimmed}>
                  در تصمیمات ساختار سرمایه کاربرد دارد
                </Text>
              </Box>
            </Box>
            <Box
              pt="sm"
              style={{
                borderTop: `1px solid ${rallyColors.glassBorder}`,
              }}
            >
              <Text size="xs" c={rallyColors.textSecondary}>
                <Text component="span" fw={700} c={rallyColors.textSecondary}>
                  سپر مالیاتی:
                </Text>{' '}
                بهره بدهی کسر مالیاتی است، بنابراین هزینه واقعی بدهی Rd x (1-Tc)
                می‌شود.
              </Text>
            </Box>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}
