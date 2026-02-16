import { DataTable } from 'mantine-datatable';
import { ScrollArea } from '@mantine/core';
import RallyEmptyState from './RallyEmptyState';
import RallyTableSkeleton from './RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';

export default function RallyDataTable({
  records,
  columns,
  loading = false,
  emptyMessage = 'No data available',
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
  ...props
}) {
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
        minHeight={minHeight}
        withTableBorder={false}
        borderRadius="md"
        striped={false}
        highlightOnHover
        {...tableProps}
        styles={{
          root: {
            '--datatable-row-color': rallyColors.textPrimary,
          },
          header: {
            borderBottom: `1px solid ${rallyColors.border}`,
            '& th': {
              color: rallyColors.textSecondary,
              fontWeight: 600,
              fontSize: '0.8rem',
              backgroundColor: 'transparent',
              borderBottom: `1px solid ${rallyColors.border}`,
            },
          },
          table: {
            '& tbody tr': {
              cursor: onRowClick ? 'pointer' : 'default',
              backgroundColor: 'transparent',
            },
            '& tbody tr td': {
              borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
              fontSize: '0.85rem',
            },
            '& tbody tr:hover td': {
              backgroundColor: 'rgba(16, 185, 129, 0.06)',
            },
          },
          pagination: {
            borderTop: '1px solid rgba(148, 163, 184, 0.06)',
          },
        }}
        {...props}
      />
    </ScrollArea>
  );
}
