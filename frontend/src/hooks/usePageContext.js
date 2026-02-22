import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export default function usePageContext() {
  const { pathname } = useLocation();

  return useMemo(() => {
    const stockMatch = pathname.match(/\/dashboard\/stock\/([^/?]+)/);
    if (stockMatch) return { section: 'stock', symbol: stockMatch[1] };

    const cryptoMatch = pathname.match(/\/crypto\/coin\/([^/?]+)/);
    if (cryptoMatch) return { section: 'crypto', symbol: cryptoMatch[1] };

    if (pathname.includes('/loans')) return { section: 'loans', symbol: null };
    if (pathname.includes('/portfolio')) return { section: 'portfolio', symbol: null };

    return { section: 'general', symbol: null };
  }, [pathname]);
}
