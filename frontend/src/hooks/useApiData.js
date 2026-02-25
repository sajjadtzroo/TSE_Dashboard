// DEPRECATED — All known callers have been migrated to direct useQuery calls.
// This file is kept only to avoid breaking any runtime references that may not
// have been caught during static analysis. Safe to delete once confirmed unused.
//
// Original note: [HIGH-04] This hook reimplements TanStack Query and should be
// replaced with proper useQuery hooks. Do not use this hook in new code.
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';

export default function useApiData(url, { params, deps = [], autoFetch = true, initialValue = [] } = {}) {
  if (import.meta.env.DEV) {
    console.warn('[useApiData] DEPRECATED: Use TanStack Query useQuery instead.');
  }
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(urlRef.current, params ? { params } : undefined);
      setData(res.data);
      setError(null);
      setLastUpdated(new Date());
      return res.data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  useEffect(() => {
    if (autoFetch) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, ...deps]);

  return { data, setData, loading, setLoading, error, setError, lastUpdated, refresh };
}
