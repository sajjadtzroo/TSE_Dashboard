import { Text } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import { formatNum } from '../../utils/formatUtils';

export default function DataBarCell({ value, maxAbs, formatter }) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs, 1) * 100 : 0;
  const color = value >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  const sign = value > 0 ? '+' : '';
  return (
    <div style={{ position: 'relative', padding: '2px 6px' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        width: `${pct}%`,
        background: color,
        borderRadius: 3,
        transition: 'width 0.3s ease',
      }} />
      <Text
        size="sm"
        fw={600}
        style={{ position: 'relative' }}
        c={value > 0 ? rallyColors.green : value < 0 ? rallyColors.orange : undefined}
      >
        {sign}{formatter ? formatter(value) : formatNum(value)}
      </Text>
    </div>
  );
}
