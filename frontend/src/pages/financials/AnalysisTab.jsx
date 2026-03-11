import { Fragment, useState } from 'react';
import { Badge, Group, SegmentedControl, Text } from '@mantine/core';
import { toPersianNum } from '../../utils/formatUtils';
import classes from './AnalysisTab.module.css';

/**
 * Horizontal / Vertical (Common-Size) Analysis — CFA L1 Chapter 22
 *
 * Horizontal: each value shown as % change from the base period (oldest).
 *             Also shows period-over-period (YoY) change.
 * Vertical:   each value shown as % of common-size base
 *             (revenue for IS, total_assets for BS).
 */
export default function AnalysisTab({ analysisData, periods, stmtType }) {
  const [mode, setMode] = useState('horizontal');

  if (!analysisData || !periods.length) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <Text size="lg" c="dimmed">داده‌ای برای تحلیل موجود نیست</Text>
      </div>
    );
  }

  const { horizontal, vertical } = analysisData;

  const isVerticalUnavailable =
    mode === 'vertical' &&
    (!vertical || (stmtType !== 'income_statement' && stmtType !== 'balance_sheet'));

  return (
    <div>
      <Group justify="space-between" align="center" px="md" pt="md" pb="sm">
        <SegmentedControl
          value={mode}
          onChange={setMode}
          size="xs"
          data={[
            { value: 'horizontal', label: 'افقی (CFA L1)' },
            { value: 'vertical', label: 'عمودی (Common-Size)' },
          ]}
        />
        <Badge variant="light" color="blue" size="sm">
          CFA L1 — Ch.22
        </Badge>
      </Group>

      {isVerticalUnavailable ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <Text c="dimmed" size="sm">
            تحلیل عمودی فقط برای سود و زیان و ترازنامه قابل محاسبه است
          </Text>
        </div>
      ) : (
        <div className={classes.tableWrapper}>
          {mode === 'horizontal' ? (
            <HorizontalTable rows={horizontal} periods={periods} />
          ) : (
            <VerticalTable rows={vertical} periods={periods} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Horizontal Analysis Table ────────────────────────────────────────────────

function HorizontalTable({ rows, periods }) {
  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th className={classes.stickyCol}>شرح</th>
          {periods.map((p, i) => (
            <th key={p.id} className={classes.headerCell} colSpan={2}>
              <Group gap={4} justify="center" wrap="nowrap">
                {toPersianNum(p.periodEndJalali)}
                {i === 0 && (
                  <Badge size="xs" variant="outline" color="gray">
                    مبنا
                  </Badge>
                )}
              </Group>
            </th>
          ))}
        </tr>
        <tr>
          <th className={classes.stickyCol} />
          {periods.map((_, i) => (
            <Fragment key={i}>
              <th className={classes.subHeaderCell}>
                <Text size="xs" c="dimmed">از مبنا٪</Text>
              </th>
              <th className={classes.subHeaderCell}>
                <Text size="xs" c="dimmed">YoY٪</Text>
              </th>
            </Fragment>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className={row.isHot ? classes.hotRow : undefined}>
            <td className={classes.stickyCol}>{row.label}</td>
            {row.baseValues.map((baseVal, i) => (
              <Fragment key={i}>
                <td className={classes.pctCell}>
                  <PctValue value={baseVal} isBase={i === 0} />
                </td>
                <td className={classes.pctCell}>
                  <PctValue value={row.yoyValues[i]} />
                </td>
              </Fragment>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Vertical Analysis Table ──────────────────────────────────────────────────

function VerticalTable({ rows, periods }) {
  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th className={classes.stickyCol}>شرح</th>
          {periods.map((p) => (
            <th key={p.id} className={classes.headerCell}>
              {toPersianNum(p.periodEndJalali)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className={row.isHot ? classes.hotRow : undefined}>
            <td className={classes.stickyCol}>{row.label}</td>
            {row.pctValues.map((v, i) => (
              <td key={i} className={classes.pctCell}>
                <PctValue value={v} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function PctValue({ value, isBase }) {
  if (isBase) {
    return <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: 11 }}>مبنا</span>;
  }
  if (value == null) {
    return <span style={{ color: 'var(--mantine-color-dimmed)' }}>—</span>;
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const color = isPositive
    ? 'var(--mantine-color-green-5)'
    : isNegative
    ? 'var(--mantine-color-red-5)'
    : 'var(--mantine-color-dimmed)';

  const sign = isPositive ? '+' : '';
  const display = toPersianNum(`${sign}${value.toFixed(1)}`);

  return (
    <span style={{ color, fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 500 }}>
      {display}٪
    </span>
  );
}
