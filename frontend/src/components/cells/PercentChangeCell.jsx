import { Text } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';

export default function PercentChangeCell({ value, decimals = 2, showSign = true, heatmap = true }) {
  if (value == null) return <Text size="sm">-</Text>;
  const color = value > 0 ? rallyColors.green : value < 0 ? rallyColors.red : undefined;
  const prefix = showSign && value > 0 ? '+' : '';

  // Heatmap background: intensity based on magnitude
  const bgStyle = { direction: 'ltr' };
  if (heatmap && value !== 0) {
    const absVal = Math.min(Math.abs(value), 10); // cap at 10% for color intensity
    const opacity = 0.05 + (absVal / 10) * 0.15; // 0.05 to 0.20 opacity range
    bgStyle.backgroundColor = value > 0
      ? `rgba(16, 185, 129, ${opacity})`
      : `rgba(239, 68, 68, ${opacity})`;
    bgStyle.borderRadius = 4;
    bgStyle.padding = '2px 6px';
    bgStyle.display = 'inline-block';
  }

  return (
    <Text size="sm" fw={600} c={color} style={bgStyle}>
      {prefix}{value.toFixed(decimals)}%
    </Text>
  );
}
