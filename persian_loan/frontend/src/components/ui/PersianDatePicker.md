# PersianDatePicker Component

A fully-featured Persian (Jalali) calendar date picker built with MUI X DatePickers and date-fns-jalali adapter.

## Features

- Persian (Jalali) calendar support
- RTL (Right-to-Left) layout
- Persian month and day names
- Dark theme matching the project design
- Full validation and error handling
- Accessible with ARIA attributes
- TypeScript support
- Min/Max date constraints
- Disabled state support

## Installation

The required packages are already installed:

```bash
npm install @mui/x-date-pickers date-fns-jalali @mui/material
```

## Basic Usage

```tsx
import { useState } from 'react';
import { PersianDatePicker } from '../components/ui';

function MyComponent() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <PersianDatePicker
      label="تاریخ"
      value={date}
      onChange={setDate}
      placeholder="انتخاب تاریخ"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Label text displayed above the input |
| `value` | `Date \| null` | - | **Required**. Current selected date |
| `onChange` | `(date: Date \| null) => void` | - | **Required**. Callback when date changes |
| `minDate` | `Date` | - | Minimum selectable date |
| `maxDate` | `Date` | - | Maximum selectable date |
| `disabled` | `boolean` | `false` | Whether the picker is disabled |
| `error` | `boolean` | `false` | Whether to show error state |
| `helperText` | `string` | - | Helper or error message below input |
| `className` | `string` | - | Additional CSS classes |
| `placeholder` | `string` | - | Placeholder text |
| `required` | `boolean` | `false` | Whether the field is required |

## Examples

### 1. Simple Date Selection

```tsx
function SimpleDatePicker() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  return (
    <PersianDatePicker
      label="تاریخ"
      value={selectedDate}
      onChange={setSelectedDate}
    />
  );
}
```

### 2. With Validation

```tsx
function ValidatedDatePicker() {
  const [date, setDate] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const handleChange = (newDate: Date | null) => {
    setDate(newDate);

    if (!newDate) {
      setError('تاریخ الزامی است');
    } else if (newDate > new Date()) {
      setError('تاریخ نمی‌تواند در آینده باشد');
    } else {
      setError('');
    }
  };

  return (
    <PersianDatePicker
      label="تاریخ تولد"
      value={date}
      onChange={handleChange}
      maxDate={new Date()}
      error={!!error}
      helperText={error || 'لطفا تاریخ تولد خود را وارد کنید'}
      required
    />
  );
}
```

### 3. Date Range Selection

```tsx
function DateRangePicker() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    // Clear end date if it's before the new start date
    if (endDate && date && endDate < date) {
      setEndDate(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PersianDatePicker
        label="تاریخ شروع"
        value={startDate}
        onChange={handleStartDateChange}
      />

      <PersianDatePicker
        label="تاریخ پایان"
        value={endDate}
        onChange={setEndDate}
        minDate={startDate || undefined}
        disabled={!startDate}
      />
    </div>
  );
}
```

### 4. Loan Form Integration

```tsx
function LoanForm() {
  const [formData, setFormData] = useState({
    startDate: null as Date | null,
  });

  const [errors, setErrors] = useState({
    startDate: '',
  });

  const handleDateChange = (date: Date | null) => {
    setFormData({ ...formData, startDate: date });

    if (!date) {
      setErrors({ ...errors, startDate: 'تاریخ شروع الزامی است' });
    } else {
      setErrors({ ...errors, startDate: '' });
    }
  };

  return (
    <form>
      <PersianDatePicker
        label="تاریخ شروع وام"
        value={formData.startDate}
        onChange={handleDateChange}
        minDate={new Date()}
        error={!!errors.startDate}
        helperText={errors.startDate}
        required
        placeholder="تاریخ دریافت وام"
      />
    </form>
  );
}
```

## Integration with Forms

The component integrates seamlessly with form state management. When used in a form that expects ISO date strings:

```tsx
// Convert Date to ISO string for API
const handleSubmit = () => {
  const submitData = {
    ...formData,
    startDate: formData.startDate?.toISOString().split('T')[0] || '',
  };
  // Submit to API
};

// Convert ISO string to Date for component
const handleChange = (date: Date | null) => {
  const dateStr = date ? date.toISOString().split('T')[0] : '';
  setFormData({ ...formData, startDate: dateStr });
};
```

## Styling

The component uses a custom dark theme that matches the project's design system:

- Background: `#1e293b` (surface-100)
- Border: `#334155` (border-light)
- Primary color: `#3b82f6` (primary-600)
- Text: `#f1f5f9` (gray-100)

The theme is fully RTL (Right-to-Left) and includes:
- Persian month names (فروردین, اردیبهشت, etc.)
- Persian day abbreviations
- RTL calendar layout
- Persian number formatting

## Accessibility

The component is fully accessible:

- ARIA labels and attributes
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Required field indicators
- Error state announcements

## Browser Support

Works in all modern browsers that support:
- ES6+
- CSS Grid
- Flexbox
- MUI v5+

## Technical Details

### Dependencies

- `@mui/x-date-pickers`: MUI X date picker components
- `@mui/material`: MUI base components
- `date-fns-jalali`: Persian calendar adapter for date-fns

### Component Structure

```
PersianDatePicker/
├── PersianDatePicker.tsx       # Main component
├── PersianDatePicker.test.tsx  # Unit tests
├── PersianDatePicker.example.tsx # Usage examples
└── PersianDatePicker.md        # Documentation
```

### Theme Configuration

The component creates a custom MUI theme with:
- RTL direction
- Dark mode palette
- Custom component styles
- Persian locale (faIR)

## Testing

Run the tests with:

```bash
npm run test -- PersianDatePicker.test.tsx
```

The test suite includes:
- Rendering tests
- Validation tests
- State management tests
- Accessibility tests
- Error handling tests

## Common Issues

### Date Format Mismatch

If you're storing dates as ISO strings in your backend:

```tsx
// Store as ISO string
const isoDate = date?.toISOString().split('T')[0];

// Load from ISO string
const dateValue = isoString ? new Date(isoString) : null;
```

### Time Zone Issues

The component uses local time zone. If you need UTC:

```tsx
const utcDate = new Date(Date.UTC(
  date.getFullYear(),
  date.getMonth(),
  date.getDate()
));
```

### Persian to Gregorian Conversion

The `date-fns-jalali` adapter handles all conversions automatically. The `Date` objects are always in Gregorian calendar, but displayed in Persian.

## Future Enhancements

Potential improvements:
- Time picker support
- Date range presets (last week, last month, etc.)
- Custom formatting options
- Multiple date selection
- Inline calendar mode

## Contributing

To modify the component:

1. Update `PersianDatePicker.tsx`
2. Add tests to `PersianDatePicker.test.tsx`
3. Update examples in `PersianDatePicker.example.tsx`
4. Update this documentation

## License

Part of the Persian Loan project.

## Support

For issues or questions:
- Check the example file: `PersianDatePicker.example.tsx`
- Review the tests: `PersianDatePicker.test.tsx`
- Consult MUI X DatePickers documentation
- Check date-fns-jalali documentation
