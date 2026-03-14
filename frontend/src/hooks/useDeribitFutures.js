import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DERIBIT_COINS, deribitRest } from '../services/deribit';
import useDeribitLive from './useDeribitLive';

const POLL_INTERVAL = 30_000; // 30 seconds

/**
 * Derive ticker channel name for a perpetual instrument.
 * e.g. "BTC-PERPETUAL" → "ticker.BTC-PERPETUAL.raw"
 */
function perpChannel(instrument) {
  return `ticker.${instrument}.raw`;
}

/**
 * Fetches perpetuals + dated futures for BTC and ETH; augments perpetuals
 * with live WebSocket funding data.
 *
 * Returns:
 * {
 *   perpetuals: Array<{ symbol, name_fa, mark_price, index_price, price_change_pct, funding_8h, open_interest, volume_usd }>,
 *   dated: Array<{ instrument_name, base_currency, expiry, mark_price, price_change, open_interest }>,
 *   loading: boolean,
 *   refetch: () => void,
 * }
 */
export default function useDeribitFutures() {
  const [restData, setRestData]   = useState({ perpBySymbol: {}, dated: [] });
  const [loading, setLoading]     = useState(true);
  const mountedRef = useRef(true);
  const timerRef   = useRef(null);

  // Build stable WS channel list for all DERIBIT_COINS perpetuals
  const wsChannels = useMemo(
    () => DERIBIT_COINS.map(c => perpChannel(c.perpetual)),
    [],
  );

  const { messages } = useDeribitLive(wsChannels);

  const fetchFutures = useCallback(async () => {
    try {
      // Fetch BTC and ETH futures in parallel; other coins don't have options/futures on Deribit
      const [btcResult, ethResult] = await Promise.all([
        deribitRest('public/get_book_summary_by_currency', { currency: 'BTC', kind: 'future' }),
        deribitRest('public/get_book_summary_by_currency', { currency: 'ETH', kind: 'future' }),
      ]);

      if (!mountedRef.current) return;

      const allFutures = [...(btcResult || []), ...(ethResult || [])];

      // Separate perpetuals from dated futures
      const datedRaw = allFutures.filter(f => !f.instrument_name.includes('PERPETUAL'));

      const dated = datedRaw.map(f => {
        // instrument_name e.g. "BTC-28MAR25"
        const parts = f.instrument_name.split('-');
        return {
          instrument_name: f.instrument_name,
          base_currency:   parts[0] || '',
          expiry:          parts[1] || '',
          mark_price:      f.mark_price       ?? null,
          price_change:    f.price_change      ?? null,
          open_interest:   f.open_interest     ?? null,
        };
      });

      // Build REST-based perpetual snapshots keyed by coin symbol
      const perpBySymbol = {};
      for (const f of allFutures) {
        if (!f.instrument_name.includes('PERPETUAL')) continue;
        // instrument_name is e.g. "BTC-PERPETUAL"
        const symbol = f.instrument_name.split('-')[0];
        perpBySymbol[symbol] = {
          mark_price:      f.mark_price         ?? null,
          index_price:     f.index_price        ?? null,
          price_change_pct: f.price_change      ?? null,
          funding_8h:      f.current_funding    ?? null,
          open_interest:   f.open_interest      ?? null,
          volume_usd:      f.volume_usd         ?? null,
        };
      }

      setRestData({ perpBySymbol, dated });
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

  // Merge REST data with live WS ticker data for perpetuals
  const perpetuals = useMemo(() => {
    return DERIBIT_COINS.map(coin => {
      const rest    = restData.perpBySymbol?.[coin.symbol] || {};
      const channel = perpChannel(coin.perpetual);
      const live    = messages[channel]; // WS ticker message

      return {
        symbol:          coin.symbol,
        name_fa:         coin.name_fa,
        mark_price:      live?.mark_price        ?? rest.mark_price        ?? null,
        index_price:     live?.index_price       ?? rest.index_price       ?? null,
        price_change_pct: live?.stats?.price_change ?? rest.price_change_pct ?? null,
        funding_8h:      live?.current_funding   ?? rest.funding_8h        ?? null,
        open_interest:   live?.open_interest     ?? rest.open_interest     ?? null,
        volume_usd:      live?.stats?.volume_usd ?? rest.volume_usd        ?? null,
      };
    });
  }, [restData, messages]);

  return {
    perpetuals,
    dated: restData.dated || [],
    loading,
    refetch,
  };
}
