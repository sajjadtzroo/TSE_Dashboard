import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/apiClient';
import RallyMainCard from '../RallyMainCard';
import RallyDataTable from '../RallyDataTable';
import PercentChangeCell from '../cells/PercentChangeCell';
import { formatNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

export default function PeerComparisonCard({ sectorName, currentSymbol }) {
  const navigate = useNavigate();
  const { data: peers = [], isLoading: loading } = useQuery({
    queryKey: ['market-overview', sectorName],
    queryFn: () => api.get('/market-overview', { params: { sector: sectorName } }).then(r => r.data),
    enabled: !!sectorName,
    staleTime: 2 * 60 * 1000,
  });

  const filteredPeers = (peers || [])
    .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
    .slice(0, 8);

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 80 },
    { accessor: 'name_fa', title: 'نام', width: 120 },
    { accessor: 'close', title: 'قیمت', width: 80, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر٪', width: 70, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'pe_ratio', title: 'P/E', width: 60, textAlign: 'end', render: (r) => r.pe_ratio ? formatNum(r.pe_ratio) : '-' },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume) },
  ];

  const handleRowClick = useCallback(({ record }) => {
    navigate(`/dashboard/stock/${encodeURIComponent(record.symbol)}`);
  }, [navigate]);

  return (
    <RallyMainCard title="مقایسه هم‌گروه" mb="md">
      {!sectorName ? (
        <Text size="sm" c="dimmed">اطلاعات صنعت موجود نیست</Text>
      ) : (
        <RallyDataTable
          records={filteredPeers.map((p, i) => ({ id: i, ...p }))}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          minHeight={200}
          rowStyle={(record) => record?.symbol === currentSymbol ? { backgroundColor: `${rallyColors.blue}15` } : undefined}
        />
      )}
    </RallyMainCard>
  );
}
