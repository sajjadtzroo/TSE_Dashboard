# CFA L1/L2 Financial Ratios Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand financial ratio analysis from 27 to ~47 ratios covering the full CFA L1/L2 curriculum, including a new Cash Flow Quality category.

**Architecture:** Extend the existing `financialRatios.js` utility with new ratio functions and a `cashFlowRatios()` category. Add a cash flow statement query to `useStockDetailData.js`. Thread cash flow data through `computeAllRatios()` → `computeRatioTimeSeries()`. Add a 5th "Cash Flow" tab to `FinancialRatiosPanel.jsx` and new KPI cards to existing tabs.

**Tech Stack:** React 18, Mantine v7, Recharts, TanStack Query

---

## Task 1: Add cash flow statement query to useStockDetailData

**Files:**
- Modify: `frontend/src/hooks/useStockDetailData.js:52-58,100-111`

**Step 1: Add the cash_flow query alongside income + balance sheet**

After line 58 (the balance sheet query), add:

```javascript
const { data: cashFlowStatements = [], isLoading: cfLoading } = useFinancialStatements(
  symbol, { statement_type: 'cash_flow', period_months: 12, per_page: 20 }
);
```

**Step 2: Pass cash flow data to computeRatioTimeSeries**

Update the `ratioTimeSeries` useMemo (around line 100) to include `cashFlowStatements`:

```javascript
const ratioTimeSeries = useMemo(() => {
  if (!incomeStatements.length && !balanceSheets.length) return [];
  const market = stockData ? {
    market_cap: stockData.latest_ohlcv?.market_cap,
    pe_ratio: stockData.latest_ohlcv?.pe_ratio,
    close: stockData.latest_ohlcv?.close,
    total_shares: stockData.security?.total_shares,
  } : null;
  return computeRatioTimeSeries({ incomeStatements, balanceSheets, cashFlowStatements, market });
}, [incomeStatements, balanceSheets, cashFlowStatements, stockData]);
```

**Step 3: Include cfLoading in ratiosLoading**

Change:
```javascript
const ratiosLoading = incLoading || bsLoading;
```
To:
```javascript
const ratiosLoading = incLoading || bsLoading || cfLoading;
```

**Step 4: Build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds (computeRatioTimeSeries doesn't use cashFlowStatements yet, but it won't error — it ignores unknown keys)

**Step 5: Commit**

```
feat(hooks): add cash flow statement query to useStockDetailData
```

---

## Task 2: Add new ratio functions to financialRatios.js

**Files:**
- Modify: `frontend/src/utils/financialRatios.js`

### Step 1: Add cashFlowRatios() function

Add after the `dupontAnalysis()` function (after line 243):

```javascript
/**
 * Compute cash flow quality ratios (CFA L1/L2).
 * @param {Object} cf  - cash_flow statement record
 * @param {Object} inc - income_statement record
 * @param {Object} bs  - balance_sheet record
 * @returns {Object} cash flow ratios
 */
export function cashFlowRatios(cf, inc, bs) {
  if (!cf) return {};
  const cfo = li(cf, 'operating_cash_flow') || li(cf, 'cash_from_operations') || li(cf, 'net_cash_from_operating');
  const capex = Math.abs(li(cf, 'capital_expenditures') || li(cf, 'purchase_of_fixed_assets') || li(cf, 'capex') || 0);
  const depreciation = li(inc, 'depreciation_amortization') || li(inc, 'depreciation') || li(cf, 'depreciation_amortization') || li(cf, 'depreciation') || 0;

  const fcf = cfo != null ? cfo - capex : null;

  return {
    cfoToNetIncome: div(cfo, inc?.net_income),
    cfoToRevenue: div(cfo, inc?.revenue),
    fcf,
    fcfMargin: div(fcf, inc?.revenue),
    capexToCfo: div(capex, cfo),
    cashToIncome: div(cfo, inc?.operating_income),
    reinvestmentRatio: div(capex, depreciation || null),
  };
}
```

### Step 2: Extend liquidityRatios() with CCC and Defensive Interval

Replace the existing `liquidityRatios` function with:

