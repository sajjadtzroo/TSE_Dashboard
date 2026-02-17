import { type ReactNode } from 'react';
import { Center, Stack, Text } from '@mantine/core';
import { IconDatabaseOff } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function Empty({
  title = 'اطلاعاتی یافت نشد',
  description,
  icon,
  action,
}: EmptyProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        {icon || <IconDatabaseOff size={48} stroke={1} color={rallyColors.textDimmed} />}
        <Text size="lg" fw={500}>
          {title}
        </Text>
        {description && (
          <Text size="sm" c="dimmed" maw={400} ta="center">
            {description}
          </Text>
        )}
        {action && <div>{action}</div>}
      </Stack>
    </Center>
  );
}

export default Empty;
