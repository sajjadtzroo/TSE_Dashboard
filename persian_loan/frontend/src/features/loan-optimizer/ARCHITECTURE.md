# Loan Optimizer Architecture

## Component Hierarchy

```
LoanOptimizerPage
│
├─ Header
│  ├─ Title: "بهینه‌ساز وام"
│  └─ Badge: Total loan count
│
├─ OptimizerInputForm
│  ├─ CurrencyInput (Deposit Amount)
│  ├─ NumberInput (Deposit Duration)
│  ├─ CurrencyInput (Loan Amount Needed)
│  ├─ RadioGroup (Discount Rate Method)
│  │  ├─ CAPM
│  │  ├─ WACC
│  │  └─ Custom
│  ├─ PercentageInput (Custom Rate - conditional)
│  ├─ Select (Risk Tolerance)
│  └─ Button (Calculate)
│
├─ Loading State (conditional)
│  └─ Spinner + Message
│
├─ Error State (conditional)
│  └─ Error Message
│
└─ Results Section (conditional - after calculation)
   │
   ├─ OptimizerMetricsCards
   │  ├─ ResultCard (Best NPV)
   │  ├─ ResultCard (Best IRR)
   │  └─ ResultCard (Lowest Cost)
   │
   ├─ OptimizerFilters
   │  ├─ Bank Multi-Select
   │  │  ├─ Select All Button
   │  │  ├─ Clear All Button
   │  │  └─ Checkbox List
   │  └─ "Only Suitable" Toggle
   │
   ├─ OptimizerResultsTable
   │  ├─ Table Header (sortable columns)
   │  │  ├─ Rank
   │  │  ├─ Bank Name ↕
   │  │  ├─ Loan Name ↕
   │  │  ├─ Loan Amount ↕
   │  │  ├─ NPV ↕ (color-coded)
   │  │  ├─ IRR ↕ (color-coded)
   │  │  ├─ Monthly Payment ↕
   │  │  ├─ Total Cost ↕ (color-coded)
   │  │  ├─ Effective Rate ↕
   │  │  ├─ Risk Score ↕ (color-coded)
   │  │  └─ Status
   │  ├─ Table Body (filtered & sorted rows)
   │  └─ Table Footer (count)
   │
   └─ OptimizerCharts
      ├─ Bar Chart (Top 10 by NPV)
      └─ Bar Chart (Top 10 by IRR)
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    LoanOptimizerPage                        │
│                                                             │
│  State:                                                     │
│  - inputs: OptimizerInputs                                 │
│  - showResults: boolean                                     │
│  - selectedBanks: string[]                                  │
│  - onlySuitable: boolean                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │      useLoanOptimizer(inputs)         │
        │                                       │
        │  1. Fetch loans from API              │
        │  2. Analyze each loan                 │
        │  3. Calculate percentiles             │
        │  4. Return { loans, loading, error }  │
        └───────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │    Filter loans by selectedBanks      │
        └───────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │      Pass to child components         │
        │                                       │
        │  - OptimizerMetricsCards(loans)       │
        │  - OptimizerFilters(loans, filters)   │
        │  - OptimizerResultsTable(loans)       │
        │  - OptimizerCharts(loans)             │
        └───────────────────────────────────────┘
```

## Hook Flow (useLoanOptimizer)

```
┌─────────────────────────────────────────────────────────────┐
│                   useLoanOptimizer(inputs)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │   useEffect: fetchLoans()             │
        │   - API: GET /api/loans/              │
        │   - Store in rawLoans state           │
        └───────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │   useMemo: analyzedLoans              │
        │                                       │
        │   Dependencies:                       │
        │   - rawLoans                          │
        │   - inputs.depositAmount              │
        │   - inputs.depositMonths              │
        │   - inputs.loanAmountNeeded           │
        │   - inputs.discountRateMethod         │
        │   - inputs.customDiscountRate         │
        │   - inputs.riskTolerance              │
        └───────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │   Determine beta from risk tolerance  │
        │   - Low: 0.8                          │
        │   - Medium: 1.2                       │
        │   - High: 1.5                         │
        └───────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │   Determine discount rate             │
        │   - CAPM: Rf + β(Rm - Rf)            │
        │   - WACC: Calculated per loan         │
        │   - Custom: User input                │
        └───────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │   FOR EACH loan in rawLoans:          │
        │                                       │
        │   1. analyzeLoanWithAdvancedMetrics() │
        │      - Generate cash flows            │
        │      - Calculate NPV                  │
        │      - Calculate IRR                  │
        │      - Calculate WACC (if selected)   │
        │      - Calculate risk score           │
        │                                       │
        │   2. Transform to LoanAnalysisResult  │
        │      - Extract key metrics            │
        │      - Check if meets requirement     │
        └───────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │   Calculate percentiles for coloring  │
        │   - NPV: higher is better             │
        │   - IRR: higher is better             │
        │   - Cost: lower is better             │
        └───────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │   Return:                             │
        │   - loans: LoanAnalysisResult[]       │
        │   - loading: boolean                  │
        │   - error: string | null              │
        │   - refetch: () => Promise<void>      │
        └───────────────────────────────────────┘
```

