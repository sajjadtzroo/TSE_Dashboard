import { useState, useMemo } from 'react';

export default function usePagination(data, defaultPerPage = 25) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  const paged = useMemo(
    () => (data || []).slice((page - 1) * perPage, page * perPage),
    [data, page, perPage],
  );

  const onPerPageChange = (p) => { setPerPage(p); setPage(1); };

  return { paged, page, setPage, perPage, setPerPage: onPerPageChange, totalRecords: (data || []).length };
}