```javascript
export function liquidityRatios(bs, inc, prevBs) {
  if (!bs) return {};
  const currentAssets = li(bs, 'current_assets');
  const currentLiabilities = li(bs, 'current_liabilities');
  const inventory = li(bs, 'inventories') || li(bs, 'inventory') || 0;
  const cash = li(bs, 'cash_and_equivalents') || li(bs, 'cash') || 0;
  const receivables = li(bs, 'trade_receivables') || li(bs, 'receivables') || li(bs, 'accounts_receivable') || 0;

  // Defensive Interval: (Cash + Receivables) / Daily operating expenses
  const dailyExpenses = inc?.revenue != null && inc?.operating_income != null
    ? (inc.revenue - inc.operating_income) / 365
    : null;
  const defensiveInterval = dailyExpenses != null && dailyExpenses > 0
    ? (cash + receivables) / dailyExpenses
    : null;

  // Cash Conversion Cycle = DOH + DSO - DPO
  let cashConversionCycle = null;
  if (inc) {
    const avgInventory = prevBs
      ? ((li(bs, 'inventories') || li(bs, 'inventory') || 0) + (li(prevBs, 'inventories') || li(prevBs, 'inventory') || 0)) / 2
      : inventory;
    const avgReceivables = prevBs
      ? (receivables + (li(prevBs, 'trade_receivables') || li(prevBs, 'receivables') || li(prevBs, 'accounts_receivable') || 0)) / 2
      : receivables;
    const payables = li(bs, 'trade_payables') || li(bs, 'accounts_payable') || 0;
    const avgPayables = prevBs
      ? (payables + (li(prevBs, 'trade_payables') || li(prevBs, 'accounts_payable') || 0)) / 2
      : payables;

    const invTurnover = div(inc.cost_of_revenue, avgInventory);
    const recTurnover = div(inc.revenue, avgReceivables);
    const payTurnover = div(inc.cost_of_revenue, avgPayables);

    const doh = invTurnover != null ? 365 / invTurnover : null;
    const dso = recTurnover != null ? 365 / recTurnover : null;
    const dpo = payTurnover != null ? 365 / payTurnover : null;

    if (doh != null && dso != null && dpo != null) {
      cashConversionCycle = doh + dso - dpo;
    }
  }

  return {
    currentRatio: div(currentAssets, currentLiabilities),
    quickRatio: div(currentAssets != null ? currentAssets - inventory : null, currentLiabilities),
    cashRatio: div(cash, currentLiabilities),
    defensiveInterval,
    cashConversionCycle,
  };
}
```

**Important:** The signature changes from `(bs)` to `(bs, inc, prevBs)`. Update the call in `computeAllRatios()` accordingly.

### Step 3: Extend solvencyRatios() with Debt-to-Capital and Fixed Charge Coverage

Add these two new ratios to the return object inside `solvencyRatios()`:

```javascript
// Add to existing return object:
debtToCapital: div(totalDebt, totalDebt + totalEquity),
fixedChargeCoverage: (() => {
  const leasePayments = li(inc, 'lease_payments') || li(inc, 'rental_expense') || 0;
  const ebit = inc?.operating_income || 0;
  const interest = interestExpense != null ? Math.abs(interestExpense) : 0;
  if (interest + leasePayments === 0) return null;
  return (ebit + leasePayments) / (interest + leasePayments);
})(),
```

### Step 4: Extend profitabilityRatios() with Pretax Margin

Add to the return object in `profitabilityRatios()`:

```javascript
pretaxMargin: div(li(inc, 'income_before_tax') || li(inc, 'ebt'), revenue),
```

### Step 5: Extend efficiencyRatios() with Payables Turnover, DPO, Working Capital Turnover

Add to the existing function after receivablesTurnover:

```javascript
const avgPayables = (() => {
  const cur = li(bs, 'trade_payables') || li(bs, 'accounts_payable');
  const prev = prevBs ? (li(prevBs, 'trade_payables') || li(prevBs, 'accounts_payable')) : null;
  if (cur == null) return null;
  return prev != null ? (cur + prev) / 2 : cur;
})();

const payablesTurnover = div(costOfRevenue, avgPayables);
const workingCapital = (() => {
  const ca = li(bs, 'current_assets');
  const cl = li(bs, 'current_liabilities');
  if (ca == null || cl == null) return null;
  const prevCa = prevBs ? li(prevBs, 'current_assets') : null;
  const prevCl = prevBs ? li(prevBs, 'current_liabilities') : null;
  const curWc = ca - cl;
  if (prevCa != null && prevCl != null) return (curWc + (prevCa - prevCl)) / 2;
  return curWc;
})();
```

