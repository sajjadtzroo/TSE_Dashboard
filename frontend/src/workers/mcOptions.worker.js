import { mcPriceEuropean, mcPriceStrategy } from '../utils/monteCarloOptions';

self.onmessage = (e) => {
  const { mode, config } = e.data;
  try {
    const result = mode === 'strategy'
      ? mcPriceStrategy(config)
      : mcPriceEuropean(config);
    self.postMessage({ success: true, result });
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
