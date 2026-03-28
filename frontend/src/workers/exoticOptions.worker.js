import { asianPriceMC, lookbackPriceMC } from '../utils/exoticOptions';

self.onmessage = (e) => {
  const { mode, config } = e.data;
  try {
    let result;
    if (mode === 'asian') {
      const { type, avgType, S, K, T, r, sigma, numPaths, steps } = config;
      result = asianPriceMC(type, avgType, S, K, T, r, sigma, numPaths, steps);
    } else if (mode === 'lookback') {
      const { type, S, T, r, sigma, numPaths, steps } = config;
      result = lookbackPriceMC(type, S, T, r, sigma, numPaths, steps);
    } else {
      throw new Error(`Unknown exotic option mode: ${mode}`);
    }
    self.postMessage({ success: true, result });
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
