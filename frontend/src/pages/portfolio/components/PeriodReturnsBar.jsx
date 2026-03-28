import { Group, Text, Box } from '@mantine/core';
import { toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';

const PERIODS = [
  { key: '1w', label: '۱ هفته' },
  { key: '1m', label: '۱ ماه' },
  { key: '3m', label: '۳ ماه' },
  { key: '6m', label: '۶ ماه' },
  { key: 'ytd', label: 'YTD' },
  { key: '1y', label: '۱ سال' },
];

export default function PeriodReturnsBar({ returns = {} }) {
  const hasData = Object.keys(returns).length > 0;
  if (!hasData) return null;

  return (
    <Group gap={6} wrap="wrap">
      {PERIODS.map(({ key, label }) => {
        const val = returns[key];
        if (val == null) return null;
        const isPos = val >= 0;
        const color = isPos ? rallyColors.green : rallyColors.red;
        return (
          <Box
            key={key}
            style={{
              background: `${color}0a`,
              border: `1px solid ${color}20`,
              borderRadius: 8,
              padding: '4px 10px',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <Text size="xs" c="dimmed" fw={500}>{label}</Text>
            <Text
              size="xs"
              fw={700}
              c={color}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {isPos ? '+' : ''}{toPersianNum(val.toFixed(1))}٪
            </Text>
          </Box>
        );
      })}
    </Group>
  );
}
