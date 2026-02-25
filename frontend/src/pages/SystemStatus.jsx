import { useState } from 'react';
import {
  Alert, Badge, Button, Group, SimpleGrid, Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconServer, IconClock, IconList, IconPlayerPlay,
} from '@tabler/icons-react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';

const SPIDERS = [
  'market_watch', 'instrument_details', 'historical_prices', 'history_backfill',
  'options', 'ime_options', 'ime_futures',
  'market_indices', 'etf_nav', 'ime_certificates', 'ime_funds',
  'ime_forwards', 'market_prices', 'ime_physical',
  'shareholders', 'codal', 'tick_trades',
];

export default function SystemStatus() {
  const {
    data: status = null,
    isLoading: loading,
    error,
    dataUpdatedAt: lastUpdated,
    refetch: fetchData,
  } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: () => axios.get('/api/scheduler/status').then(r => r.data),
    staleTime: 30 * 1000,
  });
  const [runningSpiders, setRunningSpiders] = useState({});

  const handleRunSpider = async (spider) => {
    setRunningSpiders((prev) => ({ ...prev, [spider]: true }));
    try {
      await axios.post(`/api/scraper/run/${spider}`);
      notifications.show({
        message: `Spider "${spider}" started in background`,
        color: 'green',
        autoClose: 4000,
      });
    } catch (err) {
      notifications.show({
        message: err.response?.data?.detail || `Failed to start ${spider}`,
        color: 'red',
        autoClose: 4000,
      });
    } finally {
      setRunningSpiders((prev) => ({ ...prev, [spider]: false }));
    }
  };

  const handleRunAll = async () => {
    try {
      await axios.post('/api/scraper/update-all');
      notifications.show({
        message: 'All scrapers started in parallel',
        color: 'green',
        autoClose: 4000,
      });
    } catch (err) {
      notifications.show({
        message: err.response?.data?.detail || 'Failed to start scrapers',
        color: 'red',
        autoClose: 4000,
      });
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="وضعیت سیستم" />
        <SimpleGrid cols={{ base: 1, sm: 3 }} mb="md">
          {[1, 2, 3].map((i) => <RallyKPISkeleton key={i} />)}
        </SimpleGrid>
        <RallyTableSkeleton rows={6} columns={4} />
      </>
    );
  }

  if (error && !status) {
    return <Alert color="red" title="خطا در بارگذاری وضعیت">{error?.message ?? String(error)}</Alert>;
  }

  const jobs = status?.jobs || [];

  const columns = [
    { accessor: 'id', title: 'شناسه', width: 200 },
    { accessor: 'name', title: 'نام', width: 200 },
    { accessor: 'trigger', title: 'زمان‌بند', width: 200 },
    {
      accessor: 'next_run',
      title: 'اجرای بعدی',
      width: 200,
      render: (r) => r.next_run
        ? r.next_run
        : <Badge size="sm" variant="light" color="gray">متوقف</Badge>,
    },
  ];

  return (
    <>
      <PageHeader title="وضعیت سیستم">
        <DataFreshness lastUpdated={lastUpdated} />
        <RefreshButton onRefreshComplete={fetchData} />
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="md">
        <RallyKPICard
          title="زمان‌بند"
          value={status?.running ? 'فعال' : 'متوقف'}
          icon={IconServer}
          color={status?.running ? rallyColors.primary : rallyColors.orange}
          bgColor={status?.running ? '#1E3A8A' : '#BF4030'}
        />
        <RallyKPICard
          title="منطقه زمانی"
          value={status?.timezone || 'N/A'}
          icon={IconClock}
          color={rallyColors.purple}
          bgColor="#7B2FBF"
        />
        <RallyKPICard
          title="کل وظایف"
          value={String(status?.job_count || 0)}
          icon={IconList}
          color={rallyColors.blue}
          bgColor="#3a7ca5"
        />
      </SimpleGrid>

      <RallyMainCard title="کنترل اسپایدرها" mb="md">
        <Group gap="xs" wrap="wrap" mb="md">
          <Button
            variant="filled"
            size="xs"
            leftSection={<IconPlayerPlay size={14} />}
            onClick={handleRunAll}
          >
            اجرای همه
          </Button>
        </Group>
        <Group gap="xs" wrap="wrap">
          {SPIDERS.map((spider) => (
            <Button
              key={spider}
              variant="light"
              size="xs"
              loading={runningSpiders[spider]}
              onClick={() => handleRunSpider(spider)}
            >
              {spider}
            </Button>
          ))}
        </Group>
      </RallyMainCard>

      <RallyMainCard title={`وظایف زمان‌بندی شده (${jobs.length})`} noPadding>
        <RallyDataTable
          records={jobs}
          columns={columns}
          idAccessor="id"
          totalRecords={jobs.length}
          emptyMessage="وظیفه‌ای موجود نیست"
          onRetry={fetchData}
        />
      </RallyMainCard>
    </>
  );
}
