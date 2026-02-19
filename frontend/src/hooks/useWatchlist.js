import { useState, useCallback, useRef } from 'react';

const STORAGE_KEY = 'tse-watchlist';
const ALERTS_KEY = 'tse-watchlist-alerts';

function loadWatchlist() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function loadAlerts() {
  try {
    const saved = localStorage.getItem(ALERTS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveAlerts(alerts) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export default function useWatchlist() {
  const [watchlist, setWatchlist] = useState(loadWatchlist);
  const [alerts, setAlerts] = useState(loadAlerts);
  const firedRef = useRef(new Set());

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

  /** Set price alert for a symbol: { high?: number, low?: number } */
  const setAlert = useCallback((symbol, { high, low }) => {
    const current = loadAlerts();
    const alert = {};
    if (high != null) alert.high = Number(high);
    if (low != null) alert.low = Number(low);
    if (Object.keys(alert).length === 0) {
      delete current[symbol];
    } else {
      current[symbol] = alert;
    }
    saveAlerts(current);
    setAlerts({ ...current });
    firedRef.current.delete(symbol); // reset fired state on change
  }, []);

  /** Remove all alerts for a symbol */
  const clearAlert = useCallback((symbol) => {
    const current = loadAlerts();
    delete current[symbol];
    saveAlerts(current);
    setAlerts({ ...current });
    firedRef.current.delete(symbol);
  }, []);

  /** Check prices against alerts and fire browser Notifications */
  const checkAlerts = useCallback((priceMap) => {
    // priceMap: { symbol: lastPrice }
    const current = loadAlerts();
    for (const [symbol, { high, low }] of Object.entries(current)) {
      const price = priceMap[symbol];
      if (price == null) continue;
      const key = `${symbol}-${high}-${low}`;
      if (firedRef.current.has(key)) continue;

      let msg = null;
      if (high != null && price >= high) {
        msg = `${symbol}: قیمت به ${price.toLocaleString()} رسید (بالای ${high.toLocaleString()})`;
      } else if (low != null && price <= low) {
        msg = `${symbol}: قیمت به ${price.toLocaleString()} رسید (زیر ${low.toLocaleString()})`;
      }

      if (msg) {
        firedRef.current.add(key);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('هشدار قیمت', { body: msg, icon: '/favicon.ico' });
        }
      }
    }
  }, []);

  /** Request browser notification permission */
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  return {
    watchlist, addSymbol, removeSymbol, toggleSymbol, isWatched,
    alerts, setAlert, clearAlert, checkAlerts, requestNotificationPermission,
  };
}
