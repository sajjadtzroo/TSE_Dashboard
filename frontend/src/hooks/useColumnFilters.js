import { useState, useMemo, useCallback } from 'react';

/**
 * Hook for managing column-level filters
 * @param {Array} data - The data to filter
 */
export default function useColumnFilters(data) {
  const [filters, setFilters] = useState({});

  const addFilter = useCallback((accessor, value) => {
    setFilters((prev) => ({ ...prev, [accessor]: value }));
  }, []);

  const removeFilter = useCallback((accessor) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[accessor];
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const filteredData = useMemo(() => {
    if (!data || Object.keys(filters).length === 0) return data;

    return data.filter((item) => {
      return Object.entries(filters).every(([accessor, filterValue]) => {
        if (!filterValue) return true;

        const itemValue = item[accessor];

        // Handle null/undefined
        if (itemValue === null || itemValue === undefined) return false;

        // Handle different filter types
        if (typeof filterValue === 'object') {
          // Range filter (for numbers)
          if ('min' in filterValue || 'max' in filterValue) {
            const numValue = Number(itemValue);
            if (isNaN(numValue)) return false;

            if (filterValue.min !== undefined && numValue < filterValue.min) return false;
            if (filterValue.max !== undefined && numValue > filterValue.max) return false;

            return true;
          }

          // Array filter (for multi-select)
          if (Array.isArray(filterValue)) {
            return filterValue.includes(itemValue);
          }
        }

        // Text filter (case-insensitive contains)
        return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
      });
    });
  }, [data, filters]);

  return {
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    filteredData,
    activeFilterCount: Object.keys(filters).length,
    hasFilters: Object.keys(filters).length > 0,
  };
}
