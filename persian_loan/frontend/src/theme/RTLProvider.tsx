/**
 * RTL Provider using Mantine DirectionProvider
 */

import { ReactNode, useEffect } from 'react';
import { DirectionProvider } from '@mantine/core';

interface RTLProviderProps {
  children: ReactNode;
}

export function RTLProvider({ children }: RTLProviderProps) {
  useEffect(() => {
    document.documentElement.dir = 'rtl';
  }, []);

  return (
    <DirectionProvider initialDirection="rtl">
      {children}
    </DirectionProvider>
  );
}
