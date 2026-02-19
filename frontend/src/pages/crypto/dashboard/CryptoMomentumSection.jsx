import { useState, useMemo } from 'react';
import { Box, Collapse, SimpleGrid, Text, ActionIcon, Badge, Group, Progress } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyDataTable from '../../../components/RallyDataTable';
import PercentChangeCell from '../../../components/cells/PercentChangeCell';
import usePagination from '../../../hooks/usePagination';
import rallyColors from '../../../theme/rallyColors';
import { GRID_STROKE, axisTick } from '../../../components/charts/shared/chartStyles';
import animStyles from '../../../components/shared/animations.module.css';
import { toPersianNum } from '../../../utils/formatUtils';

const SIGNAL_COLOR = {
  overbought: rallyColors.red,
  oversold: rallyColors.green,
  neutral: rallyColors.textDimmed,
};

const SIGNAL_LABEL = {
  overbought: 'اشباع خرید',
  oversold: 'اشباع فروش',
  neutral: 'خنثی',
};

function MomentumTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: rallyColors.elevated,
      border: `1px solid ${rallyColors.border}`,
      color: rallyColors.textPrimary,
      borderRadius: 4,
      padding: '6px 10px',
      fontSize: 11,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.symbol}</div>
      {payload.map(p => (
        <div key={p.dataKey}>
          {p.name}: {p.value != null ? `${p.value > 0 ? '+' : ''}${toPersianNum(p.value.toFixed(2))}%` : '-'}
        </div>
      ))}
    </div>
  );
}

export default function CryptoMomentumSection({ signals = [] }) {
  const [expanded, setExpanded] = useState(true);

  const overbought = useMemo(() => signals.filter(s => s.signal === 'overbought'), [signals]);
  const oversold = useMemo(() => signals.filter(s => s.signal === 'oversold'), [signals]);
  const neutral = useMemo(() => signals.filter(s => s.signal === 'neutral'), [signals]);

  // Top 10 by absolute 30d momentum for bar chart
  const barData = useMemo(() => {
    return [...signals]
      .filter(s => s.change_7d != null || s.change_30d != null)
      .sort((a, b) => Math.abs(b.change_30d ?? 0) - Math.abs(a.change_30d ?? 0))
      .slice(0, 10)
      .map(s => ({ symbol: s.symbol, '7 روزه': s.change_7d, '30 روزه': s.change_30d }))
      .reverse(); // lowest magnitude at top of horizontal chart
  }, [signals]);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(signals);

  const columns = [
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 90,
      render: r => <Text size="sm" fw={600}>{r.symbol}</Text>,
    },
    {
      accessor: 'rsi',
      title: 'RSI(14)',
      width: 140,
      render: r => {
        if (r.rsi == null) return <Text size="sm" c="dimmed">-</Text>;
        const color = r.rsi > 70 ? rallyColors.red : r.rsi < 30 ? rallyColors.green : rallyColors.blue;
        return (
          <Box>
            <Text size="xs" fw={600} c={color} mb={2}>{toPersianNum(r.rsi.toFixed(1))}</Text>
            <Progress value={r.rsi} color={color} size="xs" />
          </Box>
        );
      },
    },
    {
      accessor: 'change_24h',
      title: '۲۴h ٪',
      width: 90,
      textAlign: 'end',
      render: r => <PercentChangeCell value={r.change_24h} />,
    },
    {
      accessor: 'change_7d',
      title: '۷ روزه ٪',
      width: 100,
      textAlign: 'end',
      render: r => <PercentChangeCell value={r.change_7d} />,
    },
    {
      accessor: 'change_30d',
      title: '۳۰ روزه ٪',
      width: 100,
      textAlign: 'end',
      render: r => <PercentChangeCell value={r.change_30d} />,
    },
    {
      accessor: 'signal',
      title: 'سیگنال',
      width: 110,
      render: r => (
        <Badge
          size="sm"
          variant="light"
          color={r.signal === 'overbought' ? 'red' : r.signal === 'oversold' ? 'green' : 'gray'}
        >
          {SIGNAL_LABEL[r.signal] ?? r.signal}
        </Badge>
      ),
    },
  ];

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay4}`}>
      <RallyMainCard
        title="مومنتوم و روند"
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm">
            <IconChevronDown
              size={16}
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          {/* RSI status chips */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
            {[
              { label: 'اشباع خرید (RSI > ۷۰)', coins: overbought, color: 'red' },
              { label: 'خنثی', coins: neutral, color: 'gray' },
              { label: 'اشباع فروش (RSI < ۳۰)', coins: oversold, color: 'green' },
            ].map(({ label, coins, color }) => (
              <RallyMainCard key={label} title={`${label} — ${coins.length}`}>
                <Group gap={4} wrap="wrap">
                  {coins.length === 0 ? (
                    <Text size="xs" c="dimmed">—</Text>
                  ) : (
                    coins.map(c => (
                      <Badge key={c.symbol} size="sm" variant="light" color={color}>
                        {c.symbol}
                        {c.rsi != null ? ` ${toPersianNum(c.rsi.toFixed(0))}` : ''}
                      </Badge>
                    ))
                  )}
                </Group>
              </RallyMainCard>
            ))}
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" mb="md">
            {/* 7d vs 30d momentum bar chart */}
            <RallyMainCard title="مومنتوم ۷ روزه در برابر ۳۰ روزه" fullscreenable>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  layout="vertical"
                  data={barData}
                  margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" unit="%" tick={axisTick()} />
                  <YAxis type="category" dataKey="symbol" tick={axisTick()} width={44} />
                  <Tooltip content={<MomentumTooltip />} />
                  <ReferenceLine x={0} stroke={rallyColors.textDimmed} strokeDasharray="3 3" />
                  <Bar dataKey="7 روزه" fill={rallyColors.blue} radius={[0, 3, 3, 0]} maxBarSize={14}>
                    {barData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={(entry['7 روزه'] ?? 0) >= 0 ? rallyColors.blue : rallyColors.red}
                        fillOpacity={0.75}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="30 روزه" fill="#6366f1" radius={[0, 3, 3, 0]} maxBarSize={14}>
                    {barData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={(entry['30 روزه'] ?? 0) >= 0 ? '#6366f1' : '#f43f5e'}
                        fillOpacity={0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </RallyMainCard>

            {/* Ranking table */}
            <RallyMainCard title="رتبه‌بندی مومنتوم" noPadding>
              <RallyDataTable
                records={paged}
                columns={columns}
                idAccessor="symbol"
                page={page}
                onPageChange={setPage}
                recordsPerPage={perPage}
                onRecordsPerPageChange={setPerPage}
                totalRecords={totalRecords}
                minHeight={300}
              />
            </RallyMainCard>
          </SimpleGrid>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
