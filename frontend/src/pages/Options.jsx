import { useEffect, useState } from 'react';
import { Alert, Badge, Group, Select, Text } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import ColumnToggle from '../components/ColumnToggle';
import { toJalali } from '../utils/dateUtils';
import rallyColors from '../theme/rallyColors';

function ExpiryCell({ value }) {
  if (!value) return <Text size="sm">-</Text>;
  const expiry = new Date(value);
  const now = new Date();
  const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  let color;
  let bgColor;
  if (daysUntil < 7) {
    color = rallyColors.red;
    bgColor = 'rgba(239, 68, 68, 0.12)';
  } else if (daysUntil < 30) {
    color = rallyColors.yellow;
    bgColor = 'rgba(245, 158, 11, 0.10)';
  } else {
    color = rallyColors.green;
    bgColor = 'rgba(16, 185, 129, 0.08)';
  }

  return (
    <Text
      size="sm"
      fw={500}
      c={color}
      style={{
        backgroundColor: bgColor,
        borderRadius: 4,
        padding: '2px 6px',
        display: 'inline-block',
      }}
    >
      {toJalali(value)}
      <Text span size="xs" c="dimmed" ml={4}>
        ({daysUntil}d)
      </Text>
    </Text>
  );
}

export default function Options() {
  const [options, setOptions] = useState([]);
  const [underlying, setUnderlying] = useState(null);
  const [optionType, setOptionType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);

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

  const allColumns = [
    { accessor: 'symbol', title: 'Symbol', width: 90 },
    {
      accessor: 'option_type', title: 'Type', width: 60,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.option_type === 'call' ? 'rally-green' : 'rally-red'}>
          {r.option_type === 'call' ? 'Call' : 'Put'}
        </Badge>
      ),
    },
    { accessor: 'underlying', title: 'Underlying', width: 80 },
    { accessor: 'strike_price', title: 'Strike', width: 80, textAlign: 'end', render: (r) => r.strike_price?.toLocaleString() },
    { accessor: 'expiry_date', title: 'Expiry', width: 120, render: (r) => <ExpiryCell value={r.expiry_date} /> },
    { accessor: 'close', title: 'Close', width: 80, textAlign: 'end', render: (r) => r.close?.toLocaleString() },
    { accessor: 'last', title: 'Last', width: 80, textAlign: 'end', render: (r) => r.last?.toLocaleString() },
    {
      accessor: 'close_change', title: 'Change', width: 80, textAlign: 'end',
      render: (r) => {
        const val = r.close_change;
        if (val == null) return '-';
        const color = val > 0 ? rallyColors.green : val < 0 ? rallyColors.red : undefined;
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

  const columns = visibleColumns || allColumns;
  const paged = options.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="Options Contracts">
        <DataFreshness lastUpdated={lastUpdated} />
        <ColumnToggle columns={allColumns} storageKey="options" onChange={setVisibleColumns} />
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
          <Badge color="rally-red" variant="light">{putCount} puts</Badge>
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
