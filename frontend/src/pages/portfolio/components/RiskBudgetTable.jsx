import { useMemo } from 'react';
import { Text } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyDataTable from '../../../components/RallyDataTable';
import { formatPercent, toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { usePortfolioContext } from '../PortfolioProvider';

export default function RiskBudgetTable() {
  const { holdings, enriched, perStockMetrics, stockHistories } = usePortfolioContext();

  const data = useMemo(() => {
    // Compute portfolio sigma (weighted-average for simplification)
    const items = perStockMetrics
      .map((p) => {
        const e = enriched.find((e) => e.symbol === p.symbol);
        return { ...p, weight: (e?.weight ?? 0) / 100 };
      })
      .filter((p) => p.metrics != null);

    const portfolioSigma = items.reduce(
      (sum, p) => sum + p.weight * (p.metrics.volatility ?? 0),
      0,
    );

    // Risk contribution = weight_i × beta_i × σ_portfolio
    const rawContrib = items.map((p) => ({
      symbol: p.symbol,
      contrib: p.weight * (p.metrics.beta ?? 1) * portfolioSigma,
    }));
    const totalContrib = rawContrib.reduce((s, r) => s + Math.abs(r.contrib), 0);

    return holdings.map((h) => {
      const e = enriched.find((e) => e.symbol === h.symbol);
      const pm = perStockMetrics.find((p) => p.symbol === h.symbol);
      const m = pm?.metrics;
      const rc = rawContrib.find((r) => r.symbol === h.symbol);

      return {
        symbol: h.symbol,
        name_fa: e?.name_fa ?? '-',
        weight: e?.weight ?? 0,
        beta: m?.beta ?? null,
        volatility: m?.volatility ?? null,
        sharpe: m?.sharpe ?? null,
        sortino: m?.sortino ?? null,
        var95: m?.var95 ?? null,
        cvar95: m?.cvar95 ?? null,
        riskContrib: rc && totalContrib > 0 ? (Math.abs(rc.contrib) / totalContrib) * 100 : null,
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
      accessor: 'beta',
      title: 'بتا',
      width: 70,
      textAlign: 'end',
      render: (r) =>
        r.beta != null ? (
          <Text size="sm" fw={600} c={r.beta > 1 ? rallyColors.red : rallyColors.green}>
            {toPersianNum(r.beta.toFixed(2))}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'volatility',
      title: 'نوسان‌پذیری',
      width: 90,
      textAlign: 'end',
      render: (r) =>
        r.volatility != null ? (
          <Text size="sm">{formatPercent(r.volatility * 100, 1)}</Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'sharpe',
      title: 'شارپ',
      width: 70,
      textAlign: 'end',
      render: (r) =>
        r.sharpe != null ? (
          <Text size="sm">{toPersianNum(r.sharpe.toFixed(2))}</Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'sortino',
      title: 'سورتینو',
      width: 80,
      textAlign: 'end',
      render: (r) =>
        r.sortino != null ? (
          <Text size="sm">{toPersianNum(r.sortino.toFixed(2))}</Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'var95',
      title: 'VaR ۹۵٪',
      width: 80,
      textAlign: 'end',
      render: (r) =>
        r.var95 != null ? (
          <Text size="sm" c={rallyColors.red}>{formatPercent(r.var95 * 100, 1)}</Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'cvar95',
      title: 'CVaR ۹۵٪',
      width: 80,
      textAlign: 'end',
      render: (r) =>
        r.cvar95 != null ? (
          <Text size="sm" c={rallyColors.red}>{formatPercent(r.cvar95 * 100, 1)}</Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'riskContrib',
      title: 'سهم ریسک٪',
      width: 90,
      textAlign: 'end',
      render: (r) =>
        r.riskContrib != null ? (
          <Text size="sm" fw={600}>{toPersianNum(r.riskContrib.toFixed(1))}٪</Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
  ];

  return (
    <RallyMainCard title="بودجه‌بندی ریسک" noPadding>
      <RallyDataTable
        records={data}
        columns={columns}
        idAccessor="symbol"
        loading={stockHistories.some((q) => q.isLoading)}
        minHeight={200}
        emptyMessage="داده ریسک موجود نیست"
      />
    </RallyMainCard>
  );
}
