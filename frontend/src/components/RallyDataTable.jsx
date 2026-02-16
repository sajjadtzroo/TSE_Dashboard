import { DataTable } from 'mantine-datatable';
import { ScrollArea } from '@mantine/core';
import RallyEmptyState from './RallyEmptyState';
import RallyTableSkeleton from './RallyTableSkeleton';

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
            '--datatable-row-color': 'rgba(238,238,238,0.87)',
          },
          header: {
            borderBottom: '1px solid rgba(238,238,238,0.08)',
            '& th': {
              color: 'rgba(238,238,238,0.5)',
              fontWeight: 600,
              fontSize: '0.8rem',
              backgroundColor: 'transparent',
              borderBottom: '1px solid rgba(238,238,238,0.08)',
            },
          },
          table: {
            '& tbody tr': {
              cursor: onRowClick ? 'pointer' : 'default',
              backgroundColor: 'transparent',
            },
            '& tbody tr td': {
              borderBottom: '1px solid rgba(238,238,238,0.05)',
              fontSize: '0.85rem',
            },
            '& tbody tr:hover td': {
              backgroundColor: 'rgba(118, 171, 174, 0.06)',
            },
          },
          pagination: {
            borderTop: '1px solid rgba(238,238,238,0.05)',
          },
        }}
        {...props}
      />
    </ScrollArea>
  );
}
