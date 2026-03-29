import { useState, useMemo, useRef, useCallback } from 'react';
import {
  blackScholesPrice,
  strategyPayoff,
  strategyGreeks,
  findBreakevens,
  maxProfitLoss,
  probabilityOfProfit,
  STRATEGY_PRESETS,
  STRATEGY_LABELS,
} from '../utils/blackScholes';
import rallyColors from '../theme/rallyColors';

export const STRATEGY_OPTIONS = Object.entries(STRATEGY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function autoFillPremiums(legs, S, T, r, sigma) {
  return legs.map((leg) => {
    if (leg.type === 'stock') return leg;
    const premium = blackScholesPrice(leg.type, S, leg.strike, T, r, sigma);
    return { ...leg, premium: Math.round(premium * 100) / 100 };
  });
}

export default function useOptionsState() {
  const [strategy, setStrategy] = useState('straddle');
  const [stockPrice, setStockPrice] = useState(10000);
  const [daysToExpiry, setDaysToExpiry] = useState(30);
  const [riskFreeRate, setRiskFreeRate] = useState(20);
  const [volatility, setVolatility] = useState(30);
  const [legs, setLegs] = useState(() => {
    const T = 30 / 365;
    const r = 0.20;
    const sigma = 0.30;
    return autoFillPremiums(STRATEGY_PRESETS['straddle'](10000), 10000, T, r, sigma);
  });
  const chartRef = useRef(null);

  const T = daysToExpiry / 365;
  const r = riskFreeRate / 100;
  const sigma = volatility / 100;

  // Price range: +-40% around stock price
  const priceRange = useMemo(
    () => [Math.max(0, Math.round(stockPrice * 0.6)), Math.round(stockPrice * 1.4)],
    [stockPrice],
  );

  // Computed analytics
  const computed = useMemo(() => {
    if (!legs.length) {
      return {
        breakevens: [],
        maxProfit: 0,
        maxLoss: 0,
        riskRewardRatio: null,
        netPremium: 0,
        greeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 },
      };
    }
    const breakevens = findBreakevens(legs, priceRange);
    const { maxProfit, maxLoss, riskRewardRatio } = maxProfitLoss(legs, priceRange);
    const gr = strategyGreeks(legs, stockPrice, T, r, sigma);
    const netPremium = legs.reduce((sum, l) => {
      if (l.type === 'stock') return sum;
      return sum + l.direction * l.qty * l.premium;
    }, 0);
    const pop = probabilityOfProfit(legs, stockPrice, T, r, sigma, priceRange);
    return { breakevens, maxProfit, maxLoss, riskRewardRatio, netPremium: Math.round(netPremium * 100) / 100, greeks: gr, pop };
  }, [legs, priceRange, stockPrice, T, r, sigma]);

  // Strategy selection
  const handleStrategyChange = useCallback(
    (key) => {
      if (!key) return;
      setStrategy(key);
      const preset = STRATEGY_PRESETS[key];
      if (preset) {
        const newLegs = autoFillPremiums(preset(stockPrice), stockPrice, T, r, sigma);
        setLegs(newLegs);
      }
    },
    [stockPrice, T, r, sigma],
  );

  // Leg management
  const updateLeg = useCallback((index, field, value) => {
    setLegs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setStrategy('custom');
  }, []);

  const removeLeg = useCallback((index) => {
    setLegs((prev) => prev.filter((_, i) => i !== index));
    setStrategy('custom');
  }, []);

  const addLeg = useCallback(() => {
    setLegs((prev) => {
      if (prev.length >= 4) return prev;
      const premium = blackScholesPrice('call', stockPrice, stockPrice, T, r, sigma);
      return [
        ...prev,
        { type: 'call', direction: 1, strike: stockPrice, premium: Math.round(premium * 100) / 100, qty: 1 },
      ];
    });
    setStrategy('custom');
  }, [stockPrice, T, r, sigma]);

  // Export CSV
  const exportCSV = useCallback(() => {
    const [lo, hi] = priceRange;
    const step = (hi - lo) / 500;
    let csv = 'Price,Payoff\n';
    for (let i = 0; i <= 500; i++) {
      const x = lo + i * step;
      const y = strategyPayoff(legs, x);
      csv += `${x.toFixed(2)},${y.toFixed(2)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payoff_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [legs, priceRange]);

  // Export PNG
  const exportPNG = useCallback(() => {
    const svgEl = chartRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const rect = svgEl.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = rallyColors.card;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'payoff_chart.png';
        a.click();
        URL.revokeObjectURL(url);
      });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  const formatLocalNum = useCallback((n) => {
    if (n === Infinity) return 'نامحدود';
    if (n === -Infinity) return 'نامحدود';
    return n?.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }, []);

  return {
    // State
    strategy,
    stockPrice,
    daysToExpiry,
    riskFreeRate,
    volatility,
    legs,
    chartRef,
    priceRange,

    // Setters
    setStockPrice,
    setDaysToExpiry,
    setRiskFreeRate,
    setVolatility,

    // Computed
    computed,

    // Actions
    handleStrategyChange,
    updateLeg,
    removeLeg,
    addLeg,
    exportCSV,
    exportPNG,

    // Helpers
    formatLocalNum,
  };
}
