import { useState, useEffect, useCallback } from 'react';
import { deribitOHLCV } from '../services/deribit';

/**
 * Fetches OHLCV candlestick data from Deribit for any instrument.
 *
 * @param {string} instrument  e.g. 'BTC-PERPETUAL', 'ETH-PERPETUAL', 'BTC-28MAR25'
 * @param {string} resolution  '60'|'240'|'1D' (1H, 4H, 1D)
 * @param {number} days        lookback in calendar days
 *
 * @returns {{ data, loading, error, refetch }}
 *   data: Array<{ time, open, high, low, close, volume }>
 */
export default function useDeribitOHLCV(instrument, resolution = '1D', days = 90) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (!instrument) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await deribitOHLCV(instrument, resolution, days);
      if (!r?.ticks?.length) { setData([]); return; }
      setData(
        r.ticks.map((ts, i) => ({
          time:   new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          open:   r.open[i],
          high:   r.high[i],
          low:    r.low[i],
          close:  r.close[i],
          volume: r.volume[i],
        }))
      );
    } catch (e) {
      console.error('[useDeribitOHLCV]', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [instrument, resolution, days]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
