/**
 * Cash Flow Time Series Table
 * Shows period-by-period NPV/IRR breakdown for a loan analysis result
 */

import React, { memo, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
} from '@mui/material';
import { CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { LoanAnalysisResult } from '../types';
import { calculateNPV } from '@/utils/financialCalculations';

interface CashFlowTimeSeriesProps {
  loan: LoanAnalysisResult;
}

const COLLAPSE_THRESHOLD = 12;
const SHOW_FIRST = 5;
const SHOW_LAST = 3;

const FONT = 'Vazirmatn, system-ui, sans-serif';

const formatCurrency = (amount: number): string => {
  return (amount / 1_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 2 }) + ' م.ت';
};

const formatNumber = (value: number, digits: number = 4): string => {
  return value.toLocaleString('fa-IR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
};

const formatPercent = (value: number): string => {
  return (value * 100).toLocaleString('fa-IR', { maximumFractionDigits: 2 }) + '%';
};

interface CashFlowRow {
  period: number;
  description: string;
  cashFlow: number;
  discountFactor: number;
  presentValue: number;
  cumulativeNPV: number;
  /** Row type for visual styling */
  type: 'deposit' | 'wait' | 'loan' | 'installment';
}

function buildCashFlowRows(loan: LoanAnalysisResult): CashFlowRow[] {
  const cashFlows = loan.cashFlows;

  const monthlyDiscountRate = loan.discountRate / 12;
  const rows: CashFlowRow[] = [];
  let cumulativeNPV = 0;

  for (let i = 0; i < cashFlows.length; i++) {
    const discountFactor = 1 / Math.pow(1 + monthlyDiscountRate, i);
    const presentValue = cashFlows[i] * discountFactor;
    cumulativeNPV += presentValue;

    let description: string;
    let type: CashFlowRow['type'];
    if (i === 0) {
      description = 'سپرده‌گذاری';
      type = 'deposit';
    } else if (i <= loan.waitMonths) {
      description = 'دوره انتظار';
      type = 'wait';
    } else if (i === loan.waitMonths + 1) {
      description = 'دریافت وام';
      type = 'loan';
    } else {
      const installmentNum = i - loan.waitMonths - 1;
      description = `قسط شماره ${installmentNum.toLocaleString('fa-IR')}`;
      type = 'installment';
    }

    rows.push({
      period: i,
      description,
      cashFlow: cashFlows[i],
      discountFactor,
      presentValue,
      cumulativeNPV,
      type,
    });
  }

  return rows;
}

/** Row background based on event type and index */
function getRowBackground(row: CashFlowRow, index: number): string {
  if (row.type === 'deposit') return 'rgba(207, 102, 121, 0.06)';
  if (row.type === 'loan') return 'rgba(3, 218, 197, 0.06)';
  // Subtle zebra stripe for remaining rows
  return index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)';
}

const cellSx = {
  color: '#e5e5e5',
  fontSize: '0.8rem',
  fontFamily: FONT,
  borderBottom: '1px solid #2d2d2d',
  padding: '7px 12px',
  whiteSpace: 'nowrap' as const,
  letterSpacing: '0.01em',
};

const headerCellSx = {
  color: '#f9f9f9',
  fontSize: '0.78rem',
  fontWeight: 600,
  fontFamily: FONT,
  borderBottom: '2px solid #3d3d3d',
  padding: '10px 12px',
  backgroundColor: '#1a1a1a',
  whiteSpace: 'nowrap' as const,
};

const numericCellSx = {
  ...cellSx,
  fontFeatureSettings: '"tnum"',
  direction: 'ltr' as const,
  textAlign: 'right' as const,
};

