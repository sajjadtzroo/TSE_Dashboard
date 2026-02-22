import { useMemo } from 'react';
import { ActionIcon, Box, Collapse, SimpleGrid, Text } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyKPICard from '../../../components/RallyKPICard';
import RallyAreaChart from '../../../components/charts/RallyAreaChart';
import RallyBarChart from '../../../components/charts/RallyBarChart';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { DominanceIcon, FearGreedIcon } from '../../../components/icons/KPIIcons';
import { useCryptoGlobalStats, useFearGreedHistory } from '../../../hooks/useCryptoData';
import { formatUsd, formatVol, formatPercent } from '../../../utils/formatUtils';
import { FEAR_GREED_LABELS } from '../../../constants/crypto';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';

function fearGreedColor(value) {
  if (value == null) return rallyColors.textDimmed;
  if (value <= 25) return rallyColors.red;
  if (value <= 45) return '#F97316'; // orange
  if (value <= 55) return rallyColors.yellow;
  if (value <= 75) return rallyColors.green;
  return rallyColors.green;
}

function fearGreedLabel(classification) {
  return FEAR_GREED_LABELS[classification] || classification || '-';
}

export default function CoinHistoricalSection({ monthMetrics }) {
  const [expanded, setExpanded] = useLocalStorage({ key: 'coin-fund-historical', defaultValue: true });
  const { data: globalStats } = useCryptoGlobalStats();
  const { data: fgHistory } = useFearGreedHistory(90);

  const priceData = useMemo(
    () => monthMetrics.map((m) => ({ x: m.jalaliLabel, y: m.close })),
    [monthMetrics],
  );

  const volumeData = useMemo(
    () => monthMetrics.map((m) => ({ x: m.jalaliLabel, y: m.total_volume })),
    [monthMetrics],
  );

  const fgSparkline = useMemo(() => {
    if (!fgHistory?.length) return null;
    return fgHistory.map((d) => d.value ?? d.fear_greed_value ?? 0);
  }, [fgHistory]);

  const latestFG = fgHistory?.length ? fgHistory[fgHistory.length - 1] : null;
  const fgValue = latestFG?.value ?? latestFG?.fear_greed_value;
  const fgClass = latestFG?.value_classification ?? latestFG?.classification;

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
      <RallyMainCard
        title={<Text>تحلیل تاریخی</Text>}
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm" aria-label={expanded ? 'بستن بخش' : 'باز کردن بخش'}>
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" mb="md">
            <Box>
              <Text size="sm" c="dimmed" mb="xs">قیمت پایانی ماهانه</Text>
              {priceData.length > 0 ? (
                <RallyAreaChart
                  data={priceData}
                  fillColor={rallyColors.blue}
                  height={260}
                  yFormatter={formatUsd}
                  zoomable={priceData.length > 12}
                />
              ) : (
                <ChartEmptyState height={260} />
              )}
            </Box>
            <Box>
              <Text size="sm" c="dimmed" mb="xs">حجم کل ماهانه</Text>
              {volumeData.length > 0 ? (
                <RallyBarChart
                  data={volumeData}
                  barColor={rallyColors.purple}
                  height={260}
                  yFormatter={formatVol}
                />
              ) : (
                <ChartEmptyState height={260} />
              )}
            </Box>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="تسلط بیت‌کوین"
                value={globalStats?.btc_dominance_pct != null ? formatPercent(globalStats.btc_dominance_pct) : '-'}
                icon={DominanceIcon}
                color={rallyColors.yellow}
              />
            </Box>
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="شاخص ترس و طمع"
                value={fgValue != null ? String(fgValue) : '-'}
                subtitle={fearGreedLabel(fgClass)}
                icon={FearGreedIcon}
                color={fearGreedColor(fgValue)}
                sparklineData={fgSparkline}
              />
            </Box>
          </SimpleGrid>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
