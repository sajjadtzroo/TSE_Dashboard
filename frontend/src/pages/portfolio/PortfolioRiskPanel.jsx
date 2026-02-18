import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { Text, Group } from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import { useMarketIndexHistory } from '../../hooks/useMarketData';
import { TEDPIX_NAMES } from '../../constants/market';
import { computeAllMetrics } from '../../utils/riskMetrics/index.js';
import { formatPercent, toPersianNum, formatTrillion } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

const api = axios.create({ baseURL: '/api' });

export default function PortfolioRiskPanel({ holdings, enriched }) {
  const DAYS = 365;

  const stockHistories = useQueries({
    queries: holdings.map((h) => ({
      queryKey: ['stock-history', h.symbol, DAYS],
      queryFn: () =>
        api
          .get(`/stocks/${encodeURIComponent(h.symbol)}/history`, { params: { days: DAYS } })
          .then((r) => r.data),
      enabled: holdings.length > 0 && !!h.symbol,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const { data: benchHistory = [] } = useMarketIndexHistory(TEDPIX_NAMES[0], { days: DAYS });

  const riskData = useMemo(() => {
    return holdings.map((h, i) => {
      const history = stockHistories[i]?.data;
      const enrichedH = enriched.find((e) => e.symbol === h.symbol);
      const positionValue = enrichedH?.value ?? 0;

      if (!history || history.length < 10) {
        return {
          symbol: h.symbol,
          name_fa: enrichedH?.name_fa ?? '-',
          weight: enrichedH?.weight ?? 0,
          beta: null,
          volatility: null,
          var95: null,
        };
      }

      const metrics = computeAllMetrics({
        stockHistory: history,
        benchHistory: benchHistory.length > 0 ? benchHistory : null,
      });

      const dailyVarRial = metrics.var95 != null ? metrics.var95 * positionValue : null;

      return {
        symbol: h.symbol,
        name_fa: enrichedH?.name_fa ?? '-',
        weight: enrichedH?.weight ?? 0,
        beta: metrics.beta,
        volatility: metrics.volatility,
        var95: dailyVarRial,
      };
    });
  }, [holdings, stockHistories, benchHistory, enriched]);

  // Weighted portfolio volatility
  const portfolioVol = useMemo(() => {
    const items = riskData.filter((r) => r.volatility != null && r.weight > 0);
    if (!items.length) return null;
    return items.reduce((sum, r) => sum + (r.weight / 100) * r.volatility, 0);
  }, [riskData]);

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 80 },
    { accessor: 'name_fa', title: 'نام', width: 150, render: (r) => <Text size="sm">{r.name_fa}</Text> },
    {
      accessor: 'beta',
      title: 'بتا',
      width: 80,
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
      title: 'نوسان‌پذیری سالانه',
      width: 140,
      textAlign: 'end',
      render: (r) =>
        r.volatility != null ? (
          <Text size="sm" c={r.volatility > 0.5 ? rallyColors.red : rallyColors.textSecondary}>
            {formatPercent(r.volatility * 100, 1)}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'var95',
      title: 'VaR روزانه ۹۵٪',
      width: 140,
      textAlign: 'end',
      render: (r) =>
        r.var95 != null ? (
          <Text size="sm" c={rallyColors.red}>{formatTrillion(r.var95)}</Text>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        ),
    },
    {
      accessor: 'weight',
      title: 'وزن٪',
      width: 80,
      textAlign: 'end',
      render: (r) => <Text size="sm">{toPersianNum(r.weight.toFixed(1))}٪</Text>,
    },
  ];

  const secondary = portfolioVol != null ? (
    <Group gap={4}>
      <Text size="sm" c="dimmed">نوسان‌پذیری پرتفو:</Text>
      <Text size="sm" fw={600} c={portfolioVol > 0.5 ? rallyColors.red : rallyColors.green}>
        {formatPercent(portfolioVol * 100, 1)}
      </Text>
    </Group>
  ) : null;

  return (
    <RallyMainCard title="تحلیل ریسک" secondary={secondary} noPadding>
      <RallyDataTable
        records={riskData}
        columns={columns}
        idAccessor="symbol"
        loading={stockHistories.some((q) => q.isLoading)}
        minHeight={200}
        emptyMessage="داده ریسک موجود نیست"
      />
    </RallyMainCard>
  );
}
