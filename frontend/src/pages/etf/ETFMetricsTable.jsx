import { useState, useMemo } from 'react';
import { Group, Text, Badge, Progress, Button, Checkbox, Box } from '@mantine/core';
import { IconCalculator } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import { toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

function fmtRatio(v) {
  if (v == null || isNaN(v)) return '-';
  return toPersianNum(v.toFixed(2));
}
function fmtPct(v) {
  if (v == null || isNaN(v)) return '-';
  return `${toPersianNum((v * 100).toFixed(1))}٪`;
}
function fmtPctDirect(v) {
  if (v == null || isNaN(v)) return '-';
  return `${toPersianNum(v.toFixed(1))}٪`;
}

const METRIC_COLS = [
  { accessor: 'annualizedReturn', title: 'بازده سالانه', fmt: fmtPct, sortable: true },
  { accessor: 'volatility',       title: 'نوسان',         fmt: fmtPct, sortable: true },
  { accessor: 'sharpe',           title: 'شارپ',          fmt: fmtRatio, sortable: true },
  { accessor: 'sortino',          title: 'سورتینو',       fmt: fmtRatio, sortable: true },
  { accessor: 'beta',             title: 'بتا',           fmt: fmtRatio, sortable: true },
  { accessor: 'alpha',            title: 'آلفا (جنسن)',   fmt: fmtPct, sortable: true },
  { accessor: 'treynor',          title: 'ترینور',        fmt: fmtRatio, sortable: true },
  { accessor: 'mSquared',         title: 'M²',            fmt: fmtPct, sortable: true },
  { accessor: 'informationRatio', title: 'IR',            fmt: fmtRatio, sortable: true },
  { accessor: 'maxDrawdown',      title: 'حداکثر افت',   fmt: fmtPct, sortable: true },
  { accessor: 'calmar',           title: 'کالمار',        fmt: fmtRatio, sortable: true },
  { accessor: 'omega',            title: 'امگا',          fmt: fmtRatio, sortable: true },
  { accessor: 'var95',            title: 'VaR ۹۵٪',      fmt: fmtPct, sortable: true },
  { accessor: 'cvar95',           title: 'CVaR ۹۵٪',     fmt: fmtPct, sortable: true },
  { accessor: 'skewness',         title: 'چولگی',         fmt: fmtRatio, sortable: true },
  { accessor: 'kurtosis',         title: 'کشیدگی',        fmt: fmtRatio, sortable: true },
];

export default function ETFMetricsTable({
  etfs,
  metricsMap = {},
  loadedCount,
  totalCount,
  isLoading,
  onLoadMetrics,
  selectedSymbols,
  onSelectionChange,
  metricsEnabled,
}) {
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'bubble_pct', direction: 'desc' });

  const rows = useMemo(() => {
    return (etfs || []).map((etf) => {
      const m = metricsMap[etf.symbol] || {};
      return {
        symbol: etf.symbol,
        name_fa: etf.name_fa,
        fund_type: etf.fund_type,
        bubble_pct: etf.bubble_pct,
        annualizedReturn: m.annualizedReturn ?? null,
        volatility:       m.volatility ?? null,
        sharpe:           m.sharpe ?? null,
        sortino:          m.sortino ?? null,
        beta:             m.beta ?? null,
        alpha:            m.alpha ?? null,
        treynor:          m.treynor ?? null,
        mSquared:         m.mSquared ?? null,
        informationRatio: m.informationRatio ?? null,
        maxDrawdown:      m.maxDrawdown ?? null,
        calmar:           m.calmar ?? null,
        omega:            m.omega ?? null,
        var95:            m.var95 ?? null,
        cvar95:           m.cvar95 ?? null,
        skewness:         m.skewness ?? null,
        kurtosis:         m.kurtosis ?? null,
      };
    });
  }, [etfs, metricsMap]);

  const sorted = useMemo(() => {
    const { columnAccessor: col, direction } = sortStatus;
    return [...rows].sort((a, b) => {
      const va = a[col] ?? (direction === 'desc' ? -Infinity : Infinity);
      const vb = b[col] ?? (direction === 'desc' ? -Infinity : Infinity);
      return direction === 'desc' ? vb - va : va - vb;
    });
  }, [rows, sortStatus]);

  const toggleSelect = (symbol) => {
    if (selectedSymbols.includes(symbol)) {
      onSelectionChange(selectedSymbols.filter((s) => s !== symbol));
    } else if (selectedSymbols.length < 5) {
      onSelectionChange([...selectedSymbols, symbol]);
    }
  };

  const columns = [
    {
      accessor: '_select',
      title: '',
      width: 40,
      render: (r) => (
        <Checkbox
          size="xs"
          checked={selectedSymbols.includes(r.symbol)}
          onChange={() => toggleSelect(r.symbol)}
          disabled={!selectedSymbols.includes(r.symbol) && selectedSymbols.length >= 5}
        />
      ),
    },
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 90,
      sortable: true,
      render: (r) => <Text size="sm" fw={600} c={rallyColors.blue}>{r.symbol}</Text>,
    },
    {
      accessor: 'name_fa',
      title: 'نام',
      width: 150,
      render: (r) => <Text size="sm">{r.name_fa ?? '-'}</Text>,
    },
    {
      accessor: 'fund_type',
      title: 'نوع',
      width: 90,
      render: (r) => r.fund_type ? <Badge size="xs" variant="light">{r.fund_type}</Badge> : null,
    },
    {
      accessor: 'bubble_pct',
      title: 'حباب٪',
      width: 80,
      sortable: true,
      textAlign: 'end',
      render: (r) => {
        const v = r.bubble_pct;
        const color = v > 0 ? rallyColors.green : v < 0 ? rallyColors.red : rallyColors.textDimmed;
        return <Text size="sm" c={color}>{fmtPctDirect(v)}</Text>;
      },
    },
    ...METRIC_COLS.map((col) => ({
      accessor: col.accessor,
      title: col.title,
      width: 100,
      sortable: col.sortable,
      textAlign: 'end',
      render: (r) => (
        <Text size="sm" c={r[col.accessor] == null ? 'dimmed' : undefined}>
          {col.fmt(r[col.accessor])}
        </Text>
      ),
    })),
  ];

  const loadProgress = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0;

  return (
    <RallyMainCard
      title="متریک‌های صندوق‌های ETF"
      noPadding
      secondary={
        <Group gap="xs">
          {selectedSymbols.length >= 2 && (
            <Badge color="blue" variant="filled" size="sm">
              {selectedSymbols.length} انتخاب شده
            </Badge>
          )}
          {!metricsEnabled && (
            <Button
              size="xs"
              leftSection={<IconCalculator size={14} />}
              onClick={onLoadMetrics}
              loading={isLoading}
              color="blue"
            >
              محاسبه متریک‌ها
            </Button>
          )}
        </Group>
      }
    >
      {metricsEnabled && isLoading && (
        <Box
          px="md"
          py={8}
          style={{ borderBottom: `1px solid ${rallyColors.border}` }}
        >
          <Group justify="space-between" mb={5}>
            <Text size="xs" c="dimmed">در حال محاسبه متریک‌ها...</Text>
            {loadedCount > 0 && (
              <Text size="xs" c="dimmed">{loadedCount} از {totalCount} صندوق</Text>
            )}
          </Group>
          <Progress value={loadProgress} size="sm" animated color="blue" radius="xl" />
        </Box>
      )}
      <RallyDataTable
        records={sorted}
        columns={columns}
        idAccessor="symbol"
        loading={false}
        minHeight={300}
        emptyMessage="داده‌ای یافت نشد"
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        storeColumnsKey="etf-metrics-table"
      />
    </RallyMainCard>
  );
}
