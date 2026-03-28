import {
  hestonPrice,
  hestonGreeks,
  hestonIVSurface,
  calibrateHeston,
  sabrSmile,
  calibrateSABR,
} from '../utils/stochasticVol';

self.onmessage = (e) => {
  const { mode, config } = e.data;
  try {
    let result;
    switch (mode) {
      case 'hestonPrice':
        result = {
          price: hestonPrice(config.type, config.params),
          greeks: hestonGreeks(config.type, config.params),
        };
        break;
      case 'hestonSurface':
        result = hestonIVSurface(config.baseParams, config.strikes, config.expiries);
        break;
      case 'calibrateHeston':
        result = calibrateHeston(
          config.marketData,
          config.S,
          config.r,
          config.initialGuess,
          config.maxIter,
        );
        break;
      case 'sabrSmile':
        result = sabrSmile(
          config.F,
          config.T,
          config.alpha,
          config.beta,
          config.rho,
          config.nu,
          config.strikes,
        );
        break;
      case 'calibrateSABR':
        result = calibrateSABR(
          config.marketData,
          config.F,
          config.T,
          config.beta,
        );
        break;
      default:
        result = { error: 'Unknown mode' };
    }
    self.postMessage({ success: true, result });
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
