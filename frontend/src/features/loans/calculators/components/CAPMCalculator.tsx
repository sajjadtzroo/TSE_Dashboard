/**
 * CAPM Calculator Component
 *
 * Calculates expected return using Capital Asset Pricing Model:
 * E(Ri) = Rf + beta x [E(Rm) - Rf]
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
import { LineChartCard } from '@/components/loans/charts';
import { formatPersianNumber } from '@/utils/loans/persianNumber';
import { calculateCAPM, validateCAPMInputs } from '@/utils/loans/advancedFinancial';
import rallyColors from '@/theme/rallyColors';
import type { CAPMInputs, CAPMResults } from '@/types/advancedFinancial';
import { IconTrendingUp, IconAlertCircle } from '@tabler/icons-react';

const glassCard = {
  backgroundColor: rallyColors.glassBg,
  border: `1px solid ${rallyColors.glassBorder}`,
  backdropFilter: 'blur(12px)',
};

const inputStyles = {
  input: {
    backgroundColor: rallyColors.bg,
    border: `1px solid ${rallyColors.glassBorder}`,
    color: rallyColors.textPrimary,
  },
  label: {
    color: rallyColors.textSecondary,
    marginBottom: 8,
  },
};

interface Props {
  inputs: CAPMInputs;
  results: CAPMResults | null;
  onInputsChange: (inputs: CAPMInputs) => void;
  onCalculate: (results: CAPMResults) => void;
}

export function CAPMCalculator({
  inputs,
  results,
  onInputsChange,
  onCalculate,
}: Props) {
  const [errors, setErrors] = useState<string[]>([]);

  const handleCalculate = () => {
    // Validate inputs
    const validationErrors = validateCAPMInputs(
      inputs.riskFreeRate,
      inputs.beta,
      inputs.marketReturn
    );

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    // Calculate CAPM
    const capm = calculateCAPM(inputs.riskFreeRate, inputs.beta, inputs.marketReturn);

    const calculatedResults: CAPMResults = {
      expectedReturn: capm.expectedReturn,
      riskPremium: capm.riskPremium,
      requiredReturn: capm.expectedReturn, // Alias for clarity
    };

    onCalculate(calculatedResults);
  };

  // Generate Security Market Line (SML) data
  const generateSMLData = () => {
    if (!results) return [];

    const points = [];
    for (let beta = 0; beta <= 2; beta += 0.2) {
      const capm = calculateCAPM(inputs.riskFreeRate, beta, inputs.marketReturn);
      points.push({
        beta: formatPersianNumber(beta.toFixed(1)),
        expectedReturn: Number((capm.expectedReturn * 100).toFixed(1)),
      });
    }
    return points;
  };

  const smlData = generateSMLData();

  return (
    <Stack gap="lg">
      {/* Input Section */}
      <Card padding="lg" radius="md" style={glassCard}>
        <Group gap="sm" mb="md">
          <IconTrendingUp size={20} color={rallyColors.blue} />
          <Title order={3} c={rallyColors.textPrimary}>
            محاسبه CAPM
          </Title>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Input Fields */}
          <Stack gap="md">
            <Box>
              <Text size="sm" c={rallyColors.textSecondary} mb="xs">
                نرخ بدون ریسک (Rf)
                <Text component="span" size="xs" c={rallyColors.textDimmed} mr="xs">
                  {' '}
                  - سپرده بانکی یا اوراق دولتی
                </Text>
              </Text>
              <NumberInput
                value={inputs.riskFreeRate * 100}
                onChange={(value) =>
                  onInputsChange({
                    ...inputs,
                    riskFreeRate: Number(value) / 100,
                  })
                }
                step={0.01}
                decimalScale={2}
                suffix="%"
                styles={inputStyles}
                hideControls
              />
            </Box>

            <Box>
              <Text size="sm" c={rallyColors.textSecondary} mb="xs">
                بازده بازار (Rm)
                <Text component="span" size="xs" c={rallyColors.textDimmed} mr="xs">
                  {' '}
                  - شاخص بورس تهران
                </Text>
              </Text>
              <NumberInput
                value={inputs.marketReturn * 100}
                onChange={(value) =>
                  onInputsChange({
                    ...inputs,
                    marketReturn: Number(value) / 100,
                  })
                }
                step={0.01}
                decimalScale={2}
                suffix="%"
                styles={inputStyles}
                hideControls
              />
            </Box>

            <Box>
              <Group gap="sm" mb="xs">
                <Text size="sm" c={rallyColors.textSecondary}>
                  ضریب بتا (beta)
                </Text>
                <Text size="xs" c={rallyColors.textDimmed}>
                  (معیار ریسک سیستماتیک)
                </Text>
              </Group>
              <NumberInput
                value={inputs.beta}
                onChange={(value) =>
                  onInputsChange({ ...inputs, beta: Number(value) })
                }
                step={0.01}
                decimalScale={2}
                styles={inputStyles}
                hideControls
              />
              <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                beta = 1: ریسک برابر با بازار | beta &gt; 1: پرریسک‌تر | beta &lt; 1:
                کم‌ریسک‌تر
              </Text>
            </Box>

            <Button onClick={handleCalculate} color="blue" fullWidth>
              محاسبه بازده مورد انتظار
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
                  بازده مورد انتظار
                </Text>
                <Text
                  style={{ fontSize: 28 }}
                  fw={700}
                  c={rallyColors.blue}
                >
                  {formatPersianNumber(
                    (results.expectedReturn * 100).toFixed(2)
                  )}
                  ٪
                </Text>
                <Text size="xs" c={rallyColors.textDimmed} mt="sm">
                  E(Ri) ={' '}
                  {formatPersianNumber(
                    (inputs.riskFreeRate * 100).toFixed(1)
                  )}
                  ٪ +{' '}
                  {formatPersianNumber(inputs.beta.toFixed(2))} x{' '}
                  {formatPersianNumber(
                    (results.riskPremium * 100).toFixed(1)
                  )}
                  ٪
                </Text>
              </Box>

              <Box
                style={{
                  backgroundColor: rallyColors.bg,
                  border: `1px solid ${rallyColors.glassBorder}`,
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <Text size="sm" c={rallyColors.textSecondary} mb={4}>
                  صرف ریسک بازار
                </Text>
                <Text size="xl" fw={700} c="#14b8a6">
                  {formatPersianNumber(
                    (results.riskPremium * 100).toFixed(2)
                  )}
                  ٪
                </Text>
                <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                  Rm - Rf ={' '}
                  {formatPersianNumber(
                    (inputs.marketReturn * 100).toFixed(1)
                  )}
                  ٪ -{' '}
                  {formatPersianNumber(
                    (inputs.riskFreeRate * 100).toFixed(1)
                  )}
                  ٪
                </Text>
              </Box>

              <Box
                style={{
                  backgroundColor: rallyColors.bg,
                  border: `1px solid ${rallyColors.glassBorder}`,
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <Text size="sm" c={rallyColors.textSecondary} mb={4}>
                  ریسک سیستماتیک
                </Text>
                <Text size="xl" fw={700} c={rallyColors.textPrimary}>
                  beta = {formatPersianNumber(inputs.beta.toFixed(2))}
                </Text>
                <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                  {inputs.beta > 1.2
                    ? 'دارایی پرریسک - نوسانات بیشتر از بازار'
                    : inputs.beta > 0.8
                    ? 'ریسک متوسط - مشابه بازار'
                    : 'دارایی کم‌ریسک - نوسانات کمتر از بازار'}
                </Text>
              </Box>

              {/* Interpretation */}
              <Box
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <Text size="sm" fw={500} c={rallyColors.blue} mb="xs">
                  تفسیر نتایج
                </Text>
                <Stack gap="xs">
                  <Text size="xs" c={rallyColors.textSecondary}>
                    - سرمایه‌گذاران باید حداقل{' '}
                    <Text component="span" c={rallyColors.blue} fw={500}>
                      {formatPersianNumber(
                        (results.expectedReturn * 100).toFixed(2)
                      )}
                      ٪
                    </Text>{' '}
                    بازده سالانه را از این سرمایه‌گذاری انتظار داشته باشند.
                  </Text>
                  <Text size="xs" c={rallyColors.textSecondary}>
                    - این نرخ جبران‌کننده ریسک سیستماتیک (beta ={' '}
                    {formatPersianNumber(inputs.beta.toFixed(2))}) است.
                  </Text>
                  <Text size="xs" c={rallyColors.textSecondary}>
                    - برای ارزیابی پروژه‌ها، این نرخ به‌عنوان هزینه سهام در WACC
                    استفاده می‌شود.
                  </Text>
                </Stack>
              </Box>
            </Stack>
          )}
        </SimpleGrid>
      </Card>

      {/* Security Market Line Chart */}
      {results && smlData.length > 0 && (
        <LineChartCard
          title="خط بازار اوراق بهادار (SML)"
          subtitle="رابطه بین ریسک سیستماتیک (beta) و بازده مورد انتظار"
          data={smlData}
          xAxisKey="beta"
          dataKeys={[
            {
              key: 'expectedReturn',
              name: 'بازده مورد انتظار (%)',
              color: '#3b82f6',
            },
          ]}
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
          درباره CAPM
        </Title>
        <Stack gap="sm">
          <Text size="sm" c={rallyColors.textSecondary}>
            <Text component="span" fw={700} c={rallyColors.blue}>
              مدل قیمت‌گذاری دارایی سرمایه‌ای (CAPM)
            </Text>{' '}
            یکی از مهم‌ترین مدل‌های مالی برای تعیین بازده مورد انتظار با توجه به
            ریسک است.
          </Text>
          <Box
            style={{
              backgroundColor: rallyColors.elevated,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Text size="xs" ff="monospace">
              E(Ri) = Rf + beta_i x [E(Rm) - Rf]
            </Text>
          </Box>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
            <Text size="xs" c={rallyColors.textSecondary}>
              <Text component="span" c={rallyColors.textDimmed}>
                E(Ri):
              </Text>{' '}
              بازده مورد انتظار دارایی
            </Text>
            <Text size="xs" c={rallyColors.textSecondary}>
              <Text component="span" c={rallyColors.textDimmed}>
                Rf:
              </Text>{' '}
              نرخ بدون ریسک
            </Text>
            <Text size="xs" c={rallyColors.textSecondary}>
              <Text component="span" c={rallyColors.textDimmed}>
                beta_i:
              </Text>{' '}
              ضریب بتای دارایی
            </Text>
            <Text size="xs" c={rallyColors.textSecondary}>
              <Text component="span" c={rallyColors.textDimmed}>
                E(Rm):
              </Text>{' '}
              بازده مورد انتظار بازار
            </Text>
          </SimpleGrid>
          <Text size="xs" c={rallyColors.textDimmed} mt="sm">
            این مدل فقط ریسک سیستماتیک (غیرقابل تنوع‌بخشی) را در نظر می‌گیرد و فرض
            می‌کند سرمایه‌گذاران پرتفوی متنوع دارند.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
