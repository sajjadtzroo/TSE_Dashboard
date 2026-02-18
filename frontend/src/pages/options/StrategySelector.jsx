import { Group, Badge, Select } from '@mantine/core';
import { STRATEGY_LABELS } from '../../utils/blackScholes';
import { POPULAR_STRATEGIES } from '../../constants/options';
import { STRATEGY_OPTIONS } from '../../hooks/useOptionsState';

export default function StrategySelector({ strategy, onStrategyChange }) {
  return (
    <Group gap="md" wrap="wrap">
      <Select
        data={STRATEGY_OPTIONS}
        value={strategy}
        onChange={onStrategyChange}
        w={220}
        size="sm"
      />
      {POPULAR_STRATEGIES.map((key) => (
        <Badge
          key={key}
          variant={strategy === key ? 'filled' : 'light'}
          color="rally-green"
          size="lg"
          style={{ cursor: 'pointer' }}
          styles={strategy === key ? { root: { color: '#000' } } : undefined}
          onClick={() => onStrategyChange(key)}
        >
          {STRATEGY_LABELS[key]}
        </Badge>
      ))}
    </Group>
  );
}
