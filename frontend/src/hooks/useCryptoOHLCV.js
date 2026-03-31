import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

/**
 * Fetches intraday OHLCV bars from TimescaleDB continuous aggregates.
 * Auto-refetches every 15 s — crypto markets run 24/7.
 *
 * @param {string} symbol  - Crypto symbol (e.g. 'BTC', 'ETH')
 * @param {object} options
 * @param {'1min'|'5min'} options.interval - candle interval (default '1min')
 * @param {number}        options.days     - calendar days of history (default 7)
 */
export function useCryptoOHLCV(symbol, { interval = '1min', days = 7 } = {}) {
  return useQuery({
    queryKey: ['crypto-ohlcv', symbol, interval, days],
    queryFn: () =>
      api
        .get(`/crypto/${encodeURIComponent(symbol)}/ohlcv`, {
          params: { interval, days },
        })
        .then((r) => r.data),
    enabled: !!symbol,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}
