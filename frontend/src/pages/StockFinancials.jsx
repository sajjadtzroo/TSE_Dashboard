import { Badge, Group, SegmentedControl } from '@mantine/core';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import RallyMainCard from '../components/RallyMainCard';
import PageHeader from '../components/PageHeader';
import DataFreshness from '../components/DataFreshness';
import { toPersianNum } from '../utils/formatUtils';
import useFinancialStatementsPage from './financials/useFinancialStatementsPage';
import { STATEMENT_TYPE_TABS, PERIOD_OPTIONS } from './financials/financialConfig';
import FinancialStatementsTable from './financials/FinancialStatementsTable';

export default function StockFinancials() {
  const {
    symbol,
    stmtType,
    setStmtType,
    periodMonths,
    setPeriodMonths,
    periods,
    rows,
    isLoading,
    lastUpdated,
  } = useFinancialStatementsPage();

  return (
    <>
      <RallyBreadcrumbs items={[
        { label: 'داشبورد', path: '/dashboard' },
        { label: symbol, path: `/dashboard/stock/${symbol}` },
        { label: 'صورت‌های مالی' },
      ]} />

      <PageHeader title={`صورت‌های مالی - ${symbol}`}>
        <DataFreshness lastUpdated={lastUpdated} />
        {periods.length > 0 && (
          <Badge variant="light" color="blue" size="sm">
            {toPersianNum(periods.length)} دوره
          </Badge>
        )}
      </PageHeader>

      <RallyMainCard mb="md">
        <Group gap="md" wrap="wrap" mb="sm">
          <SegmentedControl
            value={stmtType}
            onChange={setStmtType}
            data={STATEMENT_TYPE_TABS}
            size="xs"
          />
          <SegmentedControl
            value={periodMonths}
            onChange={setPeriodMonths}
            data={PERIOD_OPTIONS}
            size="xs"
          />
        </Group>
      </RallyMainCard>

      <RallyMainCard noPadding>
        <FinancialStatementsTable
          periods={periods}
          rows={rows}
          isLoading={isLoading}
        />
      </RallyMainCard>
    </>
  );
}
