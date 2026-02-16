import { useMemo } from 'react';
import { strategyPayoff, findBreakevens } from '../utils/blackScholes';

export default function usePayoffData(legs, priceRange, steps = 500) {
  return useMemo(() => {
    const [lo, hi] = priceRange;
    const step = (hi - lo) / steps;

    const lineData = [];
    for (let i = 0; i <= steps; i++) {
      const x = lo + i * step;
      const y = strategyPayoff(legs, x);
      lineData.push({
        price: x,
        payoff: y,
        profit: y >= 0 ? y : 0,
        loss: y < 0 ? y : 0,
      });
    }

    // Breakeven points
    const breakevens = findBreakevens(legs, priceRange, steps);
    for (const bx of breakevens) {
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < lineData.length; i++) {
        const dist = Math.abs(lineData[i].price - bx);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }
      lineData[closestIdx].breakeven = 0;
    }

    // Strike markers
    const strikes = [
      ...new Set(legs.filter((l) => l.type !== 'stock').map((l) => l.strike)),
    ];
    for (const k of strikes) {
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < lineData.length; i++) {
        const dist = Math.abs(lineData[i].price - k);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }
      lineData[closestIdx].strike = strategyPayoff(legs, k);
    }

    // Y domain with padding
    const allY = lineData.map((d) => d.payoff);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const yPad = Math.max(Math.abs(maxY - minY) * 0.15, 1);

    return {
      data: lineData,
      yDomain: [minY - yPad, maxY + yPad],
    };
  }, [legs, priceRange, steps]);
}
