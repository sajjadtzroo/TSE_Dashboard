import React from 'react';
import { Tooltip, ActionIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';

const OptimizerInfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <Tooltip
    label={text}
    withArrow
    position="top"
    multiline
    maw={300}
    styles={{
      tooltip: {
        backgroundColor: '#1a1a1a',
        color: '#e5e5e5',
        fontSize: '0.75rem',
        border: '1px solid #3d3d3d',
      },
    }}
  >
    <ActionIcon variant="transparent" size="sm" c={rallyColors.textDimmed}>
      <IconInfoCircle size={16} />
    </ActionIcon>
  </Tooltip>
);

export default OptimizerInfoTooltip;
