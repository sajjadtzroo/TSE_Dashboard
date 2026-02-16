import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

/**
 * Hook for virtualizing large tables
 * @param {Array} data - The data to virtualize
 * @param {number} estimateSize - Estimated row height (default: 48px)
 * @param {number} overscan - Number of items to render outside viewport (default: 5)
 */
export default function useVirtualization(data, estimateSize = 48, overscan = 5) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: data?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return {
    parentRef,
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}
