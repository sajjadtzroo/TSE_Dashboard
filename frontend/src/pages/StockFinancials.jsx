import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
} from '@mantine/core';
import { IconTableColumn, IconChartBar, IconMathFunction } from '@tabler/icons-react';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import RallyMainCard from '../components/RallyMainCard';
import PageHeader from '../components/PageHeader';
import DataFreshness from '../components/DataFreshness';
import { toPersianNum } from '../utils/formatUtils';
import useFinancialStatementsPage from './financials/useFinancialStatementsPage';
import { STATEMENT_TYPE_TABS, PERIOD_OPTIONS } from './financials/financialConfig';
import FinancialStatementsTable from './financials/FinancialStatementsTable';
import FinancialAnalysisPanel from './financials/FinancialAnalysisPanel';
import AnalysisTab from './financials/AnalysisTab';
import RatioTab from './financials/RatioTab';
import { useFinancialAnalysis } from '../hooks/useMarketData';
import rallyColors from '../theme/rallyColors';

export default function StockFinancials() {
  const {
    symbol,
    stmtType,
    setStmtType,
    periodMonths,
    setPeriodMonths,
    isAudited,
    setIsAudited,
    isConsolidated,
    setIsConsolidated,
    periods,
    rows,
    isLoading,
    lastUpdated,
    analysisData,
    ratioData,
    isRatioLoading,
  } = useFinancialStatementsPage();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'statements';

  function handleTabChange(value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'statements') {
        next.delete('tab');
      } else {
        next.set('tab', value);
      }
      return next;
    });
  }

  const [analysisResult, setAnalysisResult] = useState(null);
  const analysisMutation = useFinancialAnalysis(symbol);

  function handleAnalysis() {
    setAnalysisResult(null);
    analysisMutation.mutate(
      {
        statement_type: stmtType,
        ...(periodMonths && { period_months: Number(periodMonths) }),
        ...(isAudited && { is_audited: true }),
        ...(isConsolidated && { is_consolidated: true }),
      },
      { onSuccess: (data) => setAnalysisResult(data) },
    );
  }

  return (
    <>
      <RallyBreadcrumbs items={[
        { label: 'داشبورد', path: '/dashboard' },
        { label: symbol, path: `/dashboard/stock/${symbol}` },
        { label: 'صورت‌های مالی' },
      ]} />

      <PageHeader title={`صورت‌های مالی - ${symbol}`}>
        <Group gap="sm">
          <DataFreshness lastUpdated={lastUpdated} />
          {periods.length > 0 && (
            <Badge variant="light" color="blue" size="sm">
              {toPersianNum(periods.length)} دوره
            </Badge>
          )}
          <Button
            size="sm"
            variant="light"
            color="blue"
            loading={analysisMutation.isPending}
            onClick={handleAnalysis}
            style={{ background: 'rgba(41, 98, 255, 0.12)' }}
          >
            تحلیل هوشمند
          </Button>
        </Group>
      </PageHeader>

      {/* Filter toolbar — applies to all tabs */}
      <RallyMainCard mb="md">
        <Paper
          p="sm"
          radius="md"
          style={{ background: rallyColors.elevated }}
        >
          <Stack gap="xs">
            <Group gap="md" wrap="wrap" align="flex-end">
              <Stack gap={4}>
                <Text size="xs" c="dimmed">صورت مالی</Text>
                <Select
                  value={stmtType}
                  onChange={setStmtType}
                  data={STATEMENT_TYPE_TABS}
                  size="xs"
                  w={180}
                  styles={{
                    input: { background: rallyColors.card, borderColor: 'rgba(107,114,128,0.3)' },
                  }}
                />
              </Stack>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">دوره</Text>
                <SegmentedControl
                  value={periodMonths}
                  onChange={setPeriodMonths}
                  data={PERIOD_OPTIONS}
                  size="xs"
                />
              </Stack>
            </Group>
            <Group gap="lg">
              <Switch
                size="sm"
                label="حسابرسی‌شده فقط"
                checked={isAudited}
                onChange={(e) => setIsAudited(e.currentTarget.checked)}
                color="green"
              />
              <Switch
                size="sm"
                label="تلفیقی فقط"
                checked={isConsolidated}
                onChange={(e) => setIsConsolidated(e.currentTarget.checked)}
                color="green"
              />
            </Group>
          </Stack>
        </Paper>
      </RallyMainCard>

      {/* Three-tab panel */}
      <RallyMainCard noPadding>
        <Tabs value={activeTab} onChange={handleTabChange} keepMounted={false}>
          <Tabs.List px="sm" pt="xs">
            <Tabs.Tab value="statements" leftSection={<IconTableColumn size={14} />}>
              صورت‌های مالی
            </Tabs.Tab>
            <Tabs.Tab value="analysis" leftSection={<IconChartBar size={14} />}>
              تحلیل مقایسه‌ای
              <Badge size="xs" variant="light" color="blue" ml={4}>CFA L1</Badge>
            </Tabs.Tab>
            <Tabs.Tab value="ratios" leftSection={<IconMathFunction size={14} />}>
              نسبت‌های مالی
              <Badge size="xs" variant="light" color="orange" ml={4}>CFA L1/L2</Badge>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="statements">
            <FinancialStatementsTable
              periods={periods}
              rows={rows}
              isLoading={isLoading}
            />
          </Tabs.Panel>

          <Tabs.Panel value="analysis">
            <AnalysisTab
              analysisData={analysisData}
              periods={periods}
              stmtType={stmtType}
            />
          </Tabs.Panel>

          <Tabs.Panel value="ratios">
            <RatioTab
              ratioData={ratioData}
              isRatioLoading={isRatioLoading}
              symbol={symbol}
            />
          </Tabs.Panel>
        </Tabs>
      </RallyMainCard>

      {(analysisMutation.isPending || analysisResult) && (
        <FinancialAnalysisPanel
          isLoading={analysisMutation.isPending}
          result={analysisResult}
        />
      )}
    </>
  );
}
