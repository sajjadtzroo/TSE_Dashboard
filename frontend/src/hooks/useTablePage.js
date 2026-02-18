import { useState, useMemo } from 'react';
import useTableSearch from './useTableSearch';
import usePagination from './usePagination';
import useRowSelection from './useRowSelection';

/**
 * Composite hook for table pages.
 * Orchestrates the common pipeline: search → sort → paginate, plus row selection.
 *
 * @param {Array} data - Pre-filtered data (after any page-specific transforms like preset filters, column filters)
 * @param {Object} options
 * @param {string[]} options.searchFields - Fields to search across
 * @param {Object} options.defaultSort - Initial sort: { columnAccessor, direction }
 * @param {number} options.defaultPerPage - Initial page size
 * @param {string} options.idAccessor - Unique ID field for row selection
 */
export default function useTablePage(data, {
  searchFields = [],
  defaultSort = { columnAccessor: 'symbol', direction: 'asc' },
  defaultPerPage = 25,
  idAccessor = 'id',
} = {}) {
  const [sortStatus, setSortStatus] = useState(defaultSort);

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
  } = useRowSelection(idAccessor);

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
