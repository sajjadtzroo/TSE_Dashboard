import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { deribitRest } from '../services/deribit';
import { blackScholesPrice, greeks, moneyness } from '../utils/blackScholes';
import useDeribitLive from './useDeribitLive';

const DEFAULT_R = 0.05; // 5% USD SOFR
const POLL_INTERVAL = 60_000; // 60 s — only refreshes the instrument list; prices via WS

const MONTH_MAP = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

const MONTH_ORDER = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

function parseExpiryToISO(expStr) {
  const day   = expStr.slice(0, 2);
  const mon   = expStr.slice(2, 5).toUpperCase();
  const yr    = expStr.slice(5);
  const year  = parseInt(yr, 10) + 2000;
  const month = MONTH_MAP[mon] || '01';
  return `${year}-${month}-${day}`;
}

function parseInstrument(name) {
  const parts = name.split('-');
  if (parts.length < 4) return null;
  const expiry  = parts[1];
  const strike  = parseFloat(parts[2]);
  const rawType = parts[3].toUpperCase();
  if (!expiry || isNaN(strike) || (rawType !== 'C' && rawType !== 'P')) return null;
  return { expiry, strike_price: strike, option_type: rawType === 'C' ? 'call' : 'put' };
}

function computeDaysToExpiry(isoDate) {
  const now = new Date();
  const exp = new Date(isoDate + 'T08:00:00Z'); // Deribit settles at 08:00 UTC
  return Math.max(0, (exp - now) / (1000 * 60 * 60 * 24));
}

export function compareExpiries(a, b) {
  const yearA = parseInt(a.slice(5), 10);
  const yearB = parseInt(b.slice(5), 10);
  if (yearA !== yearB) return yearA - yearB;
  const monA = MONTH_ORDER[a.slice(2, 5).toUpperCase()] || 0;
  const monB = MONTH_ORDER[b.slice(2, 5).toUpperCase()] || 0;
  if (monA !== monB) return monA - monB;
  return parseInt(a.slice(0, 2), 10) - parseInt(b.slice(0, 2), 10);
}

/**
 * Enrich a raw Deribit book-summary option record with Greeks and metadata.
 * Greeks from Deribit live ticker are preferred; Black-Scholes is the fallback.
 */
function enrichOption(raw, r, liveMsg) {
  const parsed = parseInstrument(raw.instrument_name);
  if (!parsed) return null;

  const { expiry, strike_price, option_type } = parsed;
  const expiry_date   = parseExpiryToISO(expiry);
  const daysToExpiry  = computeDaysToExpiry(expiry_date);
  const T = daysToExpiry / 365;

  // Prefer live WS data over REST snapshot for prices / IV / Greeks
  const mark_price = liveMsg?.mark_price       ?? raw.mark_price   ?? null;
  const bid_price  = liveMsg?.best_bid_price   ?? raw.bid_price    ?? null;
  const ask_price  = liveMsg?.best_ask_price   ?? raw.ask_price    ?? null;
  const mark_iv    = liveMsg?.mark_iv          ?? raw.mark_iv      ?? null;
  const S          = liveMsg?.underlying_price ?? raw.underlying_price ?? raw.index_price ?? null;
  const open_interest = liveMsg?.open_interest ?? raw.open_interest ?? null;
  const price_change  = liveMsg?.stats?.price_change ?? raw.price_change ?? null;

  // Greeks: use Deribit's own values from WS if available, else compute locally
  let delta = liveMsg?.greeks?.delta ?? null;
  let gamma = liveMsg?.greeks?.gamma ?? null;
  let theta = liveMsg?.greeks?.theta ?? null;
  let vega  = liveMsg?.greeks?.vega  ?? null;
  let rho   = liveMsg?.greeks?.rho   ?? null;
  let bs_price = null;

  if (delta === null && mark_iv != null && mark_iv > 0 && S != null && S > 0 && T > 0) {
    const sigma = mark_iv / 100;
    const g = greeks(option_type, S, strike_price, T, r, sigma);
    delta    = g.delta;
    gamma    = g.gamma;
    theta    = g.theta;
    vega     = g.vega;
    rho      = g.rho;
    bs_price = blackScholesPrice(option_type, S, strike_price, T, r, sigma);
  }

  return {
    instrument_name:  raw.instrument_name,
    option_type,
    strike_price,
    expiry_date,
    daysToExpiry,
    underlying_price: S,
    mark_price,
    bid_price,
    ask_price,
    open_interest,
    volume:       raw.volume      ?? null,
    price_change,
    mark_iv,
    iv:           mark_iv,
    delta,
    gamma,
    theta,
    vega,
    rho,
    bs_price,
    moneyness: S != null ? moneyness(option_type, S, strike_price) : null,
    time_to_expiry: T,
    // TSE-compat aliases
    symbol:        raw.instrument_name,
    last:          mark_price,
    close:         mark_price,
    bid_price_1:   bid_price,
    ask_price_1:   ask_price,
    close_change:  price_change,
  };
}

/**
 * Fetches all options for a currency from Deribit REST (instrument list),
 * then subscribes to live WebSocket tickers for real-time price/IV/Greeks updates.
 *
 * @param {string} currency  'BTC' | 'ETH'
 * @param {number} [r]       risk-free rate decimal (default 0.05)
 * @returns {{ options, expiries, loading, underlyingPrice, refetch }}
 */
export default function useDeribitOptions(currency = 'BTC', r = DEFAULT_R) {
  // Raw REST snapshot (instrument list + initial prices)
  const [restOptions, setRestOptions]         = useState([]);
  const [expiries, setExpiries]               = useState([]);
  const [underlyingPrice, setUnderlyingPrice] = useState(null);
  const [loading, setLoading]                 = useState(true);

  // WS channels for all instruments — populated after first REST fetch
  const [wsChannels, setWsChannels] = useState([]);

  const timerRef   = useRef(null);
  const mountedRef = useRef(true);

  const { messages } = useDeribitLive(wsChannels);

  const fetchOptions = useCallback(async () => {
    try {
      const result = await deribitRest('public/get_book_summary_by_currency', {
        currency,
        kind: 'option',
      });

      if (!mountedRef.current) return;

      // Store raw REST data — enrichment happens in the memoized output
      setRestOptions(result || []);

      // Build sorted expiry list
      const expSet = new Set();
      for (const raw of result || []) {
        const parts = raw.instrument_name?.split('-');
        if (parts?.[1]) expSet.add(parts[1]);
      }
      setExpiries(Array.from(expSet).sort(compareExpiries));

      // Underlying price from first option
      const first = (result || []).find(o => o.underlying_price != null || o.index_price != null);
      setUnderlyingPrice(first?.underlying_price ?? first?.index_price ?? null);

      // Subscribe to WS tickers for all instruments
      const chans = (result || []).map(o => `ticker.${o.instrument_name}.raw`);
      setWsChannels(chans);
    } catch (err) {
      console.error('[useDeribitOptions] fetch error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currency]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setRestOptions([]);
    setWsChannels([]);
    fetchOptions();
    timerRef.current = setInterval(fetchOptions, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [fetchOptions]);

  // Merge live WS data into the REST snapshot — runs on every WS tick
  const options = useMemo(() => {
    const enriched = [];
    for (const raw of restOptions) {
      const liveMsg = messages[`ticker.${raw.instrument_name}.raw`] ?? null;
      const opt = enrichOption(raw, r, liveMsg);
      if (opt) enriched.push(opt);
    }
    return enriched;
  }, [restOptions, messages, r]);

  return { options, expiries, loading, underlyingPrice, refetch };
}
