import { useNavigate } from 'react-router-dom';
import { ActionIcon, Group, Text, Box } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import SparklineMini from '../../components/charts/SparklineMini';
import ExportButton from '../../components/ExportButton';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

export default function HoldingsTable({ enriched, loading, onEdit, onRemove }) {
  const navigate = useNavigate();

  const columns = [
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 100,
      render: (r) => {
        const dotColor =
          r.close_change_pct > 0 ? rallyColors.green
            : r.close_change_pct < 0 ? rallyColors.red
              : rallyColors.textDimmed;
        return (
          <Group gap={6} wrap="nowrap" align="center">
            <Box
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: dotColor,
                flexShrink: 0,
              }}
            />
            <Text
              size="sm"
              fw={600}
              c={rallyColors.blue}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(
                r.market_type === 'crypto'
                  ? `/crypto/coin/${r.symbol}`
                  : `/dashboard/stock/${r.symbol}`
              )}
            >
              {r.symbol}
            </Text>
          </Group>
        );
      },
    },
    {
      accessor: '_sparkline',
      title: '',
      width: 70,
      render: (r) => {
        if (!r._sparkline || r._sparkline.length < 2) return null;
        const color = r.pnl >= 0 ? rallyColors.green : rallyColors.red;
        return <SparklineMini data={r._sparkline} color={color} width={56} height={20} />;
      },
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
      width: 160,
      textAlign: 'end',
      render: (r) => {
        const color = r.pnl > 0 ? rallyColors.green : r.pnl < 0 ? rallyColors.red : rallyColors.textDimmed;
        const prefix = r.pnl > 0 ? '+' : '';
        const pctStr = `${r.pnlPct >= 0 ? '+' : ''}${toPersianNum(r.pnlPct.toFixed(1))}٪`;
        return (
          <Box
            style={{
              borderInlineStart: `2px solid ${color}`,
              paddingInlineStart: 8,
            }}
          >
            <Text size="sm" fw={600} c={color} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {prefix}{formatNum(Math.round(r.pnl))}
            </Text>
            <Text size="xs" c="dimmed">{pctStr}</Text>
          </Box>
        );
      },
    },
    {
      accessor: 'weight',
      title: 'وزن٪',
      width: 100,
      textAlign: 'end',
      render: (r) => {
        const pct = Math.min(r.weight, 100);
        return (
          <Group gap={6} wrap="nowrap" justify="flex-end" align="center">
            <Box
              style={{
                width: 50,
                height: 6,
                borderRadius: 3,
                backgroundColor: `${rallyColors.blue}14`,
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <Box
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${pct}%`,
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${rallyColors.blue}, ${rallyColors.purple})`,
                  transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </Box>
            <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'end' }}>
              {toPersianNum(r.weight.toFixed(1))}٪
            </Text>
          </Group>
        );
      },
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

  const exportColumns = [
    { accessor: 'symbol', title: 'نماد' },
    { accessor: 'name_fa', title: 'نام' },
    { accessor: 'quantity', title: 'تعداد' },
    { accessor: 'buyPrice', title: 'قیمت خرید' },
    { accessor: 'currentPrice', title: 'قیمت فعلی' },
    { accessor: 'close_change_pct', title: 'تغییر٪' },
    { accessor: 'value', title: 'ارزش فعلی' },
    { accessor: 'pnl', title: 'سود/زیان' },
    { accessor: 'pnlPct', title: 'سود/زیان٪' },
    { accessor: 'weight', title: 'وزن٪' },
  ];

  return (
    <RallyMainCard
      title="سبد دارایی‌ها"
      noPadding
      secondary={<ExportButton filename="portfolio-holdings" columns={exportColumns} records={enriched} />}
    >
      <RallyDataTable
        records={enriched}
        columns={columns}
        idAccessor="symbol"
        loading={loading}
        minHeight={300}
        emptyMessage="دارایی‌ای در پورتفولیو نیست"
        pinLeftColumns
        storeColumnsKey="portfolio-holdings"
      />
    </RallyMainCard>
  );
}
