import { Menu } from '@mantine/core';
import {
  IconExternalLink,
  IconStar,
  IconStarFilled,
  IconCopy,
  IconChartLine,
  IconDownload,
} from '@tabler/icons-react';

/**
 * Context menu for table rows (right-click)
 * @param {Object} record - The row data
 * @param {Function} onNavigate - Navigate to stock detail
 * @param {Function} onToggleWatchlist - Add/remove from watchlist
 * @param {boolean} isWatched - Whether the symbol is watched
 * @param {Function} onCopySymbol - Copy symbol to clipboard
 * @param {Function} onCompare - Compare with another stock
 */
export default function TableContextMenu({
  record,
  onNavigate,
  onToggleWatchlist,
  isWatched,
  onCopySymbol,
  onCompare,
  position,
  onClose,
}) {
  if (!record) return null;

  const symbol = record.symbol;

  return (
    <Menu
      opened
      position="bottom-start"
      onClose={onClose}
      withinPortal
      styles={{
        dropdown: {
          position: 'fixed',
          left: position.x,
          top: position.y,
        },
      }}
    >
      <Menu.Dropdown>
        <Menu.Label>{symbol}</Menu.Label>

        {onNavigate && (
          <Menu.Item
            leftSection={<IconExternalLink size={16} />}
            onClick={() => {
              onNavigate(record);
              onClose();
            }}
          >
            بازکردن در تب جدید
          </Menu.Item>
        )}

        {onToggleWatchlist && (
          <Menu.Item
            leftSection={isWatched ? <IconStarFilled size={16} /> : <IconStar size={16} />}
            onClick={() => {
              onToggleWatchlist(symbol);
              onClose();
            }}
          >
            {isWatched ? 'حذف از دیده‌بان' : 'افزودن به دیده‌بان'}
          </Menu.Item>
        )}

        <Menu.Divider />

        {onCopySymbol && (
          <Menu.Item
            leftSection={<IconCopy size={16} />}
            onClick={() => {
              onCopySymbol(symbol);
              onClose();
            }}
          >
            کپی نماد
          </Menu.Item>
        )}

        {onCompare && (
          <Menu.Item
            leftSection={<IconChartLine size={16} />}
            onClick={() => {
              onCompare(record);
              onClose();
            }}
          >
            مقایسه با...
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
