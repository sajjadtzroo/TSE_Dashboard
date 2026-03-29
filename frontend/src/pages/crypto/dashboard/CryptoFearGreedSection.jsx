import { useMemo } from 'react';
import { Box, Collapse, SimpleGrid, Stack, Text, ActionIcon } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import ChartTooltipV2 from '../../../components/charts/shared/ChartTooltipV2';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import FearGreedGauge from '../../../components/crypto/FearGreedGauge';
import { useFearGreedHistory, useCryptoGlobalStats } from '../../../hooks/useCryptoData';
import { FEAR_GREED_LABELS } from '../../../constants/crypto';
import { GRID_STROKE, axisTick } from '../../../components/charts/shared/chartStyles';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';
import { toPersianNum } from '../../../utils/formatUtils';

/** Map value (0-100) to a color matching the fear/greed spectrum */
function fgColor(value) {
  if (value == null) return rallyColors.textDimmed;
  if (value <= 25) return rallyColors.red;
  if (value <= 45) return '#F97316';
  if (value <= 55) return rallyColors.yellow;
  if (value <= 75) return rallyColors.green;
  return rallyColors.darkGreen;
}

function FGTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const val = d?.value ?? d?.fear_greed_value ?? 0;
  const cls = d?.value_classification ?? d?.classification ?? '';
  const persianCls = FEAR_GREED_LABELS[cls] || cls;

  const items = [
    { name: 'شاخص', value: val, color: fgColor(val) },
    { name: 'وضعیت', value: persianCls, color: fgColor(val) },
  ];

  return <ChartTooltipV2 active={true} payload={items} label={label} />;
}

export default function CryptoFearGreedSection() {
  const [expanded, setExpanded] = useLocalStorage({ key: 'crypto-section-feargreed', defaultValue: true });
  const { data: globalStats } = useCryptoGlobalStats();
  const { data: fgHistory = [], isLoading } = useFearGreedHistory(90);

  const fgValue = globalStats?.fear_greed_value;
  const fgLabel = globalStats?.fear_greed_label;

  const chartData = useMemo(() => {
    if (!fgHistory?.length) return [];
    return fgHistory.map((d) => ({
      ...d,
      date: d.timestamp?.slice(0, 10) || d.date || '',
      value: d.value ?? d.fear_greed_value ?? 0,
    }));
  }, [fgHistory]);

  // Dynamic gradient stop color based on latest value
  const latestValue = chartData.length ? chartData[chartData.length - 1].value : 50;

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay3}`}>
      <RallyMainCard
        title="شاخص ترس و طمع"
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm" aria-label={expanded ? 'بستن بخش' : 'باز کردن بخش'}>
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            {/* Left column: Gauge */}
            <RallyMainCard title="وضعیت فعلی">
              <Stack align="center" justify="center" gap="md" py="xl">
                <FearGreedGauge value={fgValue} label={fgLabel} size={200} />
                {fgValue != null && (
                  <Text size="lg" fw={700} c={fgColor(fgValue)}>
                    {toPersianNum(String(fgValue))} / {toPersianNum('100')}
                  </Text>
                )}
              </Stack>
            </RallyMainCard>

            {/* Right column: Area chart */}
            <RallyMainCard title={`روند ${toPersianNum('90')} روزه`} fullscreenable>
              {isLoading || !chartData.length ? (
                <ChartEmptyState height={300} message="داده شاخص ترس و طمع موجود نیست" />
              ) : (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 20, left: 12 }}>
                    <defs>
                      <linearGradient id="fgGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={fgColor(latestValue)} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={fgColor(latestValue)} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />

                    {/* Background bands */}
                    <ReferenceArea y1={0} y2={25} fill={rallyColors.red} fillOpacity={0.05} label="" />
                    <ReferenceArea y1={25} y2={45} fill="#F97316" fillOpacity={0.05} label="" />
                    <ReferenceArea y1={45} y2={55} fill={rallyColors.yellow} fillOpacity={0.05} label="" />
                    <ReferenceArea y1={55} y2={75} fill={rallyColors.green} fillOpacity={0.05} label="" />
                    <ReferenceArea y1={75} y2={100} fill={rallyColors.darkGreen} fillOpacity={0.05} label="" />

                    {/* Neutral reference line */}
                    <ReferenceLine y={50} stroke={rallyColors.yellow} strokeDasharray="4 4" strokeOpacity={0.6} />

                    <XAxis
                      dataKey="date"
                      tick={axisTick()}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={axisTick()}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<FGTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={fgColor(latestValue)}
                      strokeWidth={2}
                      fill="url(#fgGradient)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: rallyColors.elevated }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </RallyMainCard>
          </SimpleGrid>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
