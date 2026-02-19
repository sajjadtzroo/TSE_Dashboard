/**
 * Scenario Comparison Component
 * Displays detailed analysis of Wait vs Buy vs Reject scenarios
 */

import React from 'react';
import { Box, Title, Text, SimpleGrid, Stack, Group } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { LoanAnalysisResult } from '../types';
import type { ScenarioResult } from '@/utils/loans/privilegeAnalysis';
import { formatCurrency } from '@/utils/loans/financialCalculations';
import { toPersianNum } from '@/utils/formatUtils';

interface ScenarioComparisonProps {
  loan: LoanAnalysisResult;
}

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({ loan }) => {
  const scenarios = [
    loan.scenarios.wait,
    loan.scenarios.buyPrivilege,
    loan.scenarios.reject,
  ].filter((s) => s !== undefined) as ScenarioResult[];

  return (
    <Box
      p="lg"
      style={{
        backgroundColor: rallyColors.card,
        borderRadius: 8,
        border: `1px solid ${rallyColors.border}`,
      }}
    >
      <Title order={3} size="lg" fw={600} c={rallyColors.textPrimary} mb="xs">
        مقایسه سناریوها: {loan.loanNameFA}
      </Title>
      <Text size="sm" c={rallyColors.textSecondary} mb="lg">
        بانک: {loan.bankNameFA}
      </Text>

      {/* Scenarios Grid */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mb="lg">
        {scenarios.map((scenario, index) => {
          const borderColor =
            scenario.decision === 'ACCEPT'
              ? '#10b981'
              : scenario.decision === 'REJECT'
              ? '#ef4444'
              : rallyColors.border;
          const bgColor =
            scenario.decision === 'ACCEPT'
              ? 'rgba(16, 185, 129, 0.05)'
              : scenario.decision === 'REJECT'
              ? 'rgba(239, 68, 68, 0.05)'
              : rallyColors.elevated;

          return (
            <Box
              key={`scenario-${scenario.name}-${index}`}
              p="md"
              style={{
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                backgroundColor: bgColor,
              }}
            >
              <Text fw={600} size="md" c={rallyColors.textPrimary} mb="xs">
                {scenario.name}
              </Text>
              <Text size="xs" c={rallyColors.textSecondary} mb="sm" mih="2.5rem">
                {scenario.description}
              </Text>
              <Text size="xl" fw={700} mb="xs">
                <Text
                  component="span"
                  c={scenario.npv >= 0 ? '#10b981' : '#ef4444'}
                  inherit
                >
                  NPV: {formatCurrency(scenario.npv)}
                </Text>
              </Text>
              <Group gap="xs">
                {scenario.decision === 'ACCEPT' && (
                  <Group gap={4}>
                    <IconCheck size={16} color="#10b981" />
                    <Text fw={600} c="#10b981" size="sm">
                      سودآور
                    </Text>
                  </Group>
                )}
                {scenario.decision === 'REJECT' && (
                  <Group gap={4}>
                    <IconX size={16} color="#ef4444" />
                    <Text fw={600} c="#ef4444" size="sm">
                      زیان‌ده
                    </Text>
                  </Group>
                )}
                {scenario.decision === 'BASELINE' && (
                  <Text fw={600} c={rallyColors.textSecondary} size="sm">
                    -- مبنا
                  </Text>
                )}
              </Group>
            </Box>
          );
        })}
      </SimpleGrid>

      {/* Key Metrics */}
      <Box
        p="md"
        mb="lg"
        style={{
          backgroundColor: rallyColors.elevated,
          borderRadius: 8,
          border: `1px solid ${rallyColors.border}`,
        }}
      >
        <Text fw={600} c={rallyColors.textPrimary} mb="sm">
          معیارهای کلیدی
        </Text>
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Stack gap={4}>
            <Text size="xs" c={rallyColors.textSecondary}>
              قیمت سر‌به‌سر امتیاز
            </Text>
            <Text fw={600} c={rallyColors.textPrimary} style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
              {formatCurrency(loan.breakEvenPrivilegePrice)}
            </Text>
          </Stack>
          <Stack gap={4}>
            <Text size="xs" c={rallyColors.textSecondary}>
              حداکثر انتظار
            </Text>
            <Text fw={600} c={rallyColors.textPrimary} style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
              {toPersianNum(loan.maxWaitMonths.toFixed(1))} ماه
            </Text>
          </Stack>
          <Stack gap={4}>
            <Text size="xs" c={rallyColors.textSecondary}>
              قسط ماهانه
            </Text>
            <Text fw={600} c={rallyColors.textPrimary} style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
              {formatCurrency(loan.monthlyPayment)}
            </Text>
          </Stack>
          <Stack gap={4}>
            <Text size="xs" c={rallyColors.textSecondary}>
              نرخ بهره
            </Text>
            <Text fw={600} c={rallyColors.textPrimary} style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
              {toPersianNum((loan.loanRate * 100).toFixed(1))}%
            </Text>
          </Stack>
        </SimpleGrid>
      </Box>

      {/* Alternatives Section */}
      {loan.alternatives && loan.alternatives.length > 0 && (
        <Box
          pt="lg"
          style={{
            borderTop: `1px solid ${rallyColors.border}`,
          }}
        >
          <Group gap="xs" mb="sm">
            <Text fw={600} c={rallyColors.textPrimary}>
              پیشنهادات جایگزین برای بهبود سودآوری
            </Text>
          </Group>
          <Stack gap="sm">
            {loan.alternatives.map((alt, index) => (
              <Group
                key={`alternative-${alt.type}-${index}`}
                align="flex-start"
                gap="sm"
                p="md"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 4,
                }}
              >
                <Text c={rallyColors.blue} fw={700} size="lg" mt={2}>
                  *
                </Text>
                <Stack gap={4} style={{ flex: 1 }}>
                  <Text fw={500} c={rallyColors.textPrimary} size="sm">
                    {alt.description}
                  </Text>
                  <Group gap="xs">
                    <Text size="sm" c={rallyColors.textSecondary}>
                      NPV جدید:
                    </Text>
                    <Text
                      size="sm"
                      fw={600}
                      c={alt.newNPV >= 0 ? '#10b981' : '#ef4444'}
                    >
                      {formatCurrency(alt.newNPV)}
                    </Text>
                  </Group>
                  {alt.parameters && (
                    <Text size="xs" c={rallyColors.textDimmed}>
                      {alt.parameters.waitMonths && `انتظار: ${alt.parameters.waitMonths} ماه`}
                      {alt.parameters.loanAmount && `مبلغ وام: ${formatCurrency(alt.parameters.loanAmount)}`}
                      {alt.parameters.repaymentMonths && `دوره بازپرداخت: ${alt.parameters.repaymentMonths} ماه`}
                    </Text>
                  )}
                </Stack>
              </Group>
            ))}
          </Stack>
        </Box>
      )}

      {/* Python Code Section */}
      <Box
        mt="lg"
        pt="lg"
        style={{
          borderTop: `1px solid ${rallyColors.border}`,
        }}
      >
        <details style={{ cursor: 'pointer' }}>
          <summary>
            <Text component="span" fw={600} size="sm" c={rallyColors.textSecondary}>
              کد پایتون برای تحلیل این وام
            </Text>
          </summary>
          <Box
            component="pre"
            mt="xs"
            p="md"
            dir="ltr"
            style={{
              backgroundColor: '#0a0a0a',
              color: '#10b981',
              borderRadius: 4,
              fontSize: '0.75rem',
              overflowX: 'auto',
              border: `1px solid ${rallyColors.border}`,
            }}
          >
{`# Loan: ${loan.loanNameFA}
# Bank: ${loan.bankNameFA}

from privilegeAnalysis import analyze_loan_scenarios

result = analyze_loan_scenarios(
    deposit_amount=${loan.depositAmount},
    wait_months=${loan.waitMonths},
    loan_amount=${loan.loanAmount},
    loan_rate=${(loan.loanRate * 100).toFixed(2)},  # ${(loan.loanRate * 100).toFixed(2)}% annual
    repayment_months=${loan.repaymentMonths},
    capm_rate=${(loan.discountRate * 100).toFixed(2)}  # ${(loan.discountRate * 100).toFixed(2)}% opportunity cost
)

print("Analysis Results:")
print(f"NPV (Wait): {result['npv_wait']:,.0f} Toman")
print(f"Break-even price: {result['break_even_price']:,.0f} Toman")
print(f"Max wait time: {result['max_wait_months']:.1f} months")
print(f"Recommendation: {result['recommendation']}")

# Output:
${JSON.stringify({
  npv_wait: Math.round(loan.npv),
  break_even_price: Math.round(loan.breakEvenPrivilegePrice),
  max_wait_months: parseFloat(loan.maxWaitMonths.toFixed(1)),
  recommendation: loan.recommendation,
  reasoning: loan.reasoning
}, null, 2)}`}
          </Box>
        </details>
      </Box>
    </Box>
  );
};

export default ScenarioComparison;
