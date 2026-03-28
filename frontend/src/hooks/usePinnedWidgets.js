import { useState, useCallback } from 'react';

const STORAGE_KEY = 'tse-pinned-widgets';

const DEFAULT_PINS = ['total_volume', 'total_value', 'advancers'];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PINS;
  } catch { return DEFAULT_PINS; }
}

function save(pins) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
}

export const WIDGET_OPTIONS = [
  { id: 'total_volume', label: 'حجم کل بازار' },
  { id: 'total_value', label: 'ارزش کل معاملات' },
  { id: 'advancers', label: 'نمادهای مثبت' },
  { id: 'decliners', label: 'نمادهای منفی' },
  { id: 'avg_pe', label: 'میانگین P/E' },
  { id: 'new_highs', label: 'سقف جدید' },
  { id: 'new_lows', label: 'کف جدید' },
  { id: 'unchanged', label: 'بدون تغییر' },
  { id: 'market_cap', label: 'ارزش بازار' },
  { id: 'trades_count', label: 'تعداد معاملات' },
];

export default function usePinnedWidgets() {
  const [pinned, setPinned] = useState(load);

  const togglePin = useCallback((widgetId) => {
    setPinned((prev) => {
      const next = prev.includes(widgetId)
        ? prev.filter((id) => id !== widgetId)
        : [...prev, widgetId];
      save(next);
      return next;
    });
  }, []);

  const isPinned = useCallback((widgetId) => pinned.includes(widgetId), [pinned]);

  return { pinned, togglePin, isPinned };
}