const CashFlowTimeSeries: React.FC<CashFlowTimeSeriesProps> = memo(({ loan }) => {
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => buildCashFlowRows(loan), [loan]);

  const totalCashFlow = useMemo(() => rows.reduce((sum, r) => sum + r.cashFlow, 0), [rows]);
  const finalNPV = rows.length > 0 ? rows[rows.length - 1].cumulativeNPV : 0;

  // IRR verification: compute NPV using IRR as discount rate
  const irrVerification = useMemo(() => {
    const cashFlows = rows.map((r) => r.cashFlow);
    const monthlyIRR = loan.irr / 12;
    const npvAtIRR = calculateNPV(cashFlows, monthlyIRR);
    const isVerified = Math.abs(npvAtIRR) < Math.abs(loan.loanAmount * 0.01);
    return { npvAtIRR, isVerified };
  }, [rows, loan.irr, loan.loanAmount]);

  // Smart collapse
  const needsCollapse = rows.length > COLLAPSE_THRESHOLD;
  const visibleRows = useMemo(() => {
    if (!needsCollapse || expanded) return rows;
    return [
      ...rows.slice(0, SHOW_FIRST),
      null, // separator placeholder
      ...rows.slice(rows.length - SHOW_LAST),
    ];
  }, [rows, needsCollapse, expanded]);

  // Track visible index for zebra striping
  let visibleIndex = 0;

  return (
    <Box>
      {/* Table */}
      <TableContainer
        sx={{
          maxHeight: 440,
          backgroundColor: '#121212',
          borderRadius: '8px',
          border: '1px solid #2d2d2d',
          overflow: 'auto',
          '&::-webkit-scrollbar': { width: 6, height: 6 },
          '&::-webkit-scrollbar-track': { backgroundColor: '#1a1a1a' },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#3d3d3d',
            borderRadius: 3,
            '&:hover': { backgroundColor: '#555' },
          },
        }}
      >
        <Table size="small" stickyHeader dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellSx, textAlign: 'center', width: 56 }}>دوره</TableCell>
              <TableCell sx={{ ...headerCellSx, minWidth: 110 }}>شرح</TableCell>
              <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>جریان نقدی</TableCell>
              <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>ضریب تنزیل</TableCell>
              <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>ارزش فعلی</TableCell>
              <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>NPV تجمعی</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => {
              if (row === null) {
                const hiddenCount = rows.length - SHOW_FIRST - SHOW_LAST;
                return (
                  <TableRow key="separator">
                    <TableCell
                      colSpan={6}
                      sx={{
                        ...cellSx,
                        textAlign: 'center',
                        color: '#666',
                        padding: '10px 12px',
                        borderBottom: '1px dashed #2d2d2d',
                        fontStyle: 'italic',
                      }}
                    >
                      ... {hiddenCount.toLocaleString('fa-IR')} دوره پنهان ...
                    </TableCell>
                  </TableRow>
                );
              }

              const currentIndex = visibleIndex++;
              const cashFlowColor = row.cashFlow < 0 ? '#CF6679' : row.cashFlow > 0 ? '#03DAC5' : '#555';
              const pvColor = row.presentValue < 0 ? '#CF6679' : row.presentValue > 0 ? '#03DAC5' : '#555';
              const cumulativeColor = row.cumulativeNPV < 0 ? '#CF6679' : '#03DAC5';
              const isKeyRow = row.type === 'deposit' || row.type === 'loan';

              return (
                <TableRow
                  key={row.period}
                  sx={{
                    backgroundColor: getRowBackground(row, currentIndex),
                    transition: 'background-color 0.15s',
                    '&:hover': { backgroundColor: 'rgba(187, 134, 252, 0.08)' },
                  }}
                >
                  <TableCell sx={{ ...cellSx, textAlign: 'center', color: '#b3b3b3' }}>
                    {row.period.toLocaleString('fa-IR')}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...cellSx,
                      fontWeight: isKeyRow ? 600 : 400,
                      color: isKeyRow ? '#e5e5e5' : '#b3b3b3',
                    }}
                  >
                    {row.description}
                  </TableCell>
                  <TableCell sx={{ ...numericCellSx, color: cashFlowColor, fontWeight: isKeyRow ? 600 : 400 }}>
                    {row.cashFlow === 0 ? '—' : formatCurrency(row.cashFlow)}
                  </TableCell>
                  <TableCell sx={{ ...numericCellSx, color: '#888' }}>
                    {formatNumber(row.discountFactor)}
                  </TableCell>
                  <TableCell sx={{ ...numericCellSx, color: pvColor }}>
                    {row.presentValue === 0 ? '—' : formatCurrency(row.presentValue)}
                  </TableCell>
                  <TableCell sx={{ ...numericCellSx, color: cumulativeColor, fontWeight: 500 }}>
                    {formatCurrency(row.cumulativeNPV)}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Summary Row */}
            <TableRow sx={{ backgroundColor: '#1a1a1a' }}>
              <TableCell sx={{ ...cellSx, borderTop: '2px solid #3d3d3d', borderBottom: 'none' }} colSpan={2}>
                <Typography
                  variant="caption"
                  sx={{ color: '#BB86FC', fontWeight: 700, fontFamily: FONT, fontSize: '0.8rem' }}
                >
                  جمع‌بندی
                </Typography>
              </TableCell>
              <TableCell
                sx={{
                  ...numericCellSx,
                  fontWeight: 700,
                  borderTop: '2px solid #3d3d3d',
                  borderBottom: 'none',
                  color: totalCashFlow < 0 ? '#CF6679' : '#03DAC5',
                }}
              >
                {formatCurrency(totalCashFlow)}
              </TableCell>
              <TableCell sx={{ ...cellSx, borderTop: '2px solid #3d3d3d', borderBottom: 'none', color: '#555' }}>—</TableCell>
              <TableCell
                sx={{
                  ...numericCellSx,
                  fontWeight: 700,
                  borderTop: '2px solid #3d3d3d',
                  borderBottom: 'none',
                  color: finalNPV < 0 ? '#CF6679' : '#03DAC5',
                }}
              >
                {formatCurrency(finalNPV)}
              </TableCell>
              <TableCell sx={{ ...cellSx, borderTop: '2px solid #3d3d3d', borderBottom: 'none', color: '#555' }}>—</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Collapse Toggle */}
      {needsCollapse && (
        <Box sx={{ textAlign: 'center', mt: 1.5 }}>
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            startIcon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            sx={{
              color: '#BB86FC',
              fontSize: '0.78rem',
              fontFamily: FONT,
              textTransform: 'none',
              borderRadius: '16px',
              padding: '4px 16px',
              border: '1px solid rgba(187, 134, 252, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(187, 134, 252, 0.08)',
                border: '1px solid rgba(187, 134, 252, 0.4)',
              },
            }}
          >
            {expanded
              ? 'نمایش خلاصه'
              : `نمایش همه ${rows.length.toLocaleString('fa-IR')} دوره`}
          </Button>
        </Box>
      )}

      {/* IRR Verification */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          backgroundColor: irrVerification.isVerified
            ? 'rgba(3, 218, 197, 0.05)'
            : 'rgba(207, 102, 121, 0.05)',
          borderRadius: '8px',
          border: irrVerification.isVerified
            ? '1px solid rgba(3, 218, 197, 0.12)'
            : '1px solid rgba(207, 102, 121, 0.12)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          {irrVerification.isVerified ? (
            <CheckCircle size={15} color="#03DAC5" />
          ) : (
            <AlertTriangle size={15} color="#CF6679" />
          )}
          <Typography
            variant="caption"
            sx={{
              color: irrVerification.isVerified ? '#03DAC5' : '#CF6679',
              fontWeight: 600,
              fontFamily: FONT,
              fontSize: '0.8rem',
            }}
          >
            صحت‌سنجی IRR
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{ color: '#b3b3b3', fontFamily: FONT, fontSize: '0.75rem', display: 'block', lineHeight: 1.7 }}
        >
          با نرخ IRR = {formatPercent(loan.irr)}، ارزش خالص فعلی (NPV) برابر است با{' '}
          <Box component="span" sx={{ color: '#e5e5e5', fontWeight: 600, fontFamily: FONT }}>
            {formatCurrency(irrVerification.npvAtIRR)}
          </Box>
          {irrVerification.isVerified ? ' (تقریباً صفر)' : ' (انحراف از صفر)'}
        </Typography>
      </Box>

      {/* Summary Chips */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
        <Chip
          label={`NPV: ${formatCurrency(finalNPV)}`}
          size="small"
          sx={{
            backgroundColor: finalNPV > 0 ? 'rgba(3, 218, 197, 0.1)' : 'rgba(207, 102, 121, 0.1)',
            color: finalNPV > 0 ? '#03DAC5' : '#CF6679',
            fontFamily: FONT,
            fontSize: '0.75rem',
            fontWeight: 500,
            border: finalNPV > 0 ? '1px solid rgba(3, 218, 197, 0.2)' : '1px solid rgba(207, 102, 121, 0.2)',
            height: 28,
          }}
        />
        <Chip
          label={`IRR: ${formatPercent(loan.irr)}`}
          size="small"
          sx={{
            backgroundColor: 'rgba(187, 134, 252, 0.1)',
            color: '#BB86FC',
            fontFamily: FONT,
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid rgba(187, 134, 252, 0.2)',
            height: 28,
          }}
        />
        <Chip
          label={`${rows.length.toLocaleString('fa-IR')} دوره`}
          size="small"
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#b3b3b3',
            fontFamily: FONT,
            fontSize: '0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            height: 28,
          }}
        />
      </Box>
    </Box>
  );
});

export default CashFlowTimeSeries;
