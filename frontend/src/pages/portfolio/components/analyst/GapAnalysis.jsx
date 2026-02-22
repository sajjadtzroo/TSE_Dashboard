import { useMemo } from 'react';
import { Card, Text, Group, Stack, Badge, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconExclamationMark } from '@tabler/icons-react';
import RallyMainCard from '../../../../components/RallyMainCard';
import RallyBarChart from '../../../../components/charts/RallyBarChart';
import { ASSET_CLASS_LABELS } from '../../../../constants/riskQuestions';
import { computeGapAnalysis } from '../../../../utils/riskProfileScoring';
import rallyColors, { glassCard } from '../../../../theme/rallyColors';
import { toPersianNum } from '../../../../utils/formatUtils';

/**
 * Shows drift analysis between current holdings and suggested allocation.
 * Drift alert card (green/yellow/red) + bar chart + details.
 */
export default function GapAnalysis({ enrichedHoldings, suggestedAllocation }) {
  const analysis = useMemo(
    () => computeGapAnalysis(enrichedHoldings, suggestedAllocation),
    [enrichedHoldings, suggestedAllocation],
  );

  if (!analysis.gaps.length) {
    return (
      <RallyMainCard title="تحلیل انحراف">
        <Text size="sm" c="dimmed" ta="center" py="xl">
          برای مشاهده تحلیل انحراف، دارایی‌هایی به پورتفو اضافه کنید
        </Text>
      </RallyMainCard>
    );
  }

  const { gaps, overallDrift } = analysis;
  const driftLevel = overallDrift <= 5 ? 'low' : overallDrift <= 15 ? 'medium' : 'high';
  const driftConfig = {
    low: { color: rallyColors.green, icon: IconCircleCheck, label: 'انحراف کم', desc: 'سبد شما با تخصیص پیشنهادی تقریباً هم‌راستاست.' },
    medium: { color: rallyColors.yellow, icon: IconExclamationMark, label: 'انحراف متوسط', desc: 'بازتوزیع جزئی دارایی‌ها توصیه می‌شود.' },
    high: { color: rallyColors.red, icon: IconAlertTriangle, label: 'انحراف زیاد', desc: 'سبد فعلی فاصله زیادی با تخصیص هدف دارد. بازتوزیع ضروری است.' },
  }[driftLevel];

  // Bar chart: current vs target per asset class
  const barData = gaps.map((g) => ({
    x: ASSET_CLASS_LABELS[g.assetClass],
    y: g.diff,
  }));

  return (
    <RallyMainCard title="تحلیل انحراف">
      <Stack gap="md">
        {/* Drift Alert */}
        <Card
          padding="md"
          radius="md"
          style={{
            ...glassCard,
            borderInlineStart: `4px solid ${driftConfig.color}`,
          }}
        >
          <Group gap="sm">
            <ThemeIcon
              size={40}
              radius="md"
              variant="light"
              style={{ backgroundColor: `${driftConfig.color}15`, color: driftConfig.color }}
            >
              <driftConfig.icon size={22} />
            </ThemeIcon>
            <Stack gap={2}>
              <Group gap="xs">
                <Text fw={700} size="sm" style={{ color: driftConfig.color }}>
                  {driftConfig.label}
                </Text>
                <Badge variant="light" size="sm" style={{ backgroundColor: `${driftConfig.color}15`, color: driftConfig.color }}>
                  {toPersianNum(overallDrift.toFixed(1))}٪
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">{driftConfig.desc}</Text>
            </Stack>
          </Group>
        </Card>

        {/* Deviation Chart */}
        <RallyBarChart
          data={barData}
          height={220}
          autoColorByValue
          tooltipFormatter={({ x, y }) => {
            const sign = y > 0 ? '+' : '';
            return `${x}: ${sign}${toPersianNum(y.toFixed(1))}٪`;
          }}
        />

        {/* Details Table */}
        <Stack gap={4}>
          {gaps.map((g) => {
            const statusColor = g.status === 'ok' ? rallyColors.green : g.status === 'overweight' ? rallyColors.yellow : rallyColors.red;
            const statusLabel = g.status === 'ok' ? 'متعادل' : g.status === 'overweight' ? 'اضافه‌وزن' : 'کم‌وزن';
            return (
              <Group key={g.assetClass} justify="space-between" px="xs" py={4} style={{ borderBottom: `1px solid ${rallyColors.border}` }}>
                <Text size="sm" style={{ color: rallyColors.textSecondary }}>
                  {ASSET_CLASS_LABELS[g.assetClass]}
                </Text>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">فعلی: {toPersianNum(g.current.toFixed(1))}٪</Text>
                  <Text size="xs" c="dimmed">هدف: {toPersianNum(g.target)}٪</Text>
                  <Badge size="xs" variant="light" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
                    {statusLabel}
                  </Badge>
                </Group>
              </Group>
            );
          })}
        </Stack>
      </Stack>
    </RallyMainCard>
  );
}
