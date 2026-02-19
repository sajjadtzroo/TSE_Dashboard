import { useMemo } from 'react';
import { DataTable } from 'mantine-datatable';
import { useLocalStorage, useMediaQuery } from '@mantine/hooks';
import RallyEmptyState from './RallyEmptyState';
import RallyTableSkeleton from './RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';
import { toPersianNum } from '../utils/formatUtils';
import tableStyles from './RallyDataTable.module.css';

/** Add sensible defaults for columns with widths: noWrap for numeric, ellipsis for text */
function normalizeColumns(cols) {
  if (!cols) return cols;
  return cols.map((col) => {
    // RTL fix: dir="rtl" makes text-align:end resolve to left — use explicit 'right' for numeric columns
    const c = col.textAlign === 'end' ? { ...col, textAlign: 'right' } : col;

    if (!c.width) return c;
    // Don't override if already explicitly set
    if (c.ellipsis != null || c.noWrap != null) return c;
    // Numeric/right-aligned columns → noWrap
    if (c.textAlign === 'right') return { ...c, noWrap: true };
    // Render-only columns (no real text content) — skip ellipsis wrapper
    if (c.render && !c.title) return c;
    // Text columns → ellipsis to truncate long names
    return { ...c, ellipsis: true };
  });
}

const DENSITY_SETTINGS = {
  compact: { rowHeight: 32, fontSize: '0.75rem', cellPadding: '4px 8px' },
  normal: { rowHeight: 48, fontSize: '0.85rem', cellPadding: '8px 12px' },
  comfortable: { rowHeight: 64, fontSize: '0.9rem', cellPadding: '12px 16px' },
};

export default function RallyDataTable({
  records,
  columns,
  loading = false,
  emptyMessage = 'داده‌ای موجود نیست',
  onRetry,
  onRowClick,
  idAccessor = 'id',
  page,
  onPageChange,
  recordsPerPage = 25,
  recordsPerPageOptions = [10, 25, 50, 100],
  onRecordsPerPageChange,
  totalRecords,
  sortStatus,
  onSortStatusChange,
  minHeight = 400,
  pinLeftColumns,
  density: externalDensity,
  resizable = false,
  storeColumnsKey,
  // Row selection
  selectedRecords,
  onSelectedRecordsChange,
  ...props
}) {
  const [storedDensity] = useLocalStorage({ key: 'table-density', defaultValue: 'normal' });
  const isMobile = useMediaQuery('(max-width: 48em)');
  const density = externalDensity || (isMobile ? 'compact' : storedDensity);
  const densityConfig = DENSITY_SETTINGS[density] || DENSITY_SETTINGS.normal;
  const effectiveMinHeight = isMobile ? Math.min(minHeight, 280) : minHeight;
  const effectiveColumns = useMemo(() => normalizeColumns(columns), [columns]);

  if (loading) {
    return (
      <RallyTableSkeleton
        rows={8}
        columns={columns?.length || 5}
        minHeight={effectiveMinHeight}
      />
    );
  }

  if (!records || records.length === 0) {
    return <RallyEmptyState message={emptyMessage} onRetry={onRetry} />;
  }

  const tableProps = {};
  if (pinLeftColumns) {
    tableProps.pinFirstColumn = true;
  }

  return (
    <DataTable
      records={records}
      columns={effectiveColumns}
      idAccessor={idAccessor}
      page={page}
      onPageChange={onPageChange}
      recordsPerPage={recordsPerPage}
      recordsPerPageOptions={recordsPerPageOptions}
      onRecordsPerPageChange={onRecordsPerPageChange}
      totalRecords={totalRecords}
      sortStatus={sortStatus}
      onSortStatusChange={onSortStatusChange}
      onRowClick={onRowClick}
      minHeight={effectiveMinHeight}
      noRecordsText="داده‌ای موجود نیست"
      recordsPerPageLabel={toPersianNum('تعداد در صفحه')}
      paginationText={({ from, to, totalRecords: total }) =>
        `${toPersianNum(from)} - ${toPersianNum(to)} / ${toPersianNum(total)}`
      }
      withTableBorder={false}
      borderRadius="md"
      striped={false}
      highlightOnHover
      resizable={resizable}
      storeColumnsKey={storeColumnsKey}
      selectedRecords={selectedRecords}
      onSelectedRecordsChange={onSelectedRecordsChange}
      classNames={{ table: tableStyles.table }}
      {...tableProps}
      styles={{
        root: {
          '--datatable-row-color': rallyColors.textPrimary,
        },
        header: {
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: rallyColors.card,
          borderBottom: `1px solid ${rallyColors.border}`,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
          fontSize: densityConfig.fontSize,
        },
        pagination: {
          borderTop: '1px solid rgba(148, 163, 184, 0.06)',
          position: 'sticky',
          bottom: 0,
          backgroundColor: rallyColors.card,
          zIndex: 10,
        },
      }}
      {...props}
    />
  );
}
