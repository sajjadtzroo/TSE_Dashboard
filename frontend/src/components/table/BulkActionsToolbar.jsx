import { useEffect, useRef } from 'react';
import { Group, Text, Button, Paper } from '@mantine/core';
import {
  IconX,
  IconStar,
  IconDownload,
  IconChartLine,
  IconTrash,
} from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

/**
 * Bulk actions toolbar shown when rows are selected
 * @param {number} selectedCount - Number of selected rows
 * @param {Function} onClear - Clear selection
 * @param {Function} onAddToWatchlist - Add selected to watchlist
 * @param {Function} onExport - Export selected rows
 * @param {Function} onCompare - Compare selected stocks
 * @param {Function} onDelete - Delete selected (optional)
 */
export default function BulkActionsToolbar({
  selectedCount,
  onClear,
  onAddToWatchlist,
  onExport,
  onCompare,
  onDelete,
}) {
  const prevCount = useRef(0);
  const toolbarRef = useRef(null);

  // Move focus to toolbar when selection first appears (0 → 1+)
  useEffect(() => {
    if (selectedCount > 0 && prevCount.current === 0 && toolbarRef.current) {
      toolbarRef.current.focus();
    }
    prevCount.current = selectedCount;
  }, [selectedCount]);

  if (selectedCount === 0) return null;

  return (
    <Paper
      ref={toolbarRef}
      tabIndex={-1}
      p="md"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        backgroundColor: rallyColors.cardBackground,
        border: `1px solid ${rallyColors.accent}`,
        borderRadius: 0,
      }}
    >
      {/* Screen reader announcement */}
      <span
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        {selectedCount} ردیف انتخاب شد
      </span>
      <Group justify="space-between">
        <Group>
          <Text size="sm" fw={600} c={rallyColors.accent}>
            {selectedCount} ردیف انتخاب شده
          </Text>
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<IconX size={14} />}
            onClick={onClear}
          >
            لغو انتخاب
          </Button>
        </Group>

        <Group gap="xs">
          {onAddToWatchlist && (
            <Button
              size="xs"
              variant="light"
              color="yellow"
              leftSection={<IconStar size={14} />}
              onClick={onAddToWatchlist}
            >
              افزودن به دیده‌بان
            </Button>
          )}

          {onCompare && selectedCount >= 2 && selectedCount <= 5 && (
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<IconChartLine size={14} />}
              onClick={onCompare}
            >
              مقایسه ({selectedCount})
            </Button>
          )}

          {onExport && (
            <Button
              size="xs"
              variant="light"
              color="rally-primary"
              leftSection={<IconDownload size={14} />}
              onClick={onExport}
            >
              صادرات انتخاب‌شده
            </Button>
          )}

          {onDelete && (
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={onDelete}
            >
              حذف
            </Button>
          )}
        </Group>
      </Group>
    </Paper>
  );
}
