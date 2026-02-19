import { useMemo } from 'react';
import { Text } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyDataTable from '../../../components/RallyDataTable';
import { toPersianNum, formatPercent } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { usePortfolioContext } from '../PortfolioProvider';

export default function PerformanceAttributionTable() {
  const { holdings, enriched, perStockMetrics, stockHistories } = usePortfolioContext();

  const data = useMemo(() => {
    return holdings.map((h) => {
      const e = enriched.find((e) => e.symbol === h.symbol);
      const pm = perStockMetrics.find((p) => p.symbol === h.symbol);
      const m = pm?.metrics;
      const weight = (e?.weight ?? 0) / 100;
      const periodReturn = m?.annualizedReturn ?? null;
      const contribution = periodReturn != null ? weight * periodReturn : null;
      const alpha = m?.alpha ?? null;
      const betaVal = m?.beta ?? null;
      const benchReturn = m?.alignedBench
        ? m.alignedBench.reduce((s, v) => s + v, 0) / m.alignedBench.length * 252
        : null;
      const betaTimesMarket = betaVal != null && benchReturn != null
        ? betaVal * benchReturn
        : null;

      return {
        symbol: h.symbol,
        name_fa: e?.name_fa ?? '-',
        weight: (e?.weight ?? 0),
        periodReturn,
        contribution,
        alpha,
        betaTimesMarket,
      };
    });
  }, [holdings, enriched, perStockMetrics]);

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 80 },
    {
      accessor: 'name_fa',
      title: 'نام',
      width: 120,
      render: (r) => <Text size="sm" truncate>{r.name_fa}</Text>,
    },
    {
      accessor: 'weight',
      title: 'وزن٪',
      width: 70,
      textAlign: 'end',
      render: (r) => <Text size="sm">{toPersianNum(r.weight.toFixed(1))}٪</Text>,
    },
    {
      accessor: 'periodReturn',
      title: 'بازده دوره',
      width: 100,
      textAlign: 'end',
      render: (r) =>
        r.periodReturn != null ? (
          <Text
            size="sm"
            c={r.periodReturn >= 0 ? rallyColors.green : rallyColors.red}
          >
            {formatPercent(r.periodReturn * 100, 1)}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'contribution',
      title: 'مشارکت در بازده',
      width: 120,
      textAlign: 'end',
      render: (r) =>
        r.contribution != null ? (
          <Text
            size="sm"
            fw={600}
            c={r.contribution >= 0 ? rallyColors.green : rallyColors.red}
          >
            {formatPercent(r.contribution * 100, 2)}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'alpha',
      title: 'آلفا',
      width: 90,
      textAlign: 'end',
      render: (r) =>
        r.alpha != null ? (
          <Text size="sm" c={r.alpha >= 0 ? rallyColors.green : rallyColors.red}>
            {formatPercent(r.alpha * 100, 1)}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'betaTimesMarket',
      title: 'β × بازده بازار',
      width: 120,
      textAlign: 'end',
      render: (r) =>
        r.betaTimesMarket != null ? (
          <Text size="sm">{formatPercent(r.betaTimesMarket * 100, 1)}</Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
  ];

  return (
    <RallyMainCard title="تحلیل اسنادی عملکرد" noPadding>
      <RallyDataTable
        records={data}
        columns={columns}
        idAccessor="symbol"
        loading={stockHistories.some((q) => q.isLoading)}
        minHeight={200}
        emptyMessage="داده عملکرد موجود نیست"
      />
    </RallyMainCard>
  );
}
