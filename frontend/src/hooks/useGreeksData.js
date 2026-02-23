import { useMemo } from 'react';

/**
 * Aggregate 1st- and 2nd-order Greeks per strike for heatmap display.
 * @param {Array} enrichedOptions – options enriched with Greeks
 * @returns {Array} sorted array of { strike, callDelta, callGamma, putDelta, putGamma,
 *                                    callVanna, callVolga, callCharm, putVanna, putVolga, putCharm }
 */
export default function useGreeksData(enrichedOptions) {
  return useMemo(() => {
    const strikeMap = new Map();
    enrichedOptions.forEach((o) => {
      if (o.strike_price == null) return;
      if (!strikeMap.has(o.strike_price)) strikeMap.set(o.strike_price, {});
      const e = strikeMap.get(o.strike_price);
      if (o.option_type === 'call') {
        e.callDelta = o.delta;
        e.callGamma = o.gamma;
        e.callTheta = o.theta;
        e.callVanna = o.vanna;
        e.callVolga = o.volga;
        e.callCharm = o.charm;
      } else {
        e.putDelta = o.delta;
        e.putGamma = o.gamma;
        e.putTheta = o.theta;
        e.putVanna = o.vanna;
        e.putVolga = o.volga;
        e.putCharm = o.charm;
      }
    });
    return [...strikeMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([strike, g]) => ({ strike, ...g }));
  }, [enrichedOptions]);
}
