import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook that runs Markowitz portfolio optimization in a Web Worker.
 * Pattern matches useMonteCarloWorker.js.
 *
 * @param {object|null} config - { mode, expectedReturns, covMatrix, constraints }
 *   mode: 'frontier' | 'maxSharpe' | 'minVariance' | 'riskParity'
 * @returns {{ result, running, error, run }}
 */
export default function useMarkowitzWorker() {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const workerRef = useRef(null);

  const run = useCallback((config) => {
    if (!config) return;

    // Terminate previous worker if still running
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setRunning(true);
    setError(null);

    const worker = new Worker(
      new URL('../workers/markowitz.worker.js', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.success) {
        setResult(e.data.result);
      } else {
        setError(e.data.error);
      }
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.onerror = (err) => {
      setError(err.message || 'Worker error');
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage(config);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return { result, running, error, run };
}
