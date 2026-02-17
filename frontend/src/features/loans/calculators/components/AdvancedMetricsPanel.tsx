/**
 * Advanced Metrics Panel Component
 *
 * Integrates all financial metrics (CAPM, WACC, FCF) for comprehensive analysis
 * and investment decision support.
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
  Table,
} from '@mantine/core';
import {
  IconActivity,
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconCircleCheck,
} from '@tabler/icons-react';
import rallyColors from '@/theme/rallyColors';
import { formatPersianAmount, formatPersianNumber } from '@/utils/loans/persianNumber';
import {
  calculateSharpeRatio,
  calculateTreynorRatio,
  calculateJensensAlpha,
  calculateInformationRatio,
} from '@/utils/loans/advancedFinancial';
import type {
  CAPMInputs,
  CAPMResults,
  WACCCalculatorInputs,
  WACCResults,
  FCFAnalysisInputs,
  FCFResults,
  AdvancedMetrics,
} from '@/types/advancedFinancial';

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
    const irrExceedsWACC = fcfResults.irr
      ? fcfResults.irr > waccResults.wacc
      : false;
    const irrExceedsCAPM = fcfResults.irr
      ? fcfResults.irr > capmResults.expectedReturn
      : false;
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
      keyInsights.push(
        `NPV مثبت: پروژه ${formatPersianAmount(fcfResults.npvAtWACC)} ارزش می‌آفریند`
      );
    } else {
      warnings.push(
        `NPV منفی: پروژه ${formatPersianAmount(Math.abs(fcfResults.npvAtWACC))} ارزش از بین می‌برد`
      );
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
      keyInsights.push(
        `نسبت شارپ بالا: ${formatPersianNumber(sharpeRatio.toFixed(2))} - ریسک‌تعدیل‌شده خوب`
      );
    } else if (sharpeRatio < 0) {
      warnings.push('نسبت شارپ منفی - بازده کمتر از نرخ بدون ریسک');
    }

    // Debt-to-equity warning
    const debtToEquity = waccInputs.debtValue / waccInputs.equityValue;
    if (debtToEquity > 2) {
      warnings.push(
        `نسبت بدهی به سهام بالا: ${formatPersianNumber(debtToEquity.toFixed(2))} - ریسک مالی زیاد`
      );
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
    <Stack gap="lg">
      {/* Prerequisites Check */}
      <Card
        padding="lg"
        radius="md"
        style={{
          backgroundColor: rallyColors.bg,
          border: `1px solid ${rallyColors.glassBorder}`,
        }}
      >
        <Group gap="sm" mb="md">
          <IconActivity size={20} color={rallyColors.blue} />
          <Title order={3} c={rallyColors.textPrimary}>
            تحلیل جامع
          </Title>
        </Group>

        <Stack gap="sm">
          <Group gap="sm">
            {capmResults ? (
              <IconCircleCheck size={16} color={rallyColors.green} />
            ) : (
              <IconAlertTriangle size={16} color={rallyColors.yellow} />
            )}
            <Text
              size="sm"
              c={capmResults ? rallyColors.textSecondary : rallyColors.textDimmed}
            >
              محاسبه CAPM {capmResults ? '' : '(در انتظار)'}
            </Text>
          </Group>
          <Group gap="sm">
            {waccResults ? (
              <IconCircleCheck size={16} color={rallyColors.green} />
            ) : (
              <IconAlertTriangle size={16} color={rallyColors.yellow} />
            )}
            <Text
              size="sm"
              c={waccResults ? rallyColors.textSecondary : rallyColors.textDimmed}
            >
              محاسبه WACC {waccResults ? '' : '(در انتظار)'}
            </Text>
          </Group>
          <Group gap="sm">
            {fcfResults ? (
              <IconCircleCheck size={16} color={rallyColors.green} />
            ) : (
              <IconAlertTriangle size={16} color={rallyColors.yellow} />
            )}
            <Text
              size="sm"
              c={fcfResults ? rallyColors.textSecondary : rallyColors.textDimmed}
            >
              محاسبه جریان نقدی {fcfResults ? '' : '(در انتظار)'}
            </Text>
          </Group>
        </Stack>

        {!canCalculate && (
          <Box
            mt="md"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Text size="sm" c={rallyColors.yellow}>
              لطفاً ابتدا محاسبات CAPM، WACC و جریان نقدی آزاد را در تب‌های مربوطه
              تکمیل کنید.
            </Text>
          </Box>
        )}
      </Card>

      {canCalculate && (
        <>
          {/* Risk Metrics Inputs */}
          <Card padding="lg" radius="md" style={glassCard}>
            <Title order={4} c={rallyColors.textPrimary} mb="md">
              پارامترهای معیارهای ریسک
            </Title>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <NumberInput
                label="انحراف معیار پرتفوی (sigma)"
                value={portfolioStdDev * 100}
                onChange={(value) => setPortfolioStdDev(Number(value) / 100)}
                step={0.01}
                decimalScale={2}
                suffix="%"
                styles={inputStyles}
                hideControls
              />

              <NumberInput
                label="بازده بنچمارک"
                value={benchmarkReturn * 100}
                onChange={(value) => setBenchmarkReturn(Number(value) / 100)}
                step={0.01}
                decimalScale={2}
                suffix="%"
                styles={inputStyles}
                hideControls
              />

              <NumberInput
                label="Tracking Error"
                value={trackingError * 100}
                onChange={(value) => setTrackingError(Number(value) / 100)}
                step={0.01}
                decimalScale={2}
                suffix="%"
                styles={inputStyles}
                hideControls
              />
            </SimpleGrid>

            <Button
              onClick={handleCalculateIntegrated}
              color="blue"
              fullWidth
              mt="md"
            >
              محاسبه معیارهای جامع
            </Button>
          </Card>

          {/* Integrated Results */}
          {integratedMetrics && (
            <>
              {/* Recommendation Banner */}
              <Card
                padding="lg"
                radius="md"
                style={{
                  backgroundColor:
                    integratedMetrics.recommendation === 'accept'
                      ? 'rgba(16, 185, 129, 0.1)'
                      : integratedMetrics.recommendation === 'reject'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid ${
                    integratedMetrics.recommendation === 'accept'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : integratedMetrics.recommendation === 'reject'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(245, 158, 11, 0.3)'
                  }`,
                }}
              >
                <Group gap="md" align="center">
                  {integratedMetrics.recommendation === 'accept' ? (
                    <IconCircleCheck
                      size={48}
                      color={rallyColors.green}
                      style={{ flexShrink: 0 }}
                    />
                  ) : integratedMetrics.recommendation === 'reject' ? (
                    <IconTrendingDown
                      size={48}
                      color={rallyColors.red}
                      style={{ flexShrink: 0 }}
                    />
                  ) : (
                    <IconAlertTriangle
                      size={48}
                      color={rallyColors.yellow}
                      style={{ flexShrink: 0 }}
                    />
                  )}
                  <Box style={{ flex: 1 }}>
                    <Text size="xl" fw={700} c={rallyColors.textPrimary} mb={4}>
                      {integratedMetrics.recommendation === 'accept'
                        ? 'توصیه: قبول پروژه'
                        : integratedMetrics.recommendation === 'reject'
                        ? 'توصیه: رد پروژه'
                        : 'توصیه: نیاز به بررسی بیشتر'}
                    </Text>
                    <Text size="sm" c={rallyColors.textSecondary}>
                      امتیاز کلی:{' '}
                      {formatPersianNumber(integratedMetrics.recommendationScore)} از
                      100
                    </Text>
                  </Box>
                  <Text
                    size="xl"
                    fw={700}
                    style={{
                      fontSize: 36,
                      color:
                        integratedMetrics.recommendation === 'accept'
                          ? '#4ade80'
                          : integratedMetrics.recommendation === 'reject'
                          ? '#f87171'
                          : '#fbbf24',
                    }}
                  >
                    {formatPersianNumber(integratedMetrics.recommendationScore)}
                  </Text>
                </Group>
              </Card>

              {/* Key Insights */}
              {integratedMetrics.keyInsights.length > 0 && (
                <Card
                  padding="lg"
                  radius="md"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    border: `1px solid rgba(16, 185, 129, 0.2)`,
                  }}
                >
                  <Group gap="sm" mb="sm">
                    <IconTrendingUp size={20} color={rallyColors.green} />
                    <Title order={4} c={rallyColors.green}>
                      نقاط قوت
                    </Title>
                  </Group>
                  <Stack gap="xs">
                    {integratedMetrics.keyInsights.map((insight, idx) => (
                      <Group key={idx} gap="sm" align="flex-start">
                        <Text
                          c={rallyColors.green}
                          style={{ flexShrink: 0 }}
                          size="sm"
                        >
                          {''}
                        </Text>
                        <Text size="sm" c={rallyColors.textSecondary}>
                          {insight}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Card>
              )}

              {/* Warnings */}
              {integratedMetrics.warnings.length > 0 && (
                <Card
                  padding="lg"
                  radius="md"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    border: `1px solid rgba(239, 68, 68, 0.2)`,
                  }}
                >
                  <Group gap="sm" mb="sm">
                    <IconAlertTriangle size={20} color={rallyColors.red} />
                    <Title order={4} c={rallyColors.red}>
                      هشدارها
                    </Title>
                  </Group>
                  <Stack gap="xs">
                    {integratedMetrics.warnings.map((warning, idx) => (
                      <Group key={idx} gap="sm" align="flex-start">
                        <Text
                          c={rallyColors.red}
                          style={{ flexShrink: 0 }}
                          size="sm"
                        >
                          !
                        </Text>
                        <Text size="sm" c={rallyColors.textSecondary}>
                          {warning}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Card>
              )}

              {/* Risk-Adjusted Metrics */}
              <Card padding="lg" radius="md" style={glassCard}>
                <Title order={4} c={rallyColors.textPrimary} mb="md">
                  معیارهای تعدیل‌شده با ریسک
                </Title>

                <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="md">
                  <Box
                    style={{
                      backgroundColor: rallyColors.bg,
                      border: `1px solid ${rallyColors.glassBorder}`,
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <Text size="xs" c={rallyColors.textSecondary} mb={4}>
                      نسبت شارپ
                    </Text>
                    <Text size="xl" fw={700} c={rallyColors.blue}>
                      {formatPersianNumber(
                        integratedMetrics.riskAdjusted.sharpeRatio?.toFixed(2) ||
                          '0'
                      )}
                    </Text>
                    <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                      (Rp - Rf) / sigma
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
                    <Text size="xs" c={rallyColors.textSecondary} mb={4}>
                      نسبت ترینور
                    </Text>
                    <Text size="xl" fw={700} c="#14b8a6">
                      {formatPersianNumber(
                        integratedMetrics.riskAdjusted.treynorRatio?.toFixed(2) ||
                          '0'
                      )}
                    </Text>
                    <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                      (Rp - Rf) / beta
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
                    <Text size="xs" c={rallyColors.textSecondary} mb={4}>
                      آلفای جنسن
                    </Text>
                    <Text
                      size="xl"
                      fw={700}
                      c={
                        (integratedMetrics.riskAdjusted.jensensAlpha || 0) > 0
                          ? rallyColors.green
                          : rallyColors.red
                      }
                    >
                      {formatPersianNumber(
                        (
                          integratedMetrics.riskAdjusted.jensensAlpha! * 100
                        ).toFixed(2)
                      )}
                      ٪
                    </Text>
                    <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                      Rp - CAPM
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
                    <Text size="xs" c={rallyColors.textSecondary} mb={4}>
                      نسبت اطلاعات
                    </Text>
                    <Text size="xl" fw={700} c={rallyColors.purple}>
                      {formatPersianNumber(
                        integratedMetrics.riskAdjusted.informationRatio?.toFixed(
                          2
                        ) || '0'
                      )}
                    </Text>
                    <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                      (Rp - Rb) / TE
                    </Text>
                  </Box>
                </SimpleGrid>

                <Stack gap="xs" mt="md">
                  <Text size="xs" c={rallyColors.textDimmed}>
                    - نسبت شارپ: بازده به ازای هر واحد ریسک کل
                  </Text>
                  <Text size="xs" c={rallyColors.textDimmed}>
                    - نسبت ترینور: بازده به ازای هر واحد ریسک سیستماتیک
                  </Text>
                  <Text size="xs" c={rallyColors.textDimmed}>
                    - آلفای جنسن: بازده اضافی نسبت به بازده مورد انتظار CAPM
                  </Text>
                  <Text size="xs" c={rallyColors.textDimmed}>
                    - نسبت اطلاعات: بازده فعال به ازای هر واحد ریسک فعال
                  </Text>
                </Stack>
              </Card>

              {/* Summary Table */}
              <Card padding="lg" radius="md" style={glassCard}>
                <Title order={4} c={rallyColors.textPrimary} mb="md">
                  خلاصه مقایسه‌ای
                </Title>

                <Box style={{ overflowX: 'auto' }}>
                  <Table
                    styles={{
                      th: {
                        color: rallyColors.textSecondary,
                        fontWeight: 500,
                        textAlign: 'right',
                        padding: '8px 12px',
                        borderBottom: `1px solid ${rallyColors.glassBorder}`,
                      },
                      td: {
                        padding: '8px 12px',
                        borderBottom: `1px solid ${rallyColors.glassBorder}`,
                      },
                    }}
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>معیار</Table.Th>
                        <Table.Th>مقدار</Table.Th>
                        <Table.Th>توضیح</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      <Table.Tr>
                        <Table.Td>
                          <Text size="sm" c={rallyColors.textSecondary}>
                            بازده مورد انتظار (CAPM)
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500} c={rallyColors.blue}>
                            {formatPersianNumber(
                              (capmResults!.expectedReturn * 100).toFixed(2)
                            )}
                            ٪
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c={rallyColors.textDimmed}>
                            حداقل بازده قابل قبول
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>
                          <Text size="sm" c={rallyColors.textSecondary}>
                            WACC
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500} c={rallyColors.blue}>
                            {formatPersianNumber(
                              (waccResults!.wacc * 100).toFixed(2)
                            )}
                            ٪
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c={rallyColors.textDimmed}>
                            نرخ تنزیل مناسب
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                      {fcfResults!.irr && (
                        <Table.Tr>
                          <Table.Td>
                            <Text size="sm" c={rallyColors.textSecondary}>
                              IRR
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500} c="#14b8a6">
                              {formatPersianNumber(
                                (fcfResults!.irr * 100).toFixed(2)
                              )}
                              ٪
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c={rallyColors.textDimmed}>
                              بازده واقعی پروژه
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                      <Table.Tr>
                        <Table.Td>
                          <Text size="sm" c={rallyColors.textSecondary}>
                            NPV (با WACC)
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text
                            size="sm"
                            fw={500}
                            c={
                              fcfResults!.npvAtWACC > 0
                                ? rallyColors.green
                                : rallyColors.red
                            }
                          >
                            {formatPersianAmount(fcfResults!.npvAtWACC)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c={rallyColors.textDimmed}>
                            ارزش خالص فعلی
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Box>
              </Card>
            </>
          )}
        </>
      )}
    </Stack>
  );
}
