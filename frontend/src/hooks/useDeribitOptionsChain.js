import { useState, useMemo } from 'react';
import useDeribitOptions from './useDeribitOptions';

/**
 * Stateful hook that provides the same interface as TSE's useOptionsChainData.
 * Wraps useDeribitOptions and adds currency/expiry selection and chain map construction.
 *
 * Returns:
 * {
 *   currency, setCurrency,
 *   selectedExpiry, setSelectedExpiry,
 *   options,           // filtered by selectedExpiry if set, else all
 *   allOptions,        // all options regardless of expiry
 *   chainMap,          // Map<strike, { call: EnrichedOption|null, put: EnrichedOption|null }>
 *   expiries,          // sorted expiry strings
 *   expiryDates,       // alias of expiries (TSE compat)
 *   callCount, putCount, strikeCount,
 *   underlyingPrice,
 *   loading,
 *   refetch,
 * }
 */
export default function useDeribitOptionsChain() {
  const [currency, setCurrency]           = useState('BTC');
  const [selectedExpiry, setSelectedExpiry] = useState(null);

  const { options: allOptions, expiries, loading, underlyingPrice, refetch } =
    useDeribitOptions(currency);

  // Filter by selected expiry when one is chosen
  const options = useMemo(() => {
    if (!selectedExpiry) return allOptions;
    return allOptions.filter(o => {
      // expiry string lives inside instrument_name, e.g. "BTC-28MAR25-80000-C"
      const parts = o.instrument_name.split('-');
      return parts[1] === selectedExpiry;
    });
  }, [allOptions, selectedExpiry]);

  // Build chainMap: Map<strike, { call, put }>
  const chainMap = useMemo(() => {
    const map = new Map();
    for (const opt of options) {
      const strike = opt.strike_price;
      if (!map.has(strike)) {
        map.set(strike, { call: null, put: null });
      }
      const entry = map.get(strike);
      if (opt.option_type === 'call') {
        entry.call = opt;
      } else {
        entry.put = opt;
      }
    }
    return map;
  }, [options]);

  const callCount   = useMemo(() => options.filter(o => o.option_type === 'call').length, [options]);
  const putCount    = useMemo(() => options.filter(o => o.option_type === 'put').length, [options]);
  const strikeCount = chainMap.size;

  return {
    currency,
    setCurrency,
    selectedExpiry,
    setSelectedExpiry,
    options,
    allOptions,
    chainMap,
    expiries,
    expiryDates: expiries,   // TSE compat alias
    callCount,
    putCount,
    strikeCount,
    underlyingPrice,
    loading,
    refetch,
  };
}
