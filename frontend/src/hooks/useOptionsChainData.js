import { useState, useMemo } from 'react';
import { useOptionsUnderlyings, useOptionsChain } from './useMarketData';

/**
 * Composite hook for the options chain explorer.
 * Manages underlying/expiry selection and returns grouped chain data.
 */
export default function useOptionsChainData() {
  const [selectedUnderlying, setSelectedUnderlying] = useState(null);
  const [selectedExpiry, setSelectedExpiry] = useState(null);

  const { data: underlyings = [], isLoading: loadingUnderlyings } = useOptionsUnderlyings();

  const {
    data: chainData,
    isLoading: loadingChain,
    refetch: refetchChain,
  } = useOptionsChain(selectedUnderlying, {
    expiry_date: selectedExpiry || undefined,
  });

  const options = chainData?.options || [];
  const info = chainData?.underlying_info;
  const expiryDates = chainData?.expiry_dates || [];

  // Group options by strike price into a Map<strike, { call, put }>
  const chainMap = useMemo(() => {
    const map = new Map();
    options.forEach((opt) => {
      const strike = opt.strike_price;
      if (strike == null) return;
      if (!map.has(strike)) map.set(strike, { call: null, put: null });
      const entry = map.get(strike);
      if (opt.option_type === 'call') entry.call = opt;
      else if (opt.option_type === 'put') entry.put = opt;
    });
    // Sort by strike ascending
    return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
  }, [options]);

  const callCount = options.filter((o) => o.option_type === 'call').length;
  const putCount = options.filter((o) => o.option_type === 'put').length;
  const strikeCount = chainMap.size;

  const handleUnderlyingChange = (value) => {
    setSelectedUnderlying(value);
    setSelectedExpiry(null);
  };

  const handleExpiryChange = (value) => {
    setSelectedExpiry(value);
  };

  const handleRefresh = () => {
    if (selectedUnderlying) refetchChain();
  };

  return {
    underlyings,
    selectedUnderlying,
    setSelectedUnderlying: handleUnderlyingChange,
    selectedExpiry,
    setSelectedExpiry: handleExpiryChange,
    chainData,
    chainMap,
    options,
    info,
    expiryDates,
    callCount,
    putCount,
    strikeCount,
    loading: loadingUnderlyings || loadingChain,
    loadingUnderlyings,
    loadingChain,
    refresh: handleRefresh,
  };
}
