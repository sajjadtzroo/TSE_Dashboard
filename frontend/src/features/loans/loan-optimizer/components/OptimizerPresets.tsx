import React from 'react';
import { Box, Text, Group, SimpleGrid, UnstyledButton } from '@mantine/core';
import { IconBolt, IconHome, IconBuilding } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { RiskTolerance } from '../types';
import OptimizerInfoTooltip from './OptimizerInfoTooltip';

interface Preset {
  name: string;
  icon: React.ReactNode;
  description: string;
  values: {
    depositAmount: number;
    depositMonths: number;
    loanAmountNeeded: number;
    riskTolerance: RiskTolerance;
  };
}

const presets: Preset[] = [
  {
    name: 'خرید خانه',
    icon: <IconHome size={20} />,
    description: 'برای خرید خانه اولین',
    values: {
      depositAmount: 50_000_000,
      depositMonths: 6,
      loanAmountNeeded: 500_000_000,
      riskTolerance: 'low',
    },
  },
  {
    name: 'وام کسب‌وکار',
    icon: <IconBuilding size={20} />,
    description: 'برای توسعه کسب‌وکار',
    values: {
      depositAmount: 20_000_000,
      depositMonths: 3,
      loanAmountNeeded: 200_000_000,
      riskTolerance: 'medium',
    },
  },
  {
    name: 'نقدینگی سریع',
    icon: <IconBolt size={20} />,
    description: 'برای نیاز فوری به پول',
    values: {
      depositAmount: 10_000_000,
      depositMonths: 1,
      loanAmountNeeded: 50_000_000,
      riskTolerance: 'high',
    },
  },
];

interface OptimizerPresetsProps {
  onApply: (preset: Preset) => void;
}

const OptimizerPresets: React.FC<OptimizerPresetsProps> = ({ onApply }) => (
  <Box
    mb="lg"
    p="md"
    style={{
      backgroundColor: rallyColors.elevated,
      borderRadius: 8,
      border: `1px solid ${rallyColors.border}`,
    }}
  >
    <Group gap="xs" mb="sm">
      <IconBolt size={20} color="#BB86FC" />
      <Text size="sm" fw={500} c={rallyColors.textPrimary}>
        سناریوهای آماده
      </Text>
      <OptimizerInfoTooltip text="با کلیک روی هر سناریو، فیلدها به طور خودکار پر می‌شوند" />
    </Group>
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
      {presets.map((preset) => (
        <UnstyledButton
          key={preset.name}
          onClick={() => onApply(preset)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            backgroundColor: rallyColors.card,
            border: `1px solid ${rallyColors.border}`,
            borderRadius: 8,
            textAlign: 'right',
            transition: 'all 0.2s',
          }}
        >
          <Box
            p="xs"
            style={{
              backgroundColor: 'rgba(187, 134, 252, 0.1)',
              borderRadius: 8,
            }}
          >
            {preset.icon}
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={500} c={rallyColors.textPrimary} size="sm">
              {preset.name}
            </Text>
            <Text size="xs" c={rallyColors.textSecondary} truncate>
              {preset.description}
            </Text>
          </Box>
        </UnstyledButton>
      ))}
    </SimpleGrid>
  </Box>
);

export default OptimizerPresets;
export type { Preset };
