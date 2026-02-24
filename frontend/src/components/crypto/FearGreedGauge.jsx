import { Box, Text, Stack } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import { FEAR_GREED_LABELS } from '../../constants/crypto';

/**
 * Semicircular SVG gauge for the Fear & Greed Index (0-100).
 * Color transitions: red (0) → yellow (50) → green (100).
 */
export default function FearGreedGauge({ value, label, size = 160 }) {
  if (value == null) return null;

  const clamped = Math.max(0, Math.min(100, value));
  const radius = 60;
  const cx = 80;
  const cy = 75;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (clamped / 100) * circumference;

  // Color based on value
  const color =
    clamped >= 70 ? rallyColors.green :
    clamped >= 55 ? '#22C55E' :
    clamped >= 45 ? rallyColors.yellow :
    clamped >= 25 ? '#F97316' :
    rallyColors.red;

  const persianLabel = FEAR_GREED_LABELS[label] || label || '';

  return (
    <Stack align="center" gap={4}>
      <svg width={size} height={size * 0.6} viewBox="0 0 160 95">
        {/* Background arc */}
        <path
          d="M 20 75 A 60 60 0 0 1 140 75"
          fill="none"
          stroke="#1E2234"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 20 75 A 60 60 0 0 1 140 75"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
        />
        {/* Center value */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill={rallyColors.textPrimary}
          fontSize="24"
          fontWeight="800"
          fontFamily="Poppins, sans-serif"
        >
          {clamped}
        </text>
      </svg>
      {persianLabel && (
        <Text size="sm" fw={600} c={color} ta="center">
          {persianLabel}
        </Text>
      )}
    </Stack>
  );
}
