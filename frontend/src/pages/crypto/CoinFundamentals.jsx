import { Badge, Group, SegmentedControl } from '@mantine/core';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';
import RallyMainCard from '../../components/RallyMainCard';
import PageHeader from '../../components/PageHeader';
import { toPersianNum } from '../../utils/formatUtils';
import useCoinFundamentalsPage from './fundamentals/useCoinFundamentalsPage';
import { WINDOW_OPTIONS } from './fundamentals/cryptoFundamentalsConfig';
import CoinIntroSection from './fundamentals/CoinIntroSection';
import CoinLiveMarketSection from './fundamentals/CoinLiveMarketSection';
import CoinHistoricalSection from './fundamentals/CoinHistoricalSection';
import CoinWhaleDetectionSection from './fundamentals/CoinWhaleDetectionSection';
import CoinFundamentalsTableSection from './fundamentals/CoinFundamentalsTableSection';

export default function CoinFundamentals() {
  const {
    symbol,
    windowMonths,
    setWindowMonths,
    monthMetrics,
    periods,
    rows,
    isLoading,
  } = useCoinFundamentalsPage();

  return (
    <>
      <RallyBreadcrumbs items={[
        { label: 'رمزارز', path: '/crypto' },
        { label: symbol, path: `/crypto/coin/${symbol}` },
        { label: 'شاخص‌های بنیادی' },
      ]} />

      <PageHeader title={`شاخص‌های بنیادی - ${symbol}`}>
        {periods.length > 0 && (
          <Badge variant="light" color="blue" size="sm">
            {toPersianNum(periods.length)} ماه
          </Badge>
        )}
      </PageHeader>

      <RallyMainCard mb="md">
        <Group gap="md" wrap="wrap">
          <SegmentedControl
            value={windowMonths}
            onChange={setWindowMonths}
            data={WINDOW_OPTIONS}
            size="xs"
          />
        </Group>
      </RallyMainCard>

      <CoinIntroSection symbol={symbol} />
      <CoinLiveMarketSection symbol={symbol} />
      <CoinHistoricalSection monthMetrics={monthMetrics} />
      <CoinWhaleDetectionSection monthMetrics={monthMetrics} />
      <CoinFundamentalsTableSection periods={periods} rows={rows} isLoading={isLoading} />
    </>
  );
}
