import { useMemo } from 'react';

/**
 * Aggregate volume and open interest per strike.
 * @param {Array} enrichedOptions – options with .strike_price, .option_type, .volume, .open_interest
 * @returns {Array} sorted array of { strike, callVol, putVol, callOI, putOI, totalOI }
 */
export default function useVolumeOI(enrichedOptions) {
  return useMemo(() => {
    const strikeMap = new Map();
    enrichedOptions.forEach((o) => {
      if (o.strike_price == null) return;
      if (!strikeMap.has(o.strike_price)) {
        strikeMap.set(o.strike_price, { callVol: 0, putVol: 0, callOI: 0, putOI: 0 });
      }
      const e = strikeMap.get(o.strike_price);
      if (o.option_type === 'call') {
        e.callVol += o.volume || 0;
        e.callOI += o.open_interest || 0;
      } else {
        e.putVol += o.volume || 0;
        e.putOI += o.open_interest || 0;
      }
    });
    return [...strikeMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([strike, d]) => ({
        strike,
        callVol: d.callVol,
        putVol: d.putVol,
        callOI: d.callOI,
        putOI: d.putOI,
        totalOI: d.callOI + d.putOI,
      }));
  }, [enrichedOptions]);
}
