import { DataTable } from 'mantine-datatable';
import { ScrollArea } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import RallyEmptyState from './RallyEmptyState';
import RallyTableSkeleton from './RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';

const DENSITY_SETTINGS = {
  compact: { rowHeight: 32, fontSize: '0.75rem', padding: '4px 8px' },
  normal: { rowHeight: 48, fontSize: '0.85rem', padding: '8px 12px' },
  comfortable: { rowHeight: 64, fontSize: '0.9rem', padding: '12px 16px' },
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
  resizable = true,
  storeColumnsKey,
  ...props
}) {
  const [storedDensity] = useLocalStorage({ key: 'table-density', defaultValue: 'normal' });
  const density = externalDensity || storedDensity;
  const densityConfig = DENSITY_SETTINGS[density] || DENSITY_SETTINGS.normal;

  // Store column widths in localStorage
  const storageKey = storeColumnsKey ? `column-widths-${storeColumnsKey}` : null;
  const [columnWidths, setColumnWidths] = useLocalStorage({
    key: storageKey || 'column-widths-default',
    defaultValue: {},
  });

  const handleColumnResize = ({ accessor, width }) => {
    if (storageKey) {
      setColumnWidths((prev) => ({ ...prev, [accessor]: width }));
    }
  };

  // Apply stored widths to columns
  const columnsWithWidths = columns.map((col) => ({
    ...col,
    width: columnWidths[col.accessor] || col.width,
  }));
  if (loading) {
    return (
      <RallyTableSkeleton
        rows={8}
        columns={columns?.length || 5}
        minHeight={minHeight}
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
    <ScrollArea>
      <DataTable
        records={records}
        columns={columnsWithWidths}
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
        minHeight={minHeight}
        withTableBorder={false}
        borderRadius="md"
        striped={false}
        highlightOnHover
        resizable={resizable}
        onColumnResize={handleColumnResize}
        {...tableProps}
        styles={{
          root: {
            '--datatable-row-color': rallyColors.textPrimary,
          },
          header: {
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: rallyColors.background,
            borderBottom: `1px solid ${rallyColors.border}`,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            '& th': {
              color: rallyColors.textSecondary,
              fontWeight: 600,
              fontSize: densityConfig.fontSize,
              backgroundColor: rallyColors.background,
              borderBottom: `1px solid ${rallyColors.border}`,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'background-color 150ms ease',
              padding: densityConfig.padding,
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.03)',
              },
              '&[data-sortable="true"]': {
                cursor: 'pointer',
              },
            },
          },
          table: {
            '& tbody tr': {
              cursor: onRowClick ? 'pointer' : 'default',
              backgroundColor: 'transparent',
              transition: 'all 150ms ease',
              position: 'relative',
              height: `${densityConfig.rowHeight}px`,
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '3px',
                backgroundColor: rallyColors.accent,
                opacity: 0,
                transition: 'opacity 150ms ease',
              },
            },
            '& tbody tr td': {
              borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
              fontSize: densityConfig.fontSize,
              padding: densityConfig.padding,
              transition: 'background-color 150ms ease',
            },
            '& tbody tr:hover': {
              '&::before': {
                opacity: 1,
              },
            },
            '& tbody tr:hover td': {
              backgroundColor: 'rgba(16, 185, 129, 0.10)',
            },
          },
          pagination: {
            borderTop: '1px solid rgba(148, 163, 184, 0.06)',
            position: 'sticky',
            bottom: 0,
            backgroundColor: rallyColors.background,
            zIndex: 10,
          },
        }}
        {...props}
      />
    </ScrollArea>
  );
}