Then add to the return object:

```javascript
payablesTurnover,
daysPayable: payablesTurnover != null ? div(365, payablesTurnover) : null,
workingCapitalTurnover: div(revenue, workingCapital),
```

### Step 6: Extend valuationRatios() with EV/EBIT, Payout, Retention, SGR, P/CF

Add to the return object in `valuationRatios()`:

```javascript
evToEbit: div(ev, inc?.operating_income),
dividendPayout: div(li(inc, 'dividends_per_share') || li(inc, 'dps'), inc?.eps),
retentionRate: (() => {
  const payout = div(li(inc, 'dividends_per_share') || li(inc, 'dps'), inc?.eps);
  return payout != null ? 1 - payout : null;
})(),
sustainableGrowthRate: (() => {
  const roe = div(inc?.net_income, bs?.total_equity);
  const payout = div(li(inc, 'dividends_per_share') || li(inc, 'dps'), inc?.eps);
  if (roe == null || payout == null) return null;
  return roe * (1 - payout);
})(),
priceToCashFlow: null, // populated when cash flow data available
```

**Note:** `priceToCashFlow` needs cash flow data. This will be computed in the orchestrator where cash flow is available.

### Step 7: Update computeAllRatios() to accept cash flow

Change the function signature and body:

```javascript
export function computeAllRatios({ incomeStatement, balanceSheet, prevBalanceSheet = null, cashFlowStatement = null, market = null }) {
  const valRatios = valuationRatios(balanceSheet, incomeStatement, market);

  // Compute P/CF if cash flow data is available
  if (cashFlowStatement && market?.close && market?.total_shares) {
    const cfo = li(cashFlowStatement, 'operating_cash_flow') || li(cashFlowStatement, 'cash_from_operations') || li(cashFlowStatement, 'net_cash_from_operating');
    if (cfo != null && market.total_shares > 0) {
      valRatios.priceToCashFlow = div(market.close, cfo / market.total_shares);
    }
  }

  return {
    period: incomeStatement?.period_end_jalali || balanceSheet?.period_end_jalali || null,
    periodDate: incomeStatement?.period_end_date || balanceSheet?.period_end_date || null,
    periodMonths: incomeStatement?.period_months || balanceSheet?.period_months || null,
    isAudited: incomeStatement?.is_audited || balanceSheet?.is_audited || false,
    profitability: profitabilityRatios(incomeStatement, balanceSheet),
    solvency: solvencyRatios(balanceSheet, incomeStatement),
    liquidity: liquidityRatios(balanceSheet, incomeStatement, prevBalanceSheet),
    efficiency: efficiencyRatios(incomeStatement, balanceSheet, prevBalanceSheet),
    valuation: valRatios,
    dupont: dupontAnalysis(incomeStatement, balanceSheet),
    cashFlow: cashFlowRatios(cashFlowStatement, incomeStatement, balanceSheet),
  };
}
```

### Step 8: Update computeRatioTimeSeries() to accept cash flow statements

Add cash flow matching logic:

```javascript
export function computeRatioTimeSeries({ incomeStatements = [], balanceSheets = [], cashFlowStatements = [], market = null }) {
  // Match income statements to balance sheets by period_end_date
  const bsByDate = {};
  for (const bs of balanceSheets) {
    bsByDate[bs.period_end_date] = bs;
  }

  const cfByDate = {};
  for (const cf of cashFlowStatements) {
    cfByDate[cf.period_end_date] = cf;
  }

  const results = [];
  const sortedInc = [...incomeStatements].sort(
    (a, b) => new Date(a.period_end_date) - new Date(b.period_end_date),
  );

  for (let i = 0; i < sortedInc.length; i++) {
    const inc = sortedInc[i];
    const bs = bsByDate[inc.period_end_date] || null;
    const prevBs = i > 0 ? (bsByDate[sortedInc[i - 1].period_end_date] || null) : null;
    const cf = cfByDate[inc.period_end_date] || null;

    // Only use market data for the latest period
    const isLatest = i === sortedInc.length - 1;

    results.push(computeAllRatios({
      incomeStatement: inc,
      balanceSheet: bs,
      prevBalanceSheet: prevBs,
      cashFlowStatement: cf,
      market: isLatest ? market : null,
    }));
  }

  return results;
}
```

