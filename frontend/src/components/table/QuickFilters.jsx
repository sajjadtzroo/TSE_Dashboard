import { Button, Group } from '@mantine/core';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconVolume,
  IconFlame,
  IconClock,
  IconTarget,
  IconArrowsUpDown,
} from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

/**
 * Quick filter preset buttons for common table filters
 * @param {Array} presets - Array of preset configurations
 * @param {Function} onPresetClick - Callback when preset is clicked
 * @param {string} activePreset - Currently active preset key
 */
export default function QuickFilters({ presets, onPresetClick, activePreset }) {
  if (!presets || presets.length === 0) return null;

  const iconMap = {
    'trending-up': IconTrendingUp,
    'trending-down': IconTrendingDown,
    volume: IconVolume,
    flame: IconFlame,
    clock: IconClock,
    target: IconTarget,
    'arrows-up-down': IconArrowsUpDown,
  };

  return (
    <Group gap="xs">
      {presets.map((preset) => {
        const Icon = iconMap[preset.icon] || IconTarget;
        const isActive = activePreset === preset.key;

        return (
          <Button
            key={preset.key}
            size="xs"
            variant={isActive ? 'filled' : 'light'}
            color={isActive ? 'rally-green' : 'gray'}
            leftSection={<Icon size={14} />}
            onClick={() => onPresetClick(isActive ? null : preset.key)}
            aria-pressed={isActive}
            styles={{
              root: {
                transition: 'all 150ms ease',
                border: isActive ? `1px solid ${rallyColors.accent}` : '1px solid transparent',
              },
            }}
          >
            {preset.label}
          </Button>
        );
      })}
    </Group>
  );
}
