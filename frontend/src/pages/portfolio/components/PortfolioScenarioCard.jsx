import { useMemo } from 'react';
import { Text } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyDataTable from '../../../components/RallyDataTable';
import { scenarioAnalysis } from '../../../utils/riskMetrics/scenario.js';
import { toPersianNum, formatPercent, formatTrillion } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';

export default function PortfolioScenarioCard({ totalValue, portBeta, portVol, portAlpha }) {
  const scenarios = useMemo(() => {
    if (totalValue == null || portBeta == null || portVol == null) return [];
    return scenarioAnalysis(totalValue, portBeta, portVol, portAlpha ?? 0);
  }, [totalValue, portBeta, portVol, portAlpha]);

  const columns = [
    {
      accessor: 'name',
      title: 'سناریو',
      width: 140,
      render: (r) => <Text size="sm" fw={600}>{r.name}</Text>,
    },
    {
      accessor: 'marketMove',
      title: 'تغییر بازار',
      width: 100,
      textAlign: 'end',
      render: (r) => (
        <Text
          size="sm"
          c={r.marketMove >= 0 ? rallyColors.green : rallyColors.red}
        >
          {formatPercent(r.marketMove * 100, 1)}
        </Text>
      ),
    },
    {
      accessor: 'stockMove',
      title: 'تغییر پرتفو',
      width: 100,
      textAlign: 'end',
      render: (r) => (
        <Text
          size="sm"
          fw={600}
          c={r.stockMove >= 0 ? rallyColors.green : rallyColors.red}
        >
          {formatPercent(r.stockMove * 100, 1)}
        </Text>
      ),
    },
    {
      accessor: 'targetPrice',
      title: 'ارزش پرتفو',
      width: 120,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatTrillion(r.targetPrice)}</Text>,
    },
    {
      accessor: 'pnl',
      title: 'سود/زیان',
      width: 120,
      textAlign: 'end',
      render: (r) => {
        const pnl = r.targetPrice - totalValue;
        return (
          <Text size="sm" fw={600} c={pnl >= 0 ? rallyColors.green : rallyColors.red}>
            {pnl >= 0 ? '+' : ''}{formatTrillion(pnl)}
          </Text>
        );
      },
    },
  ];

  return (
    <RallyMainCard title="تحلیل سناریو" noPadding>
      <RallyDataTable
        records={scenarios}
        columns={columns}
        idAccessor="name"
        minHeight={150}
        emptyMessage="داده کافی موجود نیست"
      />
    </RallyMainCard>
  );
}
