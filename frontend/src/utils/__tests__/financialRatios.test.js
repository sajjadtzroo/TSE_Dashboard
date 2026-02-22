import { describe, it, expect } from 'vitest';
import {
  profitabilityRatios,
  solvencyRatios,
  liquidityRatios,
  efficiencyRatios,
  valuationRatios,
  dupontAnalysis,
  cashFlowRatios,
  computeAllRatios,
  computeRatioTimeSeries,
} from '../financialRatios';
import {
  mockIncomeStatement as inc,
  mockBalanceSheet as bs,
  mockPrevBalanceSheet as prevBs,
  mockCashFlowStatement as cf,
  mockMarket as market,
} from './fixtures';

// ═══════════════════════════════════════════════════════════════════════════
// 1. profitabilityRatios
// ═══════════════════════════════════════════════════════════════════════════

describe('profitabilityRatios', () => {
  describe('with prevBs (CFA average equity/assets)', () => {
    const r = profitabilityRatios(inc, bs, prevBs);

    it('grossMargin = 400/1000 = 0.4', () => {
      expect(r.grossMargin).toBeCloseTo(0.4, 2);
    });

    it('operatingMargin = 200/1000 = 0.2', () => {
      expect(r.operatingMargin).toBeCloseTo(0.2, 2);
    });

    it('netMargin = 120/1000 = 0.12', () => {
      expect(r.netMargin).toBeCloseTo(0.12, 2);
    });

    it('ebitda = 200 + 30 = 230', () => {
      expect(r.ebitda).toBe(230);
    });

    it('ebitdaMargin = 230/1000 = 0.23', () => {
      expect(r.ebitdaMargin).toBeCloseTo(0.23, 2);
    });

    it('roe uses avgEquity = (2000+1800)/2 = 1900; 120/1900', () => {
      expect(r.roe).toBeCloseTo(120 / 1900, 2);
    });

    it('roa uses avgAssets = (5000+4500)/2 = 4750; 120/4750', () => {
      expect(r.roa).toBeCloseTo(120 / 4750, 2);
    });

    it('roic = NOPAT/investedCapital = 150/3000 = 0.05', () => {
      // taxRate = 1 - (120/160) = 0.25; NOPAT = 200*(1-0.25) = 150
      // investedCapital = 2000 + (800+200) = 3000
      expect(r.roic).toBeCloseTo(0.05, 2);
    });

    it('pretaxMargin = 160/1000 = 0.16', () => {
      expect(r.pretaxMargin).toBeCloseTo(0.16, 2);
    });
  });

  describe('without prevBs (point-in-time)', () => {
    const r = profitabilityRatios(inc, bs);

    it('roe = 120/2000 = 0.06', () => {
      expect(r.roe).toBeCloseTo(0.06, 2);
    });

    it('roa = 120/5000 = 0.024', () => {
      expect(r.roa).toBeCloseTo(0.024, 2);
    });

    it('margins remain the same without prevBs', () => {
      expect(r.grossMargin).toBeCloseTo(0.4, 2);
      expect(r.operatingMargin).toBeCloseTo(0.2, 2);
      expect(r.netMargin).toBeCloseTo(0.12, 2);
    });
  });

  describe('null/edge cases', () => {
    it('returns {} when inc is null', () => {
      expect(profitabilityRatios(null, bs)).toEqual({});
    });

    it('returns {} when inc is undefined', () => {
      expect(profitabilityRatios(undefined, bs)).toEqual({});
    });

    it('handles null bs gracefully (roe/roa are null)', () => {
      const r = profitabilityRatios(inc, null);
      expect(r.roe).toBeNull();
      expect(r.roa).toBeNull();
      expect(r.grossMargin).toBeCloseTo(0.4, 2);
    });

    it('returns null margins when revenue is 0', () => {
      const zeroRevInc = { ...inc, revenue: 0 };
      const r = profitabilityRatios(zeroRevInc, bs);
      expect(r.grossMargin).toBeNull();
      expect(r.operatingMargin).toBeNull();
      expect(r.netMargin).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. solvencyRatios
// ═══════════════════════════════════════════════════════════════════════════

describe('solvencyRatios', () => {
  const r = solvencyRatios(bs, inc);

  it('debtToEquity = 3000/2000 = 1.5', () => {
    expect(r.debtToEquity).toBeCloseTo(1.5, 2);
  });

  it('debtToAssets = 3000/5000 = 0.6', () => {
    expect(r.debtToAssets).toBeCloseTo(0.6, 2);
  });

  it('equityRatio = 2000/5000 = 0.4', () => {
    expect(r.equityRatio).toBeCloseTo(0.4, 2);
  });

  it('financialLeverage = 5000/2000 = 2.5', () => {
    expect(r.financialLeverage).toBeCloseTo(2.5, 2);
  });

  it('interestCoverage = 200/|−40| = 5', () => {
    expect(r.interestCoverage).toBeCloseTo(5, 2);
  });

  it('debtToCapital = 3000/(3000+2000) = 0.6', () => {
    expect(r.debtToCapital).toBeCloseTo(0.6, 2);
  });

  it('fixedChargeCoverage = (200+10)/(40+10) = 4.2', () => {
    expect(r.fixedChargeCoverage).toBeCloseTo(4.2, 2);
  });

  describe('null/edge cases', () => {
    it('returns {} when bs is null', () => {
      expect(solvencyRatios(null, inc)).toEqual({});
    });

    it('returns {} when bs is undefined', () => {
      expect(solvencyRatios(undefined, inc)).toEqual({});
    });

    it('interestCoverage is null when no interest expense', () => {
      const incNoInterest = {
        ...inc,
        operating_income: 200,
        line_items: { ...inc.line_items, interest_expense: undefined },
      };
      const r2 = solvencyRatios(bs, incNoInterest);
      // interest_expense is undefined, li returns null, Math.abs(null) handled
      expect(r2.interestCoverage).toBeNull();
    });

    it('fixedChargeCoverage is null when both interest and lease are 0', () => {
      const incNoCharges = {
        ...inc,
        line_items: {
          ...inc.line_items,
          interest_expense: 0,
          lease_payments: 0,
          rental_expense: 0,
        },
      };
      const r2 = solvencyRatios(bs, incNoCharges);
      // interest=0, leasePayments=0, so denominator=0 => null
      expect(r2.fixedChargeCoverage).toBeNull();
    });

    it('handles zero equity (division by zero)', () => {
      const bsZeroEquity = { ...bs, total_equity: 0 };
      const r2 = solvencyRatios(bsZeroEquity, inc);
      expect(r2.debtToEquity).toBeNull();
      expect(r2.financialLeverage).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. liquidityRatios
// ═══════════════════════════════════════════════════════════════════════════

describe('liquidityRatios', () => {
  describe('without prevBs', () => {
    const r = liquidityRatios(bs, inc, null);

    it('currentRatio = 1500/1000 = 1.5', () => {
      expect(r.currentRatio).toBeCloseTo(1.5, 2);
    });

    it('quickRatio = (1500-300)/1000 = 1.2', () => {
      expect(r.quickRatio).toBeCloseTo(1.2, 2);
    });

    it('cashRatio = 200/1000 = 0.2', () => {
      expect(r.cashRatio).toBeCloseTo(0.2, 2);
    });

    it('defensiveInterval = (200+400) / ((1000-200-30)/365)', () => {
      // dailyExpenses = (1000 - 200 - 30) / 365 = 770/365
      // defensiveInterval = 600 / (770/365) = 600 * 365/770
      const expected = 600 / (770 / 365);
      expect(r.defensiveInterval).toBeCloseTo(expected, 2);
    });

    it('cashConversionCycle computed from single-period values', () => {
      // No prevBs: use point-in-time values
      // invTurnover = 600/300 = 2; doh = 365/2 = 182.5
      // recTurnover = 1000/400 = 2.5; dso = 365/2.5 = 146
      // payTurnover = 600/250 = 2.4; dpo = 365/2.4 = 152.0833
      const doh = 365 / (600 / 300);
      const dso = 365 / (1000 / 400);
      const dpo = 365 / (600 / 250);
      expect(r.cashConversionCycle).toBeCloseTo(doh + dso - dpo, 2);
    });
  });

  describe('with prevBs', () => {
    const r = liquidityRatios(bs, inc, prevBs);

    it('cashConversionCycle uses averages when prevBs provided', () => {
      // avgInv = (300+260)/2 = 280; invT = 600/280; doh = 365/(600/280)
      // avgRec = (400+360)/2 = 380; recT = 1000/380; dso = 365/(1000/380)
      // avgPay = (250+220)/2 = 235; payT = 600/235; dpo = 365/(600/235)
      const doh = 365 / (600 / 280);
      const dso = 365 / (1000 / 380);
      const dpo = 365 / (600 / 235);
      expect(r.cashConversionCycle).toBeCloseTo(doh + dso - dpo, 2);
    });
  });

  describe('null/edge cases', () => {
    it('returns {} when bs is null', () => {
      expect(liquidityRatios(null, inc, null)).toEqual({});
    });

    it('returns {} when bs is undefined', () => {
      expect(liquidityRatios(undefined, inc, null)).toEqual({});
    });

    it('currentRatio is null when current_liabilities is 0', () => {
      const bsZeroCL = {
        ...bs,
        line_items: { ...bs.line_items, current_liabilities: 0 },
      };
      const r2 = liquidityRatios(bsZeroCL, inc, null);
      expect(r2.currentRatio).toBeNull();
      expect(r2.quickRatio).toBeNull();
      expect(r2.cashRatio).toBeNull();
    });

    it('defensiveInterval is null when inc is null', () => {
      const r2 = liquidityRatios(bs, null, null);
      expect(r2.defensiveInterval).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. efficiencyRatios
// ═══════════════════════════════════════════════════════════════════════════

describe('efficiencyRatios', () => {
  describe('with prevBs (CFA averages)', () => {
    const r = efficiencyRatios(inc, bs, prevBs);

    it('assetTurnover = 1000/4750', () => {
      expect(r.assetTurnover).toBeCloseTo(1000 / 4750, 2);
    });

    it('equityTurnover = 1000/1900', () => {
      expect(r.equityTurnover).toBeCloseTo(1000 / 1900, 2);
    });

    it('inventoryTurnover = 600/280', () => {
      expect(r.inventoryTurnover).toBeCloseTo(600 / 280, 2);
    });

    it('daysInventory = 365/(600/280)', () => {
      expect(r.daysInventory).toBeCloseTo(365 / (600 / 280), 2);
    });

    it('receivablesTurnover = 1000/380', () => {
      expect(r.receivablesTurnover).toBeCloseTo(1000 / 380, 2);
    });

    it('daysSalesOutstanding = 365/(1000/380)', () => {
      expect(r.daysSalesOutstanding).toBeCloseTo(365 / (1000 / 380), 2);
    });

    it('payablesTurnover = 600/235', () => {
      expect(r.payablesTurnover).toBeCloseTo(600 / 235, 2);
    });

    it('daysPayable = 365/(600/235)', () => {
      expect(r.daysPayable).toBeCloseTo(365 / (600 / 235), 2);
    });

    it('workingCapitalTurnover uses average working capital', () => {
      // curWC = 1500-1000 = 500; prevWC = 1300-900 = 400; avgWC = 450
      const avgWC = (500 + 400) / 2;
      expect(r.workingCapitalTurnover).toBeCloseTo(1000 / avgWC, 2);
    });
  });

  describe('without prevBs (point-in-time)', () => {
    const r = efficiencyRatios(inc, bs, null);

    it('assetTurnover = 1000/5000 = 0.2', () => {
      expect(r.assetTurnover).toBeCloseTo(0.2, 2);
    });

    it('equityTurnover = 1000/2000 = 0.5', () => {
      expect(r.equityTurnover).toBeCloseTo(0.5, 2);
    });

    it('inventoryTurnover = 600/300 = 2', () => {
      expect(r.inventoryTurnover).toBeCloseTo(2, 2);
    });

    it('workingCapitalTurnover = 1000/(1500-1000) = 2', () => {
      expect(r.workingCapitalTurnover).toBeCloseTo(2, 2);
    });
  });

  describe('null/edge cases', () => {
    it('returns {} when inc is null', () => {
      expect(efficiencyRatios(null, bs, null)).toEqual({});
    });

    it('returns {} when bs is null', () => {
      expect(efficiencyRatios(inc, null, null)).toEqual({});
    });

    it('returns {} when both are null', () => {
      expect(efficiencyRatios(null, null, null)).toEqual({});
    });

    it('handles zero total_assets (division by zero)', () => {
      const bsZero = { ...bs, total_assets: 0 };
      const r2 = efficiencyRatios(inc, bsZero, null);
      expect(r2.assetTurnover).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. valuationRatios
// ═══════════════════════════════════════════════════════════════════════════

describe('valuationRatios', () => {
  const r = valuationRatios(bs, inc, market);

  it('peRatio = 15 (passthrough from market)', () => {
    expect(r.peRatio).toBe(15);
  });

  it('bookValuePerShare = 2000/20 = 100', () => {
    expect(r.bookValuePerShare).toBeCloseTo(100, 2);
  });

  it('priceToBook = 500/100 = 5', () => {
    expect(r.priceToBook).toBeCloseTo(5, 2);
  });

  it('priceToSales = 10000/1000 = 10', () => {
    expect(r.priceToSales).toBeCloseTo(10, 2);
  });

  it('ev = 10000 + (800+200) - 200 = 10800', () => {
    expect(r.enterpriseValue).toBeCloseTo(10800, 2);
  });

  it('evToEbitda = 10800/230', () => {
    expect(r.evToEbitda).toBeCloseTo(10800 / 230, 2);
  });

  it('earningsYield = 1/15', () => {
    expect(r.earningsYield).toBeCloseTo(1 / 15, 2);
  });

  it('dividendYield = 6/500 = 0.012', () => {
    expect(r.dividendYield).toBeCloseTo(0.012, 2);
  });

  it('evToEbit = 10800/200 = 54', () => {
    expect(r.evToEbit).toBeCloseTo(54, 2);
  });

  it('dividendPayout = 6/12 = 0.5', () => {
    expect(r.dividendPayout).toBeCloseTo(0.5, 2);
  });

  it('retentionRate = 1 - 0.5 = 0.5', () => {
    expect(r.retentionRate).toBeCloseTo(0.5, 2);
  });

  it('sustainableGrowthRate = (120/2000) * 0.5 = 0.03', () => {
    expect(r.sustainableGrowthRate).toBeCloseTo(0.03, 2);
  });

  it('priceToCashFlow is null (populated only in computeAllRatios)', () => {
    expect(r.priceToCashFlow).toBeNull();
  });

  describe('null/edge cases', () => {
    it('returns {} when market is null', () => {
      expect(valuationRatios(bs, inc, null)).toEqual({});
    });

    it('returns {} when market is undefined', () => {
      expect(valuationRatios(bs, inc, undefined)).toEqual({});
    });

    it('earningsYield is null when pe_ratio is 0', () => {
      const mkt0 = { ...market, pe_ratio: 0 };
      const r2 = valuationRatios(bs, inc, mkt0);
      expect(r2.earningsYield).toBeNull();
    });

    it('priceToBook is null when total_shares is 0', () => {
      const mkt0 = { ...market, total_shares: 0 };
      const r2 = valuationRatios(bs, inc, mkt0);
      expect(r2.bookValuePerShare).toBeNull();
      expect(r2.priceToBook).toBeNull();
    });

    it('handles null bs gracefully', () => {
      const r2 = valuationRatios(null, inc, market);
      expect(r2.priceToBook).toBeNull();
      expect(r2.peRatio).toBe(15);
    });

    it('handles null inc gracefully', () => {
      const r2 = valuationRatios(bs, null, market);
      expect(r2.priceToSales).toBeNull();
      expect(r2.evToEbitda).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. dupontAnalysis
// ═══════════════════════════════════════════════════════════════════════════

describe('dupontAnalysis', () => {
  describe('3-factor without prevBs', () => {
    const { threeFactor } = dupontAnalysis(inc, bs);

    it('netMargin = 120/1000 = 0.12', () => {
      expect(threeFactor.netMargin).toBeCloseTo(0.12, 2);
    });

    it('assetTurnover = 1000/5000 = 0.2', () => {
      expect(threeFactor.assetTurnover).toBeCloseTo(0.2, 2);
    });

    it('leverage = 5000/2000 = 2.5', () => {
      expect(threeFactor.leverage).toBeCloseTo(2.5, 2);
    });

    it('roe = 0.12 * 0.2 * 2.5 = 0.06', () => {
      expect(threeFactor.roe).toBeCloseTo(0.06, 2);
    });

    it('product matches NI/Equity', () => {
      const directRoe = 120 / 2000;
      expect(threeFactor.roe).toBeCloseTo(directRoe, 5);
    });
  });

  describe('3-factor with prevBs (uses averages)', () => {
    const { threeFactor } = dupontAnalysis(inc, bs, prevBs);

    it('assetTurnover = 1000/4750', () => {
      expect(threeFactor.assetTurnover).toBeCloseTo(1000 / 4750, 2);
    });

    it('leverage = 4750/1900', () => {
      expect(threeFactor.leverage).toBeCloseTo(4750 / 1900, 2);
    });

    it('roe matches NI/avgEquity', () => {
      const directRoe = 120 / 1900;
      expect(threeFactor.roe).toBeCloseTo(directRoe, 5);
    });
  });

  describe('5-factor without prevBs', () => {
    const { fiveFactor } = dupontAnalysis(inc, bs);

    it('taxBurden = 120/160 = 0.75', () => {
      expect(fiveFactor.taxBurden).toBeCloseTo(0.75, 2);
    });

    it('interestBurden = 160/200 = 0.8', () => {
      expect(fiveFactor.interestBurden).toBeCloseTo(0.8, 2);
    });

    it('ebitMargin = 200/1000 = 0.2', () => {
      expect(fiveFactor.ebitMargin).toBeCloseTo(0.2, 2);
    });

    it('assetTurnover = 1000/5000 = 0.2', () => {
      expect(fiveFactor.assetTurnover).toBeCloseTo(0.2, 2);
    });

    it('leverage = 5000/2000 = 2.5', () => {
      expect(fiveFactor.leverage).toBeCloseTo(2.5, 2);
    });

    it('roe = 0.75 * 0.8 * 0.2 * 0.2 * 2.5 = 0.06', () => {
      expect(fiveFactor.roe).toBeCloseTo(0.06, 2);
    });

    it('5-factor roe equals 3-factor roe', () => {
      const { threeFactor, fiveFactor: ff } = dupontAnalysis(inc, bs);
      expect(ff.roe).toBeCloseTo(threeFactor.roe, 5);
    });
  });

  describe('null/edge cases', () => {
    it('returns { threeFactor: null, fiveFactor: null } when inc is null', () => {
      const result = dupontAnalysis(null, bs);
      expect(result.threeFactor).toBeNull();
      expect(result.fiveFactor).toBeNull();
    });

    it('returns { threeFactor: null, fiveFactor: null } when bs is null', () => {
      const result = dupontAnalysis(inc, null);
      expect(result.threeFactor).toBeNull();
      expect(result.fiveFactor).toBeNull();
    });

    it('handles zero revenue (all components null)', () => {
      const zeroRevInc = { ...inc, revenue: 0 };
      const { threeFactor } = dupontAnalysis(zeroRevInc, bs);
      expect(threeFactor.netMargin).toBeNull();
      expect(threeFactor.roe).toBeNull();
    });

    it('handles zero equity (leverage null)', () => {
      const bsZeroEq = { ...bs, total_equity: 0 };
      const { threeFactor } = dupontAnalysis(inc, bsZeroEq);
      expect(threeFactor.leverage).toBeNull();
      expect(threeFactor.roe).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. cashFlowRatios
// ═══════════════════════════════════════════════════════════════════════════

describe('cashFlowRatios', () => {
  const r = cashFlowRatios(cf, inc, bs);

  it('cfoToNetIncome = 180/120 = 1.5', () => {
    expect(r.cfoToNetIncome).toBeCloseTo(1.5, 2);
  });

  it('cfoToRevenue = 180/1000 = 0.18', () => {
    expect(r.cfoToRevenue).toBeCloseTo(0.18, 2);
  });

  it('fcf = 180 - 50 = 130', () => {
    expect(r.fcf).toBe(130);
  });

  it('fcfMargin = 130/1000 = 0.13', () => {
    expect(r.fcfMargin).toBeCloseTo(0.13, 2);
  });

  it('capexToCfo = 50/180', () => {
    expect(r.capexToCfo).toBeCloseTo(50 / 180, 2);
  });

  it('cashToIncome = 180/200 = 0.9', () => {
    expect(r.cashToIncome).toBeCloseTo(0.9, 2);
  });

  it('reinvestmentRatio = 50/30', () => {
    expect(r.reinvestmentRatio).toBeCloseTo(50 / 30, 2);
  });

  it('capex is taken as absolute value of negative capital_expenditures', () => {
    // capital_expenditures = -50 in fixture, Math.abs gives 50
    expect(r.fcf).toBe(180 - 50);
  });

  describe('null/edge cases', () => {
    it('returns {} when cf is null', () => {
      expect(cashFlowRatios(null, inc, bs)).toEqual({});
    });

    it('returns {} when cf is undefined', () => {
      expect(cashFlowRatios(undefined, inc, bs)).toEqual({});
    });

    it('handles null inc (cfoToNetIncome is null)', () => {
      const r2 = cashFlowRatios(cf, null, bs);
      expect(r2.cfoToNetIncome).toBeNull();
      expect(r2.cfoToRevenue).toBeNull();
      expect(r2.fcf).toBe(130); // fcf still computable from cf alone
    });

    it('reinvestmentRatio is null when depreciation is 0', () => {
      const cfNoDep = {
        ...cf,
        line_items: { ...cf.line_items, depreciation_amortization: 0 },
      };
      const incNoDep = {
        ...inc,
        line_items: { ...inc.line_items, depreciation_amortization: 0 },
      };
      const r2 = cashFlowRatios(cfNoDep, incNoDep, bs);
      // depreciation = 0 from both inc and cf => null passed to div
      expect(r2.reinvestmentRatio).toBeNull();
    });

    it('capexToCfo is null when cfo is 0', () => {
      const cfZeroCfo = {
        ...cf,
        line_items: { ...cf.line_items, operating_cash_flow: 0 },
      };
      const r2 = cashFlowRatios(cfZeroCfo, inc, bs);
      expect(r2.capexToCfo).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. computeAllRatios (integration)
// ═══════════════════════════════════════════════════════════════════════════

describe('computeAllRatios', () => {
  const result = computeAllRatios({
    incomeStatement: inc,
    balanceSheet: bs,
    prevBalanceSheet: prevBs,
    cashFlowStatement: cf,
    market,
  });

  it('returns period metadata from income statement', () => {
    expect(result.period).toBe('1402/12/29');
    expect(result.periodDate).toBe('2024-03-20');
    expect(result.periodMonths).toBe(12);
    expect(result.isAudited).toBe(true);
  });

  it('contains profitability category', () => {
    expect(result.profitability).toBeDefined();
    expect(result.profitability.grossMargin).toBeCloseTo(0.4, 2);
  });

  it('contains solvency category', () => {
    expect(result.solvency).toBeDefined();
    expect(result.solvency.debtToEquity).toBeCloseTo(1.5, 2);
  });

  it('contains liquidity category', () => {
    expect(result.liquidity).toBeDefined();
    expect(result.liquidity.currentRatio).toBeCloseTo(1.5, 2);
  });

  it('contains efficiency category', () => {
    expect(result.efficiency).toBeDefined();
    expect(result.efficiency.assetTurnover).toBeCloseTo(1000 / 4750, 2);
  });

  it('contains valuation category', () => {
    expect(result.valuation).toBeDefined();
    expect(result.valuation.peRatio).toBe(15);
  });

  it('contains dupont category with threeFactor and fiveFactor', () => {
    expect(result.dupont).toBeDefined();
    expect(result.dupont.threeFactor).toBeDefined();
    expect(result.dupont.fiveFactor).toBeDefined();
  });

  it('contains cashFlow category', () => {
    expect(result.cashFlow).toBeDefined();
    expect(result.cashFlow.fcf).toBe(130);
  });

  it('computes priceToCashFlow from cash flow data', () => {
    // P/CF = close / (CFO / total_shares) = 500 / (180/20) = 500 / 9
    expect(result.valuation.priceToCashFlow).toBeCloseTo(500 / 9, 2);
  });

  it('priceToCashFlow is null when no cash flow statement', () => {
    const r2 = computeAllRatios({
      incomeStatement: inc,
      balanceSheet: bs,
      prevBalanceSheet: prevBs,
      cashFlowStatement: null,
      market,
    });
    expect(r2.valuation.priceToCashFlow).toBeNull();
  });

  it('valuation is {} when market is null', () => {
    const r2 = computeAllRatios({
      incomeStatement: inc,
      balanceSheet: bs,
      prevBalanceSheet: prevBs,
      cashFlowStatement: cf,
      market: null,
    });
    expect(r2.valuation).toEqual({});
  });

  it('handles all-null inputs gracefully', () => {
    const r2 = computeAllRatios({
      incomeStatement: null,
      balanceSheet: null,
      prevBalanceSheet: null,
      cashFlowStatement: null,
      market: null,
    });
    expect(r2.profitability).toEqual({});
    expect(r2.solvency).toEqual({});
    expect(r2.liquidity).toEqual({});
    expect(r2.efficiency).toEqual({});
    expect(r2.valuation).toEqual({});
    expect(r2.dupont.threeFactor).toBeNull();
    expect(r2.cashFlow).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. computeRatioTimeSeries
// ═══════════════════════════════════════════════════════════════════════════

describe('computeRatioTimeSeries', () => {
  const inc1 = {
    ...inc,
    period_end_date: '2023-03-21',
    period_end_jalali: '1401/12/29',
  };
  const inc2 = {
    ...inc,
    period_end_date: '2024-03-20',
    period_end_jalali: '1402/12/29',
  };
  const bs1 = {
    ...prevBs,
    period_end_date: '2023-03-21',
    period_end_jalali: '1401/12/29',
  };
  const bs2 = {
    ...bs,
    period_end_date: '2024-03-20',
    period_end_jalali: '1402/12/29',
  };
  const cf2 = {
    ...cf,
    period_end_date: '2024-03-20',
  };

  const series = computeRatioTimeSeries({
    incomeStatements: [inc2, inc1], // intentionally out of order
    balanceSheets: [bs1, bs2],
    cashFlowStatements: [cf2],
    market,
  });

  it('returns array with correct length (2 periods)', () => {
    expect(Array.isArray(series)).toBe(true);
    expect(series).toHaveLength(2);
  });

  it('sorts periods chronologically (first period = 2023)', () => {
    expect(series[0].periodDate).toBe('2023-03-21');
    expect(series[1].periodDate).toBe('2024-03-20');
  });

  it('first period has no prevBs (point-in-time)', () => {
    // First period: no previous BS available
    // ROE = 120/1800 (using bs1.total_equity = 1800)
    expect(series[0].profitability.roe).toBeCloseTo(120 / 1800, 2);
  });

  it('second period uses bs1 as prevBs (averages)', () => {
    // Second period: prevBs = bs1 (total_equity=1800), bs = bs2 (total_equity=2000)
    // avgEquity = (2000+1800)/2 = 1900; roe = 120/1900
    expect(series[1].profitability.roe).toBeCloseTo(120 / 1900, 2);
  });

  it('market data only applied to the latest period', () => {
    expect(series[0].valuation).toEqual({});
    expect(series[1].valuation.peRatio).toBe(15);
  });

  it('cash flow only matched to period with same date', () => {
    // cf2 has period_end_date '2024-03-20' => matched to second period
    expect(series[1].cashFlow.fcf).toBe(130);
    // First period has no CF statement
    expect(series[0].cashFlow).toEqual({});
  });

  it('handles empty arrays', () => {
    const empty = computeRatioTimeSeries({
      incomeStatements: [],
      balanceSheets: [],
      cashFlowStatements: [],
      market: null,
    });
    expect(empty).toEqual([]);
  });

  it('handles single period', () => {
    const single = computeRatioTimeSeries({
      incomeStatements: [inc2],
      balanceSheets: [bs2],
      cashFlowStatements: [cf2],
      market,
    });
    expect(single).toHaveLength(1);
    expect(single[0].profitability.grossMargin).toBeCloseTo(0.4, 2);
    expect(single[0].valuation.peRatio).toBe(15);
  });

  it('handles missing balance sheet for a period', () => {
    const series2 = computeRatioTimeSeries({
      incomeStatements: [inc1],
      balanceSheets: [], // no matching BS
      cashFlowStatements: [],
      market,
    });
    expect(series2).toHaveLength(1);
    // inc with no BS: profitability margins still work, roe/roa null
    expect(series2[0].profitability.grossMargin).toBeCloseTo(0.4, 2);
    expect(series2[0].profitability.roe).toBeNull();
  });
});
