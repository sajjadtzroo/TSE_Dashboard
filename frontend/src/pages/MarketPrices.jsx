import { useEffect, useState } from 'react';
import { Alert, Badge, Group, Tabs, Title } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';

export default function MarketPrices() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/market/prices');
      setPrices(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const filteredPrices = category === 'all' ? prices : prices.filter((r) => r.market_type === category);

  if (error && !prices.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 90 },
    { accessor: 'name_fa', title: 'نام', width: 160 },
    { accessor: 'price', title: 'قیمت', width: 100, textAlign: 'end', render: (r) => r.price?.toLocaleString() },
    { accessor: 'price_toman', title: 'قیمت (تومان)', width: 110, textAlign: 'end', render: (r) => r.price_toman?.toLocaleString() },
    { accessor: 'change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.change_pct} /> },
    { accessor: 'unit', title: 'واحد', width: 70 },
    { accessor: 'market_cap', title: 'ارزش بازار', width: 100, textAlign: 'end', render: (r) => r.market_cap?.toLocaleString() },
  ];

  const paged = filteredPrices.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="قیمت بازارها"><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="market-prices" columns={columns} records={filteredPrices} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md" align="center">
          <Tabs value={category} onChange={(v) => { setCategory(v); setPage(1); }}>
            <Tabs.List>
              <Tabs.Tab value="all">همه</Tabs.Tab>
              <Tabs.Tab value="gold">طلا</Tabs.Tab>
              <Tabs.Tab value="currency">ارز</Tabs.Tab>
              <Tabs.Tab value="commodity">کالا</Tabs.Tab>
              <Tabs.Tab value="crypto">کریپتو</Tabs.Tab>
            </Tabs.List>
          </Tabs>
          <RefreshButton onRefreshComplete={fetchData} />
          <Badge color="rally-green" variant="light">{filteredPrices.length} مورد</Badge>
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
          totalRecords={filteredPrices.length}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={fetchData}
        />
      </RallyMainCard>
    </>
  );
}
