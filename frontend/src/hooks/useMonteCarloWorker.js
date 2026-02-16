import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook that runs Monte Carlo simulation in a Web Worker.
 */
export default function useMonteCarloWorker(config) {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const workerRef = useRef(null);

  const run = useCallback(() => {
    if (!config || !config.currentPrice || !config.sigma) return;

    // Terminate previous worker if running
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setRunning(true);
    const worker = new Worker(
      new URL('../workers/monteCarlo.worker.js', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      setResult(e.data);
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.onerror = () => {
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage(config);
  }, [config]);

  // Auto-run when config changes
  useEffect(() => {
    if (config && config.currentPrice && config.sigma) {
      run();
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [config?.currentPrice, config?.mu, config?.sigma]);

  return { result, running, rerun: run };
}
