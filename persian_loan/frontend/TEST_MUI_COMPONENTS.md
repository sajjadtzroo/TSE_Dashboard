# MUI Components Visual Testing Guide

## Quick Testing Steps

### 1. Start Development Server

```bash
cd frontend
npm run dev
```

### 2. View Demo Page

Create a temporary route in your app to view the demo page:

```tsx
// In App.tsx, add:
import { MuiComponentsDemo } from './components/ui/mui/MuiComponentsDemo';

// Add route:
<Route path="/mui-demo" element={<MuiComponentsDemo />} />
```

Then navigate to: `http://localhost:5173/mui-demo`

### 3. Test Badge Component

Check existing pages that use badges:
- `/banks` - Bank cards show category badges
- `/loans` - Loan cards show "No Guarantor" badges
- `/compare` - Selected loan badges
- `/analytics` - Requirement matrix badges

**What to look for:**
- Colors match design (blue, green, yellow, purple, red, gray)
- Sizes are correct (small and medium)
- Text is readable
- Borders are visible but subtle
- Background opacity is correct

### 4. Test Tooltip Component

Check pages with tooltips:
- Sidebar navigation items (when collapsed)
- Info icons throughout the app
- Help buttons

**What to look for:**
- Tooltip appears on hover
- Delay is ~200ms
- Position is correct (doesn't overflow viewport)
- Arrow points to element
- Dark background with light border
- Text is readable
- Tooltip disappears on mouse leave

### 5. Test New Chip Components

These need to be integrated into existing pages:

**TagChip Example:**
```tsx
// In LoanCard.tsx
import { TagChip } from '@/components/ui';

<TagChip label={loan.category} color="default" />
```

**FilterChip Example:**
```tsx
// In LoansPage.tsx
import { FilterChip } from '@/components/ui';

<FilterChip
  label="بانک‌های دیجیتال"
  selected={filters.includes('digital')}
  onClick={() => toggleFilter('digital')}
/>
```

## Visual Checklist

### Badge Component
- Blue badge (primary): Purple background, purple text
- Green badge (success): Teal background, teal text
- Yellow badge (warning): Yellow background, yellow text
- Purple badge: Purple background with custom styling
- Red badge (error): Pink background, pink text
- Gray badge (default): Gray background, gray text
- Small size: Compact, readable
- Medium size: Standard, comfortable

### Tooltip Component
- Top position: Shows above element
- Bottom position: Shows below element
- Left position: Shows to left of element
- Right position: Shows to right of element
- RTL support: Works with Persian text
- Arrow: Points to trigger element
- Dark theme: Dark background (#2d2d2d)
- Border: Light border visible (#3d3d3d)

### Tag Chips
- Small size with rounded corners
- Outlined variant
- Clickable (if onClick provided)
- Colors match theme

### Filter Chips
- Selected state: Filled with primary color
- Unselected state: Outlined
- Delete icon: Shows when selected
- Click to toggle
- Delete to remove

### Recommendation Chips
- Best: Green/success color
- Recommended: Purple/primary color
- Featured: Yellow/warning color
- New: Teal/secondary color
- Thicker border (1.5px)
- Bold text (weight: 600)

## Browser Testing

Test in the following browsers:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Testing

Test responsive behavior:
- Tooltips work on touch devices
- Badges are readable on small screens
- Chips wrap properly
- RTL works on mobile

## Accessibility Testing

- Keyboard navigation works
- Screen reader announces changes
- Focus indicators are visible
- Color contrast is sufficient
- ARIA attributes are present

## Performance Testing

- Page load time is acceptable
- No layout shift when components load
- Tooltips don't cause lag
- Theme switching (if applicable) is smooth

## Known Issues

None at this time. Report any issues found during testing.

## Reporting Issues

If you find visual inconsistencies:

1. Take a screenshot
2. Note the browser and OS
3. Describe expected vs actual behavior
4. Check if issue exists in demo page
5. Report to development team

## Success Criteria

All items in the visual checklist should pass.
All browser tests should pass.
All accessibility tests should pass.
No performance degradation.

---

**Last Updated:** 2026-02-04
**Status:** Ready for Testing
