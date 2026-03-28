import { useState } from 'react';
import { SimpleGrid, SegmentedControl, Text, Box, Group } from '@mantine/core';
import {
  IconCash,
  IconTrendingUp,
  IconReceipt,
  IconChartLine,
} from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyKPICard from '../../components/RallyKPICard';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RallyEmptyState from '../../components/RallyEmptyState';
import ExportButton from '../../components/ExportButton';
import WaterfallChart from './components/WaterfallChart';
import TWRRvsIRRCard from './components/TWRRvsIRRCard';
import {
  usePortfolios,
  usePortfolioAccounting,
  usePortfolioPerformance,
  usePortfolioHoldings,
} from '../../hooks/usePortfolioAPI';
import { formatNum, toPersianNum, formatPercent } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';

const PERIOD_OPTIONS = [
  { label: 'ماهانه', value: '1m' },
  { label: 'فصلی', value: '3m' },
  { label: 'سالانه', value: '1y' },
  { label: 'از ابتدا', value: 'all' },
];

export default function ProfitAndLoss() {
  const [period, setPeriod] = useState('all');

  const { data: portfolios = [] } = usePortfolios();
  const defaultPortfolio = portfolios.find((p) => p.is_default) || portfolios[0];
  const portfolioId = defaultPortfolio?.id;

  const { data: accounting, isLoading: accLoading } = usePortfolioAccounting(portfolioId);
  const { data: performance } = usePortfolioPerformance(portfolioId, period);
  const { data: holdings = [] } = usePortfolioHoldings(portfolioId);

  const totalCost = holdings.reduce((s, h) => s + Number(h.total_cost || 0), 0);

  if (!portfolioId) {
    return (
      <>
        <PageHeader title="سود و زیان" />
        <RallyMainCard>
          <RallyEmptyState
            icon={IconCash}
            message="ابتدا وارد حساب کاربری شوید"
          />
        </RallyMainCard>
      </>
    );
  }

  const realized = Number(accounting?.total_realized_pnl || 0);
  const fees = Number(accounting?.total_fees || 0);
  const dividends = Number(accounting?.total_dividends || 0);
  const twrr = performance?.twrr_annualized;
  const irr = performance?.irr;

  const perSymbol = accounting?.per_symbol || [];

  const columns = [
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 100,
      render: (r) => <Text size="sm" fw={600} c={rallyColors.blue}>{r.symbol}</Text>,
    },
    {
      accessor: 'remaining_quantity',
      title: 'موجودی',
      width: 100,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(Number(r.remaining_quantity))}</Text>,
    },
    {
      accessor: 'remaining_cost',
      title: 'بهای تمام‌شده',
      width: 130,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(Math.round(Number(r.remaining_cost)))}</Text>,
    },
    {
      accessor: 'realized_pnl',
      title: 'سود تحقق‌یافته',
      width: 130,
      textAlign: 'end',
      render: (r) => {
        const val = Number(r.realized_pnl);
        const color = val > 0 ? rallyColors.green : val < 0 ? rallyColors.red : 'dimmed';
        return (
          <Text size="sm" fw={600} c={color}>
            {val > 0 ? '+' : ''}{formatNum(Math.round(val))}
          </Text>
        );
      },
    },
    {
      accessor: 'total_fees',
      title: 'کارمزد',
      width: 100,
      textAlign: 'end',
      render: (r) => (
        <Text size="sm" c={rallyColors.yellow}>
          {formatNum(Math.round(Number(r.total_fees)))}
        </Text>
      ),
    },
  ];

  const exportColumns = [
    { accessor: 'symbol', title: 'نماد' },
    { accessor: 'remaining_quantity', title: 'موجودی' },
    { accessor: 'remaining_cost', title: 'بهای تمام‌شده' },
    { accessor: 'realized_pnl', title: 'سود تحقق‌یافته' },
    { accessor: 'total_fees', title: 'کارمزد' },
  ];

  return (
    <>
      <PageHeader title="سود و زیان">
        <SegmentedControl
          size="xs"
          data={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </PageHeader>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="سود تحقق‌یافته"
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
            title="TWRR (سالانه)"
            value={twrr != null ? formatPercent(twrr * 100, 1) : '—'}
            icon={IconChartLine}
            color={rallyColors.purple}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="IRR (سالانه)"
            value={irr != null ? formatPercent(irr * 100, 1) : '—'}
            icon={IconChartLine}
            color="#06b6d4"
          />
        </Box>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md"
        className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}
      >
        <WaterfallChart
          accounting={accounting}
          totalCost={totalCost}
          totalValue={totalCost + realized}
        />
        <TWRRvsIRRCard twrr={twrr} irr={irr} />
      </SimpleGrid>

      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
        <RallyMainCard
          title="سود و زیان به تفکیک نماد"
          noPadding
          secondary={
            <ExportButton filename="pnl-breakdown" columns={exportColumns} records={perSymbol} />
          }
        >
          <RallyDataTable
            records={perSymbol}
            columns={columns}
            idAccessor="symbol"
            loading={accLoading}
            minHeight={200}
            emptyMessage="داده‌ای موجود نیست"
            storeColumnsKey="portfolio-pnl"
          />
        </RallyMainCard>
      </Box>
    </>
  );
}
