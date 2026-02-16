import { useState } from 'react';
import { Alert, Badge, Group, Tabs, Title } from '@mantine/core';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { formatNum } from '../utils/formatUtils';

export default function MarketPrices() {
  const { data: prices, loading, error, lastUpdated, refresh } = useApiData('/api/market/prices');
  const [category, setCategory] = useState('all');

  const filteredPrices = category === 'all' ? prices : prices.filter((r) => r.market_type === category);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(filteredPrices);

  if (error && !prices.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 90 },
    { accessor: 'name_fa', title: 'نام', width: 160 },
    { accessor: 'price', title: 'قیمت', width: 100, textAlign: 'end', render: (r) => formatNum(r.price) },
    { accessor: 'price_toman', title: 'قیمت (تومان)', width: 110, textAlign: 'end', render: (r) => formatNum(r.price_toman) },
    { accessor: 'change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.change_pct} /> },
    { accessor: 'unit', title: 'واحد', width: 70 },
    { accessor: 'market_cap', title: 'ارزش بازار', width: 100, textAlign: 'end', render: (r) => formatNum(r.market_cap) },
  ];

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
          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-green" variant="light">{formatNum(filteredPrices.length)} مورد</Badge>
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
          emptyMessage="داده‌ای موجود نیست"
          onRetry={refresh}
        />
      </RallyMainCard>
    </>
  );
}
