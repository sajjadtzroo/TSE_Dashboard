import { useState, useMemo, useCallback } from 'react';
import { Alert, Badge, Group, Text, Anchor, Tabs, Select, SegmentedControl, Stack, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { toJalali } from '../utils/dateUtils';
import { formatNum } from '../utils/formatUtils';

const STATEMENT_TYPES = [
  { value: '', label: 'همه' },
  { value: 'income_statement', label: 'سود و زیان' },
  { value: 'balance_sheet', label: 'ترازنامه' },
  { value: 'cash_flow', label: 'جریان وجوه نقد' },
  { value: 'comprehensive_income', label: 'سود جامع' },
  { value: 'equity_changes', label: 'تغییرات حقوق مالکانه' },
];

function AnnouncementsTab() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [search, setSearch] = useState('');
  const [symbol, setSymbol] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  // Build query params for server-side pagination + filtering
  const params = useMemo(() => {
    const p = { page, per_page: perPage };
    if (debouncedSearch) p.search = debouncedSearch;
    if (symbol) p.symbol = symbol;
    return p;
  }, [page, perPage, debouncedSearch, symbol]);

  const { data, loading, error, lastUpdated, refresh } = useApiData(
    '/api/codal',
    { params, deps: [page, perPage, debouncedSearch, symbol], initialValue: { items: [], total: 0 } }
  );

  const items = data?.items || [];
  const total = data?.total || 0;

  // Fetch distinct symbols for dropdown
  const { data: symbolList } = useApiData('/api/codal/symbols', { initialValue: [] });
  const symbolOptions = useMemo(
    () => [
      { value: '', label: 'همه نمادها' },
      ...(symbolList || []).map((s) => ({ value: s, label: s })),
    ],
    [symbolList]
  );

  // Reset to page 1 when filters change
  const handleSearchChange = useCallback((e) => {
    setSearch(e.currentTarget.value);
    setPage(1);
  }, []);

  const handleSymbolChange = useCallback((val) => {
    setSymbol(val || '');
    setPage(1);
  }, []);

  const handlePerPageChange = useCallback((val) => {
    setPerPage(val);
    setPage(1);
  }, []);

  if (error && !items.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 80 },
    { accessor: 'company_name', title: 'شرکت', width: 150 },
    {
      accessor: 'title',
      title: 'عنوان',
      width: 300,
      render: (r) => (
        <Group gap="xs" wrap="nowrap">
          {r.link ? (
            <Anchor
              size="sm"
              href={r.link}
              target="_blank"
              rel="noopener noreferrer"
              truncate="end"
              style={{ flex: 1 }}
            >
              {r.title}
            </Anchor>
          ) : (
            <Text size="sm" truncate="end" style={{ flex: 1 }}>{r.title}</Text>
          )}
          {r.link_pdf && (
            <Badge
              size="xs"
              color="rally-orange"
              variant="light"
              component="a"
              href={r.link_pdf}
              target="_blank"
              rel="noopener noreferrer"
              style={{ cursor: 'pointer', flexShrink: 0 }}
            >
              PDF
            </Badge>
          )}
          {r.link_excel && (
            <Badge
              size="xs"
              color="blue"
              variant="light"
              component="a"
              href={r.link_excel}
              target="_blank"
              rel="noopener noreferrer"
              style={{ cursor: 'pointer', flexShrink: 0 }}
            >
              Excel
            </Badge>
          )}
        </Group>
      ),
    },
    { accessor: 'date_publish', title: 'تاریخ', width: 90, render: (r) => toJalali(r.date_publish) },
    { accessor: 'time_publish', title: 'زمان', width: 65 },
  ];

  return (
    <>
      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <TextInput
            placeholder="جستجو در عنوان، نماد، شرکت..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={handleSearchChange}
            style={{ maxWidth: 280 }}
            size="sm"
          />
          <Select
            placeholder="انتخاب نماد"
            data={symbolOptions}
            value={symbol}
            onChange={handleSymbolChange}
            searchable
            clearable
            style={{ maxWidth: 180 }}
            size="sm"
          />
          <RefreshButton onRefreshComplete={refresh} />
          <DataFreshness lastUpdated={lastUpdated} />
          <Badge color="rally-green" variant="light">{formatNum(total)} اطلاعیه</Badge>
          <ExportButton filename="codal-announcements" columns={columns} records={items} />
        </Group>
      </RallyMainCard>

      <RallyMainCard noPadding>
        <RallyDataTable
          records={items}
          columns={columns}
          loading={loading}
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={handlePerPageChange}
          totalRecords={total}
          emptyMessage="اطلاعیه‌ای موجود نیست"
          onRetry={refresh}
        />
      </RallyMainCard>
    </>
  );
}

