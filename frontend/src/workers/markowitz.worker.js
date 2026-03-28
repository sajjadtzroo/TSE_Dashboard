import {
  efficientFrontier,
  maxSharpePortfolio,
  minVariancePortfolio,
  riskParityPortfolio,
} from '../utils/riskMetrics/markowitz';

self.onmessage = (e) => {
  const { mode, expectedReturns, covMatrix, constraints } = e.data;
  try {
    let result;
    switch (mode) {
      case 'frontier':
        result = efficientFrontier(expectedReturns, covMatrix, constraints);
        break;
      case 'maxSharpe':
        result = maxSharpePortfolio(
          expectedReturns,
          covMatrix,
          constraints?.rfRate,
          constraints,
        );
        break;
      case 'minVariance':
        result = minVariancePortfolio(expectedReturns, covMatrix, constraints);
        break;
      case 'riskParity':
        result = riskParityPortfolio(covMatrix);
        break;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
    self.postMessage({ success: true, result });
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
