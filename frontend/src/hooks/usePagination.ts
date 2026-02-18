import { useState, useMemo } from 'react';

export interface UsePaginationResult<T> {
  paged: T[];
  page: number;
  setPage: (page: number) => void;
  perPage: number;
  setPerPage: (perPage: number) => void;
  totalRecords: number;
}

export default function usePagination<T>(data: T[], defaultPerPage = 25): UsePaginationResult<T> {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  const paged = useMemo(
    () => (data || []).slice((page - 1) * perPage, page * perPage),
    [data, page, perPage],
  );

  const onPerPageChange = (p: number) => { setPerPage(p); setPage(1); };

  return { paged, page, setPage, perPage, setPerPage: onPerPageChange, totalRecords: (data || []).length };
}