function FinancialsTab() {
  const [symbol, setSymbol] = useState('');
  const [stmtType, setStmtType] = useState('income_statement');

  // Build query params
  const params = useMemo(() => {
    const p = { per_page: 100 };
    if (symbol) p.symbol = symbol;
    if (stmtType) p.statement_type = stmtType;
    return p;
  }, [symbol, stmtType]);

  const { data: statements, loading, error, lastUpdated, refresh } = useApiData(
    '/api/codal/financials',
    { params, deps: [symbol, stmtType] }
  );

  // Extract unique symbols for the selector
  const { data: allStatements } = useApiData('/api/codal/financials', {
    params: { per_page: 500 },
    deps: [],
  });

  const symbolOptions = useMemo(() => {
    if (!allStatements?.length) return [];
    const syms = [...new Set(allStatements.map((s) => s.symbol))].sort();
    return [{ value: '', label: 'همه نمادها' }, ...syms.map((s) => ({ value: s, label: s }))];
  }, [allStatements]);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(statements);

  // Column definitions based on statement type
  const columns = useMemo(() => {
    const base = [
      { accessor: 'symbol', title: 'نماد', width: 80 },
      { accessor: 'period_end_jalali', title: 'پایان دوره', width: 100 },
      {
        accessor: 'period_months',
        title: 'دوره',
        width: 55,
        render: (r) => r.period_months ? `${r.period_months}M` : '-',
      },
      {
        accessor: 'is_audited',
        title: 'حسابرسی',
        width: 70,
        render: (r) => r.is_audited
          ? <Badge size="xs" color="green" variant="light">بله</Badge>
          : <Badge size="xs" color="gray" variant="light">خیر</Badge>,
      },
    ];

    if (stmtType === 'balance_sheet') {
      return [
        ...base,
        { accessor: 'total_assets', title: 'جمع دارایی‌ها', width: 120, render: (r) => formatNum(r.total_assets) },
        { accessor: 'total_liabilities', title: 'جمع بدهی‌ها', width: 120, render: (r) => formatNum(r.total_liabilities) },
        { accessor: 'total_equity', title: 'حقوق مالکانه', width: 120, render: (r) => formatNum(r.total_equity) },
      ];
    }

    // Income statement / default
    return [
      ...base,
      { accessor: 'revenue', title: 'درآمد عملیاتی', width: 120, render: (r) => formatNum(r.revenue) },
      { accessor: 'gross_profit', title: 'سود ناخالص', width: 110, render: (r) => formatNum(r.gross_profit) },
      { accessor: 'operating_income', title: 'سود عملیاتی', width: 110, render: (r) => formatNum(r.operating_income) },
      { accessor: 'net_income', title: 'سود خالص', width: 110, render: (r) => formatNum(r.net_income) },
      { accessor: 'eps', title: 'EPS', width: 80, render: (r) => formatNum(r.eps) },
    ];
  }, [stmtType]);

  if (error && !statements?.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  return (
    <>
      <RallyMainCard mb="md" noPadding>
        <Stack p="md" gap="md">
          <Group gap="md">
            <Select
              placeholder="انتخاب نماد"
              data={symbolOptions}
              value={symbol}
              onChange={setSymbol}
              searchable
              clearable
              style={{ maxWidth: 200 }}
              size="sm"
            />
            <RefreshButton onRefreshComplete={refresh} />
            <Badge color="rally-green" variant="light">{statements?.length || 0} صورت مالی</Badge>
            <DataFreshness lastUpdated={lastUpdated} />
          </Group>

          <SegmentedControl
            value={stmtType}
            onChange={setStmtType}
            data={STATEMENT_TYPES.filter((t) => t.value)}
            size="xs"
          />
        </Stack>
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
          emptyMessage="صورت مالی موجود نیست"
          onRetry={refresh}
        />
      </RallyMainCard>
    </>
  );
}

export default function Codal() {
  const [activeTab, setActiveTab] = useState('announcements');

  return (
    <>
      <PageHeader title="گزارش‌های کدال" />

      <Tabs value={activeTab} onChange={setActiveTab} mb="md">
        <Tabs.List>
          <Tabs.Tab value="announcements">اطلاعیه‌ها</Tabs.Tab>
          <Tabs.Tab value="financials">صورت‌های مالی</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {activeTab === 'announcements' && <AnnouncementsTab />}
      {activeTab === 'financials' && <FinancialsTab />}
    </>
  );
}
