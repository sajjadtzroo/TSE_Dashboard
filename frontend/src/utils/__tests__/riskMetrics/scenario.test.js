import { describe, it, expect } from 'vitest';
import { scenarioAnalysis, omegaRatio } from '../../riskMetrics/scenario.js';

// =============================================================================
// 1. scenarioAnalysis
// =============================================================================

describe('scenarioAnalysis', () => {
  it('KAT: price=100, beta=1.2, sigma=0.3, alpha=0 => Bull stockMove=0.72', () => {
    const result = scenarioAnalysis(100, 1.2, 0.3, 0);
    expect(result.length).toBe(4);

    // Bull: marketMove = 2*0.3 = 0.6, stockMove = 1.2*0.6 + 0 = 0.72
    const bull = result[0];
    expect(bull.marketMove).toBeCloseTo(0.6, 4);
    expect(bull.stockMove).toBeCloseTo(0.72, 4);
    expect(bull.targetPrice).toBeCloseTo(172, 4);
    expect(bull.returnPct).toBeCloseTo(0.72, 4);
  });

  it('Base case: stockMove = alpha = 0', () => {
    const result = scenarioAnalysis(100, 1.2, 0.3, 0);
    const base = result[1];
    expect(base.marketMove).toBeCloseTo(0, 4);
    expect(base.stockMove).toBeCloseTo(0, 4);
    expect(base.targetPrice).toBeCloseTo(100, 4);
  });

  it('Bear case: marketMove = -2*sigma', () => {
    const result = scenarioAnalysis(100, 1.2, 0.3, 0);
    const bear = result[2];
    expect(bear.marketMove).toBeCloseTo(-0.6, 4);
    expect(bear.stockMove).toBeCloseTo(-0.72, 4);
    expect(bear.targetPrice).toBeCloseTo(28, 4);
  });

  it('Stress case: marketMove = -3*sigma', () => {
    const result = scenarioAnalysis(100, 1.2, 0.3, 0);
    const stress = result[3];
    expect(stress.marketMove).toBeCloseTo(-0.9, 4);
    expect(stress.stockMove).toBeCloseTo(-1.08, 4);
    expect(stress.targetPrice).toBeCloseTo(-8, 4);
  });

  it('with alpha=0.05: base case stockMove = 0.05', () => {
    const result = scenarioAnalysis(100, 1.2, 0.3, 0.05);
    const base = result[1];
    expect(base.stockMove).toBeCloseTo(0.05, 4);
    expect(base.targetPrice).toBeCloseTo(105, 4);
  });

  it('null inputs return empty array', () => {
    expect(scenarioAnalysis(null, 1.2, 0.3)).toEqual([]);
    expect(scenarioAnalysis(100, null, 0.3)).toEqual([]);
    expect(scenarioAnalysis(100, 1.2, null)).toEqual([]);
  });
});

// =============================================================================
// 2. omegaRatio
// =============================================================================

describe('omegaRatio', () => {
  it('all positive returns => Infinity', () => {
    expect(omegaRatio([0.01, 0.02, 0.03])).toBe(Infinity);
  });

  it('all negative returns => result = 0 (no gains above threshold)', () => {
    const result = omegaRatio([-0.01, -0.02, -0.03]);
    // sumGains = 0, sumLosses > 0 => 0/sumLosses = 0
    expect(result).toBeCloseTo(0, 4);
  });

  it('equal gains and losses => 1.0', () => {
    // +0.02, -0.02 => gains=0.02, losses=0.02 => ratio=1
    expect(omegaRatio([0.02, -0.02])).toBeCloseTo(1.0, 4);
  });

  it('empty returns => null', () => {
    expect(omegaRatio([])).toBeNull();
  });

  it('custom threshold shifts the baseline', () => {
    // threshold=0.01: returns [0.02, 0.005, -0.01]
    // gains above 0.01: (0.02-0.01) = 0.01
    // losses below 0.01: (0.01-0.005)=0.005, (0.01-(-0.01))=0.02 => total=0.025
    // ratio = 0.01 / 0.025 = 0.4
    expect(omegaRatio([0.02, 0.005, -0.01], 0.01)).toBeCloseTo(0.4, 4);
  });
});
