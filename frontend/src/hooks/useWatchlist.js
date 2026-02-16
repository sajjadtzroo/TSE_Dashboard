import { useState, useCallback } from 'react';

const STORAGE_KEY = 'tse-watchlist';

function loadWatchlist() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function useWatchlist() {
  const [watchlist, setWatchlist] = useState(loadWatchlist);

  const save = (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setWatchlist(items);
  };

  const addSymbol = useCallback((symbol) => {
    const current = loadWatchlist();
    if (!current.includes(symbol)) {
      save([...current, symbol]);
    }
  }, []);

  const removeSymbol = useCallback((symbol) => {
    const current = loadWatchlist();
    save(current.filter((s) => s !== symbol));
  }, []);

  const toggleSymbol = useCallback((symbol) => {
    const current = loadWatchlist();
    if (current.includes(symbol)) {
      save(current.filter((s) => s !== symbol));
    } else {
      save([...current, symbol]);
    }
  }, []);

  const isWatched = useCallback((symbol) => {
    return watchlist.includes(symbol);
  }, [watchlist]);

  return { watchlist, addSymbol, removeSymbol, toggleSymbol, isWatched };
}
