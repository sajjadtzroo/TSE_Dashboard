import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Text, Stack } from '@mantine/core';
import rallyColors from '../../../../theme/rallyColors';

/**
 * SVG semi-circular gauge showing risk score 0-100.
 * Animated arc fill via motion.path.
 */
export default function RiskGauge({ score = 0, label, color, size = 200 }) {
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 16;
  const strokeWidth = 14;

  // Semi-circle arc (180 degrees, from left to right)
  const { bgPath, fillPath } = useMemo(() => {
    const startAngle = Math.PI;
    const endAngle = 0;
    const clampedScore = Math.max(0, Math.min(100, score));
    const sweepAngle = startAngle - (clampedScore / 100) * Math.PI;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy - r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy - r * Math.sin(endAngle);
    const x3 = cx + r * Math.cos(sweepAngle);
    const y3 = cy - r * Math.sin(sweepAngle);

    const bg = `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
    const fill = `M ${x1} ${y1} A ${r} ${r} 0 ${clampedScore > 50 ? 1 : 0} 1 ${x3} ${y3}`;

    return { bgPath: bg, fillPath: fill };
  }, [score, cx, cy, r]);

  const displayColor = color || rallyColors.green;

  return (
    <Stack align="center" gap={0}>
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Glow filter */}
        <defs>
          <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={displayColor} floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke={rallyColors.border}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        <motion.path
          d={fillPath}
          fill="none"
          stroke={displayColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          filter="url(#gauge-glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Score text in center */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill={rallyColors.textPrimary}
          fontSize={size * 0.2}
          fontWeight="700"
          fontFamily="Poppins, sans-serif"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill={rallyColors.textSecondary}
          fontSize={12}
        >
          از ۱۰۰
        </text>
      </svg>

      {label && (
        <Text
          size="lg"
          fw={700}
          ta="center"
          style={{ color: displayColor }}
          mt={-4}
        >
          {label}
        </Text>
      )}
    </Stack>
  );
}
