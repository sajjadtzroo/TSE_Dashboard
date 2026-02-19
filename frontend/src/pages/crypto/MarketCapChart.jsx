import { SimpleGrid, Text } from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyBarChart from '../../components/charts/RallyBarChart';
import RallyPieChart, { RALLY_COLOR_SCALE } from '../../components/charts/RallyPieChart';
import PageHeader from '../../components/PageHeader';
import PageShell from '../../components/PageShell';
import { useCryptoGlobalStats, useCryptoMarket } from '../../hooks/useCryptoData';
import { toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';

export default function MarketCapChart() {
  const { data: globalStats, isLoading: globalLoading } = useCryptoGlobalStats();
  const { data: market = [], isLoading: marketLoading } = useCryptoMarket();

  const isLoading = globalLoading || marketLoading;

  const pieData = market
    .filter(c => c.market_cap_usd > 0)
    .sort((a, b) => b.market_cap_usd - a.market_cap_usd)
    .slice(0, 8)
    .map(c => ({ x: c.symbol, y: Math.round(c.market_cap_usd / 1e9) }));

  const volumeData = market
    .filter(c => c.volume_24h > 0)
    .sort((a, b) => b.volume_24h - a.volume_24h)
    .slice(0, 15)
    .map(c => ({ x: c.symbol, y: Math.round(c.volume_24h / 1e6) }));

  const dominanceData = [];
  if (globalStats?.btc_dominance_pct) dominanceData.push({ x: 'BTC', y: globalStats.btc_dominance_pct });
  if (globalStats?.eth_dominance_pct) dominanceData.push({ x: 'ETH', y: globalStats.eth_dominance_pct });
  const otherDom = 100 - (globalStats?.btc_dominance_pct || 0) - (globalStats?.eth_dominance_pct || 0);
  if (otherDom > 0) dominanceData.push({ x: 'سایر', y: Number(otherDom.toFixed(1)) });

  const skeleton = (
    <>
      <PageHeader title="ارزش بازار رمزارزها" />
      <RallyChartSkeleton height={400} />
    </>
  );

  return (
    <PageShell loading={isLoading} error={null} hasData={market.length > 0} skeleton={skeleton}>
      <RallyBreadcrumbs items={[{ label: 'رمزارزها', path: '/crypto' }, { label: 'ارزش بازار' }]} />
      <PageHeader title="ارزش بازار رمزارزها" />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
        <RallyMainCard title="توزیع ارزش بازار (میلیارد $)" fullscreenable>
          {pieData.length > 0 ? (
            <RallyPieChart
              data={pieData}
              colorScale={RALLY_COLOR_SCALE}
              centerLabel="ارزش کل"
              centerValue={globalStats?.total_market_cap_usd ? '$' + toPersianNum((globalStats.total_market_cap_usd / 1e12).toFixed(2)) + 'T' : '-'}
              height={300}
              width={300}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده‌ای موجود نیست</Text>
          )}
        </RallyMainCard>

        <RallyMainCard title="سلطه بازار" fullscreenable>
          {dominanceData.length > 0 ? (
            <RallyPieChart
              data={dominanceData}
              colorScale={[rallyColors.yellow, rallyColors.purple, rallyColors.blue]}
              centerLabel="BTC"
              centerValue={globalStats?.btc_dominance_pct ? toPersianNum(globalStats.btc_dominance_pct.toFixed(1)) + '%' : '-'}
              height={300}
              width={300}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده‌ای موجود نیست</Text>
          )}
        </RallyMainCard>
      </SimpleGrid>

      <RallyMainCard title="حجم معاملات ۲۴h (میلیون $)" fullscreenable>
        {volumeData.length > 0 ? (
          <RallyBarChart
            data={volumeData}
            barColor={rallyColors.blue}
            height={350}
            tooltipFormatter={d => `${d.x}: $${d.y}M`}
          />
        ) : (
          <Text c="dimmed" ta="center" py="xl">داده‌ای موجود نیست</Text>
        )}
      </RallyMainCard>
    </PageShell>
  );
}
