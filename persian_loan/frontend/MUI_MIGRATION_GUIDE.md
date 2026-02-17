# MUI Components Migration Guide

## Overview

This guide documents the migration from custom UI components to Material-UI (MUI) components for better consistency, accessibility, and maintainability.

## Completed Migrations

### 1. Badge Component (Badge.tsx)

**Before:**
```tsx
// Custom implementation using Tailwind classes
<Badge variant="green" size="sm">بدون ضامن</Badge>
```

**After:**
```tsx
// MUI Chip-based implementation
import { Badge } from '@/components/ui';
<Badge variant="green" size="sm">بدون ضامن</Badge>
```

**Changes:**
- Now uses MUI `Chip` component internally
- Maintains same API (6 color variants, 2 sizes)
- Better theme integration
- Improved accessibility

**Color Variants Mapping:**
- `blue` → MUI `primary`
- `green` → MUI `success`
- `yellow` → MUI `warning`
- `purple` → MUI `primary` (with custom styling)
- `red` → MUI `error`
- `gray` → MUI `default`

### 2. Tooltip Component (Tooltip.tsx)

**Before:**
```tsx
// Custom tooltip with manual positioning
<Tooltip content="معلومات" position="top">
  <button>نمایش</button>
</Tooltip>
```

**After:**
```tsx
// MUI Tooltip with Popper
import { Tooltip } from '@/components/ui';
<Tooltip content="معلومات" position="top">
  <button>نمایش</button>
</Tooltip>
```

**Changes:**
- Now uses MUI `Tooltip` with Popper for better positioning
- Automatic boundary detection
- Better RTL support
- Improved accessibility (ARIA attributes)
- Theme-aware styling

### 3. MUI Theme Configuration (theme/muiTheme.ts)

**Features:**
- RTL direction support for Persian text
- Dark theme matching Tailwind colors
- Custom Chip variants for our 6 color system
- Typography using Vazirmatn font
- Consistent shadows and borders

**Theme Colors:**
```typescript
primary: '#BB86FC'    // Purple
secondary: '#03DAC5'  // Teal
error: '#CF6679'      // Pink
background: '#121212' // Dark
```

## New MUI Components

### 1. TagChip Component

For use in loan cards and bank cards to show categories and features.

```tsx
import { TagChip } from '@/components/ui';

<TagChip label="بدون ضامن" color="success" />
<TagChip label="نرخ سود پایین" color="primary" />
```

**Use Cases:**
- Loan categories
- Bank types
- Feature highlights
- Quick info badges

### 2. FilterChip Component

For use in tables and filter bars to show active filters.

```tsx
import { FilterChip } from '@/components/ui';

<FilterChip
  label="بانک‌های سنتی"
  selected={true}
  onDelete={() => removeFilter('traditional')}
  onClick={() => toggleFilter('traditional')}
/>
```

**Use Cases:**
- Active filters display
- Multi-select filter bars
- Search refinements
- Category selections

### 3. RecommendationChip Component

For highlighting special loans or recommendations.

```tsx
import { RecommendationChip } from '@/components/ui';

<RecommendationChip label="بهترین نرخ" type="best" />
<RecommendationChip label="پیشنهاد ویژه" type="recommended" />
<RecommendationChip label="ویژه" type="featured" />
<RecommendationChip label="جدید" type="new" />
```

**Use Cases:**
- Best rate indicators
- Special offers
- New loan products
- Featured recommendations

## Usage Examples

### Loan Card with Tags

```tsx
import { Badge, TagChip, RecommendationChip } from '@/components/ui';
import { Stack } from '@mui/material';

function LoanCard({ loan }) {
  return (
    <Card>
      <div className="flex justify-between items-start">
        <h3>{loan.nameFA}</h3>
        <Badge variant="green" size="sm">بدون ضامن</Badge>
      </div>

      <Stack direction="row" spacing={1} mt={2}>
        <TagChip label={loan.category} color="default" />
        {loan.isRecommended && (
          <RecommendationChip label="پیشنهاد ویژه" type="recommended" />
        )}
      </Stack>
    </Card>
  );
}
```

