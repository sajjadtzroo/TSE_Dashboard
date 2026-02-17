# MUI Navigation - Quick Start Guide

## 🚀 Getting Started

### 1. Start Development Server
```bash
cd /workspaces/Persian_Loan/frontend
npm run dev
```

The application will start at `http://localhost:5173`

### 2. Open in Browser
Open Chrome/Firefox and navigate to the local development URL.

## 📁 Key Files Modified

### Theme Configuration
- `src/theme/muiTheme.ts` - MUI theme with dark colors
- `src/theme/RTLProvider.tsx` - RTL provider with emotion cache
- `src/theme/index.ts` - Theme exports

### Layout Components
- `src/components/layout/Header.tsx` - MUI AppBar
- `src/components/layout/Sidebar.tsx` - MUI Drawer
- `src/components/layout/SidebarNav.tsx` - MUI List
- `src/components/layout/SidebarNavItem.tsx` - MUI ListItemButton
- `src/components/layout/SidebarToggle.tsx` - MUI IconButton
- `src/components/layout/SidebarStats.tsx` - MUI Box/Chip
- `src/components/layout/MainLayout.tsx` - MUI layout

### App Entry
- `src/App.tsx` - Wrapped with RTLProvider

## 🎯 Quick Test

### Desktop (≥1024px)
1. Open dev tools (F12)
2. Check sidebar on right (256px width)
3. Click toggle button to collapse (72px width)
4. Click navigation items
5. Verify active state highlighting

### Mobile (<1024px)
1. Resize viewport to mobile (375px)
2. Click menu button (hamburger icon)
3. Drawer opens from right
4. Click backdrop or close button
5. Drawer closes

### RTL
1. Inspect element
2. Verify `dir="rtl"` on html/body
3. Check sidebar anchored right
4. Check text flows right-to-left

## 🛠️ Customization

### Change Colors
Edit `src/theme/muiTheme.ts`:
```typescript
palette: {
  primary: {
    main: '#BB86FC', // Change this
  },
  secondary: {
    main: '#03DAC5', // Change this
  },
}
```

### Change Drawer Width
Edit `src/components/layout/Sidebar.tsx`:
```typescript
const DRAWER_WIDTH_EXPANDED = 256; // Change this
const DRAWER_WIDTH_COLLAPSED = 72;  // Change this
```

### Add Navigation Item
Edit `src/constants/navigation.constants.ts`:
```typescript
{
  name: 'New Page',
  href: '/new-page',
  icon: NewIcon, // Import from lucide-react
}
```

### Change Font
Edit `src/theme/muiTheme.ts`:
```typescript
typography: {
  fontFamily: 'YourFont, system-ui, sans-serif',
}
```

## 🐛 Troubleshooting

### Issue: Sidebar not showing
**Solution**: Check that `<RTLProvider>` wraps the app in `App.tsx`

### Issue: Icons not rendering
**Solution**: Verify `lucide-react` is installed: `npm list lucide-react`

### Issue: Theme not applied
**Solution**: Check browser console for emotion cache errors

### Issue: Navigation not highlighting
**Solution**: Verify route paths match in navigation constants

### Issue: Sidebar won't collapse
**Solution**: Check SidebarContext is provided in `App.tsx`

### Issue: RTL not working
**Solution**:
- Check `document.dir` is set to 'rtl'
- Verify stylis-plugin-rtl is installed
- Clear browser cache

### Issue: TypeScript errors
**Solution**: Run `npm run build` to see all type errors

## 📚 Component Usage

### Using MUI Components in Pages

Import from @mui/material:
```typescript
import { Box, Typography, Button } from '@mui/material';

export function MyPage() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4">My Page</Typography>
      <Button variant="contained" color="primary">
        Click Me
      </Button>
    </Box>
  );
}
```

### Accessing Theme
```typescript
import { useTheme } from '@mui/material';

export function MyComponent() {
  const theme = useTheme();

  return (
    <div style={{ color: theme.palette.primary.main }}>
      Themed text
    </div>
  );
}
```

### Responsive Breakpoints
```typescript
import { useMediaQuery, useTheme } from '@mui/material';

export function MyComponent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return <div>{isMobile ? 'Mobile' : 'Desktop'}</div>;
}
```

## 🎨 Design System Reference

### Breakpoints
- `xs`: 0px
- `sm`: 600px
- `md`: 900px
- `lg`: 1024px (custom)
- `xl`: 1280px

### Colors
```typescript
// Primary (Purple)
primary.main: '#BB86FC'
primary.light: '#c9a7ff'
primary.dark: '#a855f7'

// Secondary (Teal)
secondary.main: '#03DAC5'
secondary.light: '#4dfff0'
secondary.dark: '#00b3a1'

// Background
background.default: '#121212'
background.paper: '#121212'

// Text
text.primary: '#e5e5e5'
text.secondary: '#b3b3b3'
text.disabled: '#808080'

// Divider
divider: '#3d3d3d'
```

### Spacing Scale
MUI spacing: `theme.spacing(n)` = `n * 8px`
- `spacing(1)` = 8px
- `spacing(2)` = 16px
- `spacing(3)` = 24px
- `spacing(4)` = 32px

### Typography Scale
- `h1`: 2rem (32px)
- `h2`: 1.5rem (24px)
- `h3`: 1.25rem (20px)
- `h4`: 1.125rem (18px)
- `h5`: 1rem (16px)
- `h6`: 0.875rem (14px)
- `body1`: 1rem (16px)
- `body2`: 0.875rem (14px)

## 📖 Resources

### MUI Documentation
- Components: https://mui.com/material-ui/
- Theming: https://mui.com/material-ui/customization/theming/
- RTL: https://mui.com/material-ui/guides/right-to-left/

### Related Documentation
- Emotion: https://emotion.sh/docs/introduction
- Stylis: https://github.com/thysultan/stylis
- Lucide Icons: https://lucide.dev/

### Internal Docs
- Full Documentation: `NAVIGATION_UPGRADE.md`
- Implementation Summary: `MUI_NAVIGATION_SUMMARY.md`
- Testing Checklist: `VERIFICATION_CHECKLIST.md`

## ✅ Verification

Run through this quick checklist:
- [ ] Dev server starts without errors
- [ ] No console errors on load
- [ ] Sidebar visible on right (desktop)
- [ ] Header shows correctly
- [ ] Navigation works
- [ ] Mobile menu opens/closes
- [ ] Theme colors correct
- [ ] RTL layout correct

## 🎉 Success!

If all checks pass, the MUI navigation upgrade is working correctly!

For detailed testing, see `VERIFICATION_CHECKLIST.md`.

---

**Questions?** Check the documentation or console for errors.
