import React from 'react';
import { Box, Text, Title, Group, Stack } from '@mantine/core';
import { IconTrendingUp } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';

const OptimizerHeader: React.FC = () => (
  <Group justify="space-between" mb="lg">
    <Group gap="sm">
      <Box
        p="sm"
        style={{
          backgroundColor: 'rgba(187, 134, 252, 0.1)',
          borderRadius: 8,
        }}
      >
        <IconTrendingUp size={24} color="#BB86FC" />
      </Box>
      <Stack gap={2}>
        <Title order={2} size="xl" fw={600} c={rallyColors.textPrimary}>
          پارامترهای ورودی
        </Title>
        <Text size="sm" c={rallyColors.textSecondary}>
          اطلاعات مورد نیاز برای مقایسه وام‌ها
        </Text>
      </Stack>
    </Group>
  </Group>
);

export default OptimizerHeader;
