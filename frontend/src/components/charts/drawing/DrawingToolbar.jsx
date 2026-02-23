import { ActionIcon, Group, Tooltip } from '@mantine/core';
import {
  IconTrendingUp,
  IconMinus,
  IconSeparator,
  IconRectangle,
  IconTrash,
} from '@tabler/icons-react';

const TOOLS = [
  { label: 'خط روند',  icon: IconTrendingUp, value: 'trend-line' },
  { label: 'خط افقی',  icon: IconMinus,      value: 'h-line'     },
  { label: 'خط عمودی', icon: IconSeparator,  value: 'v-line'     },
  { label: 'مستطیل',   icon: IconRectangle,  value: 'rectangle'  },
];

export default function DrawingToolbar({ activeTool, onToolChange, onClearAll }) {
  return (
    <Group gap="xs">
      {TOOLS.map(({ label, icon: Icon, value }) => (
        <Tooltip key={value} label={label} position="bottom">
          <ActionIcon
            size="sm"
            variant={activeTool === value ? 'filled' : 'subtle'}
            color={activeTool === value ? 'rally-green' : 'gray'}
            onClick={() => onToolChange(value)}
            aria-label={label}
          >
            <Icon size={14} />
          </ActionIcon>
        </Tooltip>
      ))}

      <Tooltip label="پاک کردن" position="bottom">
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={onClearAll}
          aria-label="پاک کردن"
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
