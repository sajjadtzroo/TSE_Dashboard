import { useState, useMemo } from 'react';
import { useDebouncedValue } from '@mantine/hooks';

export interface UseTableSearchResult<T> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredData: T[];
  clearSearch: () => void;
  resultCount: number;
  isSearching: boolean;
}

export default function useTableSearch<T extends Record<string, unknown>>(
  data: T[],
  searchFields: string[] = [],
  debounceMs = 300,
): UseTableSearchResult<T> {
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
