/**
 * Loan Selection Bar
 * Floating action bar that appears when loans are selected
 */

import { useNavigate } from 'react-router-dom';
import { Group, Text, Button, Badge, Box } from '@mantine/core';
import { IconArrowsExchange, IconX } from '@tabler/icons-react';
import { useLoanSelection } from '@/context/LoanSelectionContext';
import rallyColors from '@/theme/rallyColors';

export function LoanSelectionBar() {
  const navigate = useNavigate();
  const { clearSelection, selectionCount, maxSelection } =
    useLoanSelection();

  if (selectionCount === 0) {
    return null;
  }

  const canCompare = selectionCount >= 2;

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}
    >
      <Group
        gap="md"
        style={{
          backgroundColor: rallyColors.card,
          border: `1px solid ${rallyColors.border}`,
          borderRadius: 8,
          boxShadow: rallyColors.glassShadow,
          padding: '1rem',
          minWidth: 400,
        }}
      >
        {/* Selection Count */}
        <Group gap="xs">
          <Badge color="blue" size="sm">
            {selectionCount} / {maxSelection}
          </Badge>
          <Text size="sm" c={rallyColors.textSecondary}>
            وام انتخاب شده
          </Text>
        </Group>

        {/* Actions */}
        <Group gap="xs" style={{ marginInlineStart: 'auto' }}>
          {canCompare ? (
            <Button
              onClick={() => navigate('/dashboard/loans/compare')}
              size="sm"
              leftSection={<IconArrowsExchange size={16} />}
            >
              مقایسه وام‌ها
            </Button>
          ) : (
            <Text size="sm" c={rallyColors.textSecondary}>
              حداقل ۲ وام انتخاب کنید
            </Text>
          )}

          <Button
            onClick={clearSelection}
            variant="subtle"
            size="sm"
            color="red"
            leftSection={<IconX size={16} />}
          >
            پاک کردن
          </Button>
        </Group>
      </Group>
    </Box>
  );
}

export default LoanSelectionBar;
