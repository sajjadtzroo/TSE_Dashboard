/**
 * Financial Calculator Component
 * Analyzes loans and recommends best options based on user inputs
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Box,
  Button,
  CopyButton,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import { IconCalculator, IconTrendingUp, IconCurrencyDollar, IconShare, IconCheck } from '@tabler/icons-react';
import { useLoans } from '@/hooks/loans';
import { LoadingPage } from '@/components/loans/ui';
import rallyColors, { glassCard } from '@/theme/rallyColors';
import { CalculatorForm } from './CalculatorForm';
import { CalculatorResults } from './CalculatorResults';
import { analyzeLoan, rankLoans } from './calculatorEngine';
import type { CalculatorInputs, LoanAnalysis } from './types';

function inputsToParams(inputs: CalculatorInputs): string {
  const p = new URLSearchParams();
  p.set('da', String(inputs.depositAmount));
  p.set('dm', String(inputs.depositMonths));
  p.set('er', String(inputs.externalReturnRate));
  p.set('co', String(inputs.commission));
  p.set('lm', String(inputs.loanMonths));
  p.set('rt', inputs.riskTolerance);
  return p.toString();
}

function paramsToInputs(params: URLSearchParams): CalculatorInputs | null {
  const da = params.get('da');
  if (!da) return null;
  return {
    depositAmount: Number(da) || 100000000,
    depositMonths: Number(params.get('dm')) || 3,
    externalReturnRate: Number(params.get('er')) || 0.30,
    commission: Number(params.get('co')) || 5000000,
    loanMonths: Number(params.get('lm')) || 36,
    riskTolerance: (params.get('rt') as any) || 'medium',
  };
}

export function FinancialCalculator() {
  const { data: allLoans, isLoading } = useLoans();
  const [searchParams] = useSearchParams();

  const [inputs, setInputs] = useState<CalculatorInputs>(() => {
    const fromUrl = paramsToInputs(searchParams);
    return fromUrl || {
      depositAmount: 100000000,
      depositMonths: 3,
      externalReturnRate: 0.30,
      commission: 5000000,
      loanMonths: 36,
      riskTolerance: 'medium',
    };
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
                backgroundColor: 'rgba(41, 98, 255, 0.1)',
              }}
            >
              <IconCalculator size={20} color={rallyColors.primary} />
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
            <Group mt="lg" gap="xs">
              <Button
                onClick={handleCalculate}
                color="blue"
                style={{ flex: 1 }}
              >
                محاسبه و توصیه بهترین وام
              </Button>
              <CopyButton value={`${window.location.origin}/loans/calculator?${inputsToParams(inputs)}`}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'کپی شد!' : 'لینک اشتراک‌گذاری'}>
                    <ActionIcon size="lg" variant="light" color={copied ? 'green' : 'gray'} onClick={copy}>
                      {copied ? <IconCheck size={18} /> : <IconShare size={18} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
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
