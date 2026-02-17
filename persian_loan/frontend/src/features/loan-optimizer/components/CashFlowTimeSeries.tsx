/**
 * Cash Flow Time Series Table
 * Shows period-by-period NPV/IRR breakdown for a loan analysis result
 */

import React, { memo, useMemo, useState } from 'react';
import { Box, Text, Table, Button, Badge, Group } from '@mantine/core';
import { IconCircleCheck, IconAlertTriangle, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
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

  const cellStyle: React.CSSProperties = {
    color: '#e5e5e5',
    fontSize: '0.8rem',
    fontFamily: FONT,
    borderBottom: '1px solid #2d2d2d',
    padding: '7px 12px',
    whiteSpace: 'nowrap',
    letterSpacing: '0.01em',
  };

  const numericStyle: React.CSSProperties = {
    ...cellStyle,
    fontFeatureSettings: '"tnum"',
    direction: 'ltr',
    textAlign: 'right',
  };

  const headerStyle: React.CSSProperties = {
    color: '#f9f9f9',
    fontSize: '0.78rem',
    fontWeight: 600,
    fontFamily: FONT,
    borderBottom: '2px solid #3d3d3d',
    padding: '10px 12px',
    backgroundColor: '#1a1a1a',
    whiteSpace: 'nowrap',
  };

  return (
    <Box>
      {/* Table */}
      <Box
        style={{
          maxHeight: 440,
          backgroundColor: '#121212',
          borderRadius: 8,
          border: '1px solid #2d2d2d',
          overflow: 'auto',
        }}
      >
        <Table
          striped={false}
          highlightOnHover={false}
          withTableBorder={false}
          dir="rtl"
          style={{ fontSize: '0.8rem' }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ ...headerStyle, textAlign: 'center', width: 56 }}>دوره</Table.Th>
              <Table.Th style={{ ...headerStyle, minWidth: 110 }}>شرح</Table.Th>
              <Table.Th style={{ ...headerStyle, textAlign: 'right' }}>جریان نقدی</Table.Th>
              <Table.Th style={{ ...headerStyle, textAlign: 'right' }}>ضریب تنزیل</Table.Th>
              <Table.Th style={{ ...headerStyle, textAlign: 'right' }}>ارزش فعلی</Table.Th>
              <Table.Th style={{ ...headerStyle, textAlign: 'right' }}>NPV تجمعی</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleRows.map((row) => {
              if (row === null) {
                const hiddenCount = rows.length - SHOW_FIRST - SHOW_LAST;
                return (
                  <Table.Tr key="separator">
                    <Table.Td
                      colSpan={6}
                      style={{
                        ...cellStyle,
                        textAlign: 'center',
                        color: '#666',
                        padding: '10px 12px',
                        borderBottom: '1px dashed #2d2d2d',
                        fontStyle: 'italic',
                      }}
                    >
                      ... {hiddenCount.toLocaleString('fa-IR')} دوره پنهان ...
                    </Table.Td>
                  </Table.Tr>
                );
              }

              const currentIndex = visibleIndex++;
              const cashFlowColor = row.cashFlow < 0 ? '#CF6679' : row.cashFlow > 0 ? '#03DAC5' : '#555';
              const pvColor = row.presentValue < 0 ? '#CF6679' : row.presentValue > 0 ? '#03DAC5' : '#555';
              const cumulativeColor = row.cumulativeNPV < 0 ? '#CF6679' : '#03DAC5';
              const isKeyRow = row.type === 'deposit' || row.type === 'loan';

              return (
                <Table.Tr
                  key={row.period}
                  style={{
                    backgroundColor: getRowBackground(row, currentIndex),
                    transition: 'background-color 0.15s',
                  }}
                >
                  <Table.Td style={{ ...cellStyle, textAlign: 'center', color: '#b3b3b3' }}>
                    {row.period.toLocaleString('fa-IR')}
                  </Table.Td>
                  <Table.Td
                    style={{
                      ...cellStyle,
                      fontWeight: isKeyRow ? 600 : 400,
                      color: isKeyRow ? '#e5e5e5' : '#b3b3b3',
                    }}
                  >
                    {row.description}
                  </Table.Td>
                  <Table.Td style={{ ...numericStyle, color: cashFlowColor, fontWeight: isKeyRow ? 600 : 400 }}>
                    {row.cashFlow === 0 ? '--' : formatCurrency(row.cashFlow)}
                  </Table.Td>
                  <Table.Td style={{ ...numericStyle, color: '#888' }}>
                    {formatNumber(row.discountFactor)}
                  </Table.Td>
                  <Table.Td style={{ ...numericStyle, color: pvColor }}>
                    {row.presentValue === 0 ? '--' : formatCurrency(row.presentValue)}
                  </Table.Td>
                  <Table.Td style={{ ...numericStyle, color: cumulativeColor, fontWeight: 500 }}>
                    {formatCurrency(row.cumulativeNPV)}
                  </Table.Td>
                </Table.Tr>
              );
            })}

            {/* Summary Row */}
            <Table.Tr style={{ backgroundColor: '#1a1a1a' }}>
              <Table.Td
                colSpan={2}
                style={{ ...cellStyle, borderTop: '2px solid #3d3d3d', borderBottom: 'none' }}
              >
                <Text
                  size="xs"
                  fw={700}
                  c="#BB86FC"
                  style={{ fontFamily: FONT, fontSize: '0.8rem' }}
                >
                  جمع‌بندی
                </Text>
              </Table.Td>
              <Table.Td
                style={{
                  ...numericStyle,
                  fontWeight: 700,
                  borderTop: '2px solid #3d3d3d',
                  borderBottom: 'none',
                  color: totalCashFlow < 0 ? '#CF6679' : '#03DAC5',
                }}
              >
                {formatCurrency(totalCashFlow)}
              </Table.Td>
              <Table.Td style={{ ...cellStyle, borderTop: '2px solid #3d3d3d', borderBottom: 'none', color: '#555' }}>
                --
              </Table.Td>
              <Table.Td
                style={{
                  ...numericStyle,
                  fontWeight: 700,
                  borderTop: '2px solid #3d3d3d',
                  borderBottom: 'none',
                  color: finalNPV < 0 ? '#CF6679' : '#03DAC5',
                }}
              >
                {formatCurrency(finalNPV)}
              </Table.Td>
              <Table.Td style={{ ...cellStyle, borderTop: '2px solid #3d3d3d', borderBottom: 'none', color: '#555' }}>
                --
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Box>

      {/* Collapse Toggle */}
      {needsCollapse && (
        <Group justify="center" mt="sm">
          <Button
            variant="outline"
            size="compact-sm"
            onClick={() => setExpanded(!expanded)}
            leftSection={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            styles={{
              root: {
                color: '#BB86FC',
                fontSize: '0.78rem',
                fontFamily: FONT,
                borderRadius: 16,
                padding: '4px 16px',
                borderColor: 'rgba(187, 134, 252, 0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(187, 134, 252, 0.08)',
                  borderColor: 'rgba(187, 134, 252, 0.4)',
                },
              },
            }}
          >
            {expanded
              ? 'نمایش خلاصه'
              : `نمایش همه ${rows.length.toLocaleString('fa-IR')} دوره`}
          </Button>
        </Group>
      )}

      {/* IRR Verification */}
      <Box
        mt="sm"
        p="sm"
        style={{
          backgroundColor: irrVerification.isVerified
            ? 'rgba(3, 218, 197, 0.05)'
            : 'rgba(207, 102, 121, 0.05)',
          borderRadius: 8,
          border: irrVerification.isVerified
            ? '1px solid rgba(3, 218, 197, 0.12)'
            : '1px solid rgba(207, 102, 121, 0.12)',
        }}
      >
        <Group gap="xs" mb={4}>
          {irrVerification.isVerified ? (
            <IconCircleCheck size={15} color="#03DAC5" />
          ) : (
            <IconAlertTriangle size={15} color="#CF6679" />
          )}
          <Text
            size="xs"
            fw={600}
            c={irrVerification.isVerified ? '#03DAC5' : '#CF6679'}
            style={{ fontFamily: FONT, fontSize: '0.8rem' }}
          >
            صحت‌سنجی IRR
          </Text>
        </Group>
        <Text
          size="xs"
          c={rallyColors.textSecondary}
          style={{ fontFamily: FONT, fontSize: '0.75rem', lineHeight: 1.7 }}
        >
          با نرخ IRR = {formatPercent(loan.irr)}، ارزش خالص فعلی (NPV) برابر است با{' '}
          <Text component="span" fw={600} c={rallyColors.textPrimary} style={{ fontFamily: FONT }} inherit>
            {formatCurrency(irrVerification.npvAtIRR)}
          </Text>
          {irrVerification.isVerified ? ' (تقریبا صفر)' : ' (انحراف از صفر)'}
        </Text>
      </Box>

      {/* Summary Badges */}
      <Group gap="xs" mt="sm" wrap="wrap">
        <Badge
          variant="light"
          size="lg"
          styles={{
            root: {
              backgroundColor: finalNPV > 0 ? 'rgba(3, 218, 197, 0.1)' : 'rgba(207, 102, 121, 0.1)',
              color: finalNPV > 0 ? '#03DAC5' : '#CF6679',
              fontFamily: FONT,
              fontSize: '0.75rem',
              fontWeight: 500,
              border: finalNPV > 0 ? '1px solid rgba(3, 218, 197, 0.2)' : '1px solid rgba(207, 102, 121, 0.2)',
              height: 28,
            },
          }}
        >
          NPV: {formatCurrency(finalNPV)}
        </Badge>
        <Badge
          variant="light"
          size="lg"
          styles={{
            root: {
              backgroundColor: 'rgba(187, 134, 252, 0.1)',
              color: '#BB86FC',
              fontFamily: FONT,
              fontSize: '0.75rem',
              fontWeight: 500,
              border: '1px solid rgba(187, 134, 252, 0.2)',
              height: 28,
            },
          }}
        >
          IRR: {formatPercent(loan.irr)}
        </Badge>
        <Badge
          variant="light"
          size="lg"
          styles={{
            root: {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#b3b3b3',
              fontFamily: FONT,
              fontSize: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              height: 28,
            },
          }}
        >
          {rows.length.toLocaleString('fa-IR')} دوره
        </Badge>
      </Group>
    </Box>
  );
});

export default CashFlowTimeSeries;
