import { useEffect, useState } from 'react';
import { Alert, Badge, Group, Select, SimpleGrid, Text, Card, Stack } from '@mantine/core';
import {
  IconChartDonut,
  IconArrowUp,
  IconArrowDown,
  IconCalendar,
  IconTargetArrow,
} from '@tabler/icons-react';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RallyKPICard from '../components/RallyKPICard';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import rallyColors from '../theme/rallyColors';

export default function OptionsExplorer() {
  const [underlyings, setUnderlyings] = useState([]);
  const [selectedUnderlying, setSelectedUnderlying] = useState(null);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [chainData, setChainData] = useState(null);
  const [loadingUnderlyings, setLoadingUnderlyings] = useState(true);
  const [loadingChain, setLoadingChain] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const fetchUnderlyings = async () => {
    try {
      setLoadingUnderlyings(true);
      const res = await axios.get('/api/options/underlyings');
      setUnderlyings(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingUnderlyings(false);
    }
  };

  const fetchChain = async (underlying, expiry) => {
    if (!underlying) return;
    try {
      setLoadingChain(true);
      const params = new URLSearchParams({ underlying });
      if (expiry) params.set('expiry_date', expiry);
      const res = await axios.get(`/api/options/chain?${params.toString()}`);
      setChainData(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingChain(false);
    }
  };

  useEffect(() => {
    fetchUnderlyings();
  }, []);

  useEffect(() => {
    if (selectedUnderlying) {
      setSelectedExpiry(null);
      setPage(1);
      fetchChain(selectedUnderlying, null);
    } else {
      setChainData(null);
    }
  }, [selectedUnderlying]);

  useEffect(() => {
    if (selectedUnderlying) {
      setPage(1);
      fetchChain(selectedUnderlying, selectedExpiry);
    }
  }, [selectedExpiry]);

  const handleRefresh = async () => {
    await fetchUnderlyings();
    if (selectedUnderlying) {
      await fetchChain(selectedUnderlying, selectedExpiry);
    }
  };

  const underlyingSelectData = underlyings.map((u) => ({
    value: u.underlying,
    label: `${u.underlying}${u.name_fa ? ` - ${u.name_fa}` : ''} (${u.total_options} options)`,
  }));

  const currentUnderlying = underlyings.find((u) => u.underlying === selectedUnderlying);
  const expirySelectData = (chainData?.expiry_dates || currentUnderlying?.expiry_dates || []).map(
    (d) => ({ value: d, label: d }),
  );

  const options = chainData?.options || [];
  const info = chainData?.underlying_info;
  const callCount = options.filter((o) => o.option_type === 'call').length;
  const putCount = options.filter((o) => o.option_type === 'put').length;
  const strikeCount = new Set(options.map((o) => o.strike_price).filter(Boolean)).size;
  const expiryCount = new Set(options.map((o) => o.expiry_date).filter(Boolean)).size;

  const columns = [
    { accessor: 'symbol', title: 'Symbol', width: 100 },
    {
      accessor: 'option_type',
      title: 'Type',
      width: 60,
      render: (r) => (
        <Badge
          size="sm"
          variant="light"
          color={r.option_type === 'call' ? 'rally-green' : 'rally-orange'}
        >
          {r.option_type === 'call' ? 'Call' : 'Put'}
        </Badge>
      ),
    },
    {
      accessor: 'strike_price',
      title: 'Strike',
      width: 90,
      textAlign: 'end',
      render: (r) => r.strike_price?.toLocaleString(),
    },
    { accessor: 'expiry_date', title: 'Expiry', width: 100 },
    {
      accessor: 'close',
      title: 'Close',
      width: 80,
      textAlign: 'end',
      render: (r) => r.close?.toLocaleString(),
    },
    {
      accessor: 'last',
      title: 'Last',
      width: 80,
      textAlign: 'end',
      render: (r) => r.last?.toLocaleString(),
    },
    {
      accessor: 'close_change',
      title: 'Change',
      width: 80,
      textAlign: 'end',
      render: (r) => {
        const val = r.close_change;
        if (val == null) return '-';
        const color = val > 0 ? rallyColors.green : val < 0 ? rallyColors.orange : undefined;
        return (
          <span style={{ color, fontWeight: 600 }}>
            {val > 0 ? '+' : ''}
            {val?.toLocaleString()}
          </span>
        );
      },
    },
    {
      accessor: 'volume',
      title: 'Volume',
      width: 90,
      textAlign: 'end',
      render: (r) => r.volume?.toLocaleString(),
    },
    {
      accessor: 'trades',
      title: 'Trades',
      width: 65,
      textAlign: 'end',
      render: (r) => r.trades?.toLocaleString(),
    },
    {
      accessor: 'bid_price_1',
      title: 'Bid',
      width: 80,
      textAlign: 'end',
      render: (r) => r.bid_price_1?.toLocaleString() || '-',
    },
    {
      accessor: 'ask_price_1',
      title: 'Ask',
      width: 80,
      textAlign: 'end',
      render: (r) => r.ask_price_1?.toLocaleString() || '-',
    },
  ];

  const paged = options.slice((page - 1) * perPage, page * perPage);

  if (error && !underlyings.length) {
    return (
      <Alert color="red" title="Error">
        {error}
      </Alert>
    );
  }

  return (
    <>
      <PageHeader title="Options Explorer">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="options-chain" columns={columns} records={options} />
        <RefreshButton onRefreshComplete={handleRefresh} />
      </PageHeader>

      {/* Selector bar */}
      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md" wrap="wrap">
          <Select
            placeholder="Select underlying..."
            data={underlyingSelectData}
            value={selectedUnderlying}
            onChange={setSelectedUnderlying}
            searchable
            clearable
            w={340}
            size="sm"
            nothingFoundMessage="No matching underlying"
          />
          <Select
            placeholder="All expiry dates"
            data={expirySelectData}
            value={selectedExpiry}
            onChange={setSelectedExpiry}
            clearable
            disabled={!selectedUnderlying}
            w={180}
            size="sm"
          />
          {selectedUnderlying && (
            <>
              <Badge color="rally-green" variant="light">
                {options.length} options
              </Badge>
              <Badge color="rally-green" variant="light">
                {callCount} calls
              </Badge>
              <Badge color="rally-orange" variant="light">
                {putCount} puts
              </Badge>
            </>
          )}
        </Group>
      </RallyMainCard>

      {/* Info + KPI section */}
      {selectedUnderlying && info && (
        <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
          <Card withBorder radius="md" p="lg">
            <Stack gap="xs">
              <Text size="xl" fw={700}>
                {info.underlying}
              </Text>
              {info.name_fa && (
                <Text size="md" c="dimmed">
                  {info.name_fa}
                </Text>
              )}
              <Group gap="xs">
                {info.type && (
                  <Badge variant="light" color="blue">
                    {info.type}
                  </Badge>
                )}
                {info.sector_name_fa && (
                  <Badge variant="light" color="gray">
                    {info.sector_name_fa}
                  </Badge>
                )}
              </Group>
              {chainData?.data_date && (
                <Text size="xs" c="dimmed">
                  Data date: {chainData.data_date}
                </Text>
              )}
            </Stack>
          </Card>

          <SimpleGrid cols={2}>
            <RallyKPICard
              title="Total Options"
              value={options.length}
              icon={IconChartDonut}
              color={rallyColors.green}
              variant="accent-bar"
            />
            <RallyKPICard
              title="Call Options"
              value={callCount}
              icon={IconArrowUp}
              color={rallyColors.green}
              variant="accent-bar"
            />
            <RallyKPICard
              title="Put Options"
              value={putCount}
              icon={IconArrowDown}
              color={rallyColors.orange}
              variant="accent-bar"
            />
            <RallyKPICard
              title="Strike Prices"
              value={strikeCount}
              icon={IconTargetArrow}
              color={rallyColors.blue}
              variant="accent-bar"
            />
          </SimpleGrid>
        </SimpleGrid>
      )}

      {/* Options Chain Table */}
      <RallyMainCard title={selectedUnderlying ? 'Options Chain' : 'Select an Underlying'} noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          loading={loadingUnderlyings || loadingChain}
          pinLeftColumns
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={(p) => {
            setPerPage(p);
            setPage(1);
          }}
          totalRecords={options.length}
          emptyMessage={
            selectedUnderlying
              ? 'No options found for this underlying'
              : 'Pick an underlying asset from the dropdown above'
          }
          onRetry={handleRefresh}
        />
      </RallyMainCard>
    </>
  );
}
