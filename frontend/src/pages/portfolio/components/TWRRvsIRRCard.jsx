import { Group, Text, Box, Stack } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import { toPersianNum, formatPercent } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';

export default function TWRRvsIRRCard({ twrr, irr }) {
  const hasTWRR = twrr != null && isFinite(twrr);
  const hasIRR = irr != null && isFinite(irr);

  if (!hasTWRR && !hasIRR) return null;

  const gap = hasTWRR && hasIRR ? ((twrr - irr) * 100).toFixed(1) : null;

  return (
    <RallyMainCard title="مقایسه TWRR و IRR">
      <Group justify="center" gap="xl" py="md">
        <Stack align="center" gap={2}>
          <Text size="xs" c="dimmed">TWRR (سالانه)</Text>
          <Text style={{ fontSize: 28, fontWeight: 800 }} c={rallyColors.purple}>
            {hasTWRR ? formatPercent(twrr * 100, 1) : '—'}
          </Text>
          <Text size="xs" c="dimmed">عملکرد مدیر سبد</Text>
        </Stack>

        <Box style={{ width: 1, height: 50, background: `${rallyColors.border}` }} />

        <Stack align="center" gap={2}>
          <Text size="xs" c="dimmed">IRR (سالانه)</Text>
          <Text style={{ fontSize: 28, fontWeight: 800 }} c="#06b6d4">
            {hasIRR ? formatPercent(irr * 100, 1) : '—'}
          </Text>
          <Text size="xs" c="dimmed">بازده واقعی سرمایه‌گذار</Text>
        </Stack>
      </Group>

      {gap && (
        <Box
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <Text size="xs" c="dimmed">
            <Text component="span" fw={600} c={rallyColors.textPrimary}>
              Gap: {toPersianNum(gap)}٪
            </Text>
            {' — '}
            {Number(gap) > 0
              ? 'TWRR > IRR: زمان‌بندی ورود/خروج نقدینگی بهینه نبوده'
              : 'IRR > TWRR: زمان‌بندی ورود/خروج نقدینگی مناسب بوده'}
          </Text>
        </Box>
      )}
    </RallyMainCard>
  );
}
