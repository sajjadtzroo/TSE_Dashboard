import { backtestStrategy, monteCarloBacktest } from '../utils/optionsBacktest';

self.onmessage = (e) => {
  const { mode, config } = e.data;
  try {
    let result;
    switch (mode) {
      case 'historical':
        result = backtestStrategy(config);
        break;
      case 'monteCarlo':
        result = monteCarloBacktest(config);
        break;
      default:
        throw new Error(`Unknown backtest mode: ${mode}`);
    }
    self.postMessage({ success: true, result });
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
