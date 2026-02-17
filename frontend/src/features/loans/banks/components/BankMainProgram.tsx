/**
 * Bank Main Program Component
 * Displays main program information (Bank Iran Zamin style)
 */

import { memo } from 'react';
import { Group, Stack, Title, Text, Box, List } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { Bank } from '@/types';

interface BankMainProgramProps {
  mainProgram: Bank['mainProgram'];
}

export const BankMainProgram = memo(function BankMainProgram({
  mainProgram,
}: BankMainProgramProps) {
  if (!mainProgram) {
    return null;
  }

  return (
    <>
      <Group gap="xs" mb="md">
        <IconInfoCircle size={20} color={rallyColors.purple} />
        <Title order={4} c={rallyColors.textPrimary}>
          برنامه اصلی
        </Title>
      </Group>
      <Box
        style={{
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          padding: 16,
          borderRadius: 8,
        }}
      >
        <Stack gap="xs">
          {mainProgram.nameFA && (
            <Text fw={700} c={rallyColors.purple}>
              {mainProgram.nameFA}
            </Text>
          )}
          {mainProgram.descriptionFA && (
            <Text c="rgba(139, 92, 246, 0.8)">
              {mainProgram.descriptionFA}
            </Text>
          )}
          {mainProgram.benefitsFA && (
            <List size="sm" c="rgba(139, 92, 246, 0.8)">
              {(mainProgram.benefitsFA as string[]).map(
                (benefit: string, idx: number) => (
                  <List.Item key={idx}>{benefit}</List.Item>
                )
              )}
            </List>
          )}
        </Stack>
      </Box>
    </>
  );
});
