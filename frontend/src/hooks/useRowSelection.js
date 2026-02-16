import { useState, useCallback } from 'react';

/**
 * Hook for managing row selection in tables
 * @param {string} idAccessor - The field to use as unique identifier
 */
export default function useRowSelection(idAccessor = 'id') {
  const [selectedRecords, setSelectedRecords] = useState([]);

  const isSelected = useCallback(
    (record) => selectedRecords.some((r) => r[idAccessor] === record[idAccessor]),
    [selectedRecords, idAccessor]
  );

  const toggleSelection = useCallback(
    (record) => {
      setSelectedRecords((prev) =>
        isSelected(record)
          ? prev.filter((r) => r[idAccessor] !== record[idAccessor])
          : [...prev, record]
      );
    },
    [isSelected, idAccessor]
  );

  const selectAll = useCallback((records) => {
    setSelectedRecords(records);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRecords([]);
  }, []);

  const toggleAll = useCallback(
    (records) => {
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
