import { useState, useMemo } from 'react';
import { Badge, Box, Collapse, Group, Text, SegmentedControl, ActionIcon, Select } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyChartSkeleton from '../../../components/RallyChartSkeleton';
import RallyAreaChart from '../../../components/charts/RallyAreaChart';
import { useCryptoHistory } from '../../../hooks/useCryptoData';
import { CRYPTO_TIMEFRAMES } from '../../../constants/crypto';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { toPersianNum } from '../../../utils/formatUtils';

const RANGE_MAP = { '24h': { interval: '1hour', limit: 24 }, '7d': { interval: '4hour', limit: 42 }, '30d': { interval: '1day', limit: 30 }, '90d': { interval: '1day', limit: 90 }, '1y': { interval: '1day', limit: 365 } };

export default function CryptoBTCIndexSection({ market = [] }) {
  const [symbol, setSymbol] = useState('BTC');
  const [range, setRange] = useState('30d');
  const [expanded, setExpanded] = useLocalStorage({ key: 'crypto-section-btc-index', defaultValue: true });
  const cfg = RANGE_MAP[range] || RANGE_MAP['30d'];
  const { data: history = [], isLoading } = useCryptoHistory(symbol, { interval: cfg.interval, limit: cfg.limit });

  const coin = market.find(c => c.symbol === symbol);
  const change = coin?.price_change_pct_24h;

  const coinOptions = useMemo(() =>
    market
      .filter(c => c.symbol !== 'USDT' && c.symbol !== 'USDC')
      .map(c => ({ value: c.symbol, label: `${c.name_fa || c.symbol} (${c.symbol})` })),
    [market]
  );

  const chartData = history.map(h => ({
    x: h.open_time?.slice(0, 10) || '',
    y: Number(h.close),
  }));

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
      <RallyMainCard
        title={
          <Group gap="xs">
            <Text>روند قیمت {coin?.name_fa || symbol}</Text>
            {change != null && (
              <Badge color={change >= 0 ? 'green' : 'red'} variant="light">
                {change >= 0 ? '+' : ''}{toPersianNum(change?.toFixed(2))}%
              </Badge>
            )}
          </Group>
        }
        secondary={
          <Group gap="xs">
            <Select
              value={symbol}
              onChange={setSymbol}
              data={coinOptions}
              size="xs"
              searchable
              w={180}
              placeholder="انتخاب ارز"
              styles={{ input: { direction: 'rtl' } }}
            />
            <SegmentedControl
              value={range}
              onChange={setRange}
              data={CRYPTO_TIMEFRAMES.map(t => ({ label: t.label, value: t.value }))}
              size="xs"
            />
            <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm" aria-label={expanded ? 'بستن بخش' : 'باز کردن بخش'}>
              <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </ActionIcon>
          </Group>
        }
        fullscreenable
        mb="md"
      >
        <Collapse in={expanded}>
          {isLoading ? (
            <RallyChartSkeleton height={200} />
          ) : chartData.length > 0 ? (
            <RallyAreaChart data={chartData} fillColor={rallyColors.yellow} height={200} zoomable yFormatter={v => '$' + toPersianNum(v.toLocaleString())} />
          ) : (
            <ChartEmptyState height={200} message="داده قیمتی موجود نیست" />
          )}
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