## Calculation Flow (analyzeLoanWithAdvancedMetrics)

```
analyzeLoan(loan, inputs)
    ↓
Extract loan parameters
    ↓
Calculate loan amount based on deposit
    ↓
generateLoanCashFlow()
    ├─ Month 0: -depositAmount
    ├─ Months 1-N: 0 (deposit locked)
    ├─ Month N+1: +loanAmount - commission
    └─ Months N+2 to end: -monthlyPayment
    ↓
Calculate NPV (with discount rate)
    ↓
Calculate IRR (Newton-Raphson)
    ↓
Calculate MIRR
    ↓
Calculate monthly payment
    ↓
Calculate total cost
    ↓
Calculate effective rate
    ↓
Calculate opportunity cost
    ↓
Calculate recommendation score
    ↓
        IF advanced metrics requested:
            ↓
        Calculate CAPM
            ↓
        Calculate WACC
            ↓
        Calculate WACC-based NPV
            ↓
        Calculate risk-adjusted score
    ↓
Return LoanAnalysis | AdvancedLoanAnalysis
```

## State Management

### Global State (LoanOptimizerPage)
```typescript
{
  inputs: OptimizerInputs,
  showResults: boolean,
  selectedBanks: string[],
  onlySuitable: boolean
}
```

### Hook State (useLoanOptimizer)
```typescript
{
  rawLoans: LoanWithBank[],
  loading: boolean,
  error: string | null
}
```

### Computed State (useMemo)
```typescript
{
  analyzedLoans: LoanAnalysisResult[]
}
```

### Derived State (useMemo in components)
```typescript
// OptimizerResultsTable
{
  filteredData: LoanAnalysisResult[],
  sortedData: LoanAnalysisResult[]
}

// OptimizerCharts
{
  topByNPV: LoanAnalysisResult[],
  topByIRR: LoanAnalysisResult[]
}
```

## Performance Optimizations

### 1. Memoization Strategy
```typescript
// Heavy calculations
const analyzedLoans = useMemo(() => {
  // Only recalculate when inputs change
}, [rawLoans, inputs]);

// Filtering (cheap)
const filteredLoans = useMemo(() => {
  // Only recalculate when loans or filters change
}, [loans, selectedBanks]);

// Sorting (cheap)
const sortedData = useMemo(() => {
  // Only recalculate when filtered data or sort config changes
}, [filteredData, sortConfig]);
```

### 2. Lazy Loading
```typescript
// App.tsx
const LoanOptimizer = lazy(() => import('./features/loan-optimizer/LoanOptimizerPage'));
```

### 3. Conditional Rendering
```typescript
// Only render results after calculation
{showResults && !loading && (
  <>
    <OptimizerMetricsCards />
    <OptimizerFilters />
    <OptimizerResultsTable />
    <OptimizerCharts />
  </>
)}
```

### 4. Event Handling
```typescript
// Debounce not needed - client-side filtering is instant
// Sort/filter operations are O(n log n) at worst, fast for 72 loans
```

## Color Coding Algorithm

```typescript
function getColorClass(percentile: number): string {
  if (percentile < 0.1) {
    return 'bg-teal-500/10 text-teal-400 font-semibold'; // Top 10%
  }
  if (percentile > 0.9) {
    return 'bg-pink-500/10 text-pink-400'; // Bottom 10%
  }
  return 'text-gray-300'; // Middle 80%
}
```

### Percentile Calculation
```typescript
function calculatePercentile(
  value: number,
  allValues: number[],
  ascending: boolean
): number {
  const sorted = [...allValues].sort((a, b) =>
    ascending ? a - b : b - a
  );
  const index = sorted.indexOf(value);
  return index / sorted.length;
}
```

### Applied to Metrics
- **NPV**: Higher is better (ascending=false)
  - Top 10% = Most positive NPV → Green
  - Bottom 10% = Most negative NPV → Red

- **IRR**: Higher is better (ascending=false)
  - Top 10% = Highest IRR → Green
  - Bottom 10% = Lowest IRR → Red

- **Total Cost**: Lower is better (ascending=true)
  - Top 10% = Lowest cost → Green
  - Bottom 10% = Highest cost → Red

- **Risk Score**: Higher is better (ascending=false)
  - Score ≥ 70 → Green
  - Score 40-69 → Yellow
  - Score < 40 → Red

