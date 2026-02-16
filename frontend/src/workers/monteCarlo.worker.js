import { runMonteCarloGBM } from '../utils/riskMetrics/monteCarlo.js';

self.onmessage = (e) => {
  const result = runMonteCarloGBM(e.data);
  self.postMessage(result);
};
