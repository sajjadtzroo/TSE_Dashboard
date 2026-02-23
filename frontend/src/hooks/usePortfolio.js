import { useState, useCallback, useMemo } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/localStorage';

const KEY = 'tse-portfolio';

function load() {
  const items = loadFromStorage(KEY);
  // Migrate old holdings that lack market_type
  return items.map((h) => (h.market_type ? h : { ...h, market_type: 'tse' }));
}

export default function usePortfolio() {
  const [holdings, setHoldings] = useState(load);

  const save = (items) => {
    saveToStorage(KEY, items);
    setHoldings(items);
  };

  const addHolding = useCallback((symbol, quantity, buyPrice, marketType = 'tse') => {
    const current = load();
    const idx = current.findIndex((h) => h.symbol === symbol);
    if (idx >= 0) {
      const updated = [...current];
      updated[idx] = { ...updated[idx], quantity: Number(quantity), buyPrice: Number(buyPrice) };
      save(updated);
    } else {
      save([...current, { symbol, quantity: Number(quantity), buyPrice: Number(buyPrice), market_type: marketType, addedAt: new Date().toISOString() }]);
    }
  }, []);

  const updateHolding = useCallback((symbol, patch) => {
    save(load().map((h) => (h.symbol === symbol ? { ...h, ...patch } : h)));
  }, []);

  const removeHolding = useCallback((symbol) => {
    save(load().filter((h) => h.symbol !== symbol));
  }, []);

  const clearPortfolio = useCallback(() => {
    save([]);
  }, []);

  const totalCost = useMemo(
    () => holdings.reduce((sum, h) => sum + h.quantity * h.buyPrice, 0),
    [holdings],
  );

  return { holdings, addHolding, updateHolding, removeHolding, clearPortfolio, totalCost };
}
