import { useState, useEffect, useCallback } from 'react';
import { deribitIVIndex } from '../services/deribit';

/**
 * Fetches Deribit Volatility Index (DVOL) history for BTC or ETH.
 *
 * @param {string} currency   'BTC' | 'ETH'
 * @param {string} resolution '3600' (1H) | '43200' (12H) | '86400' (1D)
 * @param {number} days       lookback in calendar days
 *
 * @returns {{ data, loading, refetch }}
 *   data: Array<{ time, open, high, low, iv }>  (iv = closing DVOL value)
 */
export default function useDeribitIVHistory(currency = 'BTC', resolution = '86400', days = 90) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await deribitIVIndex(currency, resolution, days);
      if (!r?.data?.length) { setData([]); return; }
      setData(
        r.data.map(([ts, o, h, l, c]) => ({
          time: new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          open:  o,
          high:  h,
          low:   l,
          iv:    c,   // closing DVOL %
        }))
      );
    } catch (e) {
      console.error('[useDeribitIVHistory]', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currency, resolution, days]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}
