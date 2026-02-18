import { Box, Group, Title } from '@mantine/core';
import rallyColors from '../theme/rallyColors';

export default function PageHeader({ title, children }) {
  return (
    <Box
      mb="md"
      p="sm"
      style={{
        background: rallyColors.glassBg,
        backdropFilter: rallyColors.glassBlur,
        border: `1px solid ${rallyColors.glassBorder}`,
        borderRadius: 'var(--mantine-radius-md)',
      }}
    >
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={3} style={{ color: rallyColors.textPrimary }}>{title}</Title>
        {children && (
          <Group
            gap={6}
            align="center"
            wrap="wrap"
            style={{
              background: 'rgba(148, 163, 184, 0.06)',
              borderRadius: 'var(--mantine-radius-md)',
              padding: '4px 10px',
              border: '1px solid rgba(148, 163, 184, 0.08)',
            }}
          >
            {children}
          </Group>
        )}
      </Group>
    </Box>
  );
}
