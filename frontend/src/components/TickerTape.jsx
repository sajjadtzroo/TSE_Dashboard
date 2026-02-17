import { Box, Group, Text } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight, IconMinus } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

function TickerItem({ item, isLast }) {
  const isPositive = item.change > 0;
  const isNegative = item.change < 0;
  const color = isPositive
    ? rallyColors.green
    : isNegative
      ? rallyColors.red
      : rallyColors.textDimmed;
  const Icon = isPositive
    ? IconArrowUpRight
    : isNegative
      ? IconArrowDownRight
      : IconMinus;

  return (
    <Group gap={0} wrap="nowrap" align="center" className="ticker-item">
      <Group gap={5} wrap="nowrap" align="center" style={{ padding: '0 6px' }}>
        <Icon size={11} color={color} style={{ flexShrink: 0 }} />
        <Text
          size="xs"
          fw={600}
          c={rallyColors.textPrimary}
          style={{ whiteSpace: 'nowrap' }}
        >
          {item.symbol}
        </Text>
        <Text
          size="xs"
          fw={700}
          style={{ whiteSpace: 'nowrap', color, fontVariantNumeric: 'tabular-nums' }}
        >
          {isPositive ? '+' : ''}
          {item.change.toFixed(2)}%
        </Text>
      </Group>
      {!isLast && (
        <Box
          style={{
            width: 1,
            height: 14,
            background: 'rgba(148, 163, 184, 0.15)',
            flexShrink: 0,
          }}
        />
      )}
    </Group>
  );
}

export default function TickerTape({ items }) {
  if (!items || items.length === 0) return null;

  const renderItems = (keyPrefix) =>
    items.map((item, i) => (
      <TickerItem key={`${keyPrefix}-${i}`} item={item} isLast={i === items.length - 1} />
    ));

  return (
    <Box
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: 34,
        background: 'rgba(19, 23, 32, 0.75)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Left fade mask */}
      <Box
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background: 'linear-gradient(to right, rgba(11, 14, 20, 0.95), transparent)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Scrolling content — duplicated for seamless loop */}
      <div className="ticker-tape">
        <Group gap={4} wrap="nowrap" style={{ paddingRight: 24 }}>
          {renderItems('a')}
        </Group>
        <Group gap={4} wrap="nowrap" style={{ paddingRight: 24 }}>
          {renderItems('b')}
        </Group>
      </div>

      {/* Right fade mask */}
      <Box
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background: 'linear-gradient(to left, rgba(11, 14, 20, 0.95), transparent)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Subtle top highlight */}
      <Box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.1), transparent)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}
