import { SimpleGrid, Box } from '@mantine/core';
import {
  IconCurrencyBitcoin, IconCurrencyEthereum, IconChartBar, IconCrown,
  IconVolume, IconMoodSmile, IconTrendingUp, IconTrendingDown,
} from '@tabler/icons-react';
import RallyKPICard from '../../../components/RallyKPICard';
import KPICarousel from '../../../components/KPICarousel';
import rallyColors from '../../../theme/rallyColors';
import { FEAR_GREED_LABELS } from '../../../constants/crypto';
import animStyles from '../../../components/shared/animations.module.css';

export default function CryptoKPIGrid({ globalStats, market = [], movers = { gainers: [], losers: [] }, compact = false }) {
  const btc = market.find(c => c.symbol === 'BTC');
  const eth = market.find(c => c.symbol === 'ETH');
  const topGainer = movers.gainers?.[0];
  const topLoser = movers.losers?.[0];
  const fgValue = globalStats?.fear_greed_value;
  const fgLabel = globalStats?.fear_greed_label;

  const cards = [
    {
      title: 'BTC قیمت',
      value: btc ? '$' + Number(btc.last_price).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-',
      icon: IconCurrencyBitcoin,
      color: rallyColors.yellow,
      bgColor: rallyColors.yellow,
    },
    {
      title: 'ETH قیمت',
      value: eth ? '$' + Number(eth.last_price).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-',
      icon: IconCurrencyEthereum,
      color: rallyColors.purple,
      bgColor: rallyColors.purple,
    },
    {
      title: 'ارزش بازار',
      value: globalStats?.total_market_cap_usd ? '$' + (globalStats.total_market_cap_usd / 1e12).toFixed(2) + 'T' : '-',
      icon: IconChartBar,
      color: rallyColors.green,
      bgColor: rallyColors.green,
    },
    {
      title: 'سلطه BTC',
      value: globalStats?.btc_dominance_pct ? globalStats.btc_dominance_pct.toFixed(1) + '%' : '-',
      icon: IconCrown,
      color: rallyColors.yellow,
      bgColor: rallyColors.yellow,
    },
    {
      title: 'حجم ۲۴h',
      value: globalStats?.total_volume_24h_usd ? '$' + (globalStats.total_volume_24h_usd / 1e9).toFixed(1) + 'B' : '-',
      icon: IconVolume,
      color: rallyColors.blue,
      bgColor: rallyColors.blue,
    },
    {
      title: 'شاخص ترس/طمع',
      value: fgValue != null ? String(fgValue) : '-',
      subtitle: fgLabel ? (FEAR_GREED_LABELS[fgLabel] || fgLabel) : undefined,
      icon: IconMoodSmile,
      color: fgValue > 50 ? rallyColors.green : fgValue < 50 ? rallyColors.red : rallyColors.yellow,
      bgColor: fgValue > 50 ? rallyColors.green : fgValue < 50 ? rallyColors.red : rallyColors.yellow,
    },
    {
      title: 'بیشترین رشد',
      value: topGainer ? `${topGainer.symbol}: +${topGainer.price_change_pct_24h?.toFixed(1)}%` : '-',
      icon: IconTrendingUp,
      color: rallyColors.green,
      bgColor: rallyColors.green,
    },
    {
      title: 'بیشترین افت',
      value: topLoser ? `${topLoser.symbol}: ${topLoser.price_change_pct_24h?.toFixed(1)}%` : '-',
      icon: IconTrendingDown,
      color: rallyColors.red,
      bgColor: rallyColors.red,
    },
  ];

  if (compact) {
    return (
      <KPICarousel>
        {cards.map((c, i) => (
          <RallyKPICard key={i} title={c.title} value={c.value} icon={c.icon} color={c.color} bgColor={c.bgColor} compact animateValue />
        ))}
      </KPICarousel>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 8 }} spacing={{ base: 'sm', md: 'md' }} mb="md">
      {cards.map((c, i) => (
        <Box key={i} className={animStyles.cardEnter} h="100%">
          <RallyKPICard title={c.title} value={c.value} icon={c.icon} color={c.color} bgColor={c.bgColor} subtitle={c.subtitle} animateValue />
        </Box>
      ))}
    </SimpleGrid>
  );
}
