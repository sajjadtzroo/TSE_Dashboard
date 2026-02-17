import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Group, Select, Title } from '@mantine/core';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import { isFundSector } from '../utils/sectorUtils';
import { toJalali } from '../utils/dateUtils';
import { formatNum } from '../utils/formatUtils';

export default function Funds() {
  const [selectedSector, setSelectedSector] = useState(null);
  const navigate = useNavigate();

  const { data: allSectors } = useApiData('/api/sectors');
  const sectors = useMemo(() => allSectors.filter((s) => isFundSector(s)), [allSectors]);

  const sectorParam = selectedSector ? `?sector=${encodeURIComponent(selectedSector)}` : '';
  const { data: rawFunds, loading, error, lastUpdated, refresh } = useApiData(`/api/market-overview${sectorParam}`, { deps: [selectedSector] });
  const fundsData = useMemo(() => rawFunds.filter((item) => isFundSector(item.sector_name_fa)), [rawFunds]);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(fundsData);

  if (error && !fundsData.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 80 },
    { accessor: 'name_fa', title: 'نام', width: 180 },
    { accessor: 'sector_name_fa', title: 'نوع', width: 140 },
    { accessor: 'date', title: 'تاریخ', width: 90, render: (r) => toJalali(r.date) },
    { accessor: 'close', title: 'NAV / قیمت', width: 100, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'حجم', width: 110, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'معاملات', width: 75, textAlign: 'end', render: (r) => formatNum(r.trades) },
    { accessor: 'eps', title: 'EPS', width: 80, textAlign: 'end', render: (r) => formatNum(r.eps) },
  ];

  return (
    <>
      <PageHeader title="صندوق‌های سرمایه‌گذاری"><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="funds" columns={columns} records={fundsData} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <Select
            placeholder="نوع صندوق"
            data={[{ value: '', label: 'همه انواع' }, ...sectors.map((s) => ({ value: s, label: s }))]}
            value={selectedSector || ''}
            onChange={(v) => { setSelectedSector(v || null); setPage(1); }}
            clearable
            searchable
            w={250}
            size="sm"
          />
          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-purple" variant="light">{formatNum(fundsData.length)} صندوق</Badge>
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
          onRowClick={({ record }) => navigate(`/dashboard/stock/${record.symbol}`)}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={refresh}
        />
      </RallyMainCard>
    </>
  );
}
