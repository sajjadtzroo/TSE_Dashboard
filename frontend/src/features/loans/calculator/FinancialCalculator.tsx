/**
 * Financial Calculator Component
 * Analyzes loans and recommends best options based on user inputs
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
} from '@mantine/core';
import { IconCalculator, IconTrendingUp, IconCurrencyDollar } from '@tabler/icons-react';
import { useLoans } from '@/hooks/loans';
import { LoadingPage } from '@/components/loans/ui';
import rallyColors from '@/theme/rallyColors';
import { CalculatorForm } from './CalculatorForm';
import { CalculatorResults } from './CalculatorResults';
import { analyzeLoan, rankLoans } from './calculatorEngine';
import type { CalculatorInputs, LoanAnalysis } from './types';

const glassCard = {
  backgroundColor: rallyColors.glassBg,
  border: `1px solid ${rallyColors.glassBorder}`,
  backdropFilter: 'blur(12px)',
};

export function FinancialCalculator() {
  const { data: allLoans, isLoading } = useLoans();
  const [inputs, setInputs] = useState<CalculatorInputs>({
    depositAmount: 100000000, // 100M Toman default
    depositMonths: 3,
    externalReturnRate: 0.30, // 30% annual return
    commission: 5000000, // 5M Toman
    loanMonths: 36,
    riskTolerance: 'medium',
  });
  const [results, setResults] = useState<LoanAnalysis[] | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleCalculate = () => {
    if (!allLoans) return;

    // Analyze all loans
    const analyses: LoanAnalysis[] = [];

    for (const loan of allLoans) {
      try {
        const analysis = analyzeLoan(loan, inputs);
        if (analysis) {
          analyses.push(analysis);
        }
      } catch (error) {
        console.error('Error analyzing loan:', loan.id, error);
      }
    }

    // Rank and sort by score
    const rankedLoans = rankLoans(analyses, inputs.riskTolerance);
    setResults(rankedLoans);
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    setResults(null);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group gap="sm">
        <IconCalculator size={28} color={rallyColors.blue} />
        <Box>
          <Title order={2} c={rallyColors.textPrimary}>
            ماشین حساب مالی هوشمند
          </Title>
          <Text size="sm" c={rallyColors.textSecondary} mt={4}>
            تحلیل مالی وام‌ها با محاسبه IRR، MIRR، NPV و توصیه بهترین گزینه
          </Text>
        </Box>
      </Group>

      {/* Info Cards */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Card padding="sm" radius="md" style={glassCard}>
          <Group gap="sm">
            <Box
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
              }}
            >
              <IconTrendingUp size={20} color={rallyColors.blue} />
            </Box>
            <Box>
              <Text size="xs" c={rallyColors.textSecondary}>
                تعداد وام‌های تحلیل شده
              </Text>
              <Text size="xl" fw={700} c={rallyColors.textPrimary}>
                {allLoans?.length || 0}
              </Text>
            </Box>
          </Group>
        </Card>

        <Card padding="sm" radius="md" style={glassCard}>
          <Group gap="sm">
            <Box
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
              }}
            >
              <IconCurrencyDollar size={20} color={rallyColors.purple} />
            </Box>
            <Box>
              <Text size="xs" c={rallyColors.textSecondary}>
                محاسبات مالی
              </Text>
              <Text size="sm" fw={600} c={rallyColors.textSecondary}>
                IRR . MIRR . NPV
              </Text>
            </Box>
          </Group>
        </Card>

        <Card padding="sm" radius="md" style={glassCard}>
          <Group gap="sm">
            <Box
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
              }}
            >
              <IconCalculator size={20} color={rallyColors.green} />
            </Box>
            <Box>
              <Text size="xs" c={rallyColors.textSecondary}>
                توصیه هوشمند
              </Text>
              <Text size="sm" fw={600} c={rallyColors.textSecondary}>
                بهترین گزینه برای شما
              </Text>
            </Box>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Calculator Form */}
      {!showResults ? (
        <Card padding="lg" radius="md" style={glassCard}>
          <Title order={4} c={rallyColors.textPrimary} mb="lg">
            اطلاعات مالی خود را وارد کنید
          </Title>
          <Box p="md">
            <CalculatorForm inputs={inputs} onChange={setInputs} />
            <Group mt="lg">
              <Button
                onClick={handleCalculate}
                color="blue"
                fullWidth
              >
                محاسبه و توصیه بهترین وام
              </Button>
            </Group>
          </Box>
        </Card>
      ) : (
        <>
          <Group justify="space-between" align="center">
            <Title order={3} c={rallyColors.textPrimary}>
              نتایج تحلیل مالی
            </Title>
            <Button variant="outline" size="sm" onClick={handleReset}>
              محاسبه مجدد
            </Button>
          </Group>
          {results && <CalculatorResults results={results} inputs={inputs} />}
        </>
      )}
    </Stack>
  );
}

export default FinancialCalculator;