### Table with Filter Chips

```tsx
import { FilterChip } from '@/components/ui';
import { Stack } from '@mui/material';

function LoanTable({ filters, onFilterChange }) {
  return (
    <div>
      <Stack direction="row" spacing={1} mb={2}>
        {filters.map(filter => (
          <FilterChip
            key={filter.id}
            label={filter.label}
            selected={filter.active}
            onClick={() => onFilterChange(filter.id)}
            onDelete={filter.active ? () => onFilterChange(filter.id) : undefined}
          />
        ))}
      </Stack>
      {/* Table content */}
    </div>
  );
}
```

### Tooltips with Better Positioning

```tsx
import { Tooltip } from '@/components/ui';
import { InfoIcon } from 'lucide-react';

function InfoButton() {
  return (
    <Tooltip content="اطلاعات بیشتر در مورد این گزینه" position="top">
      <button className="p-2">
        <InfoIcon className="w-4 h-4" />
      </button>
    </Tooltip>
  );
}
```

## Migration Checklist

- [x] Create MUI theme configuration
- [x] Replace Badge component with MUI Chip-based version
- [x] Replace Tooltip component with MUI Tooltip
- [x] Add ThemeProvider to main.tsx
- [x] Create TagChip component
- [x] Create FilterChip component
- [x] Create RecommendationChip component
- [x] Update component exports
- [x] Create demo page for visual testing
- [ ] Update all imports across the app (automated)
- [ ] Test visual consistency
- [ ] Update documentation

## Breaking Changes

### None

The migration maintains backward compatibility. All existing `Badge` and `Tooltip` usages work without changes.

## Testing

### Visual Testing

A comprehensive demo page is available at:
```tsx
import { MuiComponentsDemo } from '@/components/ui/mui/MuiComponentsDemo';
```

This page shows:
- All Badge color variants and sizes
- Tooltip positioning (top, bottom, left, right)
- Tag chips for loan cards
- Filter chips for tables
- Recommendation chips
- Native MUI Badge for notifications
- Native MUI Chips for reference

### Manual Testing Checklist

- [ ] Badge colors match design system
- [ ] Badge sizes are consistent
- [ ] Tooltips position correctly in all 4 directions
- [ ] Tooltips work with RTL text
- [ ] Chips are clickable and deletable
- [ ] Filter chips show selected state
- [ ] Theme applies correctly across all components
- [ ] Dark theme colors are correct
- [ ] Persian font (Vazirmatn) displays correctly

## Performance

### Benefits

1. **Better Positioning**: MUI Tooltip uses Popper.js for intelligent positioning
2. **Accessibility**: Built-in ARIA attributes and keyboard navigation
3. **Tree Shaking**: Only used MUI components are bundled
4. **Theme Caching**: MUI theme is cached and shared across components

### Bundle Size Impact

- MUI Chip: ~8KB (gzipped)
- MUI Tooltip + Popper: ~15KB (gzipped)
- Total addition: ~23KB

This is offset by:
- Removing custom tooltip logic: -2KB
- Better code reuse: -3KB
- **Net impact: ~18KB additional**

## Future Enhancements

1. **Additional MUI Components**
   - Replace Button with MUI Button
   - Replace Modal with MUI Dialog
   - Replace Select with MUI Select

2. **Advanced Features**
   - Add Chip avatars for bank logos
   - Add Tooltip rich content support
   - Add Badge animation variants

3. **Accessibility**
   - Add keyboard shortcuts
   - Add screen reader announcements
   - Add high contrast mode

## Resources

- [MUI Documentation](https://mui.com/material-ui/)
- [MUI Chip API](https://mui.com/material-ui/api/chip/)
- [MUI Tooltip API](https://mui.com/material-ui/api/tooltip/)
- [MUI Theming](https://mui.com/material-ui/customization/theming/)
- [Popper.js Documentation](https://popper.js.org/)

## Support

For questions or issues related to the MUI migration, please contact the development team or refer to the MUI documentation.
