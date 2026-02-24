import { useState } from 'react';
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import {
  IconTrendingUp,
  IconMinus,
  IconSeparator,
  IconChartLine,
  IconTextSize,
  IconTrash,
} from '@tabler/icons-react';

// Fibonacci SVG icon (no Tabler equivalent)
function IconFibonacci({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 20 L21 4" />
      <path d="M3 14 L21 14" opacity="0.5" />
      <path d="M3 9 L21 9" opacity="0.3" />
    </svg>
  );
}

const TOOLS = [
  { label: 'خط روند',   icon: IconTrendingUp,  overlay: 'segment'                },
  { label: 'خط افقی',   icon: IconMinus,        overlay: 'horizontalStraightLine' },
  { label: 'خط عمودی',  icon: IconSeparator,    overlay: 'verticalStraightLine'   },
  { label: 'فیبوناچی',  icon: IconFibonacci,    overlay: 'fibonacciLine'          },
  { label: 'کانال',     icon: IconChartLine,    overlay: 'priceChannelLine'       },
  { label: 'برچسب',     icon: IconTextSize,     overlay: 'simpleAnnotation'       },
];

export default function DrawingToolbar({ chartRef }) {
  const [activeTool, setActiveTool] = useState(null);

  const handleToolClick = (overlay) => {
    const chart = chartRef?.current;
    if (!chart) return;

    if (activeTool === overlay) {
      // Second click on same tool → deactivate (escape pending draw)
      setActiveTool(null);
      return;
    }

    setActiveTool(overlay);
    chart.createOverlay({ name: overlay });
    // After overlay is placed KLineChart auto-deactivates drawing mode;
    // reset our local state on the next draw so toolbar stays consistent.
    setTimeout(() => setActiveTool(null), 100);
  };

  const handleClearAll = () => {
    chartRef?.current?.removeOverlay();
    setActiveTool(null);
  };

  return (
    <Group gap="xs">
      {TOOLS.map(({ label, icon: Icon, overlay }) => (
        <Tooltip key={overlay} label={label} position="bottom">
          <ActionIcon
            size="sm"
            variant={activeTool === overlay ? 'filled' : 'subtle'}
            color={activeTool === overlay ? 'rally-primary' : 'gray'}
            onClick={() => handleToolClick(overlay)}
            aria-label={label}
          >
            <Icon size={14} />
          </ActionIcon>
        </Tooltip>
      ))}

      <Tooltip label="پاک کردن همه" position="bottom">
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={handleClearAll}
          aria-label="پاک کردن"
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
