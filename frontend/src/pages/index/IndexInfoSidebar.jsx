import {
  Card, Divider, Group, Text,
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
      <Text size="sm" fw={500} c={color}>{value}</Text>
    </Group>
  );
}

/**
 * Sidebar showing index value card and market activity.
 *
 * Props:
 *   index - single index object from /api/market/indices
 */
export default function IndexInfoSidebar({ index }) {
  if (!index) return null;

  const isPositive = (index.index_change ?? 0) >= 0;

  return (
    <>
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
        <Group gap={4} mb="sm">
          {isPositive
            ? <IconArrowUpRight size={16} color={rallyColors.green} />
            : <IconArrowDownRight size={16} color={rallyColors.orange} />
          }
          <Text size="sm" fw={600} c={isPositive ? rallyColors.green : rallyColors.orange}>
            {index.index_change > 0 ? '+' : ''}
            {formatNum(index.index_change)} ({toPersianNum((index.index_change_pct ?? 0).toFixed(2))}%)
          </Text>
        </Group>
        <Divider mb="xs" color="rgba(148, 163, 184, 0.12)" />
        <InfoRow label="کمترین" value={formatNum(index.min_value)} />
        <InfoRow label="بیشترین" value={formatNum(index.max_value)} />
      </Card>

      {/* Market Activity */}
      <RallyMainCard title="فعالیت بازار" mb="md">
        <InfoRow label="ارزش بازار" value={formatNum(index.market_value)} />
        <InfoRow label="حجم" value={formatNum(index.volume)} />
        <InfoRow label="ارزش معاملات" value={formatNum(index.value)} />
        <InfoRow label="تعداد معاملات" value={formatNum(index.trades)} />
        {index.state && <InfoRow label="وضعیت" value={index.state} />}
      </RallyMainCard>
    </>
  );
}
