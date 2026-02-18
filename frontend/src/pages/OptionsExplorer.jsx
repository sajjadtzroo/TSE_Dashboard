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
import usePagination from '../hooks/usePagination';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RallyKPICard from '../components/RallyKPICard';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import rallyColors from '../theme/rallyColors';
import { formatNum } from '../utils/formatUtils';

export default function OptionsExplorer() {
  const [underlyings, setUnderlyings] = useState([]);
  const [selectedUnderlying, setSelectedUnderlying] = useState(null);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [chainData, setChainData] = useState(null);
  const [loadingUnderlyings, setLoadingUnderlyings] = useState(true);
  const [loadingChain, setLoadingChain] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const options = chainData?.options || [];
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(options);

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
    label: `${u.underlying}${u.name_fa ? ` - ${u.name_fa}` : ''} (${u.total_options} اختیار)`,
  }));

  const currentUnderlying = underlyings.find((u) => u.underlying === selectedUnderlying);
  const expirySelectData = (chainData?.expiry_dates || currentUnderlying?.expiry_dates || []).map(
    (d) => ({ value: d, label: d }),
  );

  const info = chainData?.underlying_info;
  const callCount = options.filter((o) => o.option_type === 'call').length;
  const putCount = options.filter((o) => o.option_type === 'put').length;
  const strikeCount = new Set(options.map((o) => o.strike_price).filter(Boolean)).size;
  const expiryCount = new Set(options.map((o) => o.expiry_date).filter(Boolean)).size;

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 100 },
    {
      accessor: 'option_type',
      title: 'نوع',
      width: 60,
      render: (r) => (
        <Badge
          size="sm"
          variant="light"
          color={r.option_type === 'call' ? 'rally-green' : 'rally-orange'}
        >
          {r.option_type === 'call' ? 'خرید' : 'فروش'}
        </Badge>
      ),
    },
    {
      accessor: 'strike_price',
      title: 'اعمال',
      width: 90,
      textAlign: 'end',
      render: (r) => formatNum(r.strike_price),
    },
    { accessor: 'expiry_date', title: 'سررسید', width: 100 },
    {
      accessor: 'close',
      title: 'پایانی',
      width: 80,
      textAlign: 'end',
      render: (r) => formatNum(r.close),
    },
    {
      accessor: 'last',
      title: 'آخرین',
      width: 80,
      textAlign: 'end',
      render: (r) => formatNum(r.last),
    },
    {
      accessor: 'close_change',
      title: 'تغییر',
      width: 80,
      textAlign: 'end',
      render: (r) => {
        const val = r.close_change;
        if (val == null) return '-';
        const color = val > 0 ? rallyColors.green : val < 0 ? rallyColors.orange : undefined;
        return (
          <span style={{ color, fontWeight: 600 }}>
            {val > 0 ? '+' : ''}
            {formatNum(val)}
          </span>
        );
      },
    },
    {
      accessor: 'volume',
      title: 'حجم',
      width: 90,
      textAlign: 'end',
      render: (r) => formatNum(r.volume),
    },
    {
      accessor: 'trades',
      title: 'معاملات',
      width: 65,
      textAlign: 'end',
      render: (r) => formatNum(r.trades),
    },
    {
      accessor: 'bid_price_1',
      title: 'خرید',
      width: 80,
      textAlign: 'end',
      render: (r) => formatNum(r.bid_price_1),
    },
    {
      accessor: 'ask_price_1',
      title: 'فروش',
      width: 80,
      textAlign: 'end',
      render: (r) => formatNum(r.ask_price_1),
    },
  ];

  if (error && !underlyings.length) {
    return (
      <Alert color="red" title="خطا">
        {error}
      </Alert>
    );
  }

  return (
    <>
      <PageHeader title="کاوشگر اختیار">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="options-chain" columns={columns} records={options} />
        <RefreshButton onRefreshComplete={handleRefresh} />
      </PageHeader>

      {/* Selector bar */}
      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md" wrap="wrap">
          <Select
            placeholder="دارایی پایه..."
            data={underlyingSelectData}
            value={selectedUnderlying}
            onChange={setSelectedUnderlying}
            searchable
            clearable
            style={{ flex: 1, minWidth: 200, maxWidth: 360 }}
            size="sm"
            nothingFoundMessage="دارایی یافت نشد"
          />
          <Select
            placeholder="همه تاریخ‌های سررسید"
            data={expirySelectData}
            value={selectedExpiry}
            onChange={setSelectedExpiry}
            clearable
            disabled={!selectedUnderlying}
            style={{ flex: 1, minWidth: 140, maxWidth: 240 }}
            size="sm"
          />
          {selectedUnderlying && (
            <>
              <Badge color="rally-green" variant="light">
                {formatNum(options.length)} اختیار
              </Badge>
              <Badge color="rally-green" variant="light">
                {formatNum(callCount)} خرید
              </Badge>
              <Badge color="rally-orange" variant="light">
                {formatNum(putCount)} فروش
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
                  تاریخ داده: {chainData.data_date}
                </Text>
              )}
            </Stack>
          </Card>

          <SimpleGrid cols={2}>
            <RallyKPICard
              title="کل اختیارها"
              value={formatNum(options.length)}
              icon={IconChartDonut}
              color={rallyColors.green}
              variant="accent-bar"
            />
            <RallyKPICard
              title="اختیارهای خرید"
              value={formatNum(callCount)}
              icon={IconArrowUp}
              color={rallyColors.green}
              variant="accent-bar"
            />
            <RallyKPICard
              title="اختیارهای فروش"
              value={formatNum(putCount)}
              icon={IconArrowDown}
              color={rallyColors.orange}
              variant="accent-bar"
            />
            <RallyKPICard
              title="قیمت‌های اعمال"
              value={formatNum(strikeCount)}
              icon={IconTargetArrow}
              color={rallyColors.blue}
              variant="accent-bar"
            />
          </SimpleGrid>
        </SimpleGrid>
      )}

      {/* Options Chain Table */}
      <RallyMainCard title={selectedUnderlying ? 'زنجیره اختیار' : 'دارایی پایه را انتخاب کنید'} noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          loading={loadingUnderlyings || loadingChain}
          pinLeftColumns
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
          emptyMessage={
            selectedUnderlying
              ? 'اختیاری برای این دارایی یافت نشد'
              : 'دارایی پایه را از بالا انتخاب کنید'
          }
          onRetry={handleRefresh}
        />
      </RallyMainCard>
    </>
  );
}
