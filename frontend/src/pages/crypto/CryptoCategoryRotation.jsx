import { useMemo, useState } from 'react';
import { SimpleGrid, SegmentedControl, Text, Box, Group, Table, ScrollArea } from '@mantine/core';
import {
  IconTrendingUp, IconTrendingDown, IconChartBar, IconFlame,
} from '@tabler/icons-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import PageHeader from '../../components/PageHeader';
import RallyKPICard from '../../components/RallyKPICard';
import RallyMainCard from '../../components/RallyMainCard';
import ChartTooltipV2 from '../../components/charts/shared/ChartTooltipV2';
import { useCryptoMarket } from '../../hooks/useCryptoData';
import { CRYPTO_CATEGORIES, CRYPTO_CATEGORY_LABELS, getCryptoCategory } from '../../constants/crypto';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import { GRID_STROKE, axisTick } from '../../components/charts/shared/chartStyles';
import animStyles from '../../components/shared/animations.module.css';

function catColor(avgChange) {
  if (avgChange >= 3) return '#F59E0B';
  if (avgChange >= 1) return `${rallyColors.green}aa`;
  if (avgChange >= 0) return `${rallyColors.green}66`;
  if (avgChange >= -1) return `${rallyColors.red}66`;
  if (avgChange >= -3) return `${rallyColors.red}aa`;
  return rallyColors.red;
}

const SORT_OPTIONS = [
  { label: 'بازده', value: 'change' },
  { label: 'حجم', value: 'volume' },
  { label: 'ارزش بازار', value: 'mcap' },
];

export default function CryptoCategoryRotation() {
  const [sortBy, setSortBy] = useState('change');
  const { data: market = [] } = useCryptoMarket();

  const categories = useMemo(() => {
    if (!market.length) return [];

    const catMap = {};
    for (const coin of market) {
      const cat = getCryptoCategory(coin.symbol);
      if (!cat) continue;
      if (!catMap[cat]) {
        catMap[cat] = { name: CRYPTO_CATEGORY_LABELS[cat] || cat, key: cat, coins: [], totalVolume: 0, totalMcap: 0 };
      }
      catMap[cat].coins.push(coin);
      catMap[cat].totalVolume += coin.volume_24h || 0;
      catMap[cat].totalMcap += coin.market_cap_usd || 0;
    }

    return Object.values(catMap).map((cat) => {
      const changes = cat.coins.map((c) => c.price_change_pct_24h).filter((c) => c != null);
      const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
      const advancers = changes.filter((c) => c > 0).length;
      const decliners = changes.filter((c) => c < 0).length;
      return { ...cat, avgChange, advancers, decliners, coinCount: cat.coins.length };
    });
  }, [market]);

  const sorted = useMemo(() => {
    const copy = [...categories];
    if (sortBy === 'change') copy.sort((a, b) => b.avgChange - a.avgChange);
    else if (sortBy === 'volume') copy.sort((a, b) => b.totalVolume - a.totalVolume);
    else if (sortBy === 'mcap') copy.sort((a, b) => b.totalMcap - a.totalMcap);
    return copy;
  }, [categories, sortBy]);

  const topCat = sorted[0];
  const bottomCat = [...sorted].sort((a, b) => a.avgChange - b.avgChange)[0];
  const hotCat = [...categories].sort((a, b) => b.totalVolume - a.totalVolume)[0];

  const barData = sorted.map((s) => ({
    name: s.name,
    value: sortBy === 'change' ? +s.avgChange.toFixed(2)
         : sortBy === 'volume' ? Math.round(s.totalVolume / 1e6)
         : Math.round(s.totalMcap / 1e9),
    avgChange: s.avgChange,
  }));

  const barLabel = sortBy === 'change' ? 'میانگین تغییر ۲۴h (٪)'
    : sortBy === 'volume' ? 'حجم ۲۴h ($M)'
    : 'ارزش بازار ($B)';

  return (
    <>
      <PageHeader title="چرخش دسته‌بندی رمزارزها">
        <SegmentedControl size="xs" data={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
      </PageHeader>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="بهترین دسته"
            value={topCat?.name || '—'}
            subtitle={topCat ? `${topCat.avgChange >= 0 ? '+' : ''}${toPersianNum(topCat.avgChange.toFixed(1))}٪` : ''}
            icon={IconTrendingUp}
            color="#F59E0B"
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="ضعیف‌ترین دسته"
            value={bottomCat?.name || '—'}
            subtitle={bottomCat ? `${toPersianNum(bottomCat.avgChange.toFixed(1))}٪` : ''}
            icon={IconTrendingDown}
            color={rallyColors.red}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="دسته‌های مثبت / منفی"
            value={`${toPersianNum(categories.filter((s) => s.avgChange > 0).length)} / ${toPersianNum(categories.filter((s) => s.avgChange < 0).length)}`}
            icon={IconChartBar}
            color={rallyColors.blue}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="داغ‌ترین دسته (حجم)"
            value={hotCat?.name || '—'}
            subtitle={hotCat ? `$${formatNum(Math.round(hotCat.totalVolume / 1e6))}M` : ''}
            icon={IconFlame}
            color="#F59E0B"
          />
        </Box>
      </SimpleGrid>

      <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <RallyMainCard title={barLabel} fullscreenable>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={axisTick()} />
              <YAxis type="category" dataKey="name" tick={axisTick(12)} width={100} />
              <Tooltip content={<ChartTooltipV2 />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={catColor(entry.avgChange)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </RallyMainCard>
      </Box>

      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
        <RallyMainCard title="جدول دسته‌بندی‌ها" noPadding>
          <ScrollArea>
            <Table striped highlightOnHover style={{ minWidth: 600 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ textAlign: 'right' }}>دسته‌بندی</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>رمزارزها</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>میانگین تغییر</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>صعودی</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>نزولی</Table.Th>
                  <Table.Th style={{ textAlign: 'left' }}>حجم ۲۴h</Table.Th>
                  <Table.Th style={{ textAlign: 'left' }}>ارزش بازار</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sorted.map((cat) => {
                  const changeColor = cat.avgChange > 0 ? rallyColors.green : cat.avgChange < 0 ? rallyColors.red : rallyColors.textDimmed;
                  return (
                    <Table.Tr key={cat.key}>
                      <Table.Td>
                        <Group gap={6}>
                          <Box style={{ width: 4, height: 20, borderRadius: 2, background: catColor(cat.avgChange) }} />
                          <Text size="sm" fw={500}>{cat.name}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{toPersianNum(cat.coinCount)}</Text></Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text size="sm" fw={600} c={changeColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {cat.avgChange >= 0 ? '+' : ''}{toPersianNum(cat.avgChange.toFixed(2))}٪
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}><Text size="sm" c={rallyColors.green}>{toPersianNum(cat.advancers)}</Text></Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}><Text size="sm" c={rallyColors.red}>{toPersianNum(cat.decliners)}</Text></Table.Td>
                      <Table.Td style={{ textAlign: 'left' }}>
                        <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>${formatNum(Math.round(cat.totalVolume / 1e6))}M</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'left' }}>
                        <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>${formatNum(Math.round(cat.totalMcap / 1e9))}B</Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </RallyMainCard>
      </Box>
    </>
  );
}
