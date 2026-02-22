import { describe, it, expect } from 'vitest';
import {
  tailRatio,
  gainToLossRatio,
  hitRate,
  captureRatios,
} from '../../riskMetrics/tailRisk.js';

// =============================================================================
// 1. tailRatio
// =============================================================================

describe('tailRatio', () => {
  it('returns null for fewer than 20 returns', () => {
    const returns = Array.from({ length: 19 }, (_, i) => (i - 9) * 0.01);
    expect(tailRatio(returns)).toBeNull();
  });

  it('returns null when P5 = 0', () => {
    // Build 20 returns where P5 index value is 0
    const returns = Array.from({ length: 20 }, (_, i) => i * 0.01);
    // sorted = [0, 0.01, ..., 0.19]; P5 idx = floor(0.05*19) = 0 => value 0
    expect(tailRatio(returns)).toBeNull();
  });

  it('computes |P95/P5| for balanced returns', () => {
    // 40 returns: -0.20, -0.19, ..., 0.19
    const returns = Array.from({ length: 40 }, (_, i) => (i - 20) * 0.01);
    const result = tailRatio(returns);
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
    // Symmetric distribution => |P95/P5| ~ 1.0 (approximately, since sorted symmetrically)
    // P5 idx = floor(0.05*39) = 1 => sorted[1] = -0.19
    // P95 idx = floor(0.95*39) = 37 => sorted[37] = 0.17
    // |0.17 / -0.19| = 0.8947...
    expect(result).toBeCloseTo(0.8947, 3);
  });
});

// =============================================================================
// 2. gainToLossRatio
// =============================================================================

describe('gainToLossRatio', () => {
  it('all positive returns => null (no losses)', () => {
    expect(gainToLossRatio([0.01, 0.02, 0.03])).toBeNull();
  });

  it('all negative returns => null (no gains)', () => {
    expect(gainToLossRatio([-0.01, -0.02, -0.03])).toBeNull();
  });

  it('equal gains and losses => 1.0', () => {
    // avg gain = 0.02, avg loss = -0.02, ratio = 0.02/0.02 = 1.0
    const returns = [0.01, 0.03, -0.01, -0.03];
    expect(gainToLossRatio(returns)).toBeCloseTo(1.0, 4);
  });

  it('gains > losses => ratio > 1', () => {
    const returns = [0.05, 0.03, -0.01, -0.01];
    // avg gain = 0.04, avg loss = -0.01, ratio = 4.0
    expect(gainToLossRatio(returns)).toBeCloseTo(4.0, 4);
  });
});

// =============================================================================
// 3. hitRate
// =============================================================================

describe('hitRate', () => {
  it('all positive => 1', () => {
    expect(hitRate([0.01, 0.02, 0.03])).toBeCloseTo(1.0, 4);
  });

  it('all negative => 0', () => {
    expect(hitRate([-0.01, -0.02, -0.03])).toBeCloseTo(0.0, 4);
  });

  it('50/50 split => 0.5', () => {
    expect(hitRate([0.01, -0.01, 0.02, -0.02])).toBeCloseTo(0.5, 4);
  });

  it('empty array => null', () => {
    expect(hitRate([])).toBeNull();
  });
});

// =============================================================================
// 4. captureRatios
// =============================================================================

describe('captureRatios', () => {
  it('identical series => upside ~ 100, downside ~ 100', () => {
    const returns = [0.02, -0.01, 0.03, -0.02, 0.01];
    const result = captureRatios(returns, returns);
    expect(result.upsideCapture).toBeCloseTo(100, 1);
    expect(result.downsideCapture).toBeCloseTo(100, 1);
  });

  it('outperforming stock has upside capture > 100', () => {
    const bench = [0.01, -0.01, 0.02, -0.02];
    const stock = [0.02, -0.005, 0.04, -0.01]; // outperforms in both directions
    const result = captureRatios(stock, bench);
    expect(result.upsideCapture).toBeGreaterThan(100);
  });

  it('mismatched lengths return nulls', () => {
    const result = captureRatios([0.01, 0.02], [0.01]);
    expect(result.upsideCapture).toBeNull();
    expect(result.downsideCapture).toBeNull();
    expect(result.captureRatio).toBeNull();
  });
});
