import { Center, Stack, Text, Button } from '@mantine/core';
import { IconDatabaseOff } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

interface RallyEmptyStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function RallyEmptyState({ message = 'داده‌ای موجود نیست', onRetry }: RallyEmptyStateProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <IconDatabaseOff size={48} stroke={1} color={rallyColors.textDimmed} />
        <Text size="lg" c="dimmed">
          {message}
        </Text>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            تلاش مجدد
          </Button>
        )}
      </Stack>
    </Center>
  );
}
