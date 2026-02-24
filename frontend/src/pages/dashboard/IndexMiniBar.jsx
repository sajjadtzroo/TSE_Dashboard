import { SimpleGrid, Box, Text, Group } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { useMarketIndices } from '../../hooks/useMarketData';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';

function IndexCell({ name, indices }) {
  const entry = indices?.find((i) => i.name === name);
  const value = entry?.index_value ?? null;
  const changePct = entry?.index_change_pct ?? null;
  const isPositive = changePct > 0;
  const isNegative = changePct < 0;
  const changeColor = isPositive ? rallyColors.green : isNegative ? rallyColors.red : rallyColors.textDimmed;

  return (
    <Box
      style={{
        background: rallyColors.glassBg,
        backdropFilter: rallyColors.glassBlur,
        border: `1px solid ${rallyColors.glassBorder}`,
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      <Text size="xs" c="dimmed" mb={2} lineClamp={1}>{name}</Text>
      <Text size="md" fw={700} c={rallyColors.textPrimary} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value != null ? toPersianNum(value.toLocaleString('fa-IR', { maximumFractionDigits: 0 })) : '—'}
      </Text>
      {changePct != null && (
        <Group gap={3} mt={1}>
          {isPositive && <IconTrendingUp size={12} color={changeColor} />}
          {isNegative && <IconTrendingDown size={12} color={changeColor} />}
          <Text size="xs" c={changeColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {isPositive ? '+' : ''}{toPersianNum(changePct.toFixed(2))}٪
          </Text>
        </Group>
      )}
    </Box>
  );
}

function BreadthCell({ advancers, decliners, unchanged }) {
  const total = (advancers ?? 0) + (decliners ?? 0) + (unchanged ?? 0);
  const advPct = total > 0 ? (advancers / total) * 100 : 0;
  const decPct = total > 0 ? (decliners / total) * 100 : 0;
  const uncPct = total > 0 ? (unchanged / total) * 100 : 0;

  return (
    <Box
      style={{
        background: rallyColors.glassBg,
        backdropFilter: rallyColors.glassBlur,
        border: `1px solid ${rallyColors.glassBorder}`,
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      <Text size="xs" c="dimmed" mb={2}>وسعت بازار</Text>
      {/* Mini progress bar */}
      <Box
        style={{
          display: 'flex',
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 6,
        }}
      >
        <Box style={{ flex: advPct, background: rallyColors.green }} />
        <Box style={{ flex: uncPct, background: rallyColors.textDimmed, opacity: 0.4 }} />
        <Box style={{ flex: decPct, background: rallyColors.red }} />
      </Box>
      <Group gap={8} wrap="nowrap">
        <Group gap={3}>
          <Text size="xs" c={rallyColors.green}>▲</Text>
          <Text size="xs" c={rallyColors.green}>{toPersianNum(advancers ?? 0)}</Text>
        </Group>
        <Group gap={3}>
          <Text size="xs" c={rallyColors.red}>▼</Text>
          <Text size="xs" c={rallyColors.red}>{toPersianNum(decliners ?? 0)}</Text>
        </Group>
        <Group gap={3}>
          <Text size="xs" c="dimmed">■</Text>
          <Text size="xs" c="dimmed">{toPersianNum(unchanged ?? 0)}</Text>
        </Group>
      </Group>
    </Box>
  );
}

export default function IndexMiniBar({ advancers, decliners, unchanged }) {
  const { data: indices } = useMarketIndices();

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mb="sm">
      <IndexCell name="شاخص کل (هم وزن)" indices={indices} />
      <IndexCell name="شاخص قیمت (هم وزن)" indices={indices} />
      <BreadthCell advancers={advancers} decliners={decliners} unchanged={unchanged} />
    </SimpleGrid>
  );
}
