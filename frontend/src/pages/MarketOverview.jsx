import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Group, Select } from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import ColumnToggle from '../components/ColumnToggle';
import { toJalali } from '../utils/dateUtils';
import useWatchlist from '../hooks/useWatchlist';
import rallyColors from '../theme/rallyColors';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum } from '../utils/formatUtils';

export default function MarketOverview() {
  const [selectedSector, setSelectedSector] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);
  const navigate = useNavigate();
  const { toggleSymbol, isWatched } = useWatchlist();

  const { data: rawSectors } = useApiData('/api/sectors');
  const sectors = useMemo(() => rawSectors.filter((s) => !isFundSector(s)), [rawSectors]);

  const sectorParam = selectedSector ? `?sector=${encodeURIComponent(selectedSector)}` : '';
  const { data: rawMarket, loading, error, lastUpdated, refresh } = useApiData(`/api/market-overview${sectorParam}`, { deps: [selectedSector] });
  const marketData = useMemo(() => rawMarket.filter((item) => !isFundSector(item.sector_name_fa)), [rawMarket]);

  if (error && !marketData.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const allColumns = [
    {
      accessor: '_star', title: '', width: 36,
      render: (r) => {
        const watched = isWatched(r.symbol);
        const Icon = watched ? IconStarFilled : IconStar;
        return <Icon size={16} color={watched ? rallyColors.yellow : rallyColors.textDimmed} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); toggleSymbol(r.symbol); }} />;
      },
    },
    { accessor: 'symbol', title: 'نماد', width: 80 },
    { accessor: 'name_fa', title: 'نام', width: 150 },
    { accessor: 'sector_name_fa', title: 'صنعت', width: 120 },
    { accessor: 'date', title: 'تاریخ', width: 90, render: (r) => toJalali(r.date) },
    { accessor: 'close', title: 'قیمت پایانی', width: 100, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'low', title: 'کمترین', width: 80, textAlign: 'end', render: (r) => formatNum(r.low) },
    { accessor: 'high', title: 'بیشترین', width: 80, textAlign: 'end', render: (r) => formatNum(r.high) },
    { accessor: 'volume', title: 'حجم', width: 110, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'تعداد معاملات', width: 75, textAlign: 'end', render: (r) => formatNum(r.trades) },
    { accessor: 'pe_ratio', title: 'P/E', width: 65, textAlign: 'end', render: (r) => r.pe_ratio?.toFixed(2) || '-' },
    { accessor: 'eps', title: 'EPS', width: 80, textAlign: 'end', render: (r) => formatNum(r.eps) },
    { accessor: 'market_cap', title: 'ارزش بازار', width: 100, textAlign: 'end', render: (r) => r.market_cap ? (r.market_cap / 1e9).toFixed(2) + 'B' : '-' },
  ];

  const columns = visibleColumns || allColumns;
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(marketData);

  return (
    <>
      <PageHeader title="نمای بازار">
        <DataFreshness lastUpdated={lastUpdated} />
        <ColumnToggle columns={allColumns} storageKey="market-overview" onChange={setVisibleColumns} />
        <ExportButton filename="market-overview" columns={columns} records={marketData} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <Select
            placeholder="فیلتر صنعت"
            data={[{ value: '', label: 'همه صنایع' }, ...sectors.map((s) => ({ value: s, label: s }))]}
            value={selectedSector || ''}
            onChange={(v) => { setSelectedSector(v || null); setPage(1); }}
            clearable
            searchable
            w={220}
            size="sm"
          />
          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-green" variant="light">{formatNum(marketData.length)} نماد</Badge>
        </Group>
      </RallyMainCard>

      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          idAccessor="ins_code"
          loading={loading}
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
          onRowClick={({ record }) => navigate(`/stock/${record.symbol}`)}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={refresh}
          pinLeftColumns
        />
      </RallyMainCard>
    </>
  );
}
