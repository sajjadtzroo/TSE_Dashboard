# Data Grid Enhancement Guide

Complete guide for applying all 14 data grid enhancements to any table in the TSE Dashboard.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Implementation](#step-by-step-implementation)
3. [Feature Checklist](#feature-checklist)
4. [Code Examples](#code-examples)
5. [Testing Checklist](#testing-checklist)

---

## Prerequisites

### Required Imports

```jsx
// React
import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Mantine Components
import {
  Alert, Badge, Group, Select, TextInput,
  ActionIcon, Stack
} from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// Custom Components
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import ColumnToggle from '../components/ColumnToggle';
import DensityToggle from '../components/DensityToggle';
import QuickFilters from '../components/table/QuickFilters';
import BulkActionsToolbar from '../components/table/BulkActionsToolbar';
import ColumnFilter from '../components/table/ColumnFilter';

// Custom Hooks
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import useTableSearch from '../hooks/useTableSearch';
import useTableKeyboard from '../hooks/useTableKeyboard';
import useRowSelection from '../hooks/useRowSelection';
import useColumnFilters from '../hooks/useColumnFilters';

// Utils
import rallyColors from '../theme/rallyColors';
import { formatNum } from '../utils/formatUtils';
import { exportToCsv } from '../utils/exportData';
```

---

## Step-by-Step Implementation

### Step 1: Component State Setup

```jsx
export default function YourTablePage() {
  // Basic state
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [sortStatus, setSortStatus] = useState({
    columnAccessor: 'id',
    direction: 'asc'
  });
  const [activePreset, setActivePreset] = useState(null);

  // Refs
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // API Data
  const { data, loading, error, lastUpdated, refresh } = useApiData('/api/your-endpoint');

  // ... continue with hooks
}
```

### Step 2: Add Quick Filter Presets

```jsx
// Define presets relevant to your data
const quickFilterPresets = [
  { key: 'preset-1', label: 'پیش‌تنظیم ۱', icon: 'trending-up' },
  { key: 'preset-2', label: 'پیش‌تنظیم ۲', icon: 'trending-down' },
  { key: 'preset-3', label: 'پیش‌تنظیم ۳', icon: 'volume' },
];

// Apply preset filters
const presetFilteredData = useMemo(() => {
  if (!activePreset || !data) return data;

  switch (activePreset) {
    case 'preset-1':
      return data.filter(/* your condition */);
    case 'preset-2':
      return [...data].sort(/* your sorting */);
    // ... add more presets
    default:
      return data;
  }
}, [data, activePreset]);
```

### Step 3: Add Column Filters

```jsx
// Column filters
const {
  filters: columnFilters,
  addFilter,
  removeFilter,
  clearFilters: clearColumnFilters,
  filteredData: columnFilteredData,
  activeFilterCount,
} = useColumnFilters(presetFilteredData);
```

### Step 4: Add Global Search

```jsx
// Search functionality
const {
  searchQuery,
  setSearchQuery,
  filteredData,
  clearSearch,
  resultCount,
  isSearching
} = useTableSearch(
  columnFilteredData,
  ['field1', 'field2', 'field3'] // fields to search
);
```

### Step 5: Add Sorting

```jsx
// Sorted data
const sortedData = useMemo(() => {
  if (!sortStatus?.columnAccessor || !filteredData) return filteredData;

  const sorted = [...filteredData].sort((a, b) => {
    const aVal = a[sortStatus.columnAccessor];
    const bVal = b[sortStatus.columnAccessor];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortStatus.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    const comparison = aStr.localeCompare(bStr, 'fa');
    return sortStatus.direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
}, [filteredData, sortStatus]);
```

### Step 6: Add Pagination & Row Selection

```jsx
// Pagination
const { paged, page, setPage, perPage, setPerPage, totalRecords } =
  usePagination(sortedData);

// Row selection
const {
  selectedRecords,
  toggleSelection,
  clearSelection,
  selectedCount,
} = useRowSelection('id'); // your ID accessor
```

### Step 7: Add Keyboard Shortcuts

```jsx
// Keyboard shortcuts
useTableKeyboard({
  onSearch: () => searchInputRef.current?.focus(),
  onRefresh: refresh,
  onExport: () => exportToCsv('your-table', columns, data),
});
```

### Step 8: Add Bulk Actions

```jsx
// Bulk action handlers
const handleBulkExport = () => {
  exportToCsv('your-table-selected', columns, selectedRecords);
  notifications.show({
    title: 'صادرات موفق',
    message: `${selectedCount} ردیف صادر شد`,
    color: 'green',
  });
};

// Add more bulk handlers as needed...
```

### Step 9: Define Columns with Filters

```jsx
const allColumns = [
  // Text column with filter
  {
    accessor: 'name',
    title: (
      <Group gap={4}>
        <span>نام</span>
        <ColumnFilter
          accessor="name"
          type="text"
          value={columnFilters.name}
          onChange={addFilter}
          onClear={removeFilter}
        />
      </Group>
    ),
    width: 150,
    sortable: true,
  },

  // Number column with range filter
  {
    accessor: 'price',
    title: (
      <Group gap={4}>
        <span>قیمت</span>
        <ColumnFilter
          accessor="price"
          type="range"
          value={columnFilters.price}
          onChange={addFilter}
          onClear={removeFilter}
        />
      </Group>
    ),
    width: 100,
    textAlign: 'end',
    sortable: true,
    render: (r) => formatNum(r.price),
  },

  // Simple column without filter
  {
    accessor: 'date',
    title: 'تاریخ',
    width: 90,
    sortable: true,
  },
];

const columns = visibleColumns || allColumns;
```

### Step 10: Render UI Components

```jsx
return (
  <>
    {/* Page Header */}
    <PageHeader title="عنوان جدول">
      <DataFreshness lastUpdated={lastUpdated} />
      <DensityToggle />
      <ColumnToggle
        columns={allColumns}
        storageKey="your-table"
        onChange={setVisibleColumns}
      />
      <ExportButton
        filename="your-table"
        columns={columns}
        records={data}
      />
    </PageHeader>

    {/* Filters Card */}
    <RallyMainCard mb="md" noPadding>
      <Stack gap="md" p="md">
        <Group gap="md">
          {/* Search Input */}
          <TextInput
            ref={searchInputRef}
            placeholder="جستجو... (Ctrl+F یا /)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            rightSection={
              searchQuery && (
                <ActionIcon size="sm" variant="subtle" onClick={clearSearch}>
                  <IconX size={14} />
                </ActionIcon>
              )
            }
            w={320}
            size="sm"
          />

          {/* Additional Filters (Optional) */}
          <Select
            placeholder="فیلتر اضافی"
            data={[/* your options */]}
            value={selectedFilter || ''}
            onChange={(v) => setSelectedFilter(v || null)}
            clearable
            w={200}
            size="sm"
          />

          <RefreshButton onRefreshComplete={refresh} />

          {/* Result Count */}
          <Badge color="rally-green" variant="light">
            {isSearching || activePreset || activeFilterCount > 0
              ? `${formatNum(resultCount)} از ${formatNum(data.length)}`
              : `${formatNum(data.length)} ردیف`}
          </Badge>

          {/* Active Filters Indicator */}
          {activeFilterCount > 0 && (
            <Badge color="blue" variant="light">
              {activeFilterCount} فیلتر ستونی
            </Badge>
          )}
        </Group>

        {/* Quick Filters */}
        <QuickFilters
          presets={quickFilterPresets}
          activePreset={activePreset}
          onPresetClick={(key) => {
            setActivePreset(key);
            setPage(1);
          }}
        />
      </Stack>
    </RallyMainCard>

    {/* Bulk Actions Toolbar */}
    <BulkActionsToolbar
      selectedCount={selectedCount}
      onClear={clearSelection}
      onExport={handleBulkExport}
      // Add more actions as needed
    />

    {/* Data Table */}
    <RallyMainCard noPadding>
      <RallyDataTable
        records={paged}
        columns={columns}
        idAccessor="id"
        loading={loading}
        page={page}
        onPageChange={setPage}
        recordsPerPage={perPage}
        onRecordsPerPageChange={setPerPage}
        totalRecords={totalRecords}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        onRowClick={/* optional */}
        emptyMessage={isSearching ? 'نتیجه‌ای یافت نشد' : 'داده‌ای موجود نیست'}
        onRetry={refresh}
        storeColumnsKey="your-table"
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={toggleSelection}
      />
    </RallyMainCard>
  </>
);
```

---

## Feature Checklist

Use this checklist when implementing enhancements:

### Phase 1: Foundation
- [ ] Column sorting enabled (`sortable: true`)
- [ ] Sort state management (`useState` for sortStatus)
- [ ] Global search with `useTableSearch` hook
- [ ] Search input with ref for keyboard shortcuts
- [ ] Enhanced hover effects (automatic in RallyDataTable)
- [ ] Sticky headers (automatic in RallyDataTable)

### Phase 2: Filters
- [ ] Quick filter presets defined
- [ ] Quick filter logic implemented
- [ ] QuickFilters component added
- [ ] Loading state improvements (shimmer in skeleton)

### Phase 3: Export & Selection
- [ ] Table density toggle in PageHeader
- [ ] Enhanced export button (3 formats)
- [ ] Row selection with `useRowSelection` hook
- [ ] Bulk actions toolbar
- [ ] Bulk action handlers

### Phase 4: Advanced
- [ ] Column resizing enabled (`storeColumnsKey` prop)
- [ ] Keyboard shortcuts with `useTableKeyboard` hook
- [ ] Context menu component (optional)
- [ ] Column filters added to relevant columns

---

## Code Examples

### Example 1: Simple Table (Minimal Features)

```jsx
export default function SimpleTable() {
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'id', direction: 'asc' });
  const { data, loading } = useApiData('/api/data');
  const { paged, ...pagination } = usePagination(data);

  const columns = [
    { accessor: 'id', title: 'شناسه', sortable: true },
    { accessor: 'name', title: 'نام', sortable: true },
  ];

  return (
    <RallyDataTable
      records={paged}
      columns={columns}
      loading={loading}
      sortStatus={sortStatus}
      onSortStatusChange={setSortStatus}
      {...pagination}
    />
  );
}
```

### Example 2: Full-Featured Table

See Step 10 above for complete implementation.

---

## Testing Checklist

### Functional Testing
- [ ] Sorting works on all sortable columns
- [ ] Search filters results correctly
- [ ] Quick filters apply correctly
- [ ] Column filters work (text/number/range)
- [ ] Pagination navigates correctly
- [ ] Row selection/deselection works
- [ ] Bulk actions execute correctly
- [ ] Export downloads correct data
- [ ] Keyboard shortcuts respond

### UI/UX Testing
- [ ] Hover effects appear smoothly
- [ ] Sticky headers stay visible on scroll
- [ ] Loading skeleton displays correctly
- [ ] Empty states show appropriate messages
- [ ] Badges show correct counts
- [ ] Filter indicators are visible
- [ ] Table density changes apply

### Performance Testing
- [ ] Search is debounced (no lag)
- [ ] Sorting is fast (<100ms)
- [ ] Large datasets (1000+) scroll smoothly
- [ ] No memory leaks on unmount

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Screen reader compatibility

### Browser Testing
- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Common Issues & Solutions

### Issue 1: Search not working
**Solution**: Ensure searchFields match your data structure
```jsx
useTableSearch(data, ['field1', 'field2'])
```

### Issue 2: Sorting doesn't persist
**Solution**: Add sortStatus state and handler
```jsx
const [sortStatus, setSortStatus] = useState({...});
<RallyDataTable sortStatus={sortStatus} onSortStatusChange={setSortStatus} />
```

### Issue 3: Column filters don't appear
**Solution**: Wrap title in Group with ColumnFilter
```jsx
title: <Group gap={4}><span>Name</span><ColumnFilter .../></Group>
```

### Issue 4: Resizing not persisting
**Solution**: Add storeColumnsKey prop
```jsx
<RallyDataTable storeColumnsKey="unique-table-key" />
```

---

## Performance Tips

1. **Memoize expensive computations**
   ```jsx
   const sortedData = useMemo(() => { /* sort logic */ }, [data, sortStatus]);
   ```

2. **Use virtualization for large datasets (1000+)**
   ```jsx
   import useVirtualization from '../hooks/useVirtualization';
   const { virtualItems } = useVirtualization(data);
   ```

3. **Debounce search appropriately**
   - Default 300ms is good for most cases
   - Increase to 500ms for very large datasets

4. **Paginate reasonably**
   - Default 25 rows is optimal
   - Offer [10, 25, 50, 100] options

---

## Next Steps

1. ✅ Review this guide
2. ✅ Choose a table to enhance
3. ✅ Copy template code
4. ✅ Customize for your data
5. ✅ Test all features
6. ✅ Commit changes
7. ✅ Move to next table

---

## Support

For questions or issues:
- Check existing implementations: `MarketOverview.jsx`, `Options.jsx`, `ClientType.jsx`
- Review component documentation in source files
- Test with sample data first

---

**Last Updated**: 2026-02-16
**Version**: 1.0 (All 14 features)
