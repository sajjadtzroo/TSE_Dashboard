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
import rallyColors from '../theme/rallyColors';

export default function Options() {
  const [options, setOptions] = useState([]);
  const [underlying, setUnderlying] = useState(null);
  const [optionType, setOptionType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { fetchOptions(); }, [underlying, optionType]);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (underlying) params.set('underlying', underlying);
      if (optionType) params.set('option_type', optionType);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await axios.get(`/api/options${qs}`);
      setOptions(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const underlyingOptions = [...new Set(options.map((o) => o.underlying).filter(Boolean))].sort();
  const callCount = options.filter((o) => o.option_type === 'call').length;
  const putCount = options.filter((o) => o.option_type === 'put').length;

  if (error && !options.length) {
    return <Alert color="red" title="Error">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'Symbol', width: 90 },
    {
      accessor: 'option_type', title: 'Type', width: 60,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.option_type === 'call' ? 'rally-green' : 'rally-orange'}>
          {r.option_type === 'call' ? 'Call' : 'Put'}
        </Badge>
      ),
    },
    { accessor: 'underlying', title: 'Underlying', width: 80 },
    { accessor: 'strike_price', title: 'Strike', width: 80, textAlign: 'end', render: (r) => r.strike_price?.toLocaleString() },
    { accessor: 'expiry_date', title: 'Expiry', width: 90, render: (r) => toJalali(r.expiry_date) },
    { accessor: 'close', title: 'Close', width: 80, textAlign: 'end', render: (r) => r.close?.toLocaleString() },
    { accessor: 'last', title: 'Last', width: 80, textAlign: 'end', render: (r) => r.last?.toLocaleString() },
    {
      accessor: 'close_change', title: 'Change', width: 80, textAlign: 'end',
      render: (r) => {
        const val = r.close_change;
        if (val == null) return '-';
        const color = val > 0 ? rallyColors.green : val < 0 ? rallyColors.orange : undefined;
        return <span style={{ color, fontWeight: 600 }}>{val > 0 ? '+' : ''}{val?.toLocaleString()}</span>;
      },
    },
    { accessor: 'volume', title: 'Volume', width: 90, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    { accessor: 'trades', title: 'Trades', width: 65, textAlign: 'end', render: (r) => r.trades?.toLocaleString() },
    { accessor: 'open', title: 'Open', width: 75, textAlign: 'end', render: (r) => r.open?.toLocaleString() },
    { accessor: 'high', title: 'High', width: 75, textAlign: 'end', render: (r) => r.high?.toLocaleString() },
    { accessor: 'low', title: 'Low', width: 75, textAlign: 'end', render: (r) => r.low?.toLocaleString() },
    { accessor: 'bid_price_1', title: 'Bid', width: 75, textAlign: 'end', render: (r) => r.bid_price_1?.toLocaleString() || '-' },
    { accessor: 'ask_price_1', title: 'Ask', width: 75, textAlign: 'end', render: (r) => r.ask_price_1?.toLocaleString() || '-' },
  ];

  const paged = options.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="Options Contracts">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="options" columns={columns} records={options} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <Select
            placeholder="Underlying"
            data={[{ value: '', label: 'All' }, ...underlyingOptions.map((u) => ({ value: u, label: u }))]}
            value={underlying || ''}
            onChange={(v) => { setUnderlying(v || null); setPage(1); }}
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
          <RefreshButton onRefreshComplete={fetchOptions} />
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
          emptyMessage="No options data available"
          onRetry={fetchOptions}
        />
      </RallyMainCard>
    </>
  );
}
