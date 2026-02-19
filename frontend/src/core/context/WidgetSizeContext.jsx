import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'kpi-density';

const WidgetSizeContext = createContext(null);

export function WidgetSizeProvider({ children }) {
  const [density, setDensityState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'default',
  );

  const setDensity = useCallback((next) => {
    setDensityState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <WidgetSizeContext.Provider value={{ density, setDensity }}>
      {children}
    </WidgetSizeContext.Provider>
  );
}

export function useWidgetSize() {
  const ctx = useContext(WidgetSizeContext);
  if (!ctx) throw new Error('useWidgetSize must be used inside WidgetSizeProvider');
  return ctx;
}
