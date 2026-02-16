import { Card, Group, Skeleton, Stack } from '@mantine/core';

export default function RallyKPISkeleton({ variant = 'filled' }) {
  if (variant === 'accent-bar') {
    return (
      <Card withBorder radius="md" p="md">
        <Group gap="sm" align="flex-start">
          <Skeleton height={40} width={40} radius="md" />
          <Stack gap={6}>
            <Skeleton height={20} width={80} radius="sm" />
            <Skeleton height={12} width={120} radius="sm" />
          </Stack>
        </Group>
      </Card>
    );
  }

  return (
    <Card radius="md" p="lg" style={{ backgroundColor: 'rgba(148, 163, 184, 0.06)', border: 'none' }}>
      <Group gap="sm">
        <Skeleton height={44} width={44} radius="md" />
        <Stack gap={6}>
          <Skeleton height={22} width={90} radius="sm" />
          <Skeleton height={12} width={110} radius="sm" />
        </Stack>
      </Group>
    </Card>
  );
}
