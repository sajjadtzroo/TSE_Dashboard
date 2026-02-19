import { lazy } from 'react';

/**
 * Wrapper around React.lazy that retries failed dynamic imports.
 * Handles Vite's "Unable to preload CSS" errors caused by stale cached
 * chunk references after a new deployment.
 *
 * On first failure it retries the import once. If both attempts fail,
 * it forces a full page reload (once per session) so the browser fetches
 * the new index.html with updated asset hashes.
 *
 * @param {() => Promise<{default: import('react').ComponentType}>} importFn
 * @param {string} [chunkName] - optional name for logging
 */
export default function lazyRetry(importFn, chunkName = 'chunk') {
  return lazy(() =>
    importFn().catch((error) => {
      // Check if this is a CSS preload or chunk load failure
      const isCSSError = /Unable to preload CSS/i.test(error?.message);
      const isChunkError = /Failed to fetch dynamically imported module|Loading chunk/i.test(error?.message);

      if (!isCSSError && !isChunkError) {
        throw error; // Not a chunk/CSS error — rethrow
      }

      console.warn(`[lazyRetry] ${chunkName} load failed, retrying...`, error.message);

      // Retry once
      return importFn().catch((retryError) => {
        // Both attempts failed — force reload if we haven't already this session
        const reloadKey = `lazyRetry_reloaded_${chunkName}`;
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, '1');
          console.warn(`[lazyRetry] ${chunkName} retry failed, reloading page...`);
          window.location.reload();
        }
        // If we already reloaded once, let the error boundary handle it
        throw retryError;
      });
    }),
  );
}
