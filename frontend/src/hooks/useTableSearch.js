import { useState, useMemo } from 'react';
import { useDebouncedValue } from '@mantine/hooks';

/**
 * Hook for global table search with debouncing
 * @param {Array} data - The data to search through
 * @param {Array} searchFields - Array of field names to search in
 * @param {number} debounceMs - Debounce delay in milliseconds
 */
export default function useTableSearch(data, searchFields = [], debounceMs = 300) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebouncedValue(searchQuery, debounceMs);

  const filteredData = useMemo(() => {
    if (!debouncedQuery.trim() || !data || !searchFields.length) {
      return data;
    }

    const query = debouncedQuery.toLowerCase().trim();

    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      })
    );
  }, [data, debouncedQuery, searchFields]);

  const clearSearch = () => setSearchQuery('');

  return {
    searchQuery,
    setSearchQuery,
    filteredData,
    clearSearch,
    resultCount: filteredData?.length || 0,
    isSearching: searchQuery.length > 0,
  };
}
