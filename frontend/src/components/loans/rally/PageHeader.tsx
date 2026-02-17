import { type ReactNode } from 'react';
import { Group, Title } from '@mantine/core';

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
      <Title order={3}>{title}</Title>
      {children && (
        <Group gap="xs" align="center" wrap="wrap">
          {children}
        </Group>
      )}
    </Group>
  );
}
