import { Alert, Button, Group } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

/**
 * Shared loading / error guard for page components.
 * Renders a skeleton during initial load and an error alert if the fetch failed
 * before any data was available. Otherwise renders children normally.
 */
export default function PageShell({ loading, error, hasData, skeleton, onRetry, children }) {
  if (loading && !hasData) return skeleton || null;

  if (error && !hasData) {
    return (
      <Alert color="red" title="خطا در بارگذاری داده‌ها">
        {error}
        {onRetry && (
          <Group mt="sm">
            <Button size="xs" variant="light" color="red" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
              تلاش مجدد
            </Button>
          </Group>
        )}
      </Alert>
    );
  }

  return <>{children}</>;
}
