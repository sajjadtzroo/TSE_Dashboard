import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyDataTable from '../../../components/RallyDataTable';
import PercentChangeCell from '../../../components/cells/PercentChangeCell';
import { COMMODITY_SYMBOLS, getCommodityCategory } from '../../../constants/commodity';
import { toPersianNum } from '../../../utils/formatUtils';

export default function CommodityTableSection({ prices = [] }) {
  const navigate = useNavigate();

  const rows = useMemo(() =>
    prices.map(p => ({
      ...p,
      name_fa: COMMODITY_SYMBOLS[p.symbol]?.name_fa ?? p.symbol,
      category_fa: getCommodityCategory(p.symbol),
      unit: COMMODITY_SYMBOLS[p.symbol]?.unit ?? '',
    })),
    [prices],
  );

  const columns = [
    {
      accessor: 'name_fa',
      title: 'کالا',
      sortable: true,
      render: (r) => r.name_fa,
    },
    {
      accessor: 'category_fa',
      title: 'دسته',
      sortable: true,
      render: (r) => <Badge variant="light" color="orange" size="xs">{r.category_fa}</Badge>,
    },
    {
      accessor: 'price',
      title: 'قیمت',
      sortable: true,
      render: (r) => `$${toPersianNum(Number(r.price) >= 1000 ? Number(r.price).toLocaleString(undefined, { maximumFractionDigits: 0 }) : Number(r.price).toFixed(2))}`,
    },
    {
      accessor: 'change_pct',
      title: 'تغییر',
      sortable: true,
      render: (r) => <PercentChangeCell value={r.change_pct} />,
    },
    {
      accessor: 'high',
      title: 'بالاترین',
      sortable: true,
      render: (r) => r.high ? `$${toPersianNum(Number(r.high).toFixed(2))}` : '—',
    },
    {
      accessor: 'low',
      title: 'پایین‌ترین',
      sortable: true,
      render: (r) => r.low ? `$${toPersianNum(Number(r.low).toFixed(2))}` : '—',
    },
  ];

  return (
    <RallyMainCard title="جدول کالاها" noPadding>
      <RallyDataTable
        records={rows}
        columns={columns}
        onRowClick={({ record }) => navigate(`/commodity/${record.symbol}`)}
        defaultSortField="symbol"
        searchable
        searchPlaceholder="جستجوی کالا..."
        searchFields={['name_fa', 'symbol']}
      />
    </RallyMainCard>
  );
}
