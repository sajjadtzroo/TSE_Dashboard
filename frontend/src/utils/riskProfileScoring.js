import {
  QUESTIONS,
  MAX_SCORE,
  RISK_CATEGORIES,
} from '../constants/riskQuestions';

/**
 * Compute risk profile from questionnaire answers.
 * @param {Object} answers — { q1: 8, q2: 6, ... q12: 10 }
 * @returns {{ totalScore, normalizedScore, abilityScore, willingnessScore, category, config }}
 */
export function computeRiskScore(answers) {
  let totalScore = 0;
  let abilitySum = 0;
  let abilityCount = 0;
  let willingnessSum = 0;
  let willingnessCount = 0;

  for (const q of QUESTIONS) {
    const val = answers[q.id];
    if (val == null) continue;
    totalScore += val;
    if (q.dimension === 'ability') {
      abilitySum += val;
      abilityCount++;
    } else {
      willingnessSum += val;
      willingnessCount++;
    }
  }

  const normalizedScore = Math.round((totalScore / MAX_SCORE) * 100);
  const abilityScore = abilityCount > 0
    ? Math.round((abilitySum / (abilityCount * 10)) * 100)
    : 0;
  const willingnessScore = willingnessCount > 0
    ? Math.round((willingnessSum / (willingnessCount * 10)) * 100)
    : 0;

  // Find matching category
  const config = RISK_CATEGORIES.find(
    (c) => normalizedScore >= c.range[0] && normalizedScore <= c.range[1],
  ) || RISK_CATEGORIES[2]; // default to moderate

  return {
    totalScore,
    normalizedScore,
    abilityScore,
    willingnessScore,
    category: config.key,
    config,
  };
}

/**
 * Classify a holding symbol into an asset class.
 * Simple heuristic based on TSE naming conventions.
 */
function classifyHolding(symbol) {
  const s = symbol?.trim() || '';
  // ETFs typically contain keywords
  const etfKeywords = ['یکم', 'آگاس', 'کیان', 'صندوق', 'اهرم'];
  if (etfKeywords.some((k) => s.includes(k))) return 'etfs';
  // Crypto symbols are uppercase English
  if (/^[A-Z]{2,10}$/.test(s)) return 'crypto';
  // Bonds
  if (s.startsWith('اراد') || s.startsWith('اخزا')) return 'bonds';
  // Options
  if (s.startsWith('اختیار') || s.startsWith('ض')) return 'options';
  // Default: stock
  return 'stocks';
}

/**
 * Compare current portfolio allocation with suggested allocation.
 * @param {Array} enrichedHoldings — holdings with currentValue
 * @param {Object} suggestedAllocation — { stocks: 40, etfs: 25, crypto: 5, options: 0, bonds: 30 }
 * @returns {{ gaps: Array, overallDrift: number, currentAllocation: Object }}
 */
export function computeGapAnalysis(enrichedHoldings, suggestedAllocation) {
  if (!enrichedHoldings?.length || !suggestedAllocation) {
    return { gaps: [], overallDrift: 0, currentAllocation: {} };
  }

  const totalValue = enrichedHoldings.reduce(
    (sum, h) => sum + (h.currentValue || h.quantity * h.buyPrice || 0),
    0,
  );
  if (totalValue === 0) {
    return { gaps: [], overallDrift: 0, currentAllocation: {} };
  }

  // Aggregate current allocation by asset class
  const currentAllocation = { stocks: 0, etfs: 0, crypto: 0, options: 0, bonds: 0 };
  for (const h of enrichedHoldings) {
    const cls = classifyHolding(h.symbol);
    const value = h.currentValue || h.quantity * h.buyPrice || 0;
    currentAllocation[cls] += (value / totalValue) * 100;
  }

  // Compute gaps
  const gaps = Object.keys(suggestedAllocation).map((cls) => {
    const current = Math.round(currentAllocation[cls] * 10) / 10;
    const target = suggestedAllocation[cls];
    const diff = current - target;
    return {
      assetClass: cls,
      current,
      target,
      diff,
      status: Math.abs(diff) <= 5 ? 'ok' : diff > 0 ? 'overweight' : 'underweight',
    };
  });

  // Overall drift = average absolute deviation
  const overallDrift =
    gaps.reduce((sum, g) => sum + Math.abs(g.diff), 0) / gaps.length;

  return { gaps, overallDrift, currentAllocation };
}
