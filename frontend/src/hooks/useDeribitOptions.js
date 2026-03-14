import { useState, useEffect, useCallback, useRef } from 'react';
import { deribitRest } from '../services/deribit';
import { blackScholesPrice, greeks, moneyness } from '../utils/blackScholes';

const DEFAULT_R = 0.05; // 5% USD SOFR

const MONTH_MAP = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

const MONTH_ORDER = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

/**
 * Parse a Deribit expiry string like "28MAR25" into an ISO date string "2025-03-28".
 * @param {string} expStr  e.g. "28MAR25"
 * @returns {string}  ISO date e.g. "2025-03-28"
 */
function parseExpiryToISO(expStr) {
  // Format: DDMMMYY  (e.g. 28MAR25)
  const day = expStr.slice(0, 2);
  const mon = expStr.slice(2, 5).toUpperCase();
  const yr  = expStr.slice(5);
  const year = parseInt(yr, 10) + 2000;
  const month = MONTH_MAP[mon] || '01';
  return `${year}-${month}-${day}`;
}

/**
 * Parse a Deribit instrument name into its components.
 * e.g. "BTC-28MAR25-80000-C" → { expiry: "28MAR25", strike: 80000, option_type: "call" }
 */
function parseInstrument(name) {
  // Parts: CURRENCY-EXPIRY-STRIKE-TYPE
  const parts = name.split('-');
  if (parts.length < 4) return null;
  const expiry = parts[1];
  const strike = parseFloat(parts[2]);
  const rawType = parts[3].toUpperCase();
  if (!expiry || isNaN(strike) || (rawType !== 'C' && rawType !== 'P')) return null;
  return {
    expiry,
    strike_price: strike,
    option_type: rawType === 'C' ? 'call' : 'put',
  };
}

/**
 * Compute days to expiry from today to an ISO date string.
 */
function computeDaysToExpiry(isoDate) {
  const now = new Date();
  const exp = new Date(isoDate + 'T08:00:00Z'); // Deribit settles at 08:00 UTC
  const diff = exp - now;
  return Math.max(0, diff / (1000 * 60 * 60 * 24));
}

/**
 * Sort expiry strings by calendar order.
 * Format: DDMMMYY — sort by year, then month, then day.
 */
function compareExpiries(a, b) {
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
 */
function enrichOption(raw, r) {
  const parsed = parseInstrument(raw.instrument_name);
  if (!parsed) return null;

  const { expiry, strike_price, option_type } = parsed;
  const expiry_date = parseExpiryToISO(expiry);
  const daysToExpiry = computeDaysToExpiry(expiry_date);
  const T = daysToExpiry / 365;

  const S = raw.underlying_price || raw.index_price || null;
  const mark_iv = raw.mark_iv ?? null;
  const sigma = (mark_iv != null && mark_iv > 0) ? mark_iv / 100 : null;

  let delta = null, gamma = null, theta = null, vega = null, rho = null;
  let bs_price = null;

  if (sigma != null && S != null && S > 0 && T > 0) {
    const g = greeks(option_type, S, strike_price, T, r, sigma);
    delta = g.delta;
    gamma = g.gamma;
    theta = g.theta;
    vega  = g.vega;
    rho   = g.rho;
    bs_price = blackScholesPrice(option_type, S, strike_price, T, r, sigma);
  }

  const mp = raw.mark_price ?? null;
  return {
    instrument_name: raw.instrument_name,
    option_type,
    strike_price,
    expiry_date,
    daysToExpiry,
    underlying_price: S,
    mark_price: mp,
    bid_price:  raw.bid_price  ?? null,
    ask_price:  raw.ask_price  ?? null,
    open_interest: raw.open_interest ?? null,
    volume:     raw.volume     ?? null,
    price_change: raw.price_change ?? null,
    mark_iv,
    // Enriched
    iv:       mark_iv,   // pass-through; already in % from Deribit
    delta,
    gamma,
    theta,
    vega,
    rho,
    bs_price,
    moneyness: S != null ? moneyness(option_type, S, strike_price) : null,
    time_to_expiry: T,
    // TSE-compat aliases (reuse OptionsChainTable and shared components)
    symbol:       raw.instrument_name,
    last:         mp,
    close:        mp,
    bid_price_1:  raw.bid_price  ?? null,
    ask_price_1:  raw.ask_price  ?? null,
    close_change: raw.price_change ?? null,
  };
}

const POLL_INTERVAL = 30_000; // 30 seconds

/**
 * Fetches and enriches all options for a given currency from Deribit REST.
 * Polls every 30 s.
 *
 * @param {string} currency  'BTC' | 'ETH'
 * @param {number} [r]       risk-free rate decimal (default DEFAULT_R = 0.05)
 * @returns {{ options, expiries, loading, underlyingPrice, refetch }}
 */
export default function useDeribitOptions(currency = 'BTC', r = DEFAULT_R) {
  const [options, setOptions]               = useState([]);
  const [expiries, setExpiries]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [underlyingPrice, setUnderlyingPrice] = useState(null);

  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchOptions = useCallback(async () => {
    try {
      const result = await deribitRest('public/get_book_summary_by_currency', {
        currency,
        kind: 'option',
      });

      if (!mountedRef.current) return;

      const enriched = [];
      for (const raw of result) {
        const opt = enrichOption(raw, r);
        if (opt) enriched.push(opt);
      }

      // Collect sorted unique expiries
      const expSet = new Set(enriched.map(o => {
        // Extract the raw expiry string from instrument_name  e.g. "28MAR25"
        const parts = o.instrument_name.split('-');
        return parts[1] || '';
      }).filter(Boolean));
      const sortedExpiries = Array.from(expSet).sort(compareExpiries);

      // Underlying price from first option that has one
      const first = enriched.find(o => o.underlying_price != null);

      setOptions(enriched);
      setExpiries(sortedExpiries);
      setUnderlyingPrice(first?.underlying_price ?? null);
    } catch (err) {
      console.error('[useDeribitOptions] fetch error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currency, r]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchOptions();

    timerRef.current = setInterval(fetchOptions, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [fetchOptions]);

  return { options, expiries, loading, underlyingPrice, refetch };
}
