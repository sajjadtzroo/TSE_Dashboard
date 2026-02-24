import { DataTable, type DataTableProps, type DataTableSortStatus } from 'mantine-datatable';
import { ScrollArea } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import RallyEmptyState from './RallyEmptyState';
import RallyTableSkeleton from './RallyTableSkeleton';
import rallyColors from '../../../theme/rallyColors';

const DENSITY_SETTINGS = {
  compact: { rowHeight: 32, fontSize: '0.75rem', padding: '4px 8px' },
  normal: { rowHeight: 48, fontSize: '0.85rem', padding: '8px 12px' },
  comfortable: { rowHeight: 64, fontSize: '0.9rem', padding: '12px 16px' },
};

type DensityType = keyof typeof DENSITY_SETTINGS;

interface RallyDataTableProps<T = Record<string, unknown>> {
  records: T[] | undefined;
  columns: DataTableProps<T>['columns'];
  loading?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  onRowClick?: DataTableProps<T>['onRowClick'];
  idAccessor?: string;
  page?: number;
  onPageChange?: (page: number) => void;
  recordsPerPage?: number;
  recordsPerPageOptions?: number[];
  onRecordsPerPageChange?: (perPage: number) => void;
  totalRecords?: number;
  sortStatus?: DataTableSortStatus<T>;
  onSortStatusChange?: (status: DataTableSortStatus<T>) => void;
  minHeight?: number;
  pinLeftColumns?: boolean;
  density?: DensityType;
  resizable?: boolean;
  storeColumnsKey?: string;
  selectedRecords?: T[];
  onSelectedRecordsChange?: (records: T[]) => void;
  [key: string]: unknown;
}

export default function RallyDataTable<T extends Record<string, unknown>>({
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
  selectedRecords,
  onSelectedRecordsChange,
  ...props
}: RallyDataTableProps<T>) {
  const storageKey = storeColumnsKey ? `column-widths-${storeColumnsKey}` : null;
  const [columnWidths] = useLocalStorage<Record<string, number>>({
    key: storageKey || 'column-widths-default',
    defaultValue: {},
  });

  const columnsWithWidths = columns?.map((col: any) => ({
    ...col,
    width: columnWidths[col.accessor as string] || col.width,
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

  // pinFirstColumn disabled: mantine-datatable v7 does not support RTL pinning
  const tableProps: Record<string, unknown> = {};
  if (page != null && onPageChange) {
    tableProps.page = page;
    tableProps.onPageChange = onPageChange;
    tableProps.recordsPerPage = recordsPerPage;
    tableProps.recordsPerPageOptions = recordsPerPageOptions;
    tableProps.onRecordsPerPageChange = onRecordsPerPageChange;
    tableProps.totalRecords = totalRecords;
  }

  return (
    <ScrollArea>
      <DataTable
        records={records}
        columns={columnsWithWidths as any}
        idAccessor={idAccessor as any}
        sortStatus={sortStatus as any}
        onSortStatusChange={onSortStatusChange as any}
        onRowClick={onRowClick}
        minHeight={minHeight}
        withTableBorder={false}
        borderRadius="md"
        striped={false}
        highlightOnHover
        {...tableProps}
        {...props}
        styles={{
          root: {
            '--datatable-row-color': rallyColors.textPrimary,
          } as any,
          header: {
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: rallyColors.bg,
            borderBottom: `1px solid ${rallyColors.border}`,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
          },
          table: {
            backgroundColor: 'transparent',
          },
          pagination: {
            borderTop: '1px solid rgba(156, 163, 175, 0.06)',
            position: 'sticky',
            bottom: 0,
            backgroundColor: rallyColors.bg,
            zIndex: 10,
          },
        }}
        selectedRecords={undefined}
        onSelectedRecordsChange={undefined}
      />
    </ScrollArea>
  );
}
