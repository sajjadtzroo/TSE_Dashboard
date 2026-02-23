import { useMemo } from 'react';
import { blackScholesPrice, greeks } from '../utils/blackScholes';
import {
  SENSITIVITY_SPOT_RANGE,
  SENSITIVITY_VOL_RANGE,
} from '../constants/options';

/**
 * Build a what-if sensitivity matrix (spot × vol) for the ATM call.
 *
 * Spot range: ±SENSITIVITY_SPOT_RANGE from current price (11 steps)
 * Vol range:  ±SENSITIVITY_VOL_RANGE of base IV (11 steps)
 *
 * @param {Array}  calls          – call options enriched with .moneyness, .time_to_expiry, .iv, .strike_price
 * @param {number} underlyingPrice
 * @param {number} riskFreeRate   – annual rate as percentage (e.g. 23)
 * @param {string} sensGreek      – 'price' | 'delta' | 'gamma' | 'vega' | 'theta'
 * @returns {{ spots, vols, rows, K, T } | null}
 */
export default function useSensitivityMatrix(calls, underlyingPrice, riskFreeRate, sensGreek) {
  return useMemo(() => {
    if (!underlyingPrice || underlyingPrice <= 0) return null;
    const r = riskFreeRate / 100;

    const atmCall = calls.find((c) => c.moneyness === 'ATM' && c.time_to_expiry > 0)
      || calls.find((c) => c.time_to_expiry > 0);
    if (!atmCall) return null;

    const K = atmCall.strike_price;
    const T = atmCall.time_to_expiry;
    const baseSigma = (atmCall.iv || 30) / 100;

    // Spot range: from (1 - SPOT_RANGE) to (1 + SPOT_RANGE) in 10 equal steps
    // e.g. SENSITIVITY_SPOT_RANGE=0.20 → 0.80 … 1.20 of underlying price
    const spots = [];
    for (let i = 0; i <= 10; i++) {
      spots.push(Math.round(underlyingPrice * (1 - SENSITIVITY_SPOT_RANGE + (SENSITIVITY_SPOT_RANGE * 2 / 10) * i)));
    }

    // Vol range: from (1 - VOL_RANGE) to (1 + VOL_RANGE) of base IV in 10 equal steps
    // e.g. SENSITIVITY_VOL_RANGE=0.50 → 0.50 … 1.50 of baseSigma
    const vols = [];
    for (let i = 0; i <= 10; i++) {
      vols.push(Math.round(baseSigma * (1 - SENSITIVITY_VOL_RANGE + (SENSITIVITY_VOL_RANGE * 2 / 10) * i) * 10000) / 10000);
    }

    const rows = vols.map((sigma) => {
      const cells = spots.map((S) => {
        if (sensGreek === 'price') {
          return blackScholesPrice('call', S, K, T, r, sigma);
        }
        const g = greeks('call', S, K, T, r, sigma);
        return g[sensGreek] || 0;
      });
      return { vol: sigma, cells };
    });

    return { spots, vols, rows, K, T };
  }, [underlyingPrice, riskFreeRate, calls, sensGreek]);
}
