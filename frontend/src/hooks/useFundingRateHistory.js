import { useState, useEffect, useCallback } from 'react';
import { deribitFundingHistory } from '../services/deribit';

/**
 * Fetches Deribit funding rate history for a perpetual instrument.
 *
 * @param {string} instrument  e.g. 'BTC-PERPETUAL' | 'ETH-PERPETUAL'
 * @param {number} days        lookback in calendar days
 *
 * @returns {{ data, loading, error, refetch }}
 *   data: Array<{ date, rate, timestamp }>
 */
export default function useFundingRateHistory(instrument = 'BTC-PERPETUAL', days = 30) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await deribitFundingHistory(instrument, days);
      if (!r?.length) { setData([]); return; }
      setData(
        r.map((item) => ({
          date: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rate: item.interest_8h,
          timestamp: item.timestamp,
        }))
      );
    } catch (e) {
      console.error('[useFundingRateHistory]', e);
      setError(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [instrument, days]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
