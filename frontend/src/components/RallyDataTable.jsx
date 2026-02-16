import { DataTable } from 'mantine-datatable';
import { ScrollArea } from '@mantine/core';
import RallyEmptyState from './RallyEmptyState';
import RallyTableSkeleton from './RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';

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
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: rallyColors.background,
            borderBottom: `1px solid ${rallyColors.border}`,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            '& th': {
              color: rallyColors.textSecondary,
              fontWeight: 600,
              fontSize: '0.8rem',
              backgroundColor: rallyColors.background,
              borderBottom: `1px solid ${rallyColors.border}`,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'background-color 150ms ease',
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
              fontSize: '0.85rem',
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
