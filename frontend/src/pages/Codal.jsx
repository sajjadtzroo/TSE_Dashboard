import { useEffect, useState } from 'react';
import { Alert, Badge, Group, Text, Title, Anchor } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { toJalali } from '../utils/dateUtils';

export default function Codal() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/codal');
      setReports(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

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

  const paged = reports.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="گزارش‌های کدال"><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="codal" columns={columns} records={reports} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={fetchData} />
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
          onRecordsPerPageChange={(p) => { setPerPage(p); setPage(1); }}
          totalRecords={reports.length}
          emptyMessage="گزارشی موجود نیست"
          onRetry={fetchData}
        />
      </RallyMainCard>
    </>
  );
}
