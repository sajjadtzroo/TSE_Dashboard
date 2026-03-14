import {
  Badge,
  Group,
  SegmentedControl,
  SimpleGrid,
  Text,
  Stack,
} from '@mantine/core';
import {
  IconChartDonut,
  IconArrowUp,
  IconArrowDown,
  IconTargetArrow,
} from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyKPICard from '../../components/RallyKPICard';
import RefreshButton from '../../components/RefreshButton';
import PageHeader from '../../components/PageHeader';
import ExportButton from '../../components/ExportButton';
import OptionsChainTable from '../../components/options/OptionsChainTable';
import useDeribitOptionsChain from '../../hooks/useDeribitOptionsChain';
import rallyColors from '../../theme/rallyColors';
import { formatNum } from '../../utils/formatUtils';

export default function CryptoOptionsExplorer() {
  const {
    currency, setCurrency,
    selectedExpiry, setSelectedExpiry,
    options,
    allOptions,
    chainMap,
    expiries,
    callCount,
    putCount,
    strikeCount,
    underlyingPrice,
    loading,
    refetch,
  } = useDeribitOptionsChain();

  // Export columns
  const exportColumns = [
    { accessor: 'instrument_name', title: 'نماد' },
    { accessor: 'option_type', title: 'نوع' },
    { accessor: 'strike_price', title: 'اعمال' },
    { accessor: 'expiry_date', title: 'سررسید' },
    { accessor: 'mark_price', title: 'مارک' },
    { accessor: 'iv', title: 'IV%' },
    { accessor: 'delta', title: 'دلتا' },
    { accessor: 'open_interest', title: 'OI' },
    { accessor: 'volume', title: 'حجم' },
  ];

  // ATM call/put spread
  const atmSpread = (() => {
    if (!underlyingPrice || !chainMap.size) return null;
    const strikes = [...chainMap.keys()].sort((a, b) => Math.abs(a - underlyingPrice) - Math.abs(b - underlyingPrice));
    const atm = strikes[0];
    if (atm == null) return null;
    const entry = chainMap.get(atm);
    const callAsk = entry?.call?.ask_price;
    const putAsk = entry?.put?.ask_price;
    if (callAsk == null || putAsk == null) return null;
    return callAsk + putAsk;
  })();

  const callIVs = options.filter((o) => o.option_type === 'call' && o.iv != null).map((o) => o.iv);
  const putIVs = options.filter((o) => o.option_type === 'put' && o.iv != null).map((o) => o.iv);
  const avgCallIV = callIVs.length ? callIVs.reduce((a, b) => a + b, 0) / callIVs.length : null;
  const avgPutIV = putIVs.length ? putIVs.reduce((a, b) => a + b, 0) / putIVs.length : null;

  return (
    <>
      <PageHeader title={`کاوشگر اختیار ${currency} — Deribit`}>
        <ExportButton filename={`crypto-options-chain-${currency}`} columns={exportColumns} records={options} />
        <RefreshButton onRefreshComplete={refetch} />
      </PageHeader>

      {/* Selector bar */}
      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md" wrap="wrap">
          <SegmentedControl
            value={currency}
            onChange={(v) => { setCurrency(v); setSelectedExpiry(null); }}
            data={[{ value: 'BTC', label: 'BTC' }, { value: 'ETH', label: 'ETH' }]}
            size="sm"
          />
          {underlyingPrice > 0 && (
            <Badge color="rally-primary" variant="light" size="lg">
              {currency}: ${formatNum(underlyingPrice?.toFixed(2))}
            </Badge>
          )}
          {options.length > 0 && (
            <>
              <Badge color="rally-primary" variant="light">{options.length} اختیار</Badge>
              <Badge color="rally-primary" variant="light">{callCount} Call</Badge>
              <Badge color="rally-red" variant="light">{putCount} Put</Badge>
              <Badge color="rally-blue" variant="light">{strikeCount} اعمال</Badge>
            </>
          )}
        </Group>
        {expiries.length > 0 && (
          <Group gap="sm" px="md" pb="md" wrap="wrap" align="center">
            <Text size="xs" c="dimmed" fw={600}>سررسید:</Text>
            <SegmentedControl
              value={selectedExpiry || ''}
              onChange={(v) => setSelectedExpiry(v || null)}
              data={[{ value: '', label: 'همه' }, ...expiries.map((d) => ({ value: d, label: d }))]}
              size="xs"
              styles={{ root: { background: 'rgba(42,46,62,0.5)', overflowX: 'auto' } }}
            />
          </Group>
        )}
      </RallyMainCard>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
        <RallyKPICard
          title="IV میانگین Call"
          value={avgCallIV != null ? `${avgCallIV.toFixed(1)}%` : '-'}
          icon={IconArrowUp}
          color={rallyColors.green}
          variant="accent-bar"
        />
        <RallyKPICard
          title="IV میانگین Put"
          value={avgPutIV != null ? `${avgPutIV.toFixed(1)}%` : '-'}
          icon={IconArrowDown}
          color={rallyColors.red}
          variant="accent-bar"
        />
        <RallyKPICard
          title="اسپرد ATM"
          value={atmSpread != null ? atmSpread.toFixed(4) : '-'}
          icon={IconTargetArrow}
          color={rallyColors.yellow}
          variant="accent-bar"
        />
        <RallyKPICard
          title="تعداد اعمال"
          value={String(strikeCount)}
          icon={IconChartDonut}
          color={rallyColors.primary}
          variant="accent-bar"
        />
      </SimpleGrid>

      {/* Chain Table */}
      <RallyMainCard noPadding>
        <OptionsChainTable
          chainMap={chainMap}
          underlyingPrice={underlyingPrice}
          loading={loading}
        />
      </RallyMainCard>
    </>
  );
}
