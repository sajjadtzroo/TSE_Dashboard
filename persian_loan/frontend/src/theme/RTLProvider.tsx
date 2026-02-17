/**
 * RTL Provider for Material-UI
 * Ensures proper right-to-left text direction support
 */

import { ReactNode, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache, { EmotionCache } from '@emotion/cache';
import { muiTheme } from './muiTheme';

// Create RTL cache for emotion
let cacheRtl: EmotionCache;
try {
  cacheRtl = createCache({
    key: 'muirtl',
    stylisPlugins: [prefixer, rtlPlugin],
  });
} catch (err) {
  console.error('RTL cache creation failed, falling back:', err);
  cacheRtl = createCache({ key: 'mui' });
}

interface RTLProviderProps {
  children: ReactNode;
}

export function RTLProvider({ children }: RTLProviderProps) {
  // Set document direction to RTL
  useEffect(() => {
    document.dir = 'rtl';
  }, []);

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
