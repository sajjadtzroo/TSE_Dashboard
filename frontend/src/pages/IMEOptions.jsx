import { useEffect, useState } from 'react';
import { Alert, Badge, Group, Select } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { toJalali } from '../utils/dateUtils';

export default function IMEOptions() {
  const [options, setOptions] = useState([]);
  const [commodity, setCommodity] = useState(null);
  const [optionType, setOptionType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { fetchData(); }, [commodity, optionType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (commodity) params.set('commodity', commodity);
      if (optionType) params.set('option_type', optionType);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await axios.get(`/api/ime/options${qs}`);
      setOptions(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const commodityOptions = [...new Set(options.map((o) => o.commodity).filter(Boolean))].sort();
  const callCount = options.filter((o) => o.option_type === 'call').length;
  const putCount = options.filter((o) => o.option_type === 'put').length;

  if (error) {
    return <Alert color="red" title="Error">{error}</Alert>;
  }

  const columns = [
    { accessor: 'contract_code', title: 'Code', width: 110 },
    {
      accessor: 'option_type', title: 'Type', width: 60,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.option_type === 'call' ? 'rally-green' : 'rally-orange'}>
          {r.option_type === 'call' ? 'Call' : 'Put'}
        </Badge>
      ),
    },
    { accessor: 'commodity', title: 'Commodity', width: 80 },
    { accessor: 'price_strike', title: 'Strike', width: 90, textAlign: 'end', render: (r) => r.price_strike?.toLocaleString() },
    { accessor: 'date_end', title: 'Expiry', width: 90, render: (r) => toJalali(r.date_end) },
    { accessor: 'day_remain', title: 'Days Left', width: 70, textAlign: 'end' },
    { accessor: 'last', title: 'Last', width: 85, textAlign: 'end', render: (r) => r.last?.toLocaleString() },
    { accessor: 'last_change_pct', title: 'Change%', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'volume', title: 'Volume', width: 80, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    { accessor: 'interest_open', title: 'Open Interest', width: 95, textAlign: 'end', render: (r) => r.interest_open?.toLocaleString() },
    { accessor: 'settlement_price', title: 'Settlement', width: 90, textAlign: 'end', render: (r) => r.settlement_price?.toLocaleString() },
    { accessor: 'bid_price_1', title: 'Bid', width: 80, textAlign: 'end', render: (r) => r.bid_price_1?.toLocaleString() || '-' },
    { accessor: 'ask_price_1', title: 'Ask', width: 80, textAlign: 'end', render: (r) => r.ask_price_1?.toLocaleString() || '-' },
  ];

  const paged = options.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="IME Options">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="ime_options" columns={columns} records={options} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <Select
            placeholder="Commodity"
            data={[{ value: '', label: 'All' }, ...commodityOptions.map((c) => ({ value: c, label: c }))]}
            value={commodity || ''}
            onChange={(v) => { setCommodity(v || null); setPage(1); }}
            clearable
            w={160}
            size="sm"
          />
          <Select
            placeholder="Option Type"
            data={[{ value: '', label: 'All' }, { value: 'call', label: 'Call' }, { value: 'put', label: 'Put' }]}
            value={optionType || ''}
            onChange={(v) => { setOptionType(v || null); setPage(1); }}
            clearable
            w={130}
            size="sm"
          />
          <RefreshButton onRefreshComplete={fetchData} />
          <Badge color="rally-green" variant="light">{options.length} options</Badge>
          <Badge color="rally-green" variant="light">{callCount} calls</Badge>
          <Badge color="rally-orange" variant="light">{putCount} puts</Badge>
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
          totalRecords={options.length}
        />
      </RallyMainCard>
    </>
  );
}
