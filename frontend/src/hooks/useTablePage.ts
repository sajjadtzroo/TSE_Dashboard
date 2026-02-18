import { useState, useMemo } from 'react';
import useTableSearch from './useTableSearch';
import usePagination from './usePagination';
import useRowSelection from './useRowSelection';
import type { SortStatus } from '../types/components';

export interface UseTablePageOptions {
  searchFields?: string[];
  defaultSort?: SortStatus;
  defaultPerPage?: number;
  idAccessor?: string;
}

export default function useTablePage<T extends Record<string, unknown>>(
  data: T[],
  {
    searchFields = [],
    defaultSort = { columnAccessor: 'symbol', direction: 'asc' },
    defaultPerPage = 25,
    idAccessor = 'id',
  }: UseTablePageOptions = {},
) {
  const [sortStatus, setSortStatus] = useState<SortStatus>(defaultSort);

  // Search
  const {
    searchQuery, setSearchQuery, filteredData, clearSearch, resultCount, isSearching,
  } = useTableSearch(data, searchFields);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortStatus?.columnAccessor || !filteredData) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortStatus.columnAccessor];
      const bVal = b[sortStatus.columnAccessor];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortStatus.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), 'fa');
      return sortStatus.direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortStatus]);

  // Paginate
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(sortedData, defaultPerPage);

  // Row selection
  const {
    selectedRecords, isSelected, toggleSelection, selectAll,
    clearSelection, toggleAll, selectedCount,
  } = useRowSelection<T>(idAccessor);

  return {
    // Search
    searchQuery, setSearchQuery, filteredData, clearSearch, resultCount, isSearching,
    // Sort
    sortStatus, setSortStatus, sortedData,
    // Pagination
    paged, page, setPage, perPage, setPerPage, totalRecords,
    // Selection
    selectedRecords, isSelected, toggleSelection, selectAll,
    clearSelection, toggleAll, selectedCount,
  };
}
