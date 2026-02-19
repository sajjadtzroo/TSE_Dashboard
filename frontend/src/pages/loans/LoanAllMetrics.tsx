/**
 * LoanAllMetrics Page — /loans/all-metrics
 * Runs financial analysis (IRR, MIRR, NPV, EAR, opportunity cost, score)
 * across all loan products fetched from the API and presents a sortable
 * comparison table with top-3 highlight cards.
 */

import React, { useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Center,
  Loader,
  Stack,
  Text,
  Title,
  Group,
} from '@mantine/core';
import { IconChartBar, IconReportAnalytics } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import rallyColors from '../../theme/rallyColors';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';
import { loansService } from '../../services/loans/loans.service';
import AllMetricsInputForm from '../../features/loans/allAnalysis/AllMetricsInputForm';
import AllMetricsTopCards from '../../features/loans/allAnalysis/AllMetricsTopCards';
import AllMetricsTable from '../../features/loans/allAnalysis/AllMetricsTable';
import {
  analyzeAllLoans,
  type AnalysisInputs,
  type LoanAnalysisResult,
} from '../../features/loans/allAnalysis/loanAnalysisEngine';

const LoanAllMetrics: React.FC = () => {
  const [results, setResults] = useState<LoanAnalysisResult[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Fetch all loan products on mount (background, no loading spinner for page)
  const {
    data: loans = [],
    isLoading: loansLoading,
    error: loansError,
  } = useQuery({
    queryKey: ['loans', 'all'],
    queryFn: () => loansService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = useCallback(
    (inputs: AnalysisInputs) => {
      if (!loans.length) return;
      setCalculating(true);
      // Use setTimeout to let the UI update before the sync computation
      setTimeout(() => {
        try {
          const analysisResults = analyzeAllLoans(loans, inputs);
          setResults(analysisResults);
          setCalculated(true);
        } catch (err) {
          console.error('Error analyzing loans:', err);
        } finally {
          setCalculating(false);
        }
      }, 0);
    },
    [loans],
  );

  return (
    <Box maw={1400} mx="auto" px="md" py="xl" dir="rtl">
      <Stack gap="lg">
        {/* Breadcrumbs */}
        <RallyBreadcrumbs
          items={[
            { label: 'وام‌ها', path: '/loans' },
            { label: 'تحلیل مالی کامل' },
          ]}
        />

        {/* Header */}
        <Group justify="space-between" align="center">
          <Stack gap={4}>
            <Group gap="sm">
              <Box
                p="xs"
                style={{ backgroundColor: 'rgba(187, 134, 252, 0.1)', borderRadius: 8 }}
              >
                <IconReportAnalytics size={24} color="#BB86FC" />
              </Box>
              <Title order={2} fw={700} c={rallyColors.textPrimary}>
                تحلیل مالی همه وام‌ها
              </Title>
            </Group>
            <Text c={rallyColors.textSecondary} size="sm">
              مقایسه IRR، NPV، MIRR، نرخ موثر و امتیاز توصیه برای همه وام‌های موجود
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
                <Text size="sm" c="#BB86FC">وام</Text>
              </Group>
            </Box>
          )}
        </Group>

        {/* Loans loading error */}
        {loansError && (
          <Alert color="red" variant="light">
            خطا در دریافت اطلاعات وام‌ها. لطفاً صفحه را مجدداً بارگذاری کنید.
          </Alert>
        )}

        {/* Input Form */}
        <AllMetricsInputForm
          onSubmit={handleSubmit}
          loading={calculating || loansLoading}
        />

        {/* Calculating spinner */}
        {calculating && (
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
                در حال محاسبه تحلیل مالی برای {loans.length} وام…
              </Text>
            </Stack>
          </Box>
        )}

        {/* Results */}
        {calculated && !calculating && (
          <>
            {results.length > 0 ? (
              <>
                {/* Top 3 highlight cards */}
                <AllMetricsTopCards results={results} />

                {/* Full sortable table */}
                <AllMetricsTable results={results} />

                {/* Legend */}
                <Box
                  p="md"
                  style={{
                    backgroundColor: rallyColors.card,
                    borderRadius: 8,
                    border: `1px solid ${rallyColors.border}`,
                  }}
                >
                  <Text size="sm" fw={600} c={rallyColors.textSecondary} mb="xs">
                    راهنما
                  </Text>
                  <Stack gap={2}>
                    <Text size="xs" c={rallyColors.textSecondary}>
                      * IRR (نرخ بازده داخلی): هرچه بیشتر، بهتر
                    </Text>
                    <Text size="xs" c={rallyColors.textSecondary}>
                      * NPV (ارزش خالص فعلی): هرچه بیشتر، بهتر
                    </Text>
                    <Text size="xs" c={rallyColors.textSecondary}>
                      * MIRR (نرخ بازده داخلی اصلاح‌شده): معیار دقیق‌تر IRR
                    </Text>
                    <Text size="xs" c={rallyColors.textSecondary}>
                      * نرخ موثر (EAR): نرخ سود سالانه واقعی با احتساب مرکب‌شدن ماهانه
                    </Text>
                    <Text size="xs" c={rallyColors.textSecondary}>
                      * امتیاز: معیار ترکیبی ۰–۱۰۰ برای مقایسه کلی
                    </Text>
                    <Text size="xs" c={rallyColors.textSecondary}>
                      * ستون ضامن: ✓ = ضامن لازم دارد، ✗ = بدون ضامن
                    </Text>
                  </Stack>
                </Box>
              </>
            ) : (
              /* Empty results */
              <Box
                p="xl"
                style={{
                  backgroundColor: rallyColors.card,
                  borderRadius: 8,
                  border: `1px solid ${rallyColors.border}`,
                  textAlign: 'center',
                }}
              >
                <Text c={rallyColors.textSecondary}>
                  هیچ وامی برای تحلیل یافت نشد. پارامترهای ورودی را بررسی کنید.
                </Text>
              </Box>
            )}
          </>
        )}

        {/* Pre-calculation empty state */}
        {!calculated && !calculating && (
          <Box
            p="xl"
            style={{
              backgroundColor: rallyColors.card,
              borderRadius: 8,
              border: `1px solid ${rallyColors.border}`,
            }}
          >
            <Center>
              <Stack align="center" gap="md">
                <IconChartBar size={48} stroke={1} color={rallyColors.textDimmed} />
                <Text size="lg" c={rallyColors.textSecondary}>
                  پارامترهای بالا را وارد کنید و «محاسبه» را بزنید
                </Text>
                <Text size="sm" c={rallyColors.textDimmed}>
                  نتایج تحلیل مالی همه وام‌ها در اینجا نمایش داده می‌شود
                </Text>
              </Stack>
            </Center>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default LoanAllMetrics;
