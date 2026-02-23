import { useMemo } from 'react';
import { computeAllMetrics } from '../utils/riskMetrics/index.js';

/**
 * Risk metrics hook for crypto coins.
 * Wraps computeAllMetrics() with crypto-specific inputs.
 *
 * @param {Array} normalizedHistory - [{date, open, high, low, close, volume}]
 * @param {Array} benchHistory - [{date, close}] (benchmark coin history)
 * @param {number} rfAnnual - risk-free rate (default 0.05 for USD)
 * @returns {{ metrics: Object|null, insufficientData: boolean }}
 */
export default function useCryptoRiskMetrics(normalizedHistory, benchHistory, rfAnnual = 0.05) {
  const metrics = useMemo(() => {
    if (!normalizedHistory || normalizedHistory.length < 5) return null;
    return computeAllMetrics({
      stockHistory: normalizedHistory,
      benchHistory: benchHistory?.length > 0 ? benchHistory : null,
      rfAnnual,
    });
  }, [normalizedHistory, benchHistory, rfAnnual]);

  const insufficientData = normalizedHistory && normalizedHistory.length > 0 && normalizedHistory.length < 30;

  return { metrics, insufficientData };
}
