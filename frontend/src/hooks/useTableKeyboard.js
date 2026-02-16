import { useEffect } from 'react';

/**
 * Hook for table keyboard shortcuts
 * @param {Object} options - Configuration options
 * @param {Function} options.onSearch - Focus search input
 * @param {Function} options.onRefresh - Refresh data
 * @param {Function} options.onExport - Export data
 * @param {boolean} options.enabled - Whether shortcuts are enabled
 */
export default function useTableKeyboard({
  onSearch,
  onRefresh,
  onExport,
  enabled = true,
} = {}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input/textarea
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        // Allow ESC to clear search
        if (e.key === 'Escape' && onSearch) {
          e.target.blur();
        }
        return;
      }

      // Ctrl/Cmd + F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && onSearch) {
        e.preventDefault();
        onSearch();
      }

      // Ctrl/Cmd + R or F5: Refresh
      if (((e.ctrlKey || e.metaKey) && e.key === 'r') || e.key === 'F5') {
        if (onRefresh) {
          e.preventDefault();
          onRefresh();
        }
      }

      // Ctrl/Cmd + E: Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && onExport) {
        e.preventDefault();
        onExport();
      }

      // Forward slash (/): Focus search (like Gmail)
      if (e.key === '/' && onSearch) {
        e.preventDefault();
        onSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSearch, onRefresh, onExport, enabled]);
}
