import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group, Text } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyDataTable from '../../../components/RallyDataTable';
import PercentChangeCell from '../../../components/cells/PercentChangeCell';
import CryptoIcon from '../../../components/CryptoIcon';
import { CRYPTO_CATEGORIES } from '../../../constants/crypto';
import rallyColors from '../../../theme/rallyColors';
import { formatBig, toPersianNum } from '../../../utils/formatUtils';

export default function CryptoPeerComparisonCard({ currentSymbol, market, loading }) {
  const navigate = useNavigate();

  const peers = useMemo(() => {
    if (!market?.length || !currentSymbol) return [];

    // Find the category for the current symbol
    const sym = currentSymbol.toUpperCase();
    let category = null;
    for (const [cat, symbols] of Object.entries(CRYPTO_CATEGORIES)) {
      if (symbols.includes(sym)) { category = cat; break; }
    }
    if (!category) return [];

    // Filter market coins to same category
    const categorySymbols = new Set(CRYPTO_CATEGORIES[category]);
    return market
      .filter((c) => categorySymbols.has(c.symbol?.toUpperCase()))
      .sort((a, b) => (b.market_cap_usd || 0) - (a.market_cap_usd || 0))
      .slice(0, 8)
      .map((c, i) => ({ id: i, ...c }));
  }, [market, currentSymbol]);

  const columns = [
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 100,
      render: (r) => (
        <Group gap={6} wrap="nowrap">
          <CryptoIcon symbol={r.symbol} size={20} />
          <Text size="sm" fw={600}>{r.symbol}</Text>
        </Group>
      ),
    },
    { accessor: 'name_fa', title: 'نام', width: 100 },
    {
      accessor: 'last_price',
      title: 'قیمت',
      width: 90,
      textAlign: 'end',
      render: (r) => r.last_price ? '$' + toPersianNum(Number(r.last_price).toLocaleString(undefined, { maximumFractionDigits: 2 })) : '-',
    },
    {
      accessor: 'price_change_pct_24h',
      title: 'تغییر٪',
      width: 70,
      textAlign: 'end',
      render: (r) => <PercentChangeCell value={r.price_change_pct_24h} />,
    },
    {
      accessor: 'market_cap_usd',
      title: 'ارزش بازار',
      width: 100,
      textAlign: 'end',
      render: (r) => formatBig(r.market_cap_usd),
    },
    {
      accessor: 'volume_24h',
      title: 'حجم ۲۴h',
      width: 90,
      textAlign: 'end',
      render: (r) => formatBig(r.volume_24h),
    },
  ];

  const handleRowClick = useCallback(({ record }) => {
    navigate(`/crypto/coin/${record.symbol}`);
  }, [navigate]);

  return (
    <RallyMainCard title="مقایسه هم‌گروه" mb="md">
      {peers.length === 0 && !loading ? (
        <Text size="sm" c="dimmed">اطلاعات دسته‌بندی موجود نیست</Text>
      ) : (
        <RallyDataTable
          records={peers}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          minHeight={200}
          rowStyle={(record) =>
            record?.symbol?.toUpperCase() === currentSymbol?.toUpperCase()
              ? { backgroundColor: `${rallyColors.blue}15` }
              : undefined
          }
        />
      )}
    </RallyMainCard>
  );
}
