import { Skeleton, Text } from '@mantine/core';
import MonthColumnHeader from './MonthColumnHeader';
import CoinMetricRow from './CoinMetricRow';
import classes from '../../financials/FinancialStatementsTable.module.css';

export default function CoinFundamentalsTable({ periods, rows, isLoading }) {
  if (isLoading) {
    return (
      <div style={{ padding: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={28} mb={8} radius="sm" />
        ))}
      </div>
    );
  }

  if (!periods.length || !rows.length) {
    return (
      <div className={classes.emptyState}>
        <Text size="lg" c="dimmed">داده‌ای موجود نیست</Text>
      </div>
    );
  }

  return (
    <div className={classes.tableWrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th className={classes.headerStickyCol}>شاخص</th>
            {periods.map((p) => (
              <th key={p.id} className={classes.headerCell}>
                <MonthColumnHeader period={p} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <CoinMetricRow
              key={row.key}
              label={row.label}
              values={row.values}
              format={row.format}
              isHot={row.isHot}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
