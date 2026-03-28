import { useState } from 'react';
import { SimpleGrid, NumberInput, Text, Box, Group } from '@mantine/core';
import {
  IconFileInvoice,
  IconCash,
  IconReceipt,
  IconTrendingUp,
} from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyKPICard from '../../components/RallyKPICard';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RallyEmptyState from '../../components/RallyEmptyState';
import ExportButton from '../../components/ExportButton';
import { usePortfolios, usePortfolioAccounting } from '../../hooks/usePortfolioAPI';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';

export default function PortfolioTax() {
  const [year, setYear] = useState(1404);

  const { data: portfolios = [] } = usePortfolios();
  const defaultPortfolio = portfolios.find((p) => p.is_default) || portfolios[0];
  const portfolioId = defaultPortfolio?.id;

  const { data: accounting, isLoading } = usePortfolioAccounting(portfolioId);

  if (!portfolioId) {
    return (
      <>
        <PageHeader title="گزارش مالیاتی" />
        <RallyMainCard>
          <RallyEmptyState icon={IconFileInvoice} message="ابتدا وارد حساب کاربری شوید" />
        </RallyMainCard>
      </>
    );
  }

  const realized = Number(accounting?.total_realized_pnl || 0);
  const fees = Number(accounting?.total_fees || 0);
  const dividends = Number(accounting?.total_dividends || 0);
  const netTaxable = realized + dividends - fees;
  const perSymbol = accounting?.per_symbol || [];

  const columns = [
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 100,
      render: (r) => <Text size="sm" fw={600} c={rallyColors.blue}>{r.symbol}</Text>,
    },
    {
      accessor: 'realized_pnl',
      title: 'سود تحقق‌یافته',
      width: 130,
      textAlign: 'end',
      render: (r) => {
        const val = Number(r.realized_pnl);
        const color = val > 0 ? rallyColors.green : val < 0 ? rallyColors.red : 'dimmed';
        return <Text size="sm" fw={600} c={color}>{val > 0 ? '+' : ''}{formatNum(Math.round(val))}</Text>;
      },
    },
    {
      accessor: 'total_fees',
      title: 'کارمزد قابل کسر',
      width: 120,
      textAlign: 'end',
      render: (r) => <Text size="sm" c={rallyColors.yellow}>{formatNum(Math.round(Number(r.total_fees)))}</Text>,
    },
  ];

  const exportColumns = [
    { accessor: 'symbol', title: 'نماد' },
    { accessor: 'realized_pnl', title: 'سود تحقق‌یافته' },
    { accessor: 'total_fees', title: 'کارمزد' },
  ];

  return (
    <>
      <PageHeader title="گزارش مالیاتی">
        <Group gap="xs" align="flex-end">
          <NumberInput
            label="سال مالی"
            value={year}
            onChange={setYear}
            min={1390}
            max={1410}
            size="xs"
            style={{ width: 100 }}
          />
        </Group>
      </PageHeader>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="سود سرمایه‌ای"
            value={formatNum(Math.round(realized))}
            icon={IconTrendingUp}
            color={realized >= 0 ? rallyColors.green : rallyColors.red}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="سود نقدی"
            value={formatNum(Math.round(dividends))}
            icon={IconCash}
            color={rallyColors.purple}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="کارمزد قابل کسر"
            value={formatNum(Math.round(fees))}
            icon={IconReceipt}
            color={rallyColors.yellow}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="درآمد مشمول مالیات"
            value={formatNum(Math.round(netTaxable))}
            icon={IconFileInvoice}
            color={netTaxable >= 0 ? rallyColors.green : rallyColors.red}
          />
        </Box>
      </SimpleGrid>

      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <RallyMainCard
          title={`جزئیات مالیاتی — ${toPersianNum(String(year))}`}
          noPadding
          secondary={<ExportButton filename={`tax-report-${year}`} columns={exportColumns} records={perSymbol} />}
        >
          <RallyDataTable
            records={perSymbol}
            columns={columns}
            idAccessor="symbol"
            loading={isLoading}
            minHeight={200}
            emptyMessage="داده‌ای موجود نیست"
            storeColumnsKey="portfolio-tax"
          />
        </RallyMainCard>
      </Box>
    </>
  );
}
