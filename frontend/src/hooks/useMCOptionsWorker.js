import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook that runs Monte Carlo option pricing in a Web Worker.
 * Follows the same pattern as useMonteCarloWorker.
 *
 * @param {'european'|'strategy'} mode - Which MC function to invoke
 * @param {Object} config - Configuration passed to the worker
 * @returns {{ result, running, rerun }}
 */
export default function useMCOptionsWorker(mode, config) {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const workerRef = useRef(null);

  const run = useCallback(() => {
    if (!config) return;

    // For european mode, require S and sigma
    if (mode === 'european' && (!config.S || !config.sigma)) return;
    // For strategy mode, require legs and S
    if (mode === 'strategy' && (!config.legs?.length || !config.S)) return;

    // Terminate previous worker if running
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setRunning(true);
    const worker = new Worker(
      new URL('../workers/mcOptions.worker.js', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.success) {
        setResult(e.data.result);
      } else {
        console.error('MC Options Worker error:', e.data.error);
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
    if (config) {
      run();
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [mode, config?.S, config?.K, config?.T, config?.r, config?.sigma, config?.numPaths, config?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  return { result, running, rerun: run };
}
