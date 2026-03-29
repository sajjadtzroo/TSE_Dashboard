import { useMemo, useState } from 'react';
import { SimpleGrid, SegmentedControl, Text, Box, Group, Card, Table, ScrollArea } from '@mantine/core';
import {
  IconArrowUp,
  IconArrowDown,
  IconMinus,
  IconChartBar,
  IconTrendingUp,
  IconTrendingDown,
  IconFlame,
} from '@tabler/icons-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import RallyKPICard from '../components/RallyKPICard';
import RallyMainCard from '../components/RallyMainCard';
import ChartTooltipV2 from '../components/charts/shared/ChartTooltipV2';
import { useMarketOverview } from '../hooks/useMarketData';
import { formatNum, toPersianNum } from '../utils/formatUtils';
import { isFundSector } from '../utils/sectorUtils';
import rallyColors from '../theme/rallyColors';
import { GRID_STROKE, axisTick } from '../components/charts/shared/chartStyles';
import animStyles from '../components/shared/animations.module.css';

function sectorColor(avgChange) {
  if (avgChange >= 3) return rallyColors.green;
  if (avgChange >= 1) return `${rallyColors.green}aa`;
  if (avgChange >= 0) return `${rallyColors.green}66`;
  if (avgChange >= -1) return `${rallyColors.red}66`;
  if (avgChange >= -3) return `${rallyColors.red}aa`;
  return rallyColors.red;
}

const SORT_OPTIONS = [
  { label: 'بازده', value: 'change' },
  { label: 'حجم', value: 'volume' },
  { label: 'ارزش', value: 'value' },
];

export default function SectorRotation() {
  const [sortBy, setSortBy] = useState('change');
  const { data: market = [], isLoading } = useMarketOverview({ limit: 5000 });

  const sectors = useMemo(() => {
    if (!market.length) return [];

    const sectorMap = {};
    for (const s of market) {
      const name = s.sector_name_fa;
      if (!name || isFundSector(name)) continue;
      if (!sectorMap[name]) {
        sectorMap[name] = { name, stocks: [], totalVolume: 0, totalValue: 0, totalCap: 0 };
      }
      sectorMap[name].stocks.push(s);
      sectorMap[name].totalVolume += s.volume || 0;
      sectorMap[name].totalValue += s.value || 0;
      sectorMap[name].totalCap += s.market_cap || 0;
    }

    return Object.values(sectorMap).map((sec) => {
      const changes = sec.stocks.map((s) => s.close_change_pct).filter((c) => c != null);
      const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
      const advancers = changes.filter((c) => c > 0).length;
      const decliners = changes.filter((c) => c < 0).length;
      const unchanged = changes.filter((c) => c === 0).length;
      return { ...sec, avgChange, advancers, decliners, unchanged, stockCount: sec.stocks.length };
    });
  }, [market]);

  const sorted = useMemo(() => {
    const copy = [...sectors];
    if (sortBy === 'change') copy.sort((a, b) => b.avgChange - a.avgChange);
    else if (sortBy === 'volume') copy.sort((a, b) => b.totalVolume - a.totalVolume);
    else if (sortBy === 'value') copy.sort((a, b) => b.totalValue - a.totalValue);
    return copy;
  }, [sectors, sortBy]);

  // KPIs
  const topSector = sorted[0];
  const bottomSector = [...sorted].sort((a, b) => a.avgChange - b.avgChange)[0];
  const hotSector = [...sectors].sort((a, b) => b.totalVolume - a.totalVolume)[0];

  // Bar chart data (top 15 by current sort)
  const barData = sorted.slice(0, 15).map((s) => ({
    name: s.name.length > 15 ? s.name.slice(0, 14) + '…' : s.name,
    value: sortBy === 'change' ? +s.avgChange.toFixed(2)
         : sortBy === 'volume' ? Math.round(s.totalVolume / 1e6)
         : Math.round(s.totalValue / 1e9),
    avgChange: s.avgChange,
  }));

  const barLabel = sortBy === 'change' ? 'میانگین تغییر (٩)'
    : sortBy === 'volume' ? 'حجم (M)'
    : 'ارزش (B)';

  return (
    <>
      <PageHeader title="چرخش صنایع">
        <SegmentedControl size="xs" data={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
      </PageHeader>

      {/* KPI Row */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="بهترین صنعت"
            value={topSector?.name || '—'}
            subtitle={topSector ? `${topSector.avgChange >= 0 ? '+' : ''}${toPersianNum(topSector.avgChange.toFixed(1))}٩` : ''}
            icon={IconTrendingUp}
            color={rallyColors.green}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="ضعیف‌ترین صنعت"
            value={bottomSector?.name || '—'}
            subtitle={bottomSector ? `${toPersianNum(bottomSector.avgChange.toFixed(1))}٩` : ''}
            icon={IconTrendingDown}
            color={rallyColors.red}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="صنایع مثبت / منفی"
            value={`${toPersianNum(sectors.filter(s => s.avgChange > 0).length)} / ${toPersianNum(sectors.filter(s => s.avgChange < 0).length)}`}
            icon={IconChartBar}
            color={rallyColors.blue}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="داغ‌ترین صنعت (حجم)"
            value={hotSector?.name || '—'}
            subtitle={hotSector ? `${formatNum(Math.round(hotSector.totalVolume / 1e6))}M` : ''}
            icon={IconFlame}
            color={rallyColors.yellow}
          />
        </Box>
      </SimpleGrid>

      {/* Bar Chart */}
      <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <RallyMainCard title={barLabel} fullscreenable>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={axisTick()} />
              <YAxis type="category" dataKey="name" tick={axisTick(10)} width={120} />
              <Tooltip content={<ChartTooltipV2 />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={sectorColor(entry.avgChange)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </RallyMainCard>
      </Box>

      {/* Sector Table */}
      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
        <RallyMainCard title="جدول صنایع" noPadding>
          <ScrollArea>
            <Table striped highlightOnHover style={{ minWidth: 700 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ textAlign: 'right' }}>صنعت</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>نمادها</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>میانگین تغییر</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>مثبت</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>منفی</Table.Th>
                  <Table.Th style={{ textAlign: 'left' }}>حجم</Table.Th>
                  <Table.Th style={{ textAlign: 'left' }}>ارزش معاملات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sorted.map((sec) => {
                  const changeColor = sec.avgChange > 0 ? rallyColors.green : sec.avgChange < 0 ? rallyColors.red : rallyColors.textDimmed;
                  return (
                    <Table.Tr key={sec.name}>
                      <Table.Td>
                        <Group gap={6}>
                          <Box style={{ width: 4, height: 20, borderRadius: 2, background: sectorColor(sec.avgChange) }} />
                          <Text size="sm" fw={500}>{sec.name}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text size="sm">{toPersianNum(sec.stockCount)}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text size="sm" fw={600} c={changeColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {sec.avgChange >= 0 ? '+' : ''}{toPersianNum(sec.avgChange.toFixed(2))}٩
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text size="sm" c={rallyColors.green}>{toPersianNum(sec.advancers)}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text size="sm" c={rallyColors.red}>{toPersianNum(sec.decliners)}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'left' }}>
                        <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNum(Math.round(sec.totalVolume / 1e6))}M</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'left' }}>
                        <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNum(Math.round(sec.totalValue / 1e9))}B</Text>
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
