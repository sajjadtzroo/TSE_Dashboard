import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

/**
 * Returns true when the Tehran Stock Exchange is currently open.
 * Market days: Sat(6), Sun(0), Mon(1), Tue(2), Wed(3)  09:00–12:30 Tehran (UTC+3:30)
 */
export function isMarketOpen() {
  const now = new Date();
  const tehran = new Date(now.getTime() + (3.5 * 60 + now.getTimezoneOffset()) * 60000);
  const day = tehran.getDay();
  if (![0, 1, 2, 3, 6].includes(day)) return false;
  const t = tehran.getHours() * 60 + tehran.getMinutes();
  return t >= 540 && t <= 750; // 09:00 → 12:30
}

/**
 * Fetches intraday OHLCV bars from the TimescaleDB continuous aggregate.
 * Auto-refetches every 15 s while the market is open.
 *
 * @param {string} symbol  - TSE ticker symbol
 * @param {object} options
 * @param {'1min'|'5min'} options.interval - candle interval (default '1min')
 * @param {number}        options.days     - calendar days of history to fetch (default 7)
 */
export function useTickOHLCV(symbol, { interval = '1min', days = 7 } = {}) {
  const live = isMarketOpen();
  return useQuery({
    queryKey: ['tick-ohlcv', symbol, interval, days],
    queryFn: () =>
      api
        .get(`/ticks/${encodeURIComponent(symbol)}/ohlcv`, { params: { interval, days } })
        .then((r) => r.data),
    enabled: !!symbol,
    staleTime: 10_000,
    refetchInterval: live ? 15_000 : false,
    refetchIntervalInBackground: false,
  });
}
