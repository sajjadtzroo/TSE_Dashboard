import { Badge, Group, Paper, Skeleton, Stack, Text } from '@mantine/core';
import MarkdownRenderer from '../../features/chat/components/MarkdownRenderer';
import rallyColors from '../../theme/rallyColors';

function MetricChip({ label, value, sentiment }) {
  const colorMap = {
    positive: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E' },
    negative: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' },
    neutral:  { bg: 'rgba(107, 114, 128, 0.15)', text: '#6B7280' },
  };
  const { bg, text } = colorMap[sentiment] || colorMap.neutral;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        background: bg,
        color: text,
        fontSize: 12,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {label}: {value}
    </span>
  );
}

export default function FinancialAnalysisPanel({ isLoading, result }) {
  return (
    <Paper
      mt="md"
      p="md"
      radius="md"
      style={{
        border: '1px solid rgba(41, 98, 255, 0.35)',
        background: 'rgba(41, 98, 255, 0.06)',
      }}
    >
      <Stack gap="sm">
        <Group gap="xs" align="center">
          <Badge
            size="sm"
            style={{
              background: rallyColors.primary,
              color: '#fff',
              fontWeight: 700,
            }}
          >
            هوش مصنوعی
          </Badge>
          <Text size="sm" fw={600} c="white">تحلیل هوشمند صورت مالی</Text>
        </Group>

        {isLoading && (
          <Stack gap={8}>
            <Skeleton height={14} radius="sm" />
            <Skeleton height={14} radius="sm" width="85%" />
            <Skeleton height={14} radius="sm" width="70%" />
            <Skeleton height={14} radius="sm" />
            <Skeleton height={14} radius="sm" width="90%" />
          </Stack>
        )}

        {result && !isLoading && (
          <>
            {result.data_points?.tools_used?.length > 0 && (
              <Group gap="xs" wrap="wrap">
                {result.data_points.tools_used.map((tool) => (
                  <MetricChip key={tool} label="ابزار" value={tool} sentiment="neutral" />
                ))}
                {result.data_points.sources_count > 0 && (
                  <MetricChip
                    label="منابع"
                    value={result.data_points.sources_count}
                    sentiment="neutral"
                  />
                )}
              </Group>
            )}
            <MarkdownRenderer content={result.analysis} />
          </>
        )}
      </Stack>
    </Paper>
  );
}
