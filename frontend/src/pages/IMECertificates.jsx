import { useEffect, useState } from 'react';
import { Alert, Badge, Group, SegmentedControl } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';

export default function IMECertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [certType, setCertType] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/ime/certificates');
      setCertificates(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const filteredCerts = certType === 'all' ? certificates : certificates.filter((r) => String(r.cert_type) === certType);

  if (error) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'contract_code', title: 'کد', width: 100 },
    { accessor: 'name', title: 'نام', width: 160 },
    { accessor: 'commodity', title: 'کالا', width: 100 },
    { accessor: 'last', title: 'آخرین', width: 90, textAlign: 'end', render: (r) => r.last?.toLocaleString() },
    { accessor: 'last_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'settlement_price', title: 'تسویه', width: 90, textAlign: 'end', render: (r) => r.settlement_price?.toLocaleString() },
    { accessor: 'close', title: 'پایانی', width: 90, textAlign: 'end', render: (r) => r.close?.toLocaleString() },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    { accessor: 'trades', title: 'معاملات', width: 65, textAlign: 'end', render: (r) => r.trades?.toLocaleString() },
    { accessor: 'bid_price_1', title: 'خرید', width: 80, textAlign: 'end', render: (r) => r.bid_price_1?.toLocaleString() || '-' },
    { accessor: 'ask_price_1', title: 'فروش', width: 80, textAlign: 'end', render: (r) => r.ask_price_1?.toLocaleString() || '-' },
  ];

  const paged = filteredCerts.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="گواهی سپرده کالایی">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="ime_certificates" columns={columns} records={filteredCerts} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <SegmentedControl
            size="xs"
            value={certType}
            onChange={(v) => { setCertType(v); setPage(1); }}
            data={[
              { label: 'همه', value: 'all' },
              { label: 'عمومی', value: '1' },
              { label: 'سکه/زعفران', value: '2' },
            ]}
          />
          <RefreshButton onRefreshComplete={fetchData} />
          <Badge color="rally-green" variant="light">{filteredCerts.length} گواهی</Badge>
        </Group>
      </RallyMainCard>

      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          loading={loading}
          pinLeftColumns
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={(p) => { setPerPage(p); setPage(1); }}
          totalRecords={filteredCerts.length}
        />
      </RallyMainCard>
    </>
  );
}
