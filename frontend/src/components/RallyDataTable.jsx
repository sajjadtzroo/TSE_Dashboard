import { DataTable } from 'mantine-datatable';
import { ScrollArea } from '@mantine/core';
import { useLocalStorage, useMediaQuery } from '@mantine/hooks';
import RallyEmptyState from './RallyEmptyState';
import RallyTableSkeleton from './RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';
import tableStyles from './RallyDataTable.module.css';

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
    <ScrollArea>
      <DataTable
        records={records}
        columns={columns}
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
            padding: densityConfig.padding,
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
    </ScrollArea>
  );
}
