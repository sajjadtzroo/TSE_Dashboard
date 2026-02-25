import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFinancialStatements } from '../../hooks/useMarketData';
import { HOT_FIELD_LABELS, HOT_FIELDS_BY_TYPE } from './financialConfig';

/**
 * Hook for the financial statements page.
 * Fetches data and transposes row-per-period into columnar format
 * (periods as columns, line items as rows).
 *
 * Also provides:
 * - analysisData: horizontal and vertical analysis arrays
 * - ratioData: computed financial ratios from aligned IS + BS data
 */
export default function useFinancialStatementsPage() {
  const { symbol } = useParams();
  const [stmtType, setStmtType] = useState('income_statement');
  const [periodMonths, setPeriodMonths] = useState('');
  const [isAudited, setIsAudited] = useState(false);
  const [isConsolidated, setIsConsolidated] = useState(false);

  // Primary fetch: respects all filters — drives the statements tab
  const { data, isLoading } = useFinancialStatements(symbol, {
    statement_type: stmtType,
    ...(periodMonths && { period_months: Number(periodMonths) }),
    ...(isAudited && { is_audited: true }),
    ...(isConsolidated && { is_consolidated: true }),
    per_page: 50,
  });

  // Secondary fetches: always IS + BS, no extra filters — drive ratios tab
  const { data: isRatioData, isLoading: isRatioLoading } = useFinancialStatements(symbol, {
    statement_type: 'income_statement',
    per_page: 20,
  });
  const { data: bsRatioData, isLoading: bsRatioLoading } = useFinancialStatements(symbol, {
    statement_type: 'balance_sheet',
    per_page: 20,
  });

  const { periods, rows, lastUpdated } = useMemo(() => {
    if (!data || data.length === 0) {
      return { periods: [], rows: [], lastUpdated: null };
    }

    // Reverse to chronological order (oldest first → newest last)
    const statements = [...data].reverse();

    // Build period column definitions
    const periodDefs = statements.map((s) => ({
      id: s.id,
      announcementId: s.codal_announcement_id,
      periodEndJalali: s.period_end_jalali,
      isAudited: s.is_audited,
      isConsolidated: s.is_consolidated,
      codalLinkPdf: s.codal_link_pdf,
      codalLinkExcel: s.codal_link_excel,
    }));

    // Hot fields for this statement type
    const hotFields = HOT_FIELDS_BY_TYPE[stmtType] || [];

    // Build hot field rows (top section)
    const hotRows = hotFields.map((field) => ({
      key: field,
      label: HOT_FIELD_LABELS[field] || field,
      isHot: true,
      values: statements.map((s) => s[field] ?? null),
    }));

    // Build union of all JSONB line_items keys across periods.
    // Use the newest period (last in chronological order) to define canonical order,
    // then append any keys from older periods not in the newest.
    const newestItems = statements[statements.length - 1]?.line_items || {};
    const canonicalKeys = Object.keys(newestItems);
    const allKeysSet = new Set(canonicalKeys);

    for (const s of statements) {
      if (s.line_items) {
        for (const k of Object.keys(s.line_items)) {
          if (!allKeysSet.has(k)) {
            allKeysSet.add(k);
            canonicalKeys.push(k);
          }
        }
      }
    }

    // Filter out keys that are already hot fields
    const hotFieldSet = new Set(hotFields);
    const lineItemRows = canonicalKeys
      .filter((k) => !hotFieldSet.has(k))
      .map((key) => ({
        key,
        label: key,
        isHot: false,
        values: statements.map((s) => s.line_items?.[key] ?? null),
      }));

    return {
      periods: periodDefs,
      rows: [...hotRows, ...lineItemRows],
      lastUpdated: data[0]?.created_at ? new Date(data[0].created_at) : null,
    };
  }, [data, stmtType]);

  // ── Horizontal & Vertical analysis ──────────────────────────────────────
  const analysisData = useMemo(() => {
    if (!rows.length || !periods.length) return null;

    const revenueRow = rows.find((r) => r.key === 'revenue');
    const totalAssetsRow = rows.find((r) => r.key === 'total_assets');

    // Horizontal: % change vs base period (index 0 = oldest)
    const horizontal = rows.map((row) => ({
      key: row.key,
      label: row.label,
      isHot: row.isHot,
      // baseChange[i]: change from base period (i=0 is base → 0%)
      baseValues: row.values.map((v, i) => {
        if (v == null) return null;
        const base = row.values[0];
        if (base == null || base === 0) return null;
        if (i === 0) return 0;
        return ((v - base) / Math.abs(base)) * 100;
      }),
      // yoyValues[i]: period-over-period change
      yoyValues: row.values.map((v, i) => {
        if (i === 0 || v == null) return null;
        const prev = row.values[i - 1];
        if (prev == null || prev === 0) return null;
        return ((v - prev) / Math.abs(prev)) * 100;
      }),
    }));

    // Vertical: each item as % of common-size base
    const denominator = stmtType === 'balance_sheet' ? totalAssetsRow : revenueRow;
    const vertical = denominator
      ? rows.map((row) => ({
          key: row.key,
          label: row.label,
          isHot: row.isHot,
          pctValues: row.values.map((v, i) => {
            const d = denominator.values[i];
            if (v == null || d == null || d === 0) return null;
            return (v / d) * 100;
          }),
        }))
      : null;

    return { horizontal, vertical };
  }, [rows, periods, stmtType]);

  // ── Financial ratios ─────────────────────────────────────────────────────
  const ratioData = useMemo(() => {
    if (!isRatioData || !bsRatioData) return null;

    const isStmts = [...isRatioData].reverse(); // oldest first
    const bsStmts = [...bsRatioData].reverse();

    // Align IS and BS by period_end_jalali
    const bsMap = new Map(bsStmts.map((s) => [s.period_end_jalali, s]));
    const aligned = isStmts
      .map((is) => ({ is, bs: bsMap.get(is.period_end_jalali) }))
      .filter(({ bs }) => bs != null);

    if (!aligned.length) return null;

    const periodLabels = aligned.map(({ is }) => is.period_end_jalali);

    function safe(formula, is, bs) {
      try {
        const v = formula(is, bs);
        return v != null && isFinite(v) ? v : null;
      } catch {
        return null;
      }
    }

    const formulas = {
      gross_margin: (is) =>
        is.gross_profit != null && is.revenue ? (is.gross_profit / is.revenue) * 100 : null,
      operating_margin: (is) =>
        is.operating_income != null && is.revenue ? (is.operating_income / is.revenue) * 100 : null,
      net_margin: (is) =>
        is.net_income != null && is.revenue ? (is.net_income / is.revenue) * 100 : null,
      roa: (is, bs) =>
        is.net_income != null && bs.total_assets ? (is.net_income / bs.total_assets) * 100 : null,
      roe: (is, bs) =>
        is.net_income != null && bs.total_equity ? (is.net_income / bs.total_equity) * 100 : null,
      debt_to_assets: (_, bs) =>
        bs.total_liabilities != null && bs.total_assets
          ? (bs.total_liabilities / bs.total_assets) * 100
          : null,
      debt_to_equity: (_, bs) =>
        bs.total_liabilities != null && bs.total_equity
          ? (bs.total_liabilities / bs.total_equity) * 100
          : null,
      equity_multiplier: (_, bs) =>
        bs.total_assets != null && bs.total_equity ? bs.total_assets / bs.total_equity : null,
      asset_turnover: (is, bs) =>
        is.revenue != null && bs.total_assets ? is.revenue / bs.total_assets : null,
    };

    const ratioValues = {};
    for (const [key, formula] of Object.entries(formulas)) {
      ratioValues[key] = aligned.map(({ is, bs }) => safe(formula, is, bs));
    }

    return { periodLabels, ratioValues };
  }, [isRatioData, bsRatioData]);

  return {
    symbol,
    stmtType,
    setStmtType,
    periodMonths,
    setPeriodMonths,
    isAudited,
    setIsAudited,
    isConsolidated,
    setIsConsolidated,
    periods,
    rows,
    isLoading,
    lastUpdated,
    analysisData,
    ratioData,
    isRatioLoading: isRatioLoading || bsRatioLoading,
  };
}
