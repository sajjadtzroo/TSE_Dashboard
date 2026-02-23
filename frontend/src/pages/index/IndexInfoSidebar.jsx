import {
  Box, Card, Divider, Group, Text,
} from '@mantine/core';
import {
  IconTrendingUp, IconTrendingDown, IconArrowUpRight, IconArrowDownRight,
} from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum } from '../../utils/formatUtils';

function InfoRow({ label, value, color }) {
  return (
    <Group justify="space-between" py={4}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={500} c={color} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
    </Group>
  );
}

/**
 * Visual high/low range bar showing where the current value sits
 * between the day's low and high.
 */
function RangeBar({ low, high, current }) {
  if (!low || !high || !current || high === low) return null;
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));

  return (
    <Box my="sm">
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">{formatNum(low)}</Text>
        <Text size="xs" c="dimmed">{formatNum(high)}</Text>
      </Group>
      <Box
        style={{
          position: 'relative',
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(90deg, ${rallyColors.red}30, ${rallyColors.orange}30, ${rallyColors.green}30)`,
        }}
      >
        <Box
          style={{
            position: 'absolute',
            top: -3,
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: rallyColors.blue,
            border: '2px solid rgba(255,255,255,0.15)',
            boxShadow: `0 0 8px ${rallyColors.blue}60`,
            transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </Box>
      <Group justify="space-between" mt={4}>
        <Text size="xs" c="dimmed">کمترین</Text>
        <Text size="xs" c="dimmed">بیشترین</Text>
      </Group>
    </Box>
  );
}

/**
 * Volume bar — shows volume relative to max with a horizontal bar.
 */
function VolumeBar({ value, label }) {
  if (!value) return null;
  return (
    <Group justify="space-between" py={4} align="center">
      <Text size="sm" c="dimmed">{label}</Text>
      <Group gap={8} wrap="nowrap" align="center">
        <Box
          style={{
            width: 60,
            height: 6,
            borderRadius: 3,
            background: `${rallyColors.blue}18`,
            overflow: 'hidden',
          }}
        >
          <Box
            style={{
              height: '100%',
              width: '70%',
              borderRadius: 3,
              background: `linear-gradient(90deg, ${rallyColors.blue}, ${rallyColors.purple})`,
            }}
          />
        </Box>
        <Text size="sm" fw={500} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNum(value)}</Text>
      </Group>
    </Group>
  );
}

function formatTril(v) {
  if (v == null) return '-';
  const t = v / 1e12;
  if (t >= 1) return `${toPersianNum(t.toFixed(1))} تریلیون`;
  const b = v / 1e9;
  if (b >= 1) return `${toPersianNum(b.toFixed(1))} میلیارد`;
  return formatNum(v);
}

/**
 * Sidebar showing index value card, range gauge, and market activity.
 *
 * Props:
 *   index - single index object from /api/market/indices
 */
export default function IndexInfoSidebar({ index }) {
  if (!index) return null;

  const isPositive = (index.index_change ?? 0) >= 0;

  return (
    <div style={{
      position: 'sticky',
      top: 70,
      maxHeight: 'calc(100vh - 90px)',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(148, 163, 184, 0.2) transparent',
    }}>
      {/* Value Card */}
      <Card withBorder radius="md" mb="md">
        <Group gap="xs" mb="sm">
          {isPositive
            ? <IconTrendingUp size={24} color={rallyColors.green} />
            : <IconTrendingDown size={24} color={rallyColors.orange} />
          }
          <Text size="xl" fw={700} c={isPositive ? rallyColors.green : rallyColors.orange}>
            {formatNum(index.index_value)}
          </Text>
        </Group>
        <Group gap={4} mb="xs">
          {isPositive
            ? <IconArrowUpRight size={16} color={rallyColors.green} />
            : <IconArrowDownRight size={16} color={rallyColors.orange} />
          }
          <Text size="sm" fw={600} c={isPositive ? rallyColors.green : rallyColors.orange}>
            {index.index_change > 0 ? '+' : ''}
            {formatNum(index.index_change)} ({toPersianNum((index.index_change_pct ?? 0).toFixed(2))}%)
          </Text>
        </Group>

        <Divider my="xs" color="rgba(148, 163, 184, 0.12)" />

        {/* High/Low Range Gauge */}
        <RangeBar low={index.min_value} high={index.max_value} current={index.index_value} />
      </Card>

      {/* Market Activity */}
      <RallyMainCard title="فعالیت بازار" mb="md">
        <InfoRow label="ارزش بازار" value={formatTril(index.market_value)} />
        <VolumeBar label="حجم معاملات" value={index.volume} />
        <InfoRow label="ارزش معاملات" value={formatTril(index.value)} />
        <InfoRow label="تعداد معاملات" value={formatNum(index.trades)} />
        {index.state && <InfoRow label="وضعیت" value={index.state} />}
      </RallyMainCard>
    </div>
  );
}
