import { SegmentedControl, Tooltip } from '@mantine/core';
import { IconLayoutGrid, IconLayoutList } from '@tabler/icons-react';
import { useWidgetSize } from '../core/context/WidgetSizeContext';

const OPTIONS = [
  {
    value: 'default',
    label: (
      <Tooltip label="نمای کامل" position="bottom" withArrow>
        <IconLayoutGrid size={14} stroke={1.5} />
      </Tooltip>
    ),
  },
  {
    value: 'compact',
    label: (
      <Tooltip label="نمای فشرده" position="bottom" withArrow>
        <IconLayoutList size={14} stroke={1.5} />
      </Tooltip>
    ),
  },
];

export default function KPIGridControl() {
  const { density, setDensity } = useWidgetSize();
  return (
    <SegmentedControl
      size="xs"
      value={density}
      onChange={setDensity}
      data={OPTIONS}
      styles={{ root: { background: 'transparent' } }}
    />
  );
}
