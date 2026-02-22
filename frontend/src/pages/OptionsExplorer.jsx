import { Alert, Badge, Group, Select, SegmentedControl, SimpleGrid, Text, Card, Stack } from '@mantine/core';
import {
  IconChartDonut,
  IconArrowUp,
  IconArrowDown,
  IconTargetArrow,
} from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import OptionsChainTable from '../components/options/OptionsChainTable';
import RiskFreeRateSlider, { useRiskFreeRate } from '../components/options/RiskFreeRateSlider';
import useOptionsChainData from '../hooks/useOptionsChainData';
import { useEnrichedChainMap } from '../hooks/useOptionsAnalytics';
import rallyColors from '../theme/rallyColors';
import { formatNum } from '../utils/formatUtils';

export default function OptionsExplorer() {
  const {
    underlyings,
    selectedUnderlying,
    setSelectedUnderlying,
    selectedExpiry,
    setSelectedExpiry,
    chainData,
    chainMap,
    options,
    info,
    expiryDates,
    callCount,
    putCount,
    strikeCount,
    loading,
    loadingUnderlyings,
    loadingChain,
    refresh,
  } = useOptionsChainData();

  const [riskFreeRate, setRiskFreeRate] = useRiskFreeRate();
  const underlyingPrice = info?.close || 0;

  // Enrich chain map with Greeks/IV
  const enrichedChainMap = useEnrichedChainMap(chainMap, underlyingPrice, riskFreeRate);

  const underlyingSelectData = underlyings.map((u) => ({
    value: u.underlying,
    label: `${u.underlying}${u.name_fa ? ` - ${u.name_fa}` : ''} (${u.total_options} اختیار)`,
  }));

  const expirySegments = expiryDates.map((d) => ({ value: d, label: d }));

  // Flat columns for CSV export (keeping export working)
  const exportColumns = [
    { accessor: 'symbol', title: 'نماد' },
    { accessor: 'option_type', title: 'نوع' },
    { accessor: 'strike_price', title: 'اعمال' },
    { accessor: 'expiry_date', title: 'سررسید' },
    { accessor: 'close', title: 'پایانی' },
    { accessor: 'last', title: 'آخرین' },
    { accessor: 'volume', title: 'حجم' },
    { accessor: 'bid_price_1', title: 'خرید' },
    { accessor: 'ask_price_1', title: 'فروش' },
  ];

  if (!loadingUnderlyings && underlyings.length === 0) {
    return <Alert color="red" title="خطا">اطلاعات دارایی‌های پایه در دسترس نیست</Alert>;
  }

  return (
    <>
      <PageHeader title="کاوشگر اختیار">
        <DataFreshness lastUpdated={chainData?.data_date ? new Date() : null} />
        <ExportButton filename="options-chain" columns={exportColumns} records={options} />
        <RefreshButton onRefreshComplete={refresh} />
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
          <RiskFreeRateSlider value={riskFreeRate} onChange={setRiskFreeRate} />
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
              {underlyingPrice > 0 && (
                <Badge color="rally-blue" variant="light">
                  قیمت پایه: {formatNum(underlyingPrice)}
                </Badge>
              )}
            </>
          )}
        </Group>
      </RallyMainCard>

      {/* Expiry date tabs */}
      {selectedUnderlying && expirySegments.length > 0 && (
        <RallyMainCard mb="md" noPadding>
          <Group p="sm" gap="sm" wrap="wrap">
            <Text size="xs" c="dimmed" fw={600}>سررسید:</Text>
            <SegmentedControl
              value={selectedExpiry || ''}
              onChange={(v) => setSelectedExpiry(v || null)}
              data={[{ value: '', label: 'همه' }, ...expirySegments]}
              size="xs"
              styles={{
                root: { background: 'rgba(148, 163, 184, 0.06)' },
              }}
            />
          </Group>
        </RallyMainCard>
      )}

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
              {underlyingPrice > 0 && (
                <Text size="lg" fw={700} c={rallyColors.green}>
                  {formatNum(underlyingPrice)} ریال
                </Text>
              )}
              {chainData?.data_date && (
                <Text size="xs" c="dimmed">
                  تاریخ داده: {chainData.data_date}
                </Text>
              )}
            </Stack>
          </Card>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
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

      {/* Options Chain T-Layout Table */}
      <RallyMainCard title={selectedUnderlying ? 'زنجیره اختیار' : 'دارایی پایه را انتخاب کنید'} noPadding>
        <OptionsChainTable
          chainMap={enrichedChainMap}
          underlyingPrice={underlyingPrice}
          loading={loadingChain}
        />
      </RallyMainCard>
    </>
  );
}
