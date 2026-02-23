import { useMemo } from 'react';

/**
 * Compute IV Smile data — one point per strike with call/put IV.
 * @param {Array} enrichedOptions – options enriched with .iv, .strike_price, .option_type
 * @returns {Array} sorted array of { strike, callIV, putIV }
 */
export default function useIVSmile(enrichedOptions) {
  return useMemo(() => {
    const strikeMap = new Map();
    enrichedOptions.forEach((o) => {
      if (o.strike_price == null || o.iv == null) return;
      if (!strikeMap.has(o.strike_price)) strikeMap.set(o.strike_price, {});
      const entry = strikeMap.get(o.strike_price);
      if (o.option_type === 'call') entry.callIV = o.iv;
      else entry.putIV = o.iv;
    });
    return [...strikeMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([strike, { callIV, putIV }]) => ({
        strike,
        callIV: callIV != null ? Math.round(callIV * 10) / 10 : null,
        putIV: putIV != null ? Math.round(putIV * 10) / 10 : null,
      }));
  }, [enrichedOptions]);
}
