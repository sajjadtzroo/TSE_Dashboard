import { Center, Stack, Text, Button } from '@mantine/core';
import { IconDatabaseOff } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

export default function RallyEmptyState({ message = 'No data available', onRetry }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <IconDatabaseOff size={48} stroke={1} color={rallyColors.textDimmed} />
        <Text size="lg" c="dimmed">
          {message}
        </Text>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Stack>
    </Center>
  );
}
