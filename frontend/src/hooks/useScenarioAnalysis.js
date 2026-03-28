import { useMemo } from 'react';
import { strategyScenarioAnalysis } from '../utils/blackScholes';

export default function useScenarioAnalysis(legs, S, T, r, sigma, scenarios) {
  return useMemo(() => {
    if (!legs?.length || !S || !T || !sigma) return null;
    return strategyScenarioAnalysis(legs, S, T, r, sigma, scenarios);
  }, [legs, S, T, r, sigma, scenarios]);
}
