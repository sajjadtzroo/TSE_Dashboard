import { Text, Group } from '@mantine/core';
import rallyColors from '../theme/rallyColors';

export default function TickerTape({ items }) {
  if (!items || items.length === 0) return null;

  const renderItems = () =>
    items.map((item, i) => (
      <Group key={i} gap={6} wrap="nowrap" align="center">
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
          fw={600}
          c={item.change >= 0 ? rallyColors.green : rallyColors.red}
          style={{ whiteSpace: 'nowrap' }}
        >
          {item.change >= 0 ? '+' : ''}
          {item.change.toFixed(2)}%
        </Text>
        {i < items.length - 1 && (
          <Text size="xs" c={rallyColors.textDimmed} style={{ whiteSpace: 'nowrap' }}>
            &middot;
          </Text>
        )}
      </Group>
    ));

  return (
    <div
      style={{
        overflow: 'hidden',
        height: 32,
        background: 'rgba(19, 23, 32, 0.6)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="ticker-tape">
        <Group gap={12} wrap="nowrap" style={{ paddingRight: 24 }}>
          {renderItems()}
        </Group>
        <Group gap={12} wrap="nowrap" style={{ paddingRight: 24 }}>
          {renderItems()}
        </Group>
      </div>
    </div>
  );
}
