import { useMemo } from 'react';
import { SimpleGrid, Box } from '@mantine/core';
import {
  MarketCapIcon, DominanceIcon,
  VolumeIcon, FearGreedIcon, GainerIcon, LoserIcon,
} from '../../../components/icons/KPIIcons';
import RallyKPICard from '../../../components/RallyKPICard';
import CryptoIcon from '../../../components/CryptoIcon';
import KPICarousel from '../../../components/KPICarousel';
import animStyles from '../../../components/shared/animations.module.css';
import rallyColors from '../../../theme/rallyColors';
import { toPersianNum } from '../../../utils/formatUtils';
import { FEAR_GREED_LABELS } from '../../../constants/crypto';
import { useFearGreedHistory } from '../../../hooks/useCryptoData';
import { useWidgetSize } from '../../../core/context/WidgetSizeContext';

function FearGreedSparkline({ data }) {
  if (!data?.length) return null;
  const values = data.map(d => d.value).filter(v => v != null);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const h = 24;
  const w = 80;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  const lastColor = values[values.length - 1] > 50 ? rallyColors.green : values[values.length - 1] < 50 ? rallyColors.red : rallyColors.yellow;
  return (
    <svg width={w} height={h} style={{ display: 'block', marginTop: 4 }}>
      <polyline points={points} fill="none" stroke={lastColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
    </svg>
  );
}

export default function CryptoKPIGrid({ globalStats, market = [], movers = { gainers: [], losers: [] }, compact = false }) {
  const { density } = useWidgetSize();
  const isCompact = compact || density === 'compact';
  const { data: fgHistory } = useFearGreedHistory(30);
  const btc = market.find(c => c.symbol === 'BTC');
  const eth = market.find(c => c.symbol === 'ETH');
  const topGainer = movers.gainers?.[0];
  const topLoser = movers.losers?.[0];
  const fgValue = globalStats?.fear_greed_value;
  const fgLabel = globalStats?.fear_greed_label;

  // Wrap CryptoIcon as a Tabler-compatible icon component
  const BtcIcon = (props) => <CryptoIcon symbol="BTC" size={props.size || 20} />;
  const EthIcon = (props) => <CryptoIcon symbol="ETH" size={props.size || 20} />;

  const cards = [
    {
      title: 'BTC قیمت',
      value: btc ? '$' + toPersianNum(Number(btc.last_price).toLocaleString(undefined, { maximumFractionDigits: 0 })) : '-',
      icon: BtcIcon,
      color: '#F7931A',
      bgColor: '#F7931A',
    },
    {
      title: 'ETH قیمت',
      value: eth ? '$' + toPersianNum(Number(eth.last_price).toLocaleString(undefined, { maximumFractionDigits: 0 })) : '-',
      icon: EthIcon,
      color: '#627EEA',
      bgColor: '#627EEA',
    },
    {
      title: 'ارزش بازار',
      value: globalStats?.total_market_cap_usd ? '$' + toPersianNum((globalStats.total_market_cap_usd / 1e12).toFixed(2)) + 'T' : '-',
      icon: MarketCapIcon,
      color: rallyColors.primary,
      bgColor: rallyColors.primary,
    },
    {
      title: 'سلطه BTC',
      value: globalStats?.btc_dominance_pct ? toPersianNum(globalStats.btc_dominance_pct.toFixed(1)) + '%' : '-',
      icon: DominanceIcon,
      color: rallyColors.yellow,
      bgColor: rallyColors.yellow,
    },
    {
      title: 'حجم ۲۴h',
      value: globalStats?.total_volume_24h_usd ? '$' + toPersianNum((globalStats.total_volume_24h_usd / 1e9).toFixed(1)) + 'B' : '-',
      icon: VolumeIcon,
      color: rallyColors.blue,
      bgColor: rallyColors.blue,
    },
    {
      title: 'شاخص ترس/طمع',
      value: fgValue != null ? toPersianNum(String(fgValue)) : '-',
      subtitle: fgLabel ? (FEAR_GREED_LABELS[fgLabel] || fgLabel) : undefined,
      icon: FearGreedIcon,
      color: fgValue > 50 ? rallyColors.green : fgValue < 50 ? rallyColors.red : rallyColors.yellow,
      bgColor: fgValue > 50 ? rallyColors.green : fgValue < 50 ? rallyColors.red : rallyColors.yellow,
      extra: <FearGreedSparkline data={fgHistory} />,
    },
    {
      title: 'بیشترین رشد',
      value: topGainer ? `${topGainer.symbol}: +${toPersianNum(topGainer.price_change_pct_24h?.toFixed(1))}%` : '-',
      icon: GainerIcon,
      color: rallyColors.primary,
      bgColor: rallyColors.primary,
    },
    {
      title: 'بیشترین افت',
      value: topLoser ? `${topLoser.symbol}: ${toPersianNum(topLoser.price_change_pct_24h?.toFixed(1))}%` : '-',
      icon: LoserIcon,
      color: rallyColors.red,
      bgColor: rallyColors.red,
    },
  ];

  if (isCompact) {
    return (
      <KPICarousel>
        {cards.map((c, i) => (
          <RallyKPICard key={i} title={c.title} value={c.value} icon={c.icon} color={c.color} bgColor={c.bgColor} compact animateValue />
        ))}
      </KPICarousel>
    );
  }

  return (
    <Box className={animStyles.sectionEnter}>
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 8 }} spacing={{ base: 'sm', md: 'md' }} mb="md">
        {cards.map((c, i) => (
          <Box key={i}>
            <RallyKPICard title={c.title} value={c.value} icon={c.icon} color={c.color} bgColor={c.bgColor} subtitle={c.subtitle} animateValue>
              {c.extra}
            </RallyKPICard>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
