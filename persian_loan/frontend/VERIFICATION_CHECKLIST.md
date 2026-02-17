# MUI Navigation Upgrade - Verification Checklist

## 📋 Pre-Testing Setup

- [ ] All files have been updated
- [ ] No TypeScript compilation errors
- [ ] Development server starts successfully
- [ ] No console errors on initial load

## 🖥️ Desktop Testing (Viewport ≥ 1024px)

### Header (AppBar)
- [ ] Header displays with dark background (#121212)
- [ ] Border bottom is visible (#3d3d3d)
- [ ] Title "داشبورد وام‌های بانکی" shows with gradient
- [ ] Title gradient: purple to teal (#BB86FC → #03DAC5)
- [ ] Menu button is hidden on desktop
- [ ] Quick Actions toolbar visible (Compare & Calculator buttons)
- [ ] Version badge "نسخه ۱.۰.۰" displays correctly
- [ ] Header is sticky when scrolling

### Sidebar (Permanent Drawer)
- [ ] Sidebar visible on right side (RTL)
- [ ] Width: 256px when expanded
- [ ] Border on left side (#3d3d3d)
- [ ] Dark background (#121212)
- [ ] Toggle button visible at top with border
- [ ] Toggle button has tooltip
- [ ] Chevron icon points right when expanded

### Sidebar Navigation (Expanded State)
- [ ] Group 1: "اصلی" - داشبورد, تحلیل وام‌ها
- [ ] Group 2: "جستجو و مقایسه" - بانک‌ها, وام‌ها, مقایسه وام‌ها
- [ ] Group 3: "ابزارها" - ماشین حساب‌ها, بهینه‌ساز وام, واردات داده
- [ ] Group 4: "شخصی" - وام‌های من
- [ ] Group titles visible and styled correctly
- [ ] Dividers between groups visible
- [ ] All icons render correctly (Lucide icons)
- [ ] Text labels visible and readable
- [ ] Active route highlighted with primary color (#BB86FC)
- [ ] Active route has glow effect
- [ ] Hover states work (background changes)
- [ ] All navigation links clickable

### Sidebar Navigation (Collapsed State)
- [ ] Click toggle button to collapse
- [ ] Sidebar smoothly animates to 72px width
- [ ] Group titles hidden
- [ ] Text labels hidden
- [ ] Icons remain visible and centered
- [ ] Tooltips appear on hover (left side)
- [ ] Tooltips show correct labels
- [ ] Active state still highlighted
- [ ] Navigation still works when collapsed
- [ ] Dividers still visible

### Sidebar Stats Footer
- [ ] Stats footer visible when expanded
- [ ] "وام‌های انتخابی" shows with CreditCard icon
- [ ] Selection count badge shows (if any loans selected)
- [ ] "یادآوری‌ها" shows with Bell icon
- [ ] Alerts count shows "0"
- [ ] Stats hidden when sidebar collapsed
- [ ] Footer text "تحلیل وام‌های بانک‌های ایران" visible when expanded

### Sidebar Persistence
- [ ] Collapse sidebar and refresh page
- [ ] Sidebar state persists (stays collapsed)
- [ ] Expand sidebar and refresh page
- [ ] Sidebar state persists (stays expanded)

## 📱 Mobile Testing (Viewport < 1024px)

### Header
- [ ] Menu button visible on right side
- [ ] Menu button has icon (hamburger menu)
- [ ] Title visible (may wrap on very small screens)
- [ ] Quick Actions toolbar hidden on mobile
- [ ] Version badge may be hidden on small screens

### Sidebar (Temporary Drawer)
- [ ] Sidebar hidden by default
- [ ] Click menu button to open
- [ ] Drawer slides in from right
- [ ] Backdrop appears behind drawer
- [ ] Drawer width: 256px (always expanded on mobile)
- [ ] Header shows "منو" with close button (X)
- [ ] Close button works
- [ ] Clicking backdrop closes drawer
- [ ] Toggle button hidden on mobile
- [ ] All navigation items visible
- [ ] Group titles visible
- [ ] Dividers visible
- [ ] Stats footer visible
- [ ] Footer text visible
- [ ] Navigation works in mobile drawer

### Mobile FAB (Floating Action Button)
- [ ] FAB visible at bottom-left when drawer closed
- [ ] FAB hidden when drawer open
- [ ] Compare button with GitCompare icon
- [ ] Calculator button with Calculator icon
- [ ] Selection count badge on Compare button (if any)
- [ ] Buttons have smooth animation
- [ ] Buttons are clickable and functional

## 🌐 RTL (Right-to-Left) Testing

### Layout
- [ ] Document direction is RTL
- [ ] Text flows right to left
- [ ] Sidebar anchored to right side
- [ ] Drawer opens from right
- [ ] Menu button on right side of header
- [ ] Navigation items aligned right
- [ ] Icons positioned on right side of text

### Components
- [ ] Tooltips appear on left side (correct for RTL)
- [ ] Chevron icon direction correct
- [ ] Badge positioning correct
- [ ] Spacing and padding symmetric
- [ ] Borders on correct sides
- [ ] Animations flow in correct direction

## 🎨 Theme & Styling

### Colors
- [ ] Background: #121212 (dark)
- [ ] Primary: #BB86FC (purple)
- [ ] Secondary: #03DAC5 (teal)
- [ ] Text primary: #e5e5e5 (light gray)
- [ ] Text secondary: #b3b3b3 (medium gray)
- [ ] Borders: #3d3d3d (dark gray)
- [ ] Active state: #BB86FC with glow
- [ ] Hover state: rgba(45, 45, 45)

### Typography
- [ ] Font: Vazirmatn (Persian/Arabic font)
- [ ] Headers readable and bold
- [ ] Body text readable
- [ ] Font sizes appropriate
- [ ] Line heights comfortable

### Shadows & Effects
- [ ] Header has subtle shadow
- [ ] Active nav item has glow effect
- [ ] Drawer has shadow
- [ ] No harsh shadows (dark theme appropriate)

## 🔗 Navigation Testing

Test all 10 routes:
- [ ] `/` - Dashboard
- [ ] `/banks` - Banks list
- [ ] `/banks/:bankId` - Bank detail
- [ ] `/loans` - Loans list
- [ ] `/loans/:bankId/:loanId` - Loan detail
- [ ] `/compare` - Compare loans
- [ ] `/analytics` - Analytics
- [ ] `/calculators` - Calculators
- [ ] `/loan-optimizer` - Loan optimizer
- [ ] `/import` - Data import
- [ ] `/my-loans` - My loans

For each route:
- [ ] Route loads successfully
- [ ] Active state highlights in sidebar
- [ ] Page content displays correctly
- [ ] No console errors

## ⚙️ Functionality Testing

### Sidebar Collapse (Desktop)
- [ ] Toggle button works
- [ ] Smooth animation (300ms)
- [ ] Width changes correctly
- [ ] Icons remain visible when collapsed
- [ ] Tooltips show when collapsed
- [ ] Persistence works (localStorage)

### Selection Counter
- [ ] Counter starts at 0
- [ ] Select a loan from loans page
- [ ] Counter updates in stats footer
- [ ] Badge appears with correct number
- [ ] Badge shows in Compare button (header)
- [ ] Badge color is green (#03DAC5)

### Quick Actions
- [ ] Compare button in header (desktop)
- [ ] Calculator button in header (desktop)
- [ ] Compare button navigates to /compare
- [ ] Calculator button navigates to /calculators
- [ ] Mobile FAB appears on mobile
- [ ] FAB buttons work correctly

## 🐛 Error Testing

### TypeScript
- [ ] No TypeScript errors in terminal
- [ ] No TypeScript errors in IDE
- [ ] All imports resolve correctly

### Console
- [ ] No errors in browser console
- [ ] No warnings about MUI components
- [ ] No RTL plugin warnings
- [ ] No emotion cache errors

### Performance
- [ ] Page loads quickly
- [ ] Animations are smooth (60fps)
- [ ] No lag when toggling sidebar
- [ ] No lag when opening mobile drawer
- [ ] Navigation changes are instant

## 📊 Responsive Breakpoints

Test at specific widths:
- [ ] 320px (mobile small)
- [ ] 375px (mobile medium)
- [ ] 768px (tablet)
- [ ] 1024px (desktop small)
- [ ] 1280px (desktop medium)
- [ ] 1920px (desktop large)

For each breakpoint:
- [ ] Layout adapts appropriately
- [ ] No horizontal scroll
- [ ] Content is readable
- [ ] Navigation is accessible
- [ ] No overlapping elements

## 🔍 Accessibility Testing

### Keyboard Navigation
- [ ] Tab through navigation items
- [ ] Enter/Space activates navigation
- [ ] Tab through header buttons
- [ ] Escape closes mobile drawer
- [ ] Focus visible on all interactive elements

### Screen Reader (Optional)
- [ ] ARIA labels present
- [ ] Navigation structure clear
- [ ] Active state announced
- [ ] Buttons have descriptive labels

## ✅ Final Checks

- [ ] All tests passed
- [ ] No critical issues
- [ ] Performance acceptable
- [ ] Visual design matches expectations
- [ ] RTL layout correct
- [ ] Dark theme consistent
- [ ] All features working
- [ ] Ready for production

## 📝 Issues Found

Document any issues discovered during testing:

### Critical Issues
```
None found / List issues here
```

### Minor Issues
```
None found / List issues here
```

### Enhancements
```
Future improvements / List ideas here
```

## ✅ Sign-off

- [ ] Tested by: _______________
- [ ] Date: _______________
- [ ] Status: Pass / Fail / Needs Review
- [ ] Notes: _______________

---

**Testing complete! Ready to mark task #5 as completed.**