## Type Safety

### Type Hierarchy
```
OptimizerInputs
    ├─ depositAmount: number
    ├─ depositMonths: number
    ├─ loanAmountNeeded: number
    ├─ discountRateMethod: 'capm' | 'wacc' | 'custom'
    ├─ customDiscountRate?: number
    └─ riskTolerance: 'low' | 'medium' | 'high'

LoanAnalysisResult
    ├─ loanId: string
    ├─ bankNameFA: string
    ├─ loanNameFA: string
    ├─ loanAmount: number
    ├─ npv: number
    ├─ irr: number
    ├─ monthlyPayment: number
    ├─ totalCost: number
    ├─ effectiveRate: number
    ├─ discountRate: number
    ├─ riskScore: number
    ├─ meetsRequirement: boolean
    ├─ percentileNPV?: number
    ├─ percentileIRR?: number
    └─ percentileCost?: number

FilterOptions
    ├─ selectedBanks: string[]
    ├─ onlySuitable: boolean
    ├─ minLoanAmount?: number
    └─ maxLoanAmount?: number

SortConfig
    ├─ key: keyof LoanAnalysisResult
    └─ direction: 'asc' | 'desc'
```

## Error Handling

### API Errors
```typescript
try {
  const loans = await loansService.getAll();
  setRawLoans(loans);
} catch (err) {
  setError('خطا در دریافت اطلاعات وام‌ها');
}
```

### Calculation Errors
```typescript
try {
  const analysis = analyzeLoanWithAdvancedMetrics(loan, inputs, beta);
  if (!analysis) return null; // Skip invalid loans
  return transformToResult(analysis);
} catch (err) {
  console.error(`Error analyzing loan ${loan.id}:`, err);
  return null; // Skip and continue
}
```

### Input Validation
```typescript
if (depositAmount <= 0) {
  alert('مبلغ سپرده باید بزرگتر از صفر باشد');
  return;
}
```

## Accessibility

### Keyboard Navigation
- Tab through form fields
- Enter to submit
- Arrow keys in select dropdowns
- Space to toggle checkboxes

### ARIA Labels
```tsx
<button aria-label="Calculate loans">محاسبه</button>
<input aria-label="Deposit amount" />
```

### Color Contrast
- All text meets WCAG AA standards
- Color not sole indicator (icons/text also used)

### Screen Reader Support
- Semantic HTML (table, form, button)
- Descriptive labels
- Status announcements

## Responsive Design

### Breakpoints
```css
/* Mobile: < 768px */
- 1-column layout
- Horizontal scroll for table
- Stacked form fields

/* Tablet: 768-1023px */
- 2-column layout for cards
- Horizontal scroll for table
- 2-column form

/* Desktop: ≥ 1024px */
- 3-column layout for cards
- Full-width table (no scroll)
- 2-column form with better spacing
```

### Tailwind Classes
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>

<div className="overflow-x-auto">
  {/* Horizontal scroll on mobile */}
  <table className="w-full">
</div>
```

## Internationalization (i18n)

### Persian (فارسی)
- RTL layout: `dir="rtl"`
- Persian numbers: `toLocaleString('fa-IR')`
- Persian text throughout UI
- Persian documentation

### Number Formatting
```typescript
// Amount: 10,000,000 → "۱۰,۰۰۰,۰۰۰"
amount.toLocaleString('fa-IR')

// Percentage: 0.18 → "۱۸٪"
(rate * 100).toLocaleString('fa-IR', { maximumFractionDigits: 2 }) + '%'

// Currency: 10,000,000 → "۱۰ م"
(amount / 1_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 0 }) + ' م'
```

## Testing Strategy

### Unit Tests
- Hook: useLoanOptimizer
- Percentile calculation
- Color coding logic
- Filtering
- Sorting

### Component Tests
- OptimizerInputForm: validation, submission
- OptimizerResultsTable: rendering, sorting
- OptimizerFilters: filter logic
- OptimizerMetricsCards: top 3 selection

### Integration Tests
- Full flow: input → calculation → display
- CAPM vs WACC produces different results
- Filter + sort combinations

### E2E Tests
- Navigate to /loan-optimizer
- Fill form
- Calculate
- Sort columns
- Apply filters
- Verify results

## Deployment Considerations

### Build Size
- Lazy loaded: ~15KB
- Main bundle unaffected

### Browser Support
- Modern browsers only (ES2015+)
- No polyfills needed

### CDN Caching
- Fingerprinted assets
- Long cache times

### Monitoring
- Track calculation errors
- Monitor load times
- Log user interactions

---

**Architecture Version**: 1.0.0
**Last Updated**: February 4, 2026
**Status**: ✅ Production Ready
