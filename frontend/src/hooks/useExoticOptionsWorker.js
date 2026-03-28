import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook that runs exotic option MC pricing (Asian / Lookback) in a Web Worker.
 * Follows the same pattern as useMonteCarloWorker.
 *
 * @param {'asian'|'lookback'} mode - Which exotic type to price
 * @param {Object} config - Configuration passed to the worker
 * @returns {{ result, running, rerun }}
 */
export default function useExoticOptionsWorker(mode, config) {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const workerRef = useRef(null);

  const run = useCallback(() => {
    if (!config || !config.S || !config.sigma) return;

    // Terminate previous worker if running
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setRunning(true);
    const worker = new Worker(
      new URL('../workers/exoticOptions.worker.js', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.success) {
        setResult(e.data.result);
      } else {
        console.error('Exotic Options Worker error:', e.data.error);
        setResult(null);
      }
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.onerror = () => {
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage({ mode, config });
  }, [mode, config]);

  // Auto-run when config changes
  useEffect(() => {
    if (config && config.S && config.sigma) {
      run();
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [mode, config?.S, config?.K, config?.T, config?.r, config?.sigma, config?.numPaths, config?.type, config?.avgType]); // eslint-disable-line react-hooks/exhaustive-deps

  return { result, running, rerun: run };
}
