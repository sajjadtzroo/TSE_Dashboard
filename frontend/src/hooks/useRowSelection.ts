import { useState, useCallback } from 'react';

export interface UseRowSelectionResult<T> {
  selectedRecords: T[];
  isSelected: (record: T) => boolean;
  toggleSelection: (record: T) => void;
  selectAll: (records: T[]) => void;
  clearSelection: () => void;
  toggleAll: (records: T[]) => void;
  selectedCount: number;
}

export default function useRowSelection<T extends Record<string, unknown>>(
  idAccessor = 'id',
): UseRowSelectionResult<T> {
  const [selectedRecords, setSelectedRecords] = useState<T[]>([]);

  const isSelected = useCallback(
    (record: T) => selectedRecords.some((r) => r[idAccessor] === record[idAccessor]),
    [selectedRecords, idAccessor]
  );

  const toggleSelection = useCallback(
    (record: T) => {
      setSelectedRecords((prev) =>
        prev.some((r) => r[idAccessor] === record[idAccessor])
          ? prev.filter((r) => r[idAccessor] !== record[idAccessor])
          : [...prev, record]
      );
    },
    [idAccessor]
  );

  const selectAll = useCallback((records: T[]) => {
    setSelectedRecords(records);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRecords([]);
  }, []);

  const toggleAll = useCallback(
    (records: T[]) => {
      if (selectedRecords.length === records.length) {
        clearSelection();
      } else {
        selectAll(records);
      }
    },
    [selectedRecords.length, selectAll, clearSelection]
  );

  return {
    selectedRecords,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    toggleAll,
    selectedCount: selectedRecords.length,
  };
}