### Step 9: Build to verify

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

### Step 10: Commit

```
feat(ratios): add 20 CFA L1/L2 ratios including cash flow quality category
```

---

## Task 3: Add RATIO_LABELS for all new ratios

**Files:**
- Modify: `frontend/src/utils/financialRatios.js` (RATIO_LABELS object, line 314+)

### Step 1: Add labels for new ratios

Add to the `RATIO_LABELS` export, organized by category:

```javascript
// Profitability (new)
pretaxMargin: { label: 'حاشیه سود قبل از مالیات', tip: 'سود قبل از مالیات تقسیم بر درآمد', format: 'pct' },

// Solvency (new)
debtToCapital: { label: 'بدهی به سرمایه', tip: 'بدهی تقسیم بر (بدهی + حقوق صاحبان سهام)', format: 'pct' },
fixedChargeCoverage: { label: 'پوشش هزینه ثابت', tip: '(EBIT + اجاره) تقسیم بر (بهره + اجاره)', format: 'x' },

// Liquidity (new)
defensiveInterval: { label: 'فاصله تدافعی', tip: '(وجه نقد + مطالبات) تقسیم بر هزینه روزانه', format: 'day' },
cashConversionCycle: { label: 'چرخه تبدیل وجه نقد', tip: 'DOH + DSO - DPO', format: 'day' },

// Efficiency (new)
payablesTurnover: { label: 'گردش حساب‌های پرداختنی', tip: 'بهای تمام شده تقسیم بر حساب‌های پرداختنی', format: 'x' },
daysPayable: { label: 'دوره پرداخت', tip: '۳۶۵ تقسیم بر گردش حساب‌های پرداختنی', format: 'day' },
workingCapitalTurnover: { label: 'گردش سرمایه در گردش', tip: 'درآمد تقسیم بر سرمایه در گردش', format: 'x' },

// Valuation (new)
evToEbit: { label: 'EV/EBIT', tip: 'ارزش شرکت تقسیم بر سود عملیاتی', format: 'x' },
dividendPayout: { label: 'نسبت پرداخت سود', tip: 'سود نقدی هر سهم تقسیم بر EPS', format: 'pct' },
retentionRate: { label: 'نسبت نگهداشت سود', tip: '۱ - نسبت پرداخت سود', format: 'pct' },
sustainableGrowthRate: { label: 'نرخ رشد پایدار', tip: 'ROE × نسبت نگهداشت', format: 'pct' },
priceToCashFlow: { label: 'P/CF', tip: 'قیمت تقسیم بر جریان نقدی عملیاتی هر سهم', format: 'x' },

// Cash Flow (new category)
cfoToNetIncome: { label: 'CFO به سود خالص', tip: 'جریان نقدی عملیاتی تقسیم بر سود خالص (کیفیت سود)', format: 'x' },
cfoToRevenue: { label: 'CFO به درآمد', tip: 'جریان نقدی عملیاتی تقسیم بر درآمد', format: 'pct' },
fcf: { label: 'جریان نقدی آزاد (FCF)', tip: 'CFO منهای مخارج سرمایه‌ای', format: 'num' },
fcfMargin: { label: 'حاشیه FCF', tip: 'جریان نقدی آزاد تقسیم بر درآمد', format: 'pct' },
capexToCfo: { label: 'CapEx به CFO', tip: 'مخارج سرمایه‌ای تقسیم بر جریان نقدی عملیاتی', format: 'pct' },
cashToIncome: { label: 'نقد به سود عملیاتی', tip: 'CFO تقسیم بر سود عملیاتی', format: 'x' },
reinvestmentRatio: { label: 'نسبت سرمایه‌گذاری مجدد', tip: 'مخارج سرمایه‌ای تقسیم بر استهلاک', format: 'x' },
```

