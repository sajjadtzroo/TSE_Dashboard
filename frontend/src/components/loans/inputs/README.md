# MUI-Enhanced Input Components

This directory contains Material-UI enhanced input components designed for the Persian Loan application. All components support RTL (Right-to-Left) layout, Persian text, and maintain the application's dark theme.

## Components

### CurrencyInput

A specialized input for currency amounts with Persian formatting and thousands separators.

**Features:**
- Automatic thousands separator formatting (e.g., 1,000,000)
- Banknote icon on the right (RTL)
- "تومان" suffix on the left
- Min/max validation
- Error states
- Helper text support

**Usage:**
```tsx
<CurrencyInput
  label="مبلغ سپرده (تومان)"
  value={depositAmount}
  onChange={setDepositAmount}
  required
  helperText="حداقل 1 میلیون تومان"
  min={1000000}
  max={100000000}
/>
```

### PercentageInput

A specialized input for percentage values.

**Features:**
- Percent icon on the right (RTL)
- "٪" symbol on the left
- Min/max range validation (default 0-100)
- Step control (default 0.1)
- Error states
- Helper text support

**Usage:**
```tsx
<PercentageInput
  label="نرخ سود (درصد)"
  value={interestRate}
  onChange={setInterestRate}
  min={0}
  max={50}
  step={0.5}
  required
/>
```

### NumberInput

A general-purpose numeric input with customizable icon and suffix.

**Features:**
- Customizable icon (default: Hash)
- Optional suffix text
- Min/max validation
- Step control
- Error states
- Helper text support

**Usage:**
```tsx
<NumberInput
  label="مدت سپرده (ماه)"
  value={months}
  onChange={setMonths}
  min={1}
  max={60}
  suffix="ماه"
  required
/>
```

## Common Props

All input components support these props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | required | Input label text |
| `value` | number | required | Current value |
| `onChange` | (value: number) => void | required | Change handler |
| `placeholder` | string | '0' | Placeholder text |
| `helperText` | string | undefined | Helper text below input |
| `required` | boolean | false | Mark as required field |
| `error` | boolean | false | Show error state |
| `min` | number | undefined | Minimum value |
| `max` | number | undefined | Maximum value |

## Theme Integration

All components are styled to match the application's dark theme:
- Background: #121212 (surface-100)
- Border: #3d3d3d (border-light)
- Text: #e5e5e5 (gray-100)
- Primary color: #BB86FC (purple)
- Hover background: #1a1a1a (surface-elevated)
- Focus border: #BB86FC (primary)

## RTL Support

Components automatically support RTL layout:
- Icons appear on the right side
- Suffix text appears on the left side
- Proper text alignment for Persian text

## Validation

All components include built-in validation:
- Only numeric input is accepted
- Min/max constraints are enforced
- Invalid input is rejected (no onChange call)
- Error states can be displayed

## Testing

Test files are located in `__tests__` directory. Run tests with:
```bash
npm test
```

## Migration from Old Components

The old HTML-based input components in `features/calculators/components/` have been updated to re-export these MUI-enhanced versions. All existing usage should work without changes.

### Import Paths

You can import from either location:
```tsx
// New shared location (recommended)
import { CurrencyInput } from '@/components/inputs/CurrencyInput';

// Old location (still works, re-exports from new location)
import { CurrencyInput } from '@/features/calculators/components/CurrencyInput';
```
