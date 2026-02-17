/**
 * Loan Comparison Calculator
 * Compare multiple loan scenarios side-by-side
 */

import { useState } from 'react';
import {
  Card,
  Text,
  Title,
  Stack,
  SimpleGrid,
  Box,
  Button,
  TextInput,
  NumberInput,
} from '@mantine/core';
import { BarChartCard } from '@/components/loans/charts';
import { formatPersianAmount } from '@/utils/loans/persianNumber';
import { calculatePMT, AnnuityType } from '@/utils/loans/timeValueOfMoney';
import rallyColors from '@/theme/rallyColors';

interface LoanScenario {
  name: string;
  principal: number;
  rate: number;
  term: number;
}

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
};

export function LoanComparisonCalculator() {
  const [scenarios, setScenarios] = useState<LoanScenario[]>([
    { name: 'سناریو ۱', principal: 100_000_000, rate: 18, term: 60 },
    { name: 'سناریو ۲', principal: 100_000_000, rate: 20, term: 48 },
    { name: 'سناریو ۳', principal: 100_000_000, rate: 16, term: 72 },
  ]);
  const [showResults, setShowResults] = useState(false);

  // Use CFA-compliant payment calculation
  const calculatePayment = (scenario: LoanScenario) => {
    const monthlyRate = scenario.rate / 100 / 12;
    return calculatePMT(
      -scenario.principal,
      0,
      monthlyRate,
      scenario.term,
      AnnuityType.ORDINARY
    );
  };

  const comparisonData = scenarios.map((s) => {
    const payment = calculatePayment(s);
    return {
      name: s.name,
      قسط: Math.round(payment / 1_000_000),
      'مجموع پرداختی': Math.round((payment * s.term) / 1_000_000),
    };
  });

  return (
    <Stack gap="lg">
      <Card padding="lg" radius="md" style={glassCard}>
        <Title order={3} c={rallyColors.textPrimary} mb="lg">
          مقایسه سناریوهای وام
        </Title>

        <Stack gap="lg">
          {scenarios.map((scenario, index) => (
            <SimpleGrid
              key={index}
              cols={{ base: 1, md: 4 }}
              spacing="md"
              pb="md"
              style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}
            >
              <TextInput
                value={scenario.name}
                onChange={(e) => {
                  const newScenarios = [...scenarios];
                  newScenarios[index].name = e.target.value;
                  setScenarios(newScenarios);
                }}
                placeholder="نام سناریو"
                styles={inputStyles}
              />
              <NumberInput
                value={scenario.principal}
                onChange={(value) => {
                  const newScenarios = [...scenarios];
                  newScenarios[index].principal = Number(value);
                  setScenarios(newScenarios);
                }}
                placeholder="مبلغ"
                styles={inputStyles}
                hideControls
              />
              <NumberInput
                value={scenario.rate}
                onChange={(value) => {
                  const newScenarios = [...scenarios];
                  newScenarios[index].rate = Number(value);
                  setScenarios(newScenarios);
                }}
                placeholder="نرخ (%)"
                styles={inputStyles}
                hideControls
              />
              <NumberInput
                value={scenario.term}
                onChange={(value) => {
                  const newScenarios = [...scenarios];
                  newScenarios[index].term = Number(value);
                  setScenarios(newScenarios);
                }}
                placeholder="مدت (ماه)"
                styles={inputStyles}
                hideControls
              />
            </SimpleGrid>
          ))}
        </Stack>

        <Button
          onClick={() => setShowResults(true)}
          color="blue"
          fullWidth
          mt="lg"
        >
          مقایسه
        </Button>
      </Card>

      {showResults && (
        <>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            {scenarios.map((s, idx) => {
              const payment = calculatePayment(s);
              const total = payment * s.term;
              const interest = total - s.principal;

              return (
                <Card key={idx} padding="lg" radius="md" style={glassCard}>
                  <Title order={4} c={rallyColors.textPrimary} mb="md">
                    {s.name}
                  </Title>
                  <Stack gap="sm">
                    <Box>
                      <Text size="sm" c={rallyColors.textSecondary} component="span">
                        قسط ماهانه:{' '}
                      </Text>
                      <Text size="sm" fw={600} c={rallyColors.blue} component="span">
                        {formatPersianAmount(payment)}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c={rallyColors.textSecondary} component="span">
                        مجموع سود:{' '}
                      </Text>
                      <Text size="sm" fw={600} c="#ec4899" component="span">
                        {formatPersianAmount(interest)}
                      </Text>
                    </Box>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          <BarChartCard
            title="مقایسه قسط و مجموع پرداختی (میلیون تومان)"
            data={comparisonData}
            dataKey="قسط"
            height={350}
            color="#8b5cf6"
          />
        </>
      )}
    </Stack>
  );
}

export default LoanComparisonCalculator;
