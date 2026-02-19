import { Center, Stack, Text, Button } from '@mantine/core';
import { IconDatabaseOff } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

export default function RallyEmptyState({
  message = 'داده‌ای موجود نیست',
  icon: Icon = IconDatabaseOff,
  actionLabel,
  onAction,
  onRetry,
}) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <Icon size={48} stroke={1} color={rallyColors.textDimmed} />
        <Text size="lg" c="dimmed">
          {message}
        </Text>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            تلاش مجدد
          </Button>
        )}
        {actionLabel && onAction && (
          <Button variant="light" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Center>
  );
}
