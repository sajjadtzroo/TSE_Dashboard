/**
 * Calculator Layout - Main container for all calculators
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Title,
  Text,
  Stack,
  SimpleGrid,
  Box,
  UnstyledButton,
} from '@mantine/core';
import {
  IconCalculator,
  IconGitCompare,
  IconCurrencyDollar,
  IconTrendingDown,
  IconTrendingUp,
  IconWallet,
  IconActivity,
} from '@tabler/icons-react';
import rallyColors from '@/theme/rallyColors';
import { LoanPaymentCalculator } from './LoanPaymentCalculator';
import { LoanComparisonCalculator } from './LoanComparisonCalculator';
import { AffordabilityCalculator } from './AffordabilityCalculator';
import { RefinanceCalculator } from './RefinanceCalculator';
import { EarlyPayoffCalculator } from './EarlyPayoffCalculator';
import { InvestmentCalculator } from './InvestmentCalculator';
import { AdvancedFinancialCalculator } from './AdvancedFinancialCalculator';

type CalculatorType =
  | 'payment'
  | 'comparison'
  | 'affordability'
  | 'refinance'
  | 'early-payoff'
  | 'investment'
  | 'advanced';

const CALCULATORS = [
  {
    id: 'payment' as CalculatorType,
    label: 'محاسبه قسط وام',
    icon: IconCalculator,
    description: 'محاسبه قسط ماهانه و جدول بازپرداخت',
  },
  {
    id: 'comparison' as CalculatorType,
    label: 'مقایسه سناریوها',
    icon: IconGitCompare,
    description: 'مقایسه چند سناریوی وام',
  },
  {
    id: 'affordability' as CalculatorType,
    label: 'توان پرداخت',
    icon: IconCurrencyDollar,
    description: 'محاسبه حداکثر وام قابل دریافت',
  },
  {
    id: 'refinance' as CalculatorType,
    label: 'تحلیل بازپرداخت مجدد',
    icon: IconTrendingDown,
    description: 'تحلیل صرفه‌جویی از بازپرداخت',
  },
  {
    id: 'early-payoff' as CalculatorType,
    label: 'پرداخت زودتر',
    icon: IconTrendingUp,
    description: 'تأثیر پرداخت اضافی بر وام',
  },
  {
    id: 'investment' as CalculatorType,
    label: 'بازده سرمایه‌گذاری',
    icon: IconWallet,
    description: 'محاسبه سود مرکب و بازده',
  },
  {
    id: 'advanced' as CalculatorType,
    label: 'تحلیل مالی پیشرفته (CFA)',
    icon: IconActivity,
    description: 'CAPM، WACC، و تحلیل جریان نقدی آزاد',
  },
];

const isValidCalculatorType = (type: string | undefined): type is CalculatorType => {
  return CALCULATORS.some((calc) => calc.id === type);
};

export function CalculatorLayout() {
  const { type } = useParams<{ type?: string }>();
  const navigate = useNavigate();

  // Initialize from URL param or default to 'payment'
  const initialCalculator = isValidCalculatorType(type) ? type : 'payment';
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>(initialCalculator);

  // Sync state with URL param
  useEffect(() => {
    if (isValidCalculatorType(type)) {
      setActiveCalculator(type);
    }
  }, [type]);

  // Update URL when calculator changes
  const handleCalculatorChange = (calcType: CalculatorType) => {
    setActiveCalculator(calcType);
    navigate(`/calculators/${calcType}`, { replace: true });
  };

  return (
    <Box maw={1200} mx="auto" px="md" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Box mb="md">
          <Title order={1} c={rallyColors.textPrimary} mb="xs">
            ماشین‌حساب‌های مالی
          </Title>
          <Text c={rallyColors.textSecondary}>
            ابزارهای محاسبه و تحلیل وام و سرمایه‌گذاری
          </Text>
        </Box>

        {/* Calculator Selection */}
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          {CALCULATORS.map((calc) => {
            const Icon = calc.icon;
            const isActive = activeCalculator === calc.id;

            return (
              <UnstyledButton
                key={calc.id}
                onClick={() => handleCalculatorChange(calc.id)}
                style={{
                  padding: 24,
                  borderRadius: 12,
                  border: `2px solid ${
                    isActive ? rallyColors.blue : rallyColors.glassBorder
                  }`,
                  backgroundColor: isActive
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'transparent',
                  textAlign: 'right',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <Box style={{ position: 'relative' }}>
                  <Box
                    mb="sm"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: isActive
                          ? 'rgba(59, 130, 246, 0.2)'
                          : rallyColors.bg,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Icon
                        size={24}
                        color={isActive ? rallyColors.blue : rallyColors.textSecondary}
                        style={{ transition: 'color 0.2s ease' }}
                      />
                    </Box>

                    {isActive && (
                      <Box
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: rallyColors.blue,
                        }}
                      />
                    )}
                  </Box>

                  <Text
                    fw={600}
                    size="md"
                    mb="xs"
                    c={isActive ? rallyColors.textPrimary : rallyColors.textSecondary}
                    style={{ transition: 'color 0.2s ease' }}
                  >
                    {calc.label}
                  </Text>

                  <Text size="xs" c={rallyColors.textSecondary} lh={1.6}>
                    {calc.description}
                  </Text>
                </Box>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>

        {/* Calculator Content */}
        <Box>
          {activeCalculator === 'payment' && <LoanPaymentCalculator />}
          {activeCalculator === 'comparison' && <LoanComparisonCalculator />}
          {activeCalculator === 'affordability' && <AffordabilityCalculator />}
          {activeCalculator === 'refinance' && <RefinanceCalculator />}
          {activeCalculator === 'early-payoff' && <EarlyPayoffCalculator />}
          {activeCalculator === 'investment' && <InvestmentCalculator />}
          {activeCalculator === 'advanced' && <AdvancedFinancialCalculator />}
        </Box>
      </Stack>
    </Box>
  );
}

export default CalculatorLayout;
