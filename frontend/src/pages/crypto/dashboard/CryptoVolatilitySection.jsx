import { useState, useMemo } from 'react';
import { Box, Collapse, SimpleGrid, Text, ActionIcon } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
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
import styles from './CryptoVolatilitySection.module.css';

function ScatterTooltipContent({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: rallyColors.elevated,
        border: `1px solid ${rallyColors.border}`,
        color: rallyColors.textPrimary,
        borderRadius: 4,
        padding: '6px 10px',
        fontSize: 11,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.symbol}</div>
      <div>نوسان: {d.volatility}%</div>
      <div>بازده: {d.return24h > 0 ? '+' : ''}{d.return24h}%</div>
      <div>بازده تعدیل‌شده: {d.riskAdjReturn}</div>
    </div>
  );
}

export default function CryptoVolatilitySection({ volatilityMetrics = [] }) {
  const [expanded, setExpanded] = useState(true);
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(volatilityMetrics);

  const maxVolume = useMemo(
    () => Math.max(...volatilityMetrics.map(d => d.volume), 1),
    [volatilityMetrics],
  );

  const scatterData = useMemo(
    () => volatilityMetrics.map(d => ({
      ...d,
      z: Math.max(40, (d.volume / maxVolume) * 400),
    })),
    [volatilityMetrics, maxVolume],
  );

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 90, render: r => <Text size="sm" fw={600}>{r.symbol}</Text> },
    { accessor: 'return24h', title: 'بازده ۲۴h ٪', width: 110, textAlign: 'end', render: r => <PercentChangeCell value={r.return24h} /> },
    { accessor: 'volatility', title: 'نوسان ٪', width: 100, textAlign: 'end', render: r => r.volatility + '%' },
    { accessor: 'riskAdjReturn', title: 'بازده/ریسک', width: 110, textAlign: 'end', render: r => (
      <Text size="sm" style={{ color: r.riskAdjReturn >= 0 ? rallyColors.green : rallyColors.red }}>
        {r.riskAdjReturn > 0 ? '+' : ''}{r.riskAdjReturn}
      </Text>
    )},
    { accessor: 'volume', title: 'حجم (USDT)', width: 120, textAlign: 'end', render: r => {
      if (r.volume >= 1e9) return '$' + (r.volume / 1e9).toFixed(1) + 'B';
      if (r.volume >= 1e6) return '$' + (r.volume / 1e6).toFixed(1) + 'M';
      return '$' + Number(r.volume).toLocaleString();
    }},
  ];

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay3}`}>
      <RallyMainCard
        title="نوسان و ریسک"
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm">
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" mb="md">
            <RallyMainCard title="نمودار ریسک-بازده" fullscreenable>
              <div className={styles.scatterWrap}>
                <div className={`${styles.quadrantLabel} ${styles.quadrantTopRight}`}>بازده بالا / ریسک بالا</div>
                <div className={`${styles.quadrantLabel} ${styles.quadrantTopLeft}`}>بازده بالا / ریسک پایین</div>
                <div className={`${styles.quadrantLabel} ${styles.quadrantBottomRight}`}>بازده پایین / ریسک بالا</div>
                <div className={`${styles.quadrantLabel} ${styles.quadrantBottomLeft}`}>بازده پایین / ریسک پایین</div>
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      type="number"
                      dataKey="volatility"
                      name="نوسان"
                      unit="%"
                      tick={axisTick()}
                    />
                    <YAxis
                      type="number"
                      dataKey="return24h"
                      name="بازده"
                      unit="%"
                      tick={axisTick()}
                    />
                    <ZAxis type="number" dataKey="z" range={[40, 400]} />
                    <Tooltip content={<ScatterTooltipContent />} />
                    <ReferenceLine y={0} stroke={rallyColors.textDimmed} strokeDasharray="3 3" />
                    <Scatter data={scatterData}>
                      {scatterData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.return24h >= 0 ? rallyColors.green : rallyColors.red}
                          fillOpacity={0.7}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </RallyMainCard>

            <RallyMainCard title="رتبه‌بندی بازده تعدیل‌شده ریسک" noPadding>
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
