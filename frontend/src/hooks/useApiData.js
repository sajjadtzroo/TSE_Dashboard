// TODO: [HIGH-04] DEPRECATED — This hook reimplements TanStack Query and should be
// replaced with proper useQuery hooks from useMarketData.js.
// Do not use this hook in new code. Remove after all callers are migrated.
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
