import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Group, Text, Badge, ThemeIcon, Box } from '@mantine/core';
import { IconBuildingBank, IconCreditCard, IconArrowLeft } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';
import type { Bank } from '@/types';

interface BankCardProps {
  bank: Bank;
}

export const BankCard = React.memo(({ bank }: BankCardProps) => {
  const isDigital = bank.category === 'digital-banks';

  return (
    <Card
      component={Link}
      to={`/banks/${bank.id}`}
      padding="lg"
      radius="md"
      style={{
        backgroundColor: rallyColors.GLASS_BG,
        border: `1px solid ${rallyColors.GLASS_BORDER}`,
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
      }}
      styles={{
        root: {
          '&:hover': {
            borderColor: 'rgba(16,185,129,0.4)',
            transform: 'translateY(-2px)',
          },
        },
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Group gap="sm">
          <ThemeIcon
            size={42}
            radius="md"
            variant="light"
            color="rally-green"
          >
            <IconBuildingBank size={22} stroke={1.5} />
          </ThemeIcon>
          <div>
            <Text fw={600} size="lg" c={rallyColors.TEXT_PRIMARY}>
              {bank.nameFA}
            </Text>
            <Text size="sm" c={rallyColors.TEXT_SECONDARY}>
              {bank.nameEN}
            </Text>
          </div>
        </Group>
        <Badge
          color={isDigital ? 'violet' : 'blue'}
          variant="light"
          size="sm"
        >
          {isDigital ? 'دیجیتال' : 'سنتی'}
        </Badge>
      </Group>

      <Box
        mt="md"
        pt="md"
        style={{ borderTop: `1px solid ${rallyColors.GLASS_BORDER}` }}
      >
        <Group justify="space-between">
          <Group gap="xs">
            <IconCreditCard size={16} color={rallyColors.RALLY_GREEN} />
            <Text size="sm" c={rallyColors.TEXT_SECONDARY}>
              {bank.loansCount} محصول وام
            </Text>
          </Group>
          <IconArrowLeft
            size={18}
            color={rallyColors.TEXT_DIMMED}
            style={{ transition: 'transform 0.2s' }}
          />
        </Group>
      </Box>
    </Card>
  );
});

BankCard.displayName = 'BankCard';

export default BankCard;
