import { useRef, useEffect, useState } from 'react';
import { Text } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';

export default function PercentChangeCell({ value, decimals = 2, showSign = true, heatmap = true }) {
  if (value == null) return <Text size="sm">-</Text>;
  const color = value > 0 ? rallyColors.green : value < 0 ? rallyColors.red : undefined;
  const prefix = showSign && value > 0 ? '+' : '';

  // Flash on value change
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(id);
    }
  }, [value]);

  // Heatmap background: intensity based on magnitude
  const bgStyle = { direction: 'ltr', transition: 'background-color 0.4s ease' };
  if (heatmap && value !== 0) {
    const absVal = Math.min(Math.abs(value), 10); // cap at 10% for color intensity
    const baseOpacity = 0.05 + (absVal / 10) * 0.15; // 0.05 to 0.20 opacity range
    const opacity = flash ? baseOpacity + 0.15 : baseOpacity;
    bgStyle.backgroundColor = value > 0
      ? `rgba(34, 197, 94, ${opacity})`
      : `rgba(239, 68, 68, ${opacity})`;
    bgStyle.borderRadius = 4;
    bgStyle.padding = '2px 6px';
    bgStyle.display = 'inline-block';
  }

  return (
    <Text size="sm" fw={600} c={color} style={bgStyle}>
      {prefix}{toPersianNum(value.toFixed(decimals))}%
    </Text>
  );
}
