import { Fragment } from 'react';
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
            <th className={`${classes.headerCell} ${classes.trendCell}`}>روند</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const prevRow = rows[idx - 1];
            const showDivider = idx > 0 && !row.isHot && prevRow?.isHot;
            return (
              <Fragment key={row.key}>
                {showDivider && (
                  <tr className={classes.sectionDivider}>
                    <td colSpan={periods.length + 2} />
                  </tr>
                )}
                <LineItemRow
                  label={row.label}
                  values={row.values}
                  isHot={row.isHot}
                />
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
