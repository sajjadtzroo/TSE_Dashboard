import { Popover, Button, Stack, Text, Checkbox, Group, Box, ActionIcon, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconChartLine, IconSettings } from '@tabler/icons-react';
import indicatorMeta from '../utils/indicatorMeta';

const overlayKeys = Object.entries(indicatorMeta).filter(([, m]) => m.category === 'overlay').map(([k]) => k);
const subchartKeys = Object.entries(indicatorMeta).filter(([, m]) => m.category === 'subchart').map(([k]) => k);

// Quick-access indicators shown as toggle buttons directly in the toolbar
const QUICK_INDICATORS = ['sma20', 'ema12', 'bollinger', 'rsi', 'macd'];

export default function IndicatorToggle({ prefs = {}, onToggle }) {
  const isMobile = useMediaQuery('(max-width: 48em)');

  return (
    <Group gap={4}>
      {/* Quick-access toggle buttons — hidden on mobile to save space */}
      {!isMobile && QUICK_INDICATORS.map((key) => {
        const meta = indicatorMeta[key];
        const active = !!prefs[key];
        return (
          <Tooltip key={key} label={meta.desc} position="bottom" withArrow>
            <Button
              size="compact-xs"
              variant={active ? 'filled' : 'subtle'}
              color={active ? 'rally-green' : 'gray'}
              onClick={() => onToggle(key)}
              styles={{
                root: {
                  fontWeight: 500,
                  fontSize: 11,
                  borderLeft: `3px solid ${meta.color}`,
                  paddingLeft: 6,
                  paddingRight: 8,
                },
              }}
            >
              {meta.label}
            </Button>
          </Tooltip>
        );
      })}

      {/* Full popover for all indicators */}
      <Popover position="bottom-end" withArrow shadow="md" width={isMobile ? 200 : 220}>
        <Popover.Target>
          <Tooltip label="همه اندیکاتورها" position="bottom" withArrow>
            <ActionIcon variant="subtle" size="sm" color="gray">
              <IconSettings size={14} />
            </ActionIcon>
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown>
          <Text size="xs" fw={600} mb="xs">روی نمودار</Text>
          <Stack gap={4} mb="sm">
            {overlayKeys.map((key) => {
              const meta = indicatorMeta[key];
              return (
                <Checkbox
                  key={key}
                  size="xs"
                  checked={!!prefs[key]}
                  onChange={() => onToggle(key)}
                  label={
                    <Group gap={6}>
                      <Box w={10} h={10} style={{ background: meta.color, borderRadius: 2 }} />
                      <Text size="xs">{meta.label}</Text>
                    </Group>
                  }
                />
              );
            })}
          </Stack>
          <Text size="xs" fw={600} mb="xs">زیرنمودار</Text>
          <Stack gap={4}>
            {subchartKeys.map((key) => {
              const meta = indicatorMeta[key];
              return (
                <Checkbox
                  key={key}
                  size="xs"
                  checked={!!prefs[key]}
                  onChange={() => onToggle(key)}
                  label={
                    <Group gap={6}>
                      <Box w={10} h={10} style={{ background: meta.color, borderRadius: 2 }} />
                      <Text size="xs">{meta.label}</Text>
                    </Group>
                  }
                />
              );
            })}
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
}
