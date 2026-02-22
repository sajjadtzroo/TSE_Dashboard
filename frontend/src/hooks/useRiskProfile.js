import { useState, useCallback, useMemo } from 'react';
import {
  RISK_CATEGORIES,
  SUGGESTED_SYMBOLS,
  ASSET_CLASS_RATIONALE,
  QUESTIONNAIRE_VERSION,
} from '../constants/riskQuestions';

const KEY = 'tse-risk-profile';

function load() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/**
 * Manage risk profile persistence (localStorage for phase 1).
 * Returns saved profile + CRUD helpers.
 */
export default function useRiskProfile() {
  const [profile, setProfile] = useState(load);

  const saveProfile = useCallback((data) => {
    const record = {
      ...data,
      version: QUESTIONNAIRE_VERSION,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(record));
    setProfile(record);
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(KEY);
    setProfile(null);
  }, []);

  const hasProfile = profile != null;

  return { profile, saveProfile, clearProfile, hasProfile };
}

/**
 * Get suggested portfolio for a given risk category.
 * Returns static suggestions (phase 1); will switch to API in phase 2.
 */
export function useSuggestedPortfolio(category) {
  return useMemo(() => {
    if (!category) return null;

    const config = RISK_CATEGORIES.find((c) => c.key === category);
    if (!config) return null;

    const symbols = SUGGESTED_SYMBOLS[category] || {};

    // Build holdings array
    const holdings = Object.entries(config.allocation)
      .filter(([, weight]) => weight > 0)
      .map(([cls, weight]) => ({
        assetClass: cls,
        weight,
        symbols: symbols[cls] || [],
        rationale: ASSET_CLASS_RATIONALE[cls] || '',
      }));

    return {
      category: config.key,
      label: config.label,
      allocation: config.allocation,
      holdings,
      metrics: config.metrics,
    };
  }, [category]);
}
