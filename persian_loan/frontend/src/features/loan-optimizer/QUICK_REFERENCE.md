# OptimizerResultsTable - Quick Reference Guide

## Basic Usage

```tsx
import OptimizerResultsTable from './components/OptimizerResultsTable';

// Simple usage
<OptimizerResultsTable data={loanAnalysisResults} />

// Filter to show only suitable loans
<OptimizerResultsTable
  data={loanAnalysisResults}
  onlySuitable={true}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `LoanAnalysisResult[]` | Yes | - | Array of loan analysis results |
| `onlySuitable` | `boolean` | No | `false` | Filter to show only suitable loans |

## User Features

### Quick Search
- **Location**: Toolbar (top left)
- **Shortcut**: Click search icon or type in search box
- **Function**: Search across all columns simultaneously
- **Persian**: جستجو

### Column Filtering
- **Access**: Click filter icon in column header OR toolbar filter button
- **Operators Available**:
  - Text: contains, equals, starts with, ends with
  - Number: =, !=, >, >=, <, <=
  - Boolean: is, is not
- **Persian**: All operators translated

### Sorting
- **Single Column**: Click column header
- **Multi-Column**: Hold Shift + click additional columns
- **Reset**: Click column header 3 times
- **Indicator**: ↑ (ascending), ↓ (descending)

### Pagination
- **Location**: Bottom of table
- **Page Sizes**: 25, 50, 100 rows
- **Navigation**: First, Previous, Next, Last buttons
- **Jump**: Click page number to jump directly

### Column Visibility
- **Access**: Toolbar → Columns button (ستون‌ها)
- **Function**: Check/uncheck to show/hide columns
- **Reset**: Click "نمایش/مخفی کردن همه" to toggle all

### Density
- **Access**: Toolbar → Density button (تراکم)
- **Options**:
  - **Compact** (فشرده): Small rows, more data visible
  - **Standard** (استاندارد): Medium rows
  - **Comfortable** (راحت): Large rows, easier to read

### Export to CSV
- **Access**: Toolbar → Export button (خروجی) → CSV
- **Filename**: `loan-optimizer-results-YYYY-MM-DD.csv`
- **Encoding**: UTF-8 with BOM (Persian support)
- **Content**: All visible data (respects filters)

## Column Reference

### 1. Bank Name (بانک)
- **Type**: Text
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 150px
- **Format**: Persian text

### 2. Loan Name (نام وام)
- **Type**: Text
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 180px
- **Format**: Persian text

### 3. Loan Amount (مبلغ وام)
- **Type**: Number
- **Sortable**: Yes
- **Filterable**: Yes (numeric operators)
- **Width**: 120px
- **Format**: Millions (م) with Persian digits
- **Display**: Monospace font

### 4. NPV (NPV)
- **Type**: Number
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 120px
- **Format**: Millions with Persian digits
- **Color Coding**:
  - Top 10%: Teal background (#03DAC5)
  - Bottom 10%: Pink background (#CF6679)
  - Middle: Gray text

### 5. IRR (IRR)
- **Type**: Number (percentage)
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 100px
- **Format**: Percentage with Persian digits
- **Color Coding**: Same as NPV

### 6. Monthly Payment (قسط ماهانه)
- **Type**: Number
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 120px
- **Format**: Millions with Persian digits
- **Display**: Monospace font

### 7. Total Cost (هزینه کل)
- **Type**: Number
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 120px
- **Format**: Millions with Persian digits
- **Color Coding**: Same as NPV

### 8. Effective Rate (نرخ مؤثر)
- **Type**: Number (percentage)
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 100px
- **Format**: Percentage with Persian digits
- **Display**: Monospace font

### 9. Risk Score (امتیاز)
- **Type**: Number
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 100px
- **Format**: MUI Chip with color coding
- **Colors**:
  - ≥70: Teal (#03DAC5)
  - 40-69: Yellow (#f59e0b)
  - <40: Pink (#CF6679)

### 10. Break-even Privilege Price (قیمت سر‌به‌سر امتیاز)
- **Type**: Number
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 150px
- **Format**: Two-line display
  - Line 1: Amount in millions
  - Line 2: "حداکثر قیمت خرید" subtitle

### 11. Max Wait Months (حداکثر انتظار)
- **Type**: Number
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 140px
- **Format**: Two-line display
  - Line 1: Months with color (Green/Red)
  - Line 2: Affordability indicator (✓/✗)
- **Colors**:
  - Can afford: Green (#10b981)
  - Cannot afford: Red (#ef4444)

### 12. Recommendation (توصیه)
- **Type**: Text
- **Sortable**: Yes
- **Filterable**: Yes
- **Width**: 180px
- **Format**: MUI Chip + reasoning text
- **Types**:
  - **WAIT**: Blue chip - "منتظر بمانید"
  - **BUY_PRIVILEGE**: Green chip - "خرید امتیاز"
  - **NEGOTIATE**: Yellow chip - "مذاکره کنید"
  - **REJECT**: Red chip - "رد کنید"

### 13. Status (وضعیت)
- **Type**: Boolean
- **Sortable**: Yes
- **Filterable**: Yes (true/false)
- **Width**: 80px
- **Format**: Circular indicator
- **Colors**:
  - Suitable: Teal dot (#03DAC5)
  - Unsuitable: Gray dot (#6b7280)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Navigate between cells |
| `Shift + Tab` | Navigate backwards |
| `Arrow Keys` | Navigate grid |
| `Enter` | Sort column |
| `Space` | Toggle selection (if enabled) |
| `Ctrl/Cmd + F` | Focus quick filter (browser default) |
| `Page Up/Down` | Scroll page |
| `Home` | Go to first column |
| `End` | Go to last column |

## Styling Customization

### Theme Colors
All colors inherit from the MUI theme:
```tsx
const darkTheme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'dark',
    primary: { main: '#BB86FC' },
    secondary: { main: '#03DAC5' },
    error: { main: '#CF6679' },
    background: { default: '#121212', paper: '#020202' },
  },
});
```

### Cell Styling
Customize via `sx` prop on DataGrid component.

## Performance Tips

### For Large Datasets (1000+ rows)
1. Use pagination (default: 25 rows per page)
2. Virtual scrolling is automatic
3. Lazy rendering is built-in
4. Consider filtering to reduce visible data

### For Slow Networks
1. Load data progressively
2. Use loading state
3. Consider caching strategies

## Accessibility

### Screen Readers
- All columns have proper ARIA labels
- Row count announced
- Sort direction announced
- Filter state announced

### Keyboard Navigation
- Full keyboard support (see shortcuts above)
- Focus indicators visible
- Tab order logical

### Color Contrast
- All text meets WCAG AA standards
- Focus indicators high contrast
- Color not sole indicator (text + color)

## Common Patterns

### Loading State
```tsx
{loading ? (
  <LoadingSpinner />
) : (
  <OptimizerResultsTable data={loans} />
)}
```

### Empty State
```tsx
// Component handles automatically
// Shows: "هیچ وامی یافت نشد" when data.length === 0
```

### Filter by Suitability
```tsx
const [onlySuitable, setOnlySuitable] = useState(false);

