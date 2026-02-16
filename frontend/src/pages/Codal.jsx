import { Alert, Badge, Group, Text, Anchor } from '@mantine/core';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { toJalali } from '../utils/dateUtils';

export default function Codal() {
  const { data: reports, loading, error, lastUpdated, refresh } = useApiData('/api/codal');
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(reports);

  if (error && !reports.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 80 },
    { accessor: 'company_name', title: 'شرکت', width: 130 },
    {
      accessor: 'title',
      title: 'عنوان',
      width: 250,
      render: (r) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" truncate="end" style={{ flex: 1 }}>{r.title}</Text>
          {r.link_pdf && (
            <Badge
              size="xs"
              color="rally-orange"
              variant="light"
              component="a"
              href={r.link_pdf}
              target="_blank"
              rel="noopener noreferrer"
              style={{ cursor: 'pointer', flexShrink: 0 }}
            >
              PDF
            </Badge>
          )}
        </Group>
      ),
    },
    { accessor: 'date_publish', title: 'تاریخ', width: 85, render: (r) => toJalali(r.date_publish) },
    { accessor: 'time_publish', title: 'زمان', width: 65 },
  ];

  return (
    <>
      <PageHeader title="گزارش‌های کدال"><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="codal" columns={columns} records={reports} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-green" variant="light">{reports.length} گزارش</Badge>
        </Group>
      </RallyMainCard>

      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          loading={loading}
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
          emptyMessage="گزارشی موجود نیست"
          onRetry={refresh}
        />
      </RallyMainCard>
    </>
  );
}
