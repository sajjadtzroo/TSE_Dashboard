import { useMemo } from 'react';
import {
  blackScholesPrice,
  greeks,
  greeks2nd,
  impliedVolatility,
  moneyness,
} from '../utils/blackScholes';
import { computeT } from '../utils/dateUtils';

/**
 * Enrich raw option records with BS analytics: IV, Greeks, moneyness.
 * @param {Array} options – raw option records from API
 * @param {number} underlyingPrice – spot price of underlying asset
 * @param {number} riskFreeRate – annual rate as percentage (e.g. 23)
 * @returns {Array} enriched options with iv, delta, gamma, theta, vega, rho, bs_price, moneyness
 */
export function useEnrichedOptions(options, underlyingPrice, riskFreeRate) {
  return useMemo(() => {
    if (!options?.length || !underlyingPrice) return options || [];
    const S = underlyingPrice;
    const r = (riskFreeRate || 23) / 100;

    return options.map((opt) => {
      const K = opt.strike_price;
      const T = computeT(opt.expiry_date);
      const marketPrice = opt.last || opt.close;
      const type = opt.option_type;

      if (!K || !type || T <= 0) {
        return {
          ...opt,
          iv: null,
          delta: null,
          gamma: null,
          theta: null,
          vega: null,
          rho: null,
          bs_price: null,
          moneyness: moneyness(type, S, K),
          time_to_expiry: T,
        };
      }

      const iv = impliedVolatility(type, marketPrice, S, K, T, r);
      const sigma = iv || 0.3; // fallback for Greeks when IV unavailable
      const g = greeks(type, S, K, T, r, sigma);
      const g2 = greeks2nd(type, S, K, T, r, sigma);
      const bsPrice = blackScholesPrice(type, S, K, T, r, sigma);

      return {
        ...opt,
        iv: iv != null ? iv * 100 : null, // as percentage
        delta: g.delta,
        gamma: g.gamma,
        theta: g.theta,
        vega: g.vega,
        rho: g.rho,
        vanna: g2.vanna,
        volga: g2.volga,
        charm: g2.charm,
        speed: g2.speed,
        color: g2.color,
        bs_price: bsPrice,
        moneyness: moneyness(type, S, K),
        time_to_expiry: T,
      };
    });
  }, [options, underlyingPrice, riskFreeRate]);
}

/**
 * Build an enriched chain map from raw options.
 * @returns {Map<number, { call, put }>} where call/put include computed Greeks
 */
export function useEnrichedChainMap(chainMap, underlyingPrice, riskFreeRate) {
  return useMemo(() => {
    if (!chainMap || chainMap.size === 0 || !underlyingPrice) return chainMap;
    const S = underlyingPrice;
    const r = (riskFreeRate || 23) / 100;

    const enriched = new Map();
    for (const [strike, { call, put }] of chainMap.entries()) {
      enriched.set(strike, {
        call: call ? enrichOption(call, S, r) : null,
        put: put ? enrichOption(put, S, r) : null,
      });
    }
    return enriched;
  }, [chainMap, underlyingPrice, riskFreeRate]);
}

function enrichOption(opt, S, r) {
  const K = opt.strike_price;
  const T = computeT(opt.expiry_date);
  const marketPrice = opt.last || opt.close;
  const type = opt.option_type;

  if (!K || !type || T <= 0) {
    return { ...opt, iv: null, delta: null, gamma: null, theta: null, vega: null, rho: null, bs_price: null, moneyness: moneyness(type, S, K), time_to_expiry: T };
  }

  const iv = impliedVolatility(type, marketPrice, S, K, T, r);
  const sigma = iv || 0.3;
  const g = greeks(type, S, K, T, r, sigma);
  const g2 = greeks2nd(type, S, K, T, r, sigma);
  const bsPrice = blackScholesPrice(type, S, K, T, r, sigma);

  return {
    ...opt,
    iv: iv != null ? iv * 100 : null,
    delta: g.delta,
    gamma: g.gamma,
    theta: g.theta,
    vega: g.vega,
    rho: g.rho,
    vanna: g2.vanna,
    volga: g2.volga,
    charm: g2.charm,
    speed: g2.speed,
    color: g2.color,
    bs_price: bsPrice,
    moneyness: moneyness(type, S, K),
    time_to_expiry: T,
  };
}