<OptimizerResultsTable
  data={loans}
  onlySuitable={onlySuitable}
/>
```

### Combined with Other Filters
```tsx
// Pre-filter data before passing to table
const filteredLoans = useMemo(() =>
  loans.filter(loan =>
    selectedBanks.includes(loan.bankNameFA)
  ),
  [loans, selectedBanks]
);

<OptimizerResultsTable data={filteredLoans} />
```

## Troubleshooting

### Issue: Persian text not displaying
**Solution**: Ensure Vazirmatn font is loaded

### Issue: CSV export missing Persian characters
**Solution**: Already configured with UTF-8 BOM, check Excel import settings

### Issue: Slow performance with many rows
**Solution**: Pagination is enabled by default, reduce page size if needed

### Issue: Columns too narrow/wide
**Solution**: Columns have default widths, can be customized in column definitions

### Issue: Sort not working
**Solution**: Ensure data has proper types (numbers as numbers, not strings)

## Examples

### Basic Example
```tsx
import OptimizerResultsTable from '@/features/loan-optimizer/components/OptimizerResultsTable';
import type { LoanAnalysisResult } from '@/features/loan-optimizer/types';

function MyComponent() {
  const loans: LoanAnalysisResult[] = [...]; // Your data

  return <OptimizerResultsTable data={loans} />;
}
```

### With Filtering
```tsx
function MyComponent() {
  const [showOnlySuitable, setShowOnlySuitable] = useState(false);
  const loans: LoanAnalysisResult[] = [...];

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={showOnlySuitable}
          onChange={e => setShowOnlySuitable(e.target.checked)}
        />
        نمایش فقط وام‌های مناسب
      </label>

      <OptimizerResultsTable
        data={loans}
        onlySuitable={showOnlySuitable}
      />
    </>
  );
}
```

### With Pre-filtering
```tsx
function MyComponent() {
  const allLoans: LoanAnalysisResult[] = [...];
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const filteredLoans = useMemo(() => {
    if (!selectedBank) return allLoans;
    return allLoans.filter(loan => loan.bankNameFA === selectedBank);
  }, [allLoans, selectedBank]);

  return (
    <>
      <BankSelector value={selectedBank} onChange={setSelectedBank} />
      <OptimizerResultsTable data={filteredLoans} />
    </>
  );
}
```

## Version Info

- **Component**: OptimizerResultsTable
- **Version**: 2.0.0 (MUI DataGrid)
- **Last Updated**: 2026-02-04
- **Dependencies**:
  - @mui/x-data-grid: 8.27.0
  - @mui/material: 6.3.2
  - @emotion/react: 11.14.0
  - @emotion/styled: 11.14.0

## Support

For issues or questions:
1. Check this guide
2. Review DATAGRID_UPGRADE.md for detailed documentation
3. Review FEATURES_COMPARISON.md for feature details
4. Check MUI DataGrid docs: https://mui.com/x/react-data-grid/

## Related Files

- Component: `src/features/loan-optimizer/components/OptimizerResultsTable.tsx`
- Types: `src/features/loan-optimizer/types.ts`
- Tests: `src/features/loan-optimizer/components/__tests__/OptimizerResultsTable.test.tsx`
- Documentation:
  - `DATAGRID_UPGRADE.md` - Technical details
  - `FEATURES_COMPARISON.md` - Feature comparison
  - `UPGRADE_COMPLETE.md` - Completion summary
  - `QUICK_REFERENCE.md` - This file
