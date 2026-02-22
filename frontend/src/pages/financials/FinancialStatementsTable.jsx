import { Skeleton, Text } from '@mantine/core';
import PeriodColumnHeader from './PeriodColumnHeader';
import LineItemRow from './LineItemRow';
import classes from './FinancialStatementsTable.module.css';

export default function FinancialStatementsTable({ periods, rows, isLoading }) {
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
        <Text size="lg" c="dimmed">صورت مالی موجود نیست</Text>
      </div>
    );
  }

  return (
    <div className={classes.tableWrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th className={classes.headerStickyCol}>شرح</th>
            {periods.map((p) => (
              <th key={p.id} className={classes.headerCell}>
                <PeriodColumnHeader period={p} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <LineItemRow
              key={row.key}
              label={row.label}
              values={row.values}
              isHot={row.isHot}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
