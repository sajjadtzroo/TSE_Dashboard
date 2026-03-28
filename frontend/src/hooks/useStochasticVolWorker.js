import { useState, useCallback, useRef } from 'react';

/**
 * Hook that runs stochastic volatility computations in a Web Worker.
 * Mirrors the pattern from useMonteCarloWorker.js.
 *
 * Usage:
 *   const { result, running, run } = useStochasticVolWorker();
 *   run('hestonPrice', { type: 'call', params: { S, K, T, r, v0, kappa, theta, xi, rho } });
 *   run('hestonSurface', { baseParams, strikes, expiries });
 *   run('calibrateHeston', { marketData, S, r, initialGuess, maxIter });
 *   run('sabrSmile', { F, T, alpha, beta, rho, nu, strikes });
 *   run('calibrateSABR', { marketData, F, T, beta });
 */
export default function useStochasticVolWorker() {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const workerRef = useRef(null);

  const run = useCallback((mode, config) => {
    // Terminate previous worker if running
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setRunning(true);
    setError(null);

    const worker = new Worker(
      new URL('../workers/stochasticVol.worker.js', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { success, result: res, error: errMsg } = e.data;
      if (success) {
        setResult(res);
        setError(null);
      } else {
        setError(errMsg || 'Worker error');
        setResult(null);
      }
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.onerror = (e) => {
      setError(e.message || 'Worker error');
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage({ mode, config });
  }, []);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setRunning(false);
    }
  }, []);

  return { result, running, error, run, cancel };
}
