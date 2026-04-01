import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, ActionIcon, Collapse, Badge } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconSearch, IconChevronDown, IconX } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyDataTable from '../../../components/RallyDataTable';
import PercentChangeCell from '../../../components/cells/PercentChangeCell';
import CryptoIcon from '../../../components/CryptoIcon';
import { useCryptoMarket, useCryptoSignals } from '../../../hooks/useCryptoData';
import { toPersianNum, formatVol, formatMarketCap } from '../../../utils/formatUtils';
import animStyles from '../../../components/shared/animations.module.css';

function SignalBadge({ signal, rsi }) {
  if (!signal) return <Text size="xs" c="dimmed">—</Text>;
  const isOverbought = signal === 'overbought';
  const isOversold = signal === 'oversold';
  const color = isOverbought ? 'red' : isOversold ? 'green' : 'gray';
  const label = isOverbought ? 'اشباع خرید' : isOversold ? 'اشباع فروش' : 'خنثی';
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      {rsi != null && (
        <Text size="xs" c="dimmed" style={{ direction: 'ltr' }}>
          {toPersianNum(rsi.toFixed(0))}
        </Text>
      )}
      <Badge size="xs" color={color} variant="light" radius="sm">{label}</Badge>
    </Group>
  );
}

function PriceCell({ value, prefix = '$' }) {
  if (value == null) return <Text size="sm">—</Text>;
  const formatted = value >= 1
    ? toPersianNum(value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    : toPersianNum(value.toFixed(6));
  return (
    <Text size="sm" fw={500} style={{ direction: 'ltr', textAlign: 'right' }}>
      {prefix}{formatted}
    </Text>
  );
}

function TomanCell({ value }) {
  if (value == null) return <Text size="sm">—</Text>;
  const formatted = value >= 1_000_000
    ? `${toPersianNum((value / 1_000_000).toFixed(1))}M`
    : toPersianNum(value.toLocaleString('en-US', { maximumFractionDigits: 0 }));
  return (
    <Text size="sm" fw={500} style={{ direction: 'ltr', textAlign: 'right' }}>
      {formatted} ت
    </Text>
  );
}

export default function CryptoMarketSection() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useLocalStorage({ key: 'crypto-section-market', defaultValue: true });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'market_cap_usd', direction: 'desc' });
  const recordsPerPage = 25;

  const { data: market = [], isLoading } = useCryptoMarket();
  const { data: signals = [] } = useCryptoSignals();

  // Build signal lookup map  { symbol → { rsi, signal } }
  const signalMap = useMemo(() => {
    const map = {};
    signals.forEach(s => { map[s.symbol] = s; });
    return map;
  }, [signals]);

  // Merge market + signals, filter by search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return market
      .map((coin, idx) => ({ ...coin, _rank: idx + 1, ...signalMap[coin.symbol] }))
      .filter(coin =>
        !q ||
        coin.symbol?.toLowerCase().includes(q) ||
        coin.name_fa?.includes(q) ||
        coin.name_en?.toLowerCase().includes(q)
      );
  }, [market, signalMap, search]);

  // Sort
  const sorted = useMemo(() => {
    const { columnAccessor: col, direction } = sortStatus;
    return [...filtered].sort((a, b) => {
      const av = a[col] ?? (direction === 'asc' ? Infinity : -Infinity);
      const bv = b[col] ?? (direction === 'asc' ? Infinity : -Infinity);
      if (typeof av === 'number' && typeof bv === 'number') {
        return direction === 'asc' ? av - bv : bv - av;
      }
      return direction === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortStatus]);

  const records = sorted.slice((page - 1) * recordsPerPage, page * recordsPerPage);

  const columns = [
    {
      accessor: '_rank',
      title: '#',
      width: 44,
      sortable: true,
      render: r => <Text size="xs" c="dimmed">{toPersianNum(r._rank)}</Text>,
    },
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 110,
      sortable: true,
      render: r => (
        <Group gap={6} wrap="nowrap">
          <CryptoIcon symbol={r.symbol} size={22} />
          <Text size="sm" fw={700} c="blue">{r.symbol}</Text>
        </Group>
      ),
    },
    {
      accessor: 'name_fa',
      title: 'نام',
      width: 130,
      sortable: true,
      render: r => <Text size="sm">{r.name_fa ?? r.name_en ?? r.symbol}</Text>,
    },
    {
      accessor: 'last_price',
      title: 'قیمت (USD)',
      width: 130,
      textAlign: 'right',
      sortable: true,
      render: r => <PriceCell value={r.last_price} />,
    },
    {
      accessor: 'price_toman',
      title: 'قیمت (تومان)',
      width: 130,
      textAlign: 'right',
      sortable: true,
      render: r => <TomanCell value={r.price_toman} />,
    },
    {
      accessor: 'price_change_pct_24h',
      title: 'تغییر ۲۴h',
      width: 110,
      textAlign: 'right',
      sortable: true,
      render: r => <PercentChangeCell value={r.price_change_pct_24h} />,
    },
    {
      accessor: 'high_24h',
      title: 'بالاترین',
      width: 120,
      textAlign: 'right',
      sortable: true,
      render: r => <PriceCell value={r.high_24h} />,
    },
    {
      accessor: 'low_24h',
      title: 'پایین‌ترین',
      width: 120,
      textAlign: 'right',
      sortable: true,
      render: r => <PriceCell value={r.low_24h} />,
    },
    {
      accessor: 'volume_24h',
      title: 'حجم ۲۴h',
      width: 110,
      textAlign: 'right',
      sortable: true,
      render: r => (
        <Text size="sm" style={{ direction: 'ltr', textAlign: 'right' }}>
          {formatVol(r.volume_24h)}
        </Text>
      ),
    },
    {
      accessor: 'market_cap_usd',
      title: 'ارزش بازار',
      width: 120,
      textAlign: 'right',
      sortable: true,
      render: r => (
        <Text size="sm" style={{ direction: 'ltr', textAlign: 'right' }}>
          {formatMarketCap(r.market_cap_usd)}
        </Text>
      ),
    },
    {
      accessor: 'rsi_14',
      title: 'RSI / سیگنال',
      width: 140,
      textAlign: 'right',
      sortable: true,
      render: r => <SignalBadge signal={r.signal} rsi={r.rsi_14} />,
    },
  ];

  const handleSortChange = (s) => {
    setSortStatus(s);
    setPage(1);
  };

  const handleSearch = (v) => {
    setSearch(v);
    setPage(1);
  };

  const cardTitle = (
    <Group gap="xs" align="center">
      <Text fw={700} size="sm">جدول بازار رمزارزها</Text>
      {market.length > 0 && (
        <Badge size="sm" variant="light" color="blue" radius="sm">
          {toPersianNum(market.length)} رمزارز
        </Badge>
      )}
    </Group>
  );

  return (
    <Box className={animStyles.sectionEnter}>
      <RallyMainCard
        title={cardTitle}
        noPadding
        secondary={
          <ActionIcon
            variant="subtle"
            onClick={() => setExpanded(!expanded)}
            size="sm"
            aria-label={expanded ? 'بستن' : 'باز کردن'}
          >
            <IconChevronDown
              size={16}
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </ActionIcon>
        }
      >
        <Collapse in={expanded}>
          <Box px="md" pt="sm" pb="xs">
            <TextInput
              placeholder="جستجو: نماد یا نام..."
              value={search}
              onChange={e => handleSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={15} />}
              rightSection={search ? (
                <ActionIcon size="xs" variant="subtle" onClick={() => handleSearch('')}>
                  <IconX size={12} />
                </ActionIcon>
              ) : null}
              size="xs"
              maw={260}
              style={{ marginRight: 'auto' }}
            />
          </Box>
          <RallyDataTable
            records={records}
            columns={columns}
            loading={isLoading}
            idAccessor="symbol"
            page={page}
            onPageChange={setPage}
            recordsPerPage={recordsPerPage}
            totalRecords={filtered.length}
            sortStatus={sortStatus}
            onSortStatusChange={handleSortChange}
            minHeight={300}
            emptyMessage="رمزارزی یافت نشد"
            onRowClick={({ record }) => navigate(`/crypto/coin/${record.symbol}`)}
          />
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
