import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFinancialStatements } from '../../hooks/useMarketData';
import { HOT_FIELD_LABELS, HOT_FIELDS_BY_TYPE } from './financialConfig';

/**
 * Hook for the financial statements page.
 * Fetches data and transposes row-per-period into columnar format
 * (periods as columns, line items as rows).
 */
export default function useFinancialStatementsPage() {
  const { symbol } = useParams();
  const [stmtType, setStmtType] = useState('income_statement');
  const [periodMonths, setPeriodMonths] = useState('');

  const { data, isLoading } = useFinancialStatements(symbol, {
    statement_type: stmtType,
    ...(periodMonths && { period_months: Number(periodMonths) }),
    per_page: 50,
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

  return {
    symbol,
    stmtType,
    setStmtType,
    periodMonths,
    setPeriodMonths,
    periods,
    rows,
    isLoading,
    lastUpdated,
  };
}
