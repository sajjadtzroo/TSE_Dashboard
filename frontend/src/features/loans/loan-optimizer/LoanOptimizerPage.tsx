/**
 * Loan Optimizer Page
 * Main page that assembles all optimizer components
 */

import React, { useState, useCallback } from 'react';
import { Box, Title, Text, Group, Stack, Loader, Alert } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import { toPersianNum } from '../../../utils/formatUtils';
import { useLoanOptimizer } from './hooks/useLoanOptimizer';
import OptimizerInputForm from './components/OptimizerInputForm';
import OptimizerMetricsCards from './components/OptimizerMetricsCards';
import OptimizerResultsTable from './components/OptimizerResultsTable';
import OptimizerFilters from './components/OptimizerFilters';
import OptimizerCharts from './components/OptimizerCharts';
import ScenarioComparison from './components/ScenarioComparison';
import type { OptimizerInputs } from './types';

const LoanOptimizerPage: React.FC = () => {
  const [inputs, setInputs] = useState<OptimizerInputs>({
    depositAmount: 10_000_000,
    depositMonths: 3,
    loanAmountNeeded: 50_000_000,
    discountRateMethod: 'capm',
    riskTolerance: 'medium',
    considerPrivilegePurchase: false,
  });

  const [showResults, setShowResults] = useState(false);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [onlySuitable, setOnlySuitable] = useState(false);
  const [expandedScenarios, setExpandedScenarios] = useState<boolean>(false);

  const { loans, loading, error } = useLoanOptimizer(inputs);

  // Initialize selected banks when loans load
  React.useEffect(() => {
    if (loans.length > 0 && selectedBanks.length === 0) {
      const uniqueBanks = Array.from(new Set(loans.map((l) => l.bankNameFA)));
      setSelectedBanks(uniqueBanks);
    }
  }, [loans, selectedBanks]);

  // Filter loans by selected banks
  const filteredLoans = React.useMemo(() => {
    if (selectedBanks.length === 0) {
      return loans;
    }
    return loans.filter((loan) => selectedBanks.includes(loan.bankNameFA));
  }, [loans, selectedBanks]);

  const handleCalculate = useCallback((newInputs: OptimizerInputs) => {
    setInputs(newInputs);
    setShowResults(true);
  }, []);

  return (
    <Box maw={1400} mx="auto" px="md" py="xl" dir="rtl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Stack gap={4}>
            <Title order={1} size="h2" fw={700} c={rallyColors.textPrimary}>
              بهینه‌ساز وام
            </Title>
            <Text c={rallyColors.textSecondary}>
              مقایسه جامع همه وام‌ها با معیارهای پیشرفته مالی
            </Text>
          </Stack>
          {loans.length > 0 && (
            <Box
              px="md"
              py="xs"
              style={{
                backgroundColor: 'rgba(187, 134, 252, 0.1)',
                borderRadius: 8,
                border: '1px solid rgba(187, 134, 252, 0.2)',
              }}
            >
              <Group gap="xs">
                <Text fw={600} size="lg" c="#BB86FC">
                  {loans.length.toLocaleString('fa-IR')}
                </Text>
                <Text size="sm" c="#BB86FC">
                  وام
                </Text>
              </Group>
            </Box>
          )}
        </Group>

        {/* Input Form */}
        <OptimizerInputForm onSubmit={handleCalculate} loading={loading} />

        {/* Error Message */}
        {error && (
          <Alert
            color="red"
            variant="light"
            styles={{
              root: {
                backgroundColor: 'rgba(207, 102, 121, 0.1)',
                border: '1px solid rgba(207, 102, 121, 0.2)',
                borderRadius: 8,
              },
              message: { color: '#CF6679' },
            }}
          >
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box
            p="xl"
            style={{
              backgroundColor: rallyColors.card,
              borderRadius: 8,
              border: `1px solid ${rallyColors.border}`,
            }}
          >
            <Stack align="center" gap="md">
              <Loader size="lg" color="violet" />
              <Text c={rallyColors.textSecondary}>
                در حال محاسبه و مقایسه وام‌ها...
              </Text>
            </Stack>
          </Box>
        )}

        {/* Results Section */}
        {showResults && !loading && loans.length > 0 && (
          <>
            {/* Summary Cards */}
            <OptimizerMetricsCards results={filteredLoans} />

            {/* Filters */}
            <OptimizerFilters
              results={loans}
              selectedBanks={selectedBanks}
              onSelectedBanksChange={setSelectedBanks}
              onlySuitable={onlySuitable}
              onOnlySuitableChange={setOnlySuitable}
            />

            {/* Scenario Analysis for Top Loans (if privilege analysis enabled) */}
            {inputs.considerPrivilegePurchase && filteredLoans.length > 0 && (
              <Box
                p="lg"
                style={{
                  backgroundColor: rallyColors.card,
                  borderRadius: 8,
                  border: `1px solid ${rallyColors.border}`,
                }}
              >
                <Group justify="space-between" mb="md">
                  <Title order={3} size="lg" fw={600} c={rallyColors.textPrimary}>
                    تحلیل جزئی 5 وام برتر
                  </Title>
                  <Text
                    component="button"
                    onClick={() => setExpandedScenarios(!expandedScenarios)}
                    size="sm"
                    c="#BB86FC"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {expandedScenarios ? 'بستن همه' : 'نمایش همه'}
                    <Box
                      style={{
                        transform: expandedScenarios ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        display: 'flex',
                      }}
                    >
                      <IconChevronDown size={16} />
                    </Box>
                  </Text>
                </Group>
                <Stack gap="md">
                  {filteredLoans.slice(0, 5).map((loan, index) => (
                    <details key={`${loan.loanId}-${loan.bankNameFA}-detail-${index}`} open={expandedScenarios}>
                      <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                        <Box
                          p="md"
                          style={{
                            backgroundColor: rallyColors.elevated,
                            borderRadius: 8,
                            border: `1px solid ${rallyColors.border}`,
                            transition: 'background-color 0.2s',
                          }}
                        >
                          <Group justify="space-between">
                            <Group gap="md">
                              <Text size="lg" fw={700} c="#BB86FC">
                                {index + 1}
                              </Text>
                              <Stack gap={2}>
                                <Text fw={600} c={rallyColors.textPrimary}>
                                  {loan.bankNameFA} - {loan.loanNameFA}
                                </Text>
                                <Text size="sm" c={rallyColors.textSecondary}>
                                  NPV: {toPersianNum((loan.npv / 1_000_000).toFixed(1))} م -- توصیه: {
                                    loan.recommendation === 'WAIT' ? 'منتظر بمانید' :
                                    loan.recommendation === 'BUY_PRIVILEGE' ? 'خرید امتیاز' :
                                    loan.recommendation === 'NEGOTIATE' ? 'مذاکره کنید' :
                                    'رد کنید'
                                  }
                                </Text>
                              </Stack>
                            </Group>
                            <Box style={{ color: rallyColors.textSecondary }}>
                              <IconChevronDown size={20} />
                            </Box>
                          </Group>
                        </Box>
                      </summary>
                      <Box mt="md">
                        <ScenarioComparison loan={loan} />
                      </Box>
                    </details>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Results Table */}
            <OptimizerResultsTable
              data={filteredLoans}
              onlySuitable={onlySuitable}
            />

            {/* Charts */}
            <OptimizerCharts data={filteredLoans} />
          </>
        )}

        {/* Empty State */}
        {showResults && !loading && loans.length === 0 && !error && (
          <Box
            p="xl"
            style={{
              backgroundColor: rallyColors.card,
              borderRadius: 8,
              border: `1px solid ${rallyColors.border}`,
              textAlign: 'center',
            }}
          >
            <Text size="lg" c={rallyColors.textSecondary}>
              هیچ وامی یافت نشد. لطفا پارامترهای ورودی را بررسی کنید.
            </Text>
          </Box>
        )}

        {/* Info Footer */}
        <Box
          p="md"
          style={{
            backgroundColor: rallyColors.card,
            borderRadius: 8,
            border: `1px solid ${rallyColors.border}`,
          }}
        >
          <Text size="sm" fw={600} c={rallyColors.textSecondary} mb="xs">
            راهنمای استفاده
          </Text>
          <Stack gap={4}>
            <Text size="xs" c={rallyColors.textSecondary}>* رنگ سبز: بهترین 10% وام‌ها</Text>
            <Text size="xs" c={rallyColors.textSecondary}>* رنگ قرمز: ضعیف‌ترین 10% وام‌ها</Text>
            <Text size="xs" c={rallyColors.textSecondary}>* رنگ خاکستری: وام‌های متوسط</Text>
            <Text size="xs" c={rallyColors.textSecondary}>* برای مرتب‌سازی روی عنوان ستون‌ها کلیک کنید</Text>
            <Text size="xs" c={rallyColors.textSecondary}>* CAPM: مدل قیمت‌گذاری دارایی سرمایه‌ای (برای محاسبه نرخ بازده مورد انتظار)</Text>
            <Text size="xs" c={rallyColors.textSecondary}>* WACC: میانگین موزون هزینه سرمایه (برای تنزیل ریسک‌آگاهانه)</Text>
            <Text size="xs" c={rallyColors.textSecondary}>* NPV: ارزش خالص فعلی (هرچه بیشتر، بهتر)</Text>
            <Text size="xs" c={rallyColors.textSecondary}>* IRR: نرخ بازده داخلی (هرچه بیشتر، بهتر)</Text>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default LoanOptimizerPage;
