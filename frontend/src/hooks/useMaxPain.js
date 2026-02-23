import { useMemo } from 'react';

/**
 * Compute Max Pain strike — the price where maximum option contracts expire worthless.
 * @param {Array} volumeOIData – output of useVolumeOI: [{ strike, callOI, putOI, ... }]
 * @returns {{ data: Array, maxPainStrike: number } | null}
 */
export default function useMaxPain(volumeOIData) {
  return useMemo(() => {
    if (volumeOIData.length === 0) return null;
    const strikes = volumeOIData.map((d) => d.strike);

    const painData = strikes.map((K) => {
      let callPain = 0;
      let putPain = 0;
      volumeOIData.forEach((d) => {
        callPain += Math.max(d.strike - K, 0) * (d.callOI || 0);
        putPain += Math.max(K - d.strike, 0) * (d.putOI || 0);
      });
      return { strike: K, callPain, putPain, totalPain: callPain + putPain };
    });

    let minPain = Infinity;
    let maxPainStrike = null;
    painData.forEach((d) => {
      if (d.totalPain < minPain) {
        minPain = d.totalPain;
        maxPainStrike = d.strike;
      }
    });

    return { data: painData, maxPainStrike };
  }, [volumeOIData]);
}
