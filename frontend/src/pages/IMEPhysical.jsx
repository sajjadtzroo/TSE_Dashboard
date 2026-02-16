import { useEffect, useState } from 'react';
import { Alert, Badge, Group } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';

export default function IMEPhysical() {
  const [physical, setPhysical] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/ime/physical');
      setPhysical(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (error) {
    return <Alert color="red" title="Error">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'Symbol', width: 90 },
    { accessor: 'name', title: 'Name', width: 160 },
    { accessor: 'code_offer', title: 'Offer Code', width: 90 },
    { accessor: 'producer', title: 'Producer', width: 130 },
    { accessor: 'price_last', title: 'Last Price', width: 90, textAlign: 'end', render: (r) => r.price_last?.toLocaleString() },
    { accessor: 'price_base_offer', title: 'Base Offer', width: 90, textAlign: 'end', render: (r) => r.price_base_offer?.toLocaleString() },
    { accessor: 'volume_contract', title: 'Contract Vol', width: 80, textAlign: 'end', render: (r) => r.volume_contract?.toLocaleString() },
    { accessor: 'demand', title: 'Demand', width: 80, textAlign: 'end', render: (r) => r.demand?.toLocaleString() },
    { accessor: 'value', title: 'Value', width: 90, textAlign: 'end', render: (r) => r.value?.toLocaleString() },
    { accessor: 'settlement_type', title: 'Settlement', width: 80 },
    { accessor: 'market_hall', title: 'Hall', width: 80 },
  ];

  const paged = physical.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="IME Physical">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="ime_physical" columns={columns} records={physical} />
      </PageHeader>
      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={fetchData} />
          <Badge color="rally-green" variant="light">{physical.length} items</Badge>
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
          totalRecords={physical.length}
        />
      </RallyMainCard>
    </>
  );
}
