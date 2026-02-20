import { Alert, Button, Group } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

/**
 * Standardised error display used by data pages.
 *
 * @param {string}   error   - Error message to show
 * @param {Function} [onRetry] - Optional retry callback
 */
export default function ErrorAlert({ error, onRetry }) {
  return (
    <Alert color="red" title="خطا" icon={<IconAlertCircle size={18} />}>
      <Group justify="space-between" align="center">
        <span>{error}</span>
        {onRetry && (
          <Button size="xs" variant="light" color="red" onClick={onRetry}>
            تلاش مجدد
          </Button>
        )}
      </Group>
    </Alert>
  );
}
