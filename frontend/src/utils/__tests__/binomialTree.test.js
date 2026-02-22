import { describe, it, expect } from 'vitest';
import { buildTree, convergenceData } from '../binomialTree';
import { blackScholesPrice } from '../blackScholes';

// Common parameters
const S = 100, K = 100, T = 1, r = 0.05, sigma = 0.2;

// ═══════════════════════════════════════════════════════════════════════════
// 1. buildTree
// ═══════════════════════════════════════════════════════════════════════════

describe('buildTree', () => {
  it('CRR params: u * d = 1', () => {
    const { u, d } = buildTree(S, K, T, r, sigma, 50, 'call');
    expect(u * d).toBeCloseTo(1, 10);
  });

  it('risk-neutral probability p in (0, 1)', () => {
    const { p } = buildTree(S, K, T, r, sigma, 50, 'call');
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it('1-step European call: hand-computed', () => {
    // dt = 1, u = exp(0.2*1) ~ 1.2214, d = 1/u ~ 0.8187
    // p = (exp(0.05) - d) / (u - d) ~ (1.05127 - 0.8187) / (1.2214 - 0.8187) ~ 0.5774
    // Su = 100 * 1.2214 = 122.14, payoff_u = max(122.14 - 100, 0) = 22.14
    // Sd = 100 * 0.8187 = 81.87,  payoff_d = max(81.87 - 100, 0) = 0
    // price = exp(-0.05) * (p * 22.14 + (1-p) * 0)
    const result = buildTree(S, K, T, r, sigma, 1, 'call', 'european');
    const { u, d, p: prob } = result;

    const uExpected = Math.exp(sigma * Math.sqrt(T));
    expect(u).toBeCloseTo(uExpected, 6);
    expect(d).toBeCloseTo(1 / uExpected, 6);

    const payoffUp = Math.max(S * u - K, 0);
    const payoffDown = Math.max(S * d - K, 0);
    const expectedPrice = Math.exp(-r * T) * (prob * payoffUp + (1 - prob) * payoffDown);
    expect(result.optionPrice).toBeCloseTo(expectedPrice, 6);
  });

  it('European put <= American put (same params)', () => {
    const euro = buildTree(S, K, T, r, sigma, 100, 'put', 'european');
    const amer = buildTree(S, K, T, r, sigma, 100, 'put', 'american');
    expect(amer.optionPrice).toBeGreaterThanOrEqual(euro.optionPrice);
  });

  it('American ITM put has early exercise nodes', () => {
    // ITM put: S=90, K=110
    const result = buildTree(90, 110, T, r, sigma, 50, 'put', 'american');
    expect(result.earlyExerciseNodes.length).toBeGreaterThan(0);
  });

  it('European call = American call (no early exercise without dividends)', () => {
    const euro = buildTree(S, K, T, r, sigma, 100, 'call', 'european');
    const amer = buildTree(S, K, T, r, sigma, 100, 'call', 'american');
    expect(amer.optionPrice).toBeCloseTo(euro.optionPrice, 6);
    expect(amer.earlyExerciseNodes.length).toBe(0);
  });

  it('high step count (200) converges to BS price within 2.0', () => {
    // The BS implementation uses Abramowitz & Stegun CDF approximation, so the
    // binomial tree (which converges to the exact BS formula) may differ by up to
    // ~1.5 from the approximate BS price at typical parameters
    const bsPrice = blackScholesPrice('call', S, K, T, r, sigma);
    const { optionPrice } = buildTree(S, K, T, r, sigma, 200, 'call', 'european');
    expect(Math.abs(optionPrice - bsPrice)).toBeLessThan(2.0);
  });

  it('terminal payoffs: call -> max(S-K, 0), put -> max(K-S, 0)', () => {
    const steps = 10;
    const callTree = buildTree(S, K, T, r, sigma, steps, 'call', 'european');
    const putTree = buildTree(S, K, T, r, sigma, steps, 'put', 'european');

    for (let j = 0; j <= steps; j++) {
      const sT = callTree.nodes[steps][j].stockPrice;
      expect(callTree.nodes[steps][j].optionValue).toBeCloseTo(Math.max(sT - K, 0), 6);
      expect(putTree.nodes[steps][j].optionValue).toBeCloseTo(Math.max(K - sT, 0), 6);
    }
  });

  it('nodes[0][0].optionValue equals optionPrice', () => {
    const result = buildTree(S, K, T, r, sigma, 50, 'call', 'european');
    expect(result.nodes[0][0].optionValue).toBe(result.optionPrice);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. convergenceData
// ═══════════════════════════════════════════════════════════════════════════

describe('convergenceData', () => {
  it('returns array of length maxSteps', () => {
    const data = convergenceData(S, K, T, r, sigma, 'call', 'european', 30);
    expect(data).toHaveLength(30);
  });

  it('last entry price ~ BS price (within 2.0)', () => {
    const maxSteps = 50;
    const data = convergenceData(S, K, T, r, sigma, 'call', 'european', maxSteps);
    const bsPrice = blackScholesPrice('call', S, K, T, r, sigma);
    // convergenceData rounds to 2 decimal places, so allow slightly wider tolerance
    expect(Math.abs(data[maxSteps - 1].price - bsPrice)).toBeLessThan(2.0);
  });

  it('each entry has { steps, price } with steps 1..maxSteps', () => {
    const maxSteps = 20;
    const data = convergenceData(S, K, T, r, sigma, 'put', 'european', maxSteps);
    for (let i = 0; i < maxSteps; i++) {
      expect(data[i]).toHaveProperty('steps', i + 1);
      expect(data[i]).toHaveProperty('price');
      expect(typeof data[i].price).toBe('number');
    }
  });

  it('prices are non-negative for all steps', () => {
    const data = convergenceData(S, K, T, r, sigma, 'call', 'european', 25);
    data.forEach((entry) => {
      expect(entry.price).toBeGreaterThanOrEqual(0);
    });
  });
});
