import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Badge, Group, TextInput, Title } from '@mantine/core';
import axios from 'axios';
import usePagination from '../hooks/usePagination';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import rallyColors from '../theme/rallyColors';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import { formatNum } from '../utils/formatUtils';

export default function Shareholders() {
  const { symbol: urlSymbol } = useParams();
  const [symbol, setSymbol] = useState(urlSymbol || '');
  const [activeSymbol, setActiveSymbol] = useState(urlSymbol || '');
  const [shareholders, setShareholders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(shareholders);

  useEffect(() => { if (urlSymbol) fetchData(urlSymbol); }, [urlSymbol]);

  const fetchData = async (sym) => {
    const target = sym || activeSymbol;
    if (!target) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/stocks/${target}/shareholders`);
      setShareholders(res.data);
      setActiveSymbol(target);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); setShareholders([]); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') fetchData(symbol); };

  const columns = [
    { accessor: 'name', title: 'نام', width: 200 },
    { accessor: 'volume', title: 'حجم', width: 100, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'percent', title: 'درصد', width: 80, textAlign: 'end', render: (r) => r.percent != null ? `${r.percent.toFixed(2)}%` : '-' },
    {
      accessor: 'change', title: 'تغییر', width: 100, textAlign: 'end',
      render: (r) => {
        const val = r.change;
        if (val == null) return '-';
        const color = val > 0 ? rallyColors.green : val < 0 ? rallyColors.orange : undefined;
        return <span style={{ color, fontWeight: 600 }}>{val > 0 ? '+' : ''}{formatNum(val)}</span>;
      },
    },
  ];

  return (
    <>
      <RallyBreadcrumbs items={[
        { label: 'داشبورد', path: '/dashboard' },
        ...(activeSymbol ? [{ label: activeSymbol, path: `/dashboard/stock/${activeSymbol}` }] : []),
        { label: 'سهامداران' },
      ]} />
      <PageHeader title={`سهامداران${activeSymbol ? ' - ' + activeSymbol : ''}`}><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="shareholders" columns={columns} records={shareholders} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <TextInput
            value={symbol}
            onChange={(e) => setSymbol(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="نماد را وارد کنید و Enter بزنید"
            size="sm"
            w={220}
          />
          <RefreshButton onRefreshComplete={() => fetchData()} />
          {shareholders.length > 0 && (
            <Badge color="rally-green" variant="light">{formatNum(shareholders.length)} سهامدار</Badge>
          )}
        </Group>
      </RallyMainCard>

      {error && <Alert color="red" mb="md">{error}</Alert>}

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
        />
      </RallyMainCard>
    </>
  );
}
