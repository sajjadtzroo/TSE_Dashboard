/**
 * Bank Header Component
 * Displays bank name, badges, website link, and description
 */

import { memo } from 'react';
import { Group, Stack, Title, Text, Badge, Avatar, Anchor } from '@mantine/core';
import { IconBuildingBank, IconGlobe } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { Bank } from '@/types';

interface BankHeaderProps {
  bank: Bank;
  isDigital: boolean;
}

export const BankHeader = memo(function BankHeader({
  bank,
  isDigital,
}: BankHeaderProps) {
  return (
    <Group
      justify="space-between"
      align="flex-start"
      wrap="wrap"
      gap="md"
    >
      <Group gap="md" align="flex-start">
        <Avatar
          src={bank.logo || null}
          size={64}
          radius="md"
          color="blue"
          styles={{
            root: {
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              flexShrink: 0,
            },
          }}
        >
          <IconBuildingBank size={36} color={rallyColors.blue} />
        </Avatar>
        <Stack gap={4}>
          <Title order={2} c={rallyColors.textPrimary}>
            {bank.nameFA}
          </Title>
          <Text c={rallyColors.textSecondary}>{bank.nameEN}</Text>
          {(bank.parentBankFA ?? bank.extraBankData?.parentBankFA) && (
            <Text size="sm" c={rallyColors.textSecondary} mt={4}>
              زیرمجموعه: {bank.parentBankFA ?? bank.extraBankData?.parentBankFA}
            </Text>
          )}
          <Group gap="xs" mt="xs" wrap="wrap">
            <Badge
              color={isDigital ? 'violet' : 'blue'}
              variant="light"
            >
              {isDigital ? 'بانک دیجیتال' : 'بانک سنتی'}
            </Badge>
            {bank.type && (
              <Badge color="gray" variant="light">
                {bank.type}
              </Badge>
            )}
            {bank.calculationMethod && (
              <Badge color="green" variant="light">
                {bank.calculationMethod}
              </Badge>
            )}
            {bank.invitationBased && (
              <Badge color="yellow" variant="light">
                دعوت‌نامه‌ای
              </Badge>
            )}
          </Group>
        </Stack>
      </Group>
      {bank.website && (
        <Anchor
          href={bank.website}
          target="_blank"
          rel="noopener noreferrer"
          underline="never"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: rallyColors.blue,
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid rgba(59, 130, 246, 0.3)',
            transition: 'border-color 200ms ease',
          }}
        >
          <IconGlobe size={16} />
          <span>وبسایت رسمی</span>
        </Anchor>
      )}
    </Group>
  );
});