### Step 2: Build to verify

Run: `cd frontend && npm run build`
Expected: Build succeeds

### Step 3: Commit

```
feat(ratios): add Persian labels for 20 new CFA L1/L2 ratios
```

---

## Task 4: Update FinancialRatiosPanel UI

**Files:**
- Modify: `frontend/src/components/FinancialRatiosPanel.jsx`

### Step 1: Add 5th "Cash Flow" tab to Tabs.List

After the DuPont tab (line 274), add:

```jsx
<Tabs.Tab value="cashflow">جریان نقدی</Tabs.Tab>
```

### Step 2: Destructure cashFlow from latest period

Update the destructure at line 255:

```javascript
const { profitability, solvency, liquidity, efficiency, valuation, dupont, cashFlow } = latest;
```

### Step 3: Add new KPIs to existing Solvency tab (new solvency ratios)

After the existing solvency KPIs (interestCoverage), add `debtToCapital` and `fixedChargeCoverage`:

```jsx
<Grid.Col span={{ base: 6, sm: 4 }}>
  <RatioKPI metricKey="debtToCapital" value={solvency.debtToCapital} color={rallyColors.red} />
</Grid.Col>
<Grid.Col span={{ base: 6, sm: 4 }}>
  <RatioKPI metricKey="fixedChargeCoverage" value={solvency.fixedChargeCoverage} color={rallyColors.yellow} />
</Grid.Col>
```

### Step 4: Add new KPIs to Liquidity section (CCC, Defensive Interval)

After the existing liquidity KPIs:

```jsx
<Grid.Col span={{ base: 6, sm: 6 }}>
  <RatioKPI metricKey="defensiveInterval" value={liquidity.defensiveInterval} color={rallyColors.yellow} />
</Grid.Col>
<Grid.Col span={{ base: 6, sm: 6 }}>
  <RatioKPI metricKey="cashConversionCycle" value={liquidity.cashConversionCycle} color={rallyColors.red} />
</Grid.Col>
```

### Step 5: Add new KPIs to Profitability tab (pretaxMargin)

Add after ebitdaMargin KPI card (after the first Grid row):

```jsx
<Grid.Col span={{ base: 6, sm: 3 }}>
  <RatioKPI metricKey="pretaxMargin" value={profitability.pretaxMargin} color={rallyColors.red} />
</Grid.Col>
```

(Adjust the first row from 4 cards to 5, or make it 4+1.)

### Step 6: Add new KPIs to Efficiency tab (payables turnover, DPO, working capital turnover)

After existing daysSalesOutstanding:

```jsx
<Grid.Col span={{ base: 6, sm: 4 }}>
  <RatioKPI metricKey="payablesTurnover" value={efficiency.payablesTurnover} color={rallyColors.purple} />
</Grid.Col>
<Grid.Col span={{ base: 6, sm: 4 }}>
  <RatioKPI metricKey="daysPayable" value={efficiency.daysPayable} color={rallyColors.green} />
</Grid.Col>
<Grid.Col span={{ base: 6, sm: 4 }}>
  <RatioKPI metricKey="workingCapitalTurnover" value={efficiency.workingCapitalTurnover} color={rallyColors.blue} />
</Grid.Col>
```

### Step 7: Add new KPIs to Valuation section (EV/EBIT, payout, retention, SGR, P/CF)

After existing dividendYield:

```jsx
<Grid.Col span={{ base: 6, sm: 3 }}>
  <RatioKPI metricKey="evToEbit" value={valuation.evToEbit} color={rallyColors.red} />
</Grid.Col>
<Grid.Col span={{ base: 6, sm: 3 }}>
  <RatioKPI metricKey="dividendPayout" value={valuation.dividendPayout} color={rallyColors.yellow} />
</Grid.Col>
<Grid.Col span={{ base: 6, sm: 3 }}>
  <RatioKPI metricKey="sustainableGrowthRate" value={valuation.sustainableGrowthRate} color={rallyColors.green} />
</Grid.Col>
<Grid.Col span={{ base: 6, sm: 3 }}>
  <RatioKPI metricKey="priceToCashFlow" value={valuation.priceToCashFlow} color={rallyColors.blue} />
</Grid.Col>
```

