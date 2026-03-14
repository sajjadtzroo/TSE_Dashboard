import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DERIBIT_COINS, deribitRest } from '../services/deribit';
import useDeribitLive from './useDeribitLive';

const POLL_INTERVAL = 30_000; // 30 s — refreshes instrument list; price comes via WS

/**
 * Fetches perpetuals + dated futures for BTC and ETH.
 * Perpetuals and dated futures are both augmented with live WebSocket ticker data.
 *
 * Returns:
 * {
 *   perpetuals: Array<{ symbol, name_fa, mark_price, index_price, price_change_pct, funding_8h, open_interest, volume_usd }>,
 *   dated:      Array<{ instrument_name, base_currency, expiry, mark_price, price_change, open_interest, volume_usd }>,
 *   loading:    boolean,
 *   refetch:    () => void,
 * }
 */
export default function useDeribitFutures() {
  const [restData, setRestData] = useState({ perpBySymbol: {}, datedRaw: [] });
  const [loading, setLoading]   = useState(true);
  const mountedRef = useRef(true);
  const timerRef   = useRef(null);

  // WS channels: starts with perpetual channels; dated futures channels are added
  // after the first REST fetch returns their instrument names.
  const perpChannels = useMemo(
    () => DERIBIT_COINS.map(c => `ticker.${c.perpetual}.raw`),
    [],
  );
  const [datedChannels, setDatedChannels] = useState([]);

  const wsChannels = useMemo(
    () => [...perpChannels, ...datedChannels],
    [perpChannels, datedChannels],
  );

  const { messages } = useDeribitLive(wsChannels);

  const fetchFutures = useCallback(async () => {
    try {
      const [btcResult, ethResult] = await Promise.all([
        deribitRest('public/get_book_summary_by_currency', { currency: 'BTC', kind: 'future' }),
        deribitRest('public/get_book_summary_by_currency', { currency: 'ETH', kind: 'future' }),
      ]);

      if (!mountedRef.current) return;

      const allFutures = [...(btcResult || []), ...(ethResult || [])];

      const datedRaw = allFutures
        .filter(f => !f.instrument_name.includes('PERPETUAL'))
        .map(f => {
          const parts = f.instrument_name.split('-');
          return {
            instrument_name: f.instrument_name,
            base_currency:   parts[0] || '',
            expiry:          parts[1] || '',
            mark_price:      f.mark_price    ?? null,
            price_change:    f.price_change  ?? null,
            open_interest:   f.open_interest ?? null,
            volume_usd:      f.volume_usd    ?? null,
          };
        });

      const perpBySymbol = {};
      for (const f of allFutures) {
        if (!f.instrument_name.includes('PERPETUAL')) continue;
        const symbol = f.instrument_name.split('-')[0];
        perpBySymbol[symbol] = {
          mark_price:       f.mark_price      ?? null,
          index_price:      f.index_price     ?? null,
          price_change_pct: f.price_change    ?? null,
          funding_8h:       f.current_funding ?? null,
          open_interest:    f.open_interest   ?? null,
          volume_usd:       f.volume_usd      ?? null,
        };
      }

      setRestData({ perpBySymbol, datedRaw });

      // Subscribe to WS channels for dated futures
      const newDatedChans = datedRaw.map(f => `ticker.${f.instrument_name}.raw`);
      setDatedChannels(newDatedChans);
    } catch (err) {
      console.error('[useDeribitFutures] fetch error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchFutures();
  }, [fetchFutures]);

  useEffect(() => {
    mountedRef.current = true;
    fetchFutures();
    timerRef.current = setInterval(fetchFutures, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [fetchFutures]);

  // Perpetuals: merge REST snapshot with live WS ticker
  const perpetuals = useMemo(() => {
    return DERIBIT_COINS.map(coin => {
      const rest = restData.perpBySymbol?.[coin.symbol] || {};
      const live = messages[`ticker.${coin.perpetual}.raw`];
      return {
        symbol:           coin.symbol,
        name_fa:          coin.name_fa,
        mark_price:       live?.mark_price           ?? rest.mark_price       ?? null,
        index_price:      live?.index_price          ?? rest.index_price      ?? null,
        price_change_pct: live?.stats?.price_change  ?? rest.price_change_pct ?? null,
        funding_8h:       live?.current_funding      ?? rest.funding_8h       ?? null,
        open_interest:    live?.open_interest        ?? rest.open_interest    ?? null,
        volume_usd:       live?.stats?.volume_usd    ?? rest.volume_usd       ?? null,
      };
    });
  }, [restData.perpBySymbol, messages]);

  // Dated futures: merge REST snapshot with live WS ticker
  const dated = useMemo(() => {
    return restData.datedRaw.map(f => {
      const live = messages[`ticker.${f.instrument_name}.raw`];
      return {
        instrument_name: f.instrument_name,
        base_currency:   f.base_currency,
        expiry:          f.expiry,
        mark_price:      live?.mark_price          ?? f.mark_price    ?? null,
        price_change:    live?.stats?.price_change ?? f.price_change  ?? null,
        open_interest:   live?.open_interest       ?? f.open_interest ?? null,
        volume_usd:      live?.stats?.volume_usd   ?? f.volume_usd    ?? null,
      };
    });
  }, [restData.datedRaw, messages]);

  return { perpetuals, dated, loading, refetch };
}
