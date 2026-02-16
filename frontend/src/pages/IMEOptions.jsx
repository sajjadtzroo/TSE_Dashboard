import { useState } from 'react';
import { Alert, Badge, Group, Select } from '@mantine/core';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { toJalali } from '../utils/dateUtils';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import { formatNum } from '../utils/formatUtils';

export default function IMEOptions() {
  const [commodity, setCommodity] = useState(null);
  const [optionType, setOptionType] = useState(null);

  const params = new URLSearchParams();
  if (commodity) params.set('commodity', commodity);
  if (optionType) params.set('option_type', optionType);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const { data: options, loading, error, lastUpdated, refresh } = useApiData(`/api/ime/options${qs}`, { deps: [commodity, optionType] });

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(options);

  const commodityOptions = [...new Set(options.map((o) => o.commodity).filter(Boolean))].sort();
  const callCount = options.filter((o) => o.option_type === 'call').length;
  const putCount = options.filter((o) => o.option_type === 'put').length;

  if (error && !options.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'contract_code', title: 'کد', width: 110 },
    {
      accessor: 'option_type', title: 'نوع', width: 60,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.option_type === 'call' ? 'rally-green' : 'rally-orange'}>
          {r.option_type === 'call' ? 'خرید' : 'فروش'}
        </Badge>
      ),
    },
    { accessor: 'commodity', title: 'کالا', width: 80 },
    { accessor: 'price_strike', title: 'قیمت اعمال', width: 90, textAlign: 'end', render: (r) => formatNum(r.price_strike) },
    { accessor: 'date_end', title: 'سررسید', width: 90, render: (r) => toJalali(r.date_end) },
    { accessor: 'day_remain', title: 'روز مانده', width: 70, textAlign: 'end' },
    { accessor: 'last', title: 'آخرین', width: 85, textAlign: 'end', render: (r) => formatNum(r.last) },
    { accessor: 'last_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'interest_open', title: 'موقعیت باز', width: 95, textAlign: 'end', render: (r) => formatNum(r.interest_open) },
    { accessor: 'settlement_price', title: 'تسویه', width: 90, textAlign: 'end', render: (r) => formatNum(r.settlement_price) },
    { accessor: 'bid_price_1', title: 'خرید', width: 80, textAlign: 'end', render: (r) => formatNum(r.bid_price_1) },
    { accessor: 'ask_price_1', title: 'فروش', width: 80, textAlign: 'end', render: (r) => formatNum(r.ask_price_1) },
  ];

  return (
    <>
      <PageHeader title="اختیار بورس کالا">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="ime_options" columns={columns} records={options} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <Select
            placeholder="کالا"
            data={[{ value: '', label: 'همه' }, ...commodityOptions.map((c) => ({ value: c, label: c }))]}
            value={commodity || ''}
            onChange={(v) => { setCommodity(v || null); setPage(1); }}
            clearable
            w={160}
            size="sm"
          />
          <Select
            placeholder="نوع اختیار"
            data={[{ value: '', label: 'همه' }, { value: 'call', label: 'خرید' }, { value: 'put', label: 'فروش' }]}
            value={optionType || ''}
            onChange={(v) => { setOptionType(v || null); setPage(1); }}
            clearable
            w={130}
            size="sm"
          />
          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-green" variant="light">{formatNum(options.length)} اختیار</Badge>
          <Badge color="rally-green" variant="light">{formatNum(callCount)} خرید</Badge>
          <Badge color="rally-orange" variant="light">{formatNum(putCount)} فروش</Badge>
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
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
        />
      </RallyMainCard>
    </>
  );
}