### Step 8: Add Cash Flow tab panel

After the DuPont Tabs.Panel (after line 480), add:

```jsx
{/* Tab 5: Cash Flow Quality */}
<Tabs.Panel value="cashflow">
  <Text size="sm" fw={600} mb="sm" c="dimmed">کیفیت سود و جریان نقدی</Text>
  <Grid gutter="sm" mb="md">
    <Grid.Col span={{ base: 6, sm: 4 }}>
      <RatioKPI metricKey="cfoToNetIncome" value={cashFlow?.cfoToNetIncome} color={rallyColors.green} />
    </Grid.Col>
    <Grid.Col span={{ base: 6, sm: 4 }}>
      <RatioKPI metricKey="cfoToRevenue" value={cashFlow?.cfoToRevenue} color={rallyColors.blue} />
    </Grid.Col>
    <Grid.Col span={{ base: 6, sm: 4 }}>
      <RatioKPI metricKey="cashToIncome" value={cashFlow?.cashToIncome} color={rallyColors.purple} />
    </Grid.Col>
  </Grid>

  <Text size="sm" fw={600} mb="sm" mt="md" c="dimmed">جریان نقدی آزاد و سرمایه‌گذاری</Text>
  <Grid gutter="sm" mb="md">
    <Grid.Col span={{ base: 6, sm: 3 }}>
      <RatioKPI metricKey="fcfMargin" value={cashFlow?.fcfMargin} color={rallyColors.green} />
    </Grid.Col>
    <Grid.Col span={{ base: 6, sm: 3 }}>
      <RatioKPI metricKey="capexToCfo" value={cashFlow?.capexToCfo} color={rallyColors.red} />
    </Grid.Col>
    <Grid.Col span={{ base: 6, sm: 3 }}>
      <RatioKPI metricKey="reinvestmentRatio" value={cashFlow?.reinvestmentRatio} color={rallyColors.yellow} />
    </Grid.Col>
    <Grid.Col span={{ base: 6, sm: 3 }}>
      <RatioKPI metricKey="fcf" value={cashFlow?.fcf} color={rallyColors.blue} />
    </Grid.Col>
  </Grid>

  {ratioTimeSeries.length > 1 && (
    <div>
      <Text size="sm" fw={600} mb="xs">روند کیفیت سود (CFO/NI)</Text>
      <RatioTrendChart
        timeSeries={ratioTimeSeries}
        ratioKeys={['cfoToNetIncome', 'cfoToRevenue']}
        category="cashFlow"
        colors={[rallyColors.green, rallyColors.blue]}
      />
    </div>
  )}
</Tabs.Panel>
```

### Step 9: Build to verify

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

### Step 10: Commit

```
feat(frontend): add cash flow tab and new CFA L1/L2 KPIs to ratios panel
```

---

## Task 5: Final build verification and cleanup

**Step 1: Full build**

Run: `cd frontend && npm run build`
Expected: Clean build, no warnings related to our changes

**Step 2: Visual verification checklist**

Navigate to `/dashboard/stock/شبندر` and verify:
- [ ] Financial ratios panel loads without console errors
- [ ] 5 tabs visible: سودآوری | اهرم و نقدینگی | کارایی و ارزش‌گذاری | تحلیل دوپونت | جریان نقدی
- [ ] Pretax Margin appears in Profitability tab
- [ ] D/Capital and Fixed Charge Coverage appear in Solvency section
- [ ] Defensive Interval and CCC appear in Liquidity section
- [ ] Payables Turnover, DPO, WC Turnover appear in Efficiency section
- [ ] EV/EBIT, Dividend Payout, SGR, P/CF appear in Valuation section
- [ ] Cash Flow tab shows 7 KPI cards and trend chart
- [ ] All values show "N/A" gracefully when data is missing (not errors)

**Step 3: Final commit (if any cleanup needed)**

```
fix(frontend): cleanup financial ratios expansion
```
