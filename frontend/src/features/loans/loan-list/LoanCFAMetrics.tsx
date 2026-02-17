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
import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Box,
  Table,
} from '@mantine/core';
import {
  IconActivity,
  IconTrendingUp,
  IconCircleCheck,
  IconAlertTriangle,
  IconTrendingDown,
} from '@tabler/icons-react';
import { LineChartCard, PieChartCard, BarChartCard } from '@/components/loans/charts';
import { formatPersianAmount, formatPersianNumber } from '@/utils/loans/persianNumber';
import {
  calculateCAPM,
  calculateWACC,
  calculateFCFF,
  calculateSharpeRatio,
  calculateTreynorRatio,
  calculateJensensAlpha,
  IRANIAN_MARKET_DEFAULTS,
} from '@/utils/loans/advancedFinancial';
import { calculateIRR, calculateNPV, generateLoanCashFlow } from '@/utils/loans/financialCalculations';
import type { LoanWithBank } from '@/types';
import rallyColors from '@/theme/rallyColors';

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
      <Card
        withBorder
        radius="md"
        p="xl"
        style={{
          backgroundColor: rallyColors.card,
          border: `1px solid ${rallyColors.glassBorder}`,
        }}
      >
        <Text ta="center" c={rallyColors.textSecondary}>
          لطفاً مبلغ سپرده و مدت‌های مورد نظر را وارد کنید تا تحلیل مالی پیشرفته نمایش داده شود.
        </Text>
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

  const recommendationColor =
    cfaAnalysis.recommendation === 'accept'
      ? rallyColors.green
      : cfaAnalysis.recommendation === 'reject'
      ? rallyColors.red
      : rallyColors.yellow;

  return (
    <Stack gap="lg">
      {/* Header */}
      <Card
        withBorder
        radius="md"
        p="xl"
        style={{
          background: `linear-gradient(135deg, ${rallyColors.blue}18, transparent)`,
          border: `1px solid ${rallyColors.blue}33`,
          backgroundColor: rallyColors.card,
        }}
      >
        <Group gap="sm" mb="md">
          <IconActivity size={32} color={rallyColors.blue} />
          <div>
            <Title order={3} c={rallyColors.textPrimary}>
              تحلیل مالی پیشرفته (CFA)
            </Title>
            <Text size="sm" c={rallyColors.textSecondary}>
              ارزیابی ریسک و بازده با استانداردهای CFA
            </Text>
          </div>
        </Group>
      </Card>

      {/* Recommendation Banner */}
      <Card
        withBorder
        radius="md"
        p="xl"
        style={{
          backgroundColor: `${recommendationColor}18`,
          border: `1px solid ${recommendationColor}4d`,
        }}
      >
        <Group gap="md">
          {cfaAnalysis.recommendation === 'accept' ? (
            <IconCircleCheck size={48} color={rallyColors.green} style={{ flexShrink: 0 }} />
          ) : cfaAnalysis.recommendation === 'reject' ? (
            <IconTrendingDown size={48} color={rallyColors.red} style={{ flexShrink: 0 }} />
          ) : (
            <IconAlertTriangle size={48} color={rallyColors.yellow} style={{ flexShrink: 0 }} />
          )}
          <Box style={{ flex: 1 }}>
            <Text size="xl" fw={700} c={rallyColors.textPrimary} mb={4}>
              {cfaAnalysis.recommendation === 'accept'
                ? 'توصیه: قبول وام'
                : cfaAnalysis.recommendation === 'reject'
                ? 'توصیه: رد وام'
                : 'توصیه: نیاز به بررسی دقیق‌تر'}
            </Text>
            <Text size="sm" c={rallyColors.textSecondary}>
              امتیاز ارزیابی: {formatPersianNumber(cfaAnalysis.recommendationScore)} از 100
            </Text>
          </Box>
          <Text
            size="2rem"
            fw={700}
            c={recommendationColor}
            ta="right"
          >
            {formatPersianNumber(cfaAnalysis.recommendationScore)}
          </Text>
        </Group>
      </Card>

      {/* Key Metrics Grid */}
      <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="md">
        <Card
          withBorder
          radius="md"
          p="md"
          style={{
            backgroundColor: `${rallyColors.blue}18`,
            border: `1px solid ${rallyColors.blue}33`,
          }}
        >
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>
            بازده مورد انتظار (CAPM)
          </Text>
          <Text size="xl" fw={700} c={rallyColors.blue}>
            {formatPersianNumber((cfaAnalysis.capm.expectedReturn * 100).toFixed(2))}٪
          </Text>
          <Text size="xs" c={rallyColors.textDimmed} mt={4}>
            &beta; = {formatPersianNumber(cfaAnalysis.capm.beta.toFixed(2))}
          </Text>
        </Card>

        <Card
          withBorder
          radius="md"
          p="md"
          style={{
            backgroundColor: '#14b8a618',
            border: '1px solid #14b8a633',
          }}
        >
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>
            WACC
          </Text>
          <Text size="xl" fw={700} style={{ color: '#14b8a6' }}>
            {formatPersianNumber((cfaAnalysis.wacc.wacc * 100).toFixed(2))}٪
          </Text>
          <Text size="xs" c={rallyColors.textDimmed} mt={4}>
            نرخ تنزیل مناسب
          </Text>
        </Card>

        <Card
          withBorder
          radius="md"
          p="md"
          style={{
            backgroundColor: `${rallyColors.blue}18`,
            border: `1px solid ${rallyColors.blue}33`,
          }}
        >
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>
            NPV (در WACC)
          </Text>
          <Text
            size="xl"
            fw={700}
            c={cfaAnalysis.performance.npvAtWACC > 0 ? rallyColors.green : rallyColors.red}
          >
            {formatPersianAmount(cfaAnalysis.performance.npvAtWACC)}
          </Text>
          <Text size="xs" c={rallyColors.textDimmed} mt={4}>
            ارزش خالص فعلی
          </Text>
        </Card>

        <Card
          withBorder
          radius="md"
          p="md"
          style={{
            backgroundColor: `${rallyColors.purple}18`,
            border: `1px solid ${rallyColors.purple}33`,
          }}
        >
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>
            IRR
          </Text>
          <Text size="xl" fw={700} c={rallyColors.purple}>
            {cfaAnalysis.performance.irr
              ? formatPersianNumber((cfaAnalysis.performance.irr * 100).toFixed(2)) + '٪'
              : 'N/A'}
          </Text>
          <Text size="xs" c={rallyColors.textDimmed} mt={4}>
            نرخ بازده داخلی
          </Text>
        </Card>
      </SimpleGrid>

      {/* Insights and Warnings */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {cfaAnalysis.insights.length > 0 && (
          <Card
            withBorder
            radius="md"
            p="md"
            style={{
              backgroundColor: `${rallyColors.green}0d`,
              border: `1px solid ${rallyColors.green}33`,
            }}
          >
            <Group gap="xs" mb="sm">
              <IconTrendingUp size={20} color={rallyColors.green} />
              <Text fw={700} c={rallyColors.green}>
                نقاط قوت
              </Text>
            </Group>
            <Stack gap="xs">
              {cfaAnalysis.insights.map((insight, idx) => (
                <Group key={idx} gap="xs" align="flex-start" wrap="nowrap">
                  <Text c={rallyColors.green} style={{ flexShrink: 0 }}>
                    &#10003;
                  </Text>
                  <Text size="sm" c={rallyColors.textSecondary}>
                    {insight}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Card>
        )}

        {cfaAnalysis.warnings.length > 0 && (
          <Card
            withBorder
            radius="md"
            p="md"
            style={{
              backgroundColor: `${rallyColors.red}0d`,
              border: `1px solid ${rallyColors.red}33`,
            }}
          >
            <Group gap="xs" mb="sm">
              <IconAlertTriangle size={20} color={rallyColors.red} />
              <Text fw={700} c={rallyColors.red}>
                هشدارها
              </Text>
            </Group>
            <Stack gap="xs">
              {cfaAnalysis.warnings.map((warning, idx) => (
                <Group key={idx} gap="xs" align="flex-start" wrap="nowrap">
                  <Text c={rallyColors.red} style={{ flexShrink: 0 }}>
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
      </SimpleGrid>

      {/* Charts */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
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
      </SimpleGrid>

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
      <Card
        withBorder
        radius="md"
        p="xl"
        style={{
          backgroundColor: rallyColors.card,
          border: `1px solid ${rallyColors.glassBorder}`,
        }}
      >
        <Title order={4} c={rallyColors.textPrimary} mb="md">
          جزئیات تحلیل CFA
        </Title>
        <Table.ScrollContainer minWidth={500}>
          <Table verticalSpacing="sm" horizontalSpacing="sm">
            <Table.Thead>
              <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.border}` }}>
                <Table.Th style={{ textAlign: 'right' }}>
                  <Text size="sm" c={rallyColors.textSecondary} fw={500}>معیار</Text>
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  <Text size="sm" c={rallyColors.textSecondary} fw={500}>مقدار</Text>
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  <Text size="sm" c={rallyColors.textSecondary} fw={500}>تفسیر</Text>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.border}` }}>
                <Table.Td><Text size="sm" c={rallyColors.textSecondary}>مبلغ سپرده</Text></Table.Td>
                <Table.Td><Text size="sm" fw={500} c={rallyColors.blue}>{formatPersianAmount(depositAmount)}</Text></Table.Td>
                <Table.Td><Text size="xs" c={rallyColors.textDimmed}>سرمایه اولیه (حقوق صاحبان سهام)</Text></Table.Td>
              </Table.Tr>
              <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.border}` }}>
                <Table.Td><Text size="sm" c={rallyColors.textSecondary}>مبلغ وام</Text></Table.Td>
                <Table.Td><Text size="sm" fw={500} c={rallyColors.purple}>{formatPersianAmount(cfaAnalysis.loanAmount)}</Text></Table.Td>
                <Table.Td><Text size="xs" c={rallyColors.textDimmed}>بدهی دریافتی</Text></Table.Td>
              </Table.Tr>
              <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.border}` }}>
                <Table.Td><Text size="sm" c={rallyColors.textSecondary}>قسط ماهانه</Text></Table.Td>
                <Table.Td><Text size="sm" fw={500} c={rallyColors.yellow}>{formatPersianAmount(cfaAnalysis.fcf.monthlyPayment)}</Text></Table.Td>
                <Table.Td><Text size="xs" c={rallyColors.textDimmed}>پرداخت ماهانه بدهی</Text></Table.Td>
              </Table.Tr>
              <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.border}` }}>
                <Table.Td><Text size="sm" c={rallyColors.textSecondary}>وام خالص</Text></Table.Td>
                <Table.Td><Text size="sm" fw={500} style={{ color: '#14b8a6' }}>{formatPersianAmount(cfaAnalysis.fcf.netBorrowing)}</Text></Table.Td>
                <Table.Td><Text size="xs" c={rallyColors.textDimmed}>دریافتی منهای بازپرداختی</Text></Table.Td>
              </Table.Tr>
              <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.border}` }}>
                <Table.Td><Text size="sm" c={rallyColors.textSecondary}>نسبت شارپ</Text></Table.Td>
                <Table.Td><Text size="sm" fw={500} c={rallyColors.blue}>{formatPersianNumber(cfaAnalysis.performance.sharpeRatio.toFixed(3))}</Text></Table.Td>
                <Table.Td><Text size="xs" c={rallyColors.textDimmed}>بازده به ازای واحد ریسک کل</Text></Table.Td>
              </Table.Tr>
              <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.border}` }}>
                <Table.Td><Text size="sm" c={rallyColors.textSecondary}>نسبت ترینور</Text></Table.Td>
                <Table.Td><Text size="sm" fw={500} c={rallyColors.blue}>{formatPersianNumber(cfaAnalysis.performance.treynorRatio.toFixed(3))}</Text></Table.Td>
                <Table.Td><Text size="xs" c={rallyColors.textDimmed}>بازده به ازای ریسک سیستماتیک</Text></Table.Td>
              </Table.Tr>
              <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.border}` }}>
                <Table.Td><Text size="sm" c={rallyColors.textSecondary}>آلفای جنسن</Text></Table.Td>
                <Table.Td>
                  <Text
                    size="sm"
                    fw={500}
                    c={cfaAnalysis.performance.jensensAlpha > 0 ? rallyColors.green : rallyColors.red}
                  >
                    {formatPersianNumber((cfaAnalysis.performance.jensensAlpha * 100).toFixed(3))}٪
                  </Text>
                </Table.Td>
                <Table.Td><Text size="xs" c={rallyColors.textDimmed}>بازده اضافی نسبت به CAPM</Text></Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      {/* Methodology Note */}
      <Card
        withBorder
        radius="md"
        p="md"
        style={{
          backgroundColor: rallyColors.card,
          border: `1px solid ${rallyColors.border}`,
        }}
      >
        <Stack gap="xs">
          <Text size="xs" c={rallyColors.textDimmed}>
            <Text span fw={600} c={rallyColors.textSecondary}>
              روش‌شناسی:
            </Text>{' '}
            این تحلیل بر اساس استانداردهای CFA Level 1 و 2 انجام شده است.
          </Text>
          <Box component="ul" style={{ listStyleType: 'disc', paddingInlineStart: '1.5rem' }}>
            <Text component="li" size="xs" c={rallyColors.textDimmed} mb={4}>
              CAPM برای محاسبه هزینه سهام (با &beta;بتا={formatPersianNumber(cfaAnalysis.capm.beta.toFixed(2))})
            </Text>
            <Text component="li" size="xs" c={rallyColors.textDimmed} mb={4}>
              WACC با در نظر گرفتن سپر مالیاتی ({formatPersianNumber((IRANIAN_MARKET_DEFAULTS.corporateTaxRate * 100).toFixed(0))}٪)
            </Text>
            <Text component="li" size="xs" c={rallyColors.textDimmed} mb={4}>
              سپرده به عنوان حقوق صاحبان سهام و وام به عنوان بدهی در نظر گرفته شده
            </Text>
            <Text component="li" size="xs" c={rallyColors.textDimmed}>
              جریان‌های نقدی واقعی ماهانه برای محاسبه NPV و IRR
            </Text>
          </Box>
        </Stack>
      </Card>
    </Stack>
  );
}
