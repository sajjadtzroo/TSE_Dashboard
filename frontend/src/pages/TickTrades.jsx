import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Badge, Group, TextInput, Title } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import rallyColors from '../theme/rallyColors';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import usePagination from '../hooks/usePagination';
import { formatNum } from '../utils/formatUtils';

export default function TickTrades() {
  const { symbol: urlSymbol } = useParams();
  const [symbol, setSymbol] = useState(urlSymbol || '');
  const [activeSymbol, setActiveSymbol] = useState(urlSymbol || '');
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(trades);

  useEffect(() => { if (urlSymbol) fetchData(urlSymbol); }, [urlSymbol]);

  const fetchData = async (sym) => {
    const target = sym || activeSymbol;
    if (!target) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/stocks/${target}/tick-trades`);
      setTrades(res.data);
      setActiveSymbol(target);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); setTrades([]); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') fetchData(symbol); };

  const columns = [
    { accessor: 'row_num', title: '#', width: 50, textAlign: 'end' },
    { accessor: 'time', title: 'زمان', width: 80 },
    { accessor: 'price', title: 'قیمت', width: 100, textAlign: 'end', render: (r) => formatNum(r.price) },
    { accessor: 'volume', title: 'حجم', width: 100, textAlign: 'end', render: (r) => formatNum(r.volume) },
    {
      accessor: 'canceled', title: 'لغو شده', width: 70,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.canceled ? 'rally-orange' : 'rally-green'}>
          {r.canceled ? 'بله' : 'خیر'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <RallyBreadcrumbs items={[
        { label: 'داشبورد', path: '/dashboard' },
        ...(activeSymbol ? [{ label: activeSymbol, path: `/dashboard/stock/${activeSymbol}` }] : []),
        { label: 'معاملات تیک' },
      ]} />
      <PageHeader title={`معاملات تیک${activeSymbol ? ' - ' + activeSymbol : ''}`}><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="tick-trades" columns={columns} records={trades} /></PageHeader>

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
          {trades.length > 0 && (
            <Badge color="rally-green" variant="light">{formatNum(trades.length)} معامله</Badge>
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
