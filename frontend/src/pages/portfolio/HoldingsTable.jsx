import { useNavigate } from 'react-router-dom';
import { ActionIcon, Group, Text } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

export default function HoldingsTable({ enriched, loading, onEdit, onRemove }) {
  const navigate = useNavigate();

  const columns = [
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 80,
      render: (r) => (
        <Text
          size="sm"
          fw={600}
          c={rallyColors.blue}
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/dashboard/stock/${r.symbol}`)}
        >
          {r.symbol}
        </Text>
      ),
    },
    {
      accessor: 'name_fa',
      title: 'نام',
      width: 150,
      render: (r) => <Text size="sm">{r.name_fa ?? '-'}</Text>,
    },
    {
      accessor: 'quantity',
      title: 'تعداد',
      width: 90,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(r.quantity)}</Text>,
    },
    {
      accessor: 'buyPrice',
      title: 'قیمت خرید',
      width: 110,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(r.buyPrice)}</Text>,
    },
    {
      accessor: 'currentPrice',
      title: 'قیمت فعلی',
      width: 110,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(r.currentPrice)}</Text>,
    },
    {
      accessor: 'close_change_pct',
      title: 'تغییر٪',
      width: 90,
      textAlign: 'end',
      render: (r) => <PercentChangeCell value={r.close_change_pct} />,
    },
    {
      accessor: 'value',
      title: 'ارزش فعلی',
      width: 130,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(Math.round(r.value))}</Text>,
    },
    {
      accessor: 'pnl',
      title: 'سود/زیان',
      width: 150,
      textAlign: 'end',
      render: (r) => {
        const color = r.pnl > 0 ? rallyColors.green : r.pnl < 0 ? rallyColors.red : undefined;
        const prefix = r.pnl > 0 ? '+' : '';
        const pctStr = `(${r.pnlPct >= 0 ? '+' : ''}${toPersianNum(r.pnlPct.toFixed(1))}٪)`;
        return (
          <Text size="sm" fw={600} c={color}>
            {prefix}{formatNum(Math.round(r.pnl))}{' '}
            <Text span size="xs" c="dimmed">{pctStr}</Text>
          </Text>
        );
      },
    },
    {
      accessor: 'weight',
      title: 'وزن٪',
      width: 80,
      textAlign: 'end',
      render: (r) => <Text size="sm">{toPersianNum(r.weight.toFixed(1))}٪</Text>,
    },
    {
      accessor: 'actions',
      title: '',
      width: 72,
      render: (r) => (
        <Group gap={4} wrap="nowrap">
          <ActionIcon
            variant="subtle"
            color="blue"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEdit(r); }}
          >
            <IconEdit size={14} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onRemove(r.symbol); }}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ),
    },
  ];

  return (
    <RallyMainCard title="سبد دارایی‌ها" noPadding>
      <RallyDataTable
        records={enriched}
        columns={columns}
        idAccessor="symbol"
        loading={loading}
        minHeight={300}
        emptyMessage="دارایی‌ای در پورتفولیو نیست"
      />
    </RallyMainCard>
  );
}
