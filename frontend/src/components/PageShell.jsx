import { Center, Stack, Text, Button } from '@mantine/core';
import { IconWifiOff } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

/**
 * Shared loading / error guard for page components.
 * Renders a skeleton during initial load and an error state if the fetch failed
 * before any data was available. Otherwise renders children normally.
 */
export default function PageShell({ loading, error, hasData, skeleton, onRetry, children }) {
  if (loading && !hasData) return skeleton || null;

  if (error && !hasData) {
    return (
      <Center py={80}>
        <Stack align="center" gap="md">
          <IconWifiOff size={48} stroke={1} color={rallyColors.textDimmed} />
          <Text size="lg" fw={600} c={rallyColors.textPrimary}>
            خطا در بارگذاری داده‌ها
          </Text>
          <Text size="sm" c="dimmed" maw={400} ta="center">
            {error}
          </Text>
          {onRetry && (
            <Button variant="light" color="red" onClick={onRetry}>
              تلاش مجدد
            </Button>
          )}
        </Stack>
      </Center>
    );
  }

  return <>{children}</>;
}
