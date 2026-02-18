import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, SimpleGrid } from '@mantine/core';
import PageHeader from '../../components/PageHeader';
import PageShell from '../../components/PageShell';
import RallyKPISkeleton from '../../components/RallyKPISkeleton';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import CoinChartSection from './coin/CoinChartSection';
import CoinInfoSidebar from './coin/CoinInfoSidebar';
import useCoinDetailData from '../../hooks/useCoinDetailData';

export default function CoinDetail() {
  const { symbol } = useParams();
  const [interval, setInterval] = useState('1day');
  const { detail, history, isLoading, isError } = useCoinDetailData(symbol, { interval });

  const skeleton = (
    <>
      <PageHeader title={symbol} />
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
        {[1, 2, 3, 4].map(i => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <RallyChartSkeleton height={400} />
    </>
  );

  return (
    <PageShell
      loading={isLoading}
      error={isError ? 'خطا در بارگذاری داده‌ها' : null}
      hasData={!!detail}
      skeleton={skeleton}
    >
      <PageHeader title={`${detail?.name_fa || symbol} (${symbol})`} />

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <CoinChartSection
            symbol={symbol}
            history={history}
            interval={interval}
            onIntervalChange={setInterval}
            detail={detail}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <CoinInfoSidebar detail={detail} symbol={symbol} />
        </Grid.Col>
      </Grid>
    </PageShell>
  );
}
