import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Collapse, ActionIcon, Group, Text } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyDataTable from '../../../components/RallyDataTable';
import PercentChangeCell from '../../../components/cells/PercentChangeCell';
import CryptoIcon from '../../../components/CryptoIcon';
import usePagination from '../../../hooks/usePagination';
import animStyles from '../../../components/shared/animations.module.css';

function formatVolume(v) {
  if (!v) return '-';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  return '$' + Number(v).toLocaleString();
}

function formatMarketCap(v) {
  if (!v) return '-';
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(0) + 'M';
  return '$' + Number(v).toLocaleString();
}

export default function CryptoTableSection({ market = [], onRetry }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(market);

  const columns = [
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 120,
      render: r => (
        <Group gap={8} wrap="nowrap">
          <CryptoIcon symbol={r.symbol} size={22} />
          <Text size="sm" fw={600}>{r.symbol}</Text>
        </Group>
      ),
    },
    { accessor: 'name_fa', title: 'نام', width: 120, render: r => r.name_fa || r.symbol },
    { accessor: 'last_price', title: 'قیمت (USDT)', width: 130, textAlign: 'end', render: r => r.last_price ? '$' + Number(r.last_price).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-' },
    { accessor: 'price_change_pct_24h', title: 'تغییر ۲۴h ٪', width: 110, textAlign: 'end', render: r => <PercentChangeCell value={r.price_change_pct_24h} /> },
    { accessor: 'volume_24h', title: 'حجم ۲۴h', width: 120, textAlign: 'end', render: r => formatVolume(r.volume_24h) },
    { accessor: 'market_cap_usd', title: 'ارزش بازار', width: 130, textAlign: 'end', render: r => formatMarketCap(r.market_cap_usd) },
    { accessor: 'price_toman', title: 'قیمت (تومان)', width: 130, textAlign: 'end', render: r => r.price_toman ? Number(r.price_toman).toLocaleString() + ' T' : '-' },
  ];

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay4}`}>
      <RallyMainCard
        title={`رمزارزها (${market.length})`}
        noPadding
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm">
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
      >
        <Collapse in={expanded}>
          <RallyDataTable
            records={paged}
            columns={columns}
            idAccessor="symbol"
            page={page}
            onPageChange={setPage}
            recordsPerPage={perPage}
            onRecordsPerPageChange={setPerPage}
            totalRecords={totalRecords}
            onRowClick={({ record }) => navigate(`/crypto/coin/${record.symbol}`)}
            emptyMessage="داده‌ای موجود نیست"
            onRetry={onRetry}
            minHeight={350}
          />
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
