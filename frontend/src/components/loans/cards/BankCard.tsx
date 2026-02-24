import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Group, Text, Badge, Avatar, Box } from '@mantine/core';
import { IconBuildingBank, IconCreditCard, IconArrowLeft } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { Bank } from '@/types';

interface BankCardProps {
  bank: Bank;
}

export const BankCard = React.memo(({ bank }: BankCardProps) => {
  const isDigital = bank.category === 'digital-banks';

  return (
    <Card
      component={Link}
      to={`/loans/banks/${bank.id}`}
      padding="lg"
      radius="md"
      style={{
        backgroundColor: rallyColors.glassBg,
        border: `1px solid ${rallyColors.glassBorder}`,
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
      }}
      styles={{
        root: {
          transition: 'all 0.2s ease',
        },
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Group gap="sm">
          <Avatar
            src={bank.logo || null}
            size={42}
            radius="md"
            color="blue"
            styles={{
              root: {
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              },
            }}
          >
            <IconBuildingBank size={22} stroke={1.5} />
          </Avatar>
          <div>
            <Text fw={600} size="lg" c={rallyColors.textPrimary}>
              {bank.nameFA}
            </Text>
            <Text size="sm" c={rallyColors.textSecondary}>
              {bank.nameEN}
            </Text>
            {bank.descriptionFA && (
              <Text size="xs" c={rallyColors.textDimmed} mt={4} lineClamp={1}>
                {bank.descriptionFA}
              </Text>
            )}
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
        style={{ borderTop: `1px solid ${rallyColors.glassBorder}` }}
      >
        <Group justify="space-between">
          <Group gap="xs">
            <IconCreditCard size={16} color={rallyColors.primary} />
            <Text size="sm" c={rallyColors.textSecondary}>
              {bank.loansCount} محصول وام
            </Text>
          </Group>
          <IconArrowLeft
            size={18}
            color={rallyColors.textDimmed}
            style={{ transition: 'transform 0.2s' }}
          />
        </Group>
      </Box>
    </Card>
  );
});

BankCard.displayName = 'BankCard';

export default BankCard;
