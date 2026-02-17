/**
 * Optimizer Results Table Component
 * Displays all analyzed loans in a sortable, filterable MUI DataGrid
 */

import React, { useMemo, memo, useState, useCallback, useRef } from 'react';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { faIR } from '@mui/x-data-grid/locales';
import { ThemeProvider, createTheme, Chip, Box, Typography, IconButton, Collapse } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LoanAnalysisResult } from '../types';
import { LoanCalculationDetail } from './LoanCalculationDetail';

interface OptimizerResultsTableProps {
  data: LoanAnalysisResult[];
  onlySuitable?: boolean;
}

/**
 * Get color based on percentile for MUI theme
 */
const getPercentileColor = (percentile?: number): string => {
  if (percentile === undefined) return '#b3b3b3';
  if (percentile < 0.1) return '#03DAC5'; // Teal (good)
  if (percentile > 0.9) return '#CF6679'; // Pink (bad)
  return '#b3b3b3'; // Gray (neutral)
};

/**
 * Get background color based on percentile
 */
const getPercentileBgColor = (percentile?: number): string => {
  if (percentile === undefined) return 'transparent';
  if (percentile < 0.1) return 'rgba(3, 218, 197, 0.1)';
  if (percentile > 0.9) return 'rgba(207, 102, 121, 0.1)';
  return 'transparent';
};

/**
 * Format currency amount
 */
const formatAmount = (amount: number): string => {
  return (amount / 1_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 0 }) + ' م';
};

/**
 * Format percentage
 */
const formatPercent = (value: number): string => {
  return (value * 100).toLocaleString('fa-IR', { maximumFractionDigits: 2 }) + '%';
};

/**
 * Recommendation Badge Component using MUI Chip
 */
const RecommendationChip: React.FC<{ recommendation: string }> = memo(({ recommendation }) => {
  const config = {
    'WAIT': { label: 'منتظر بمانید', color: '#3b82f6' as const, bgColor: 'rgba(59, 130, 246, 0.1)' },
    'BUY_PRIVILEGE': { label: 'خرید امتیاز', color: '#10b981' as const, bgColor: 'rgba(16, 185, 129, 0.1)' },
    'NEGOTIATE': { label: 'مذاکره کنید', color: '#f59e0b' as const, bgColor: 'rgba(245, 158, 11, 0.1)' },
    'REJECT': { label: 'رد کنید', color: '#ef4444' as const, bgColor: 'rgba(239, 68, 68, 0.1)' }
  }[recommendation] || { label: recommendation, color: '#6b7280' as const, bgColor: 'rgba(107, 114, 128, 0.1)' };

  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        backgroundColor: config.bgColor,
        color: config.color,
        fontWeight: 500,
        fontSize: '0.75rem',
        height: '24px',
      }}
    />
  );
});

/**
 * Status Indicator Component
 */
const StatusIndicator: React.FC<{ meetsRequirement: boolean }> = memo(({ meetsRequirement }) => {
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: meetsRequirement ? '#03DAC5' : '#6b7280',
        margin: '0 auto',
      }}
      title={meetsRequirement ? 'مناسب' : 'نامناسب'}
    />
  );
});

/**
 * Create dark theme for MUI DataGrid matching the app's design
 */
const darkTheme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'dark',
    primary: {
      main: '#BB86FC',
      light: '#dcc8ff',
      dark: '#3700B3',
    },
    secondary: {
      main: '#03DAC5',
      light: '#4dfff0',
      dark: '#008c7d',
    },
    error: {
      main: '#CF6679',
    },
    background: {
      default: '#121212',
      paper: '#020202',
    },
    text: {
      primary: '#e5e5e5',
      secondary: '#b3b3b3',
    },
  },
  typography: {
    fontFamily: 'Vazirmatn, system-ui, sans-serif',
  },
});

const OptimizerResultsTable: React.FC<OptimizerResultsTableProps> = ({
  data,
  onlySuitable = false
}) => {
  // State for expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Ref to always access latest expandedRows from memoized column closures
  const expandedRowsRef = useRef(expandedRows);
  expandedRowsRef.current = expandedRows;

  // Filter data
  const filteredData = useMemo(() => {
    if (onlySuitable) {
      return data.filter((loan) => loan.meetsRequirement);
    }
    return data;
  }, [data, onlySuitable]);

  // Add row IDs (using deterministic IDs without index for stability)
  const rows = useMemo(() =>
    filteredData.map((loan, index) => ({
      ...loan,
      id: `${loan.loanId}-${loan.bankNameFA}`,
      _index: index, // Keep index for reference if needed
    })),
    [filteredData]
  );

  // Toggle row expansion (memoized to prevent re-renders)
  const toggleRowExpansion = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  // Define columns (memoized without expandedRows dependency)
  // Note: renderCell functions access expandedRows via closure, but columns array
  // doesn't need to be recreated when expandedRows changes
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'expand',
      headerName: '',
      width: 60,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const isExpanded = expandedRowsRef.current.has(params.row.id);
        return (
          <IconButton
            size="small"
            onClick={() => toggleRowExpansion(params.row.id)}
            sx={{
              color: '#BB86FC',
              '&:hover': {
                backgroundColor: 'rgba(187, 134, 252, 0.1)',
              },
            }}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </IconButton>
        );
      },
    },
    {
      field: 'bankNameFA',
      headerName: 'بانک',
      width: 150,
      headerAlign: 'right',
      align: 'right',
      filterable: true,
    },
    {
      field: 'loanNameFA',
      headerName: 'نام وام',
      width: 180,
      headerAlign: 'right',
      align: 'right',
      filterable: true,
    },
    {
      field: 'depositRatioLabel',
      headerName: 'ضریب سپرده',
      width: 110,
      headerAlign: 'right',
      align: 'right',
      filterable: true,
      renderCell: (params) => {
        const hasRatio = params.row.depositMultiplier !== null;
        return (
          <span
            style={{
              fontFamily: 'Vazirmatn, sans-serif',
              fontWeight: 500,
              color: hasRatio ? '#03DAC5' : '#666',
              fontSize: '0.85rem',
            }}
          >
            {params.value}
          </span>
        );
      },
    },
    {
      field: 'loanAmount',
      headerName: 'مبلغ وام',
      width: 120,
      headerAlign: 'right',
      align: 'right',
      type: 'number',
      valueFormatter: (value) => formatAmount(value),
      renderCell: (params) => (
        <span style={{ fontFamily: 'Vazirmatn, sans-serif', fontWeight: 500 }}>
          {formatAmount(params.value)}
        </span>
      ),
    },
    {
      field: 'npv',
      headerName: 'NPV',
      width: 120,
      headerAlign: 'right',
      align: 'right',
      type: 'number',
      valueFormatter: (value) => formatAmount(value),
      renderCell: (params) => {
        const color = getPercentileColor(params.row.percentileNPV);
        const bgColor = getPercentileBgColor(params.row.percentileNPV);
        return (
          <span
            style={{
              fontFamily: 'Vazirmatn, sans-serif',
              color,
              backgroundColor: bgColor,
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: params.row.percentileNPV !== undefined && params.row.percentileNPV < 0.1 ? 600 : 500,
            }}
          >
            {formatAmount(params.value)}
          </span>
        );
      },
    },
    {
      field: 'irr',
      headerName: 'IRR',
      width: 100,
      headerAlign: 'right',
      align: 'right',
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      renderCell: (params) => {
        const color = getPercentileColor(params.row.percentileIRR);
        const bgColor = getPercentileBgColor(params.row.percentileIRR);
        return (
          <span
            style={{
              fontFamily: 'Vazirmatn, sans-serif',
              color,
              backgroundColor: bgColor,
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: params.row.percentileIRR !== undefined && params.row.percentileIRR < 0.1 ? 600 : 500,
            }}
          >
            {formatPercent(params.value)}
          </span>
        );
      },
    },
    {
      field: 'monthlyPayment',
      headerName: 'قسط ماهانه',
      width: 120,
      headerAlign: 'right',
      align: 'right',
      type: 'number',
      valueFormatter: (value) => formatAmount(value),
      renderCell: (params) => (
        <span style={{ fontFamily: 'Vazirmatn, sans-serif', fontWeight: 500 }}>
          {formatAmount(params.value)}
        </span>
      ),
    },
    {
      field: 'totalCost',
      headerName: 'هزینه کل',
      width: 120,
      headerAlign: 'right',
      align: 'right',
      type: 'number',
      valueFormatter: (value) => formatAmount(value),
      renderCell: (params) => {
        const color = getPercentileColor(params.row.percentileCost);
        const bgColor = getPercentileBgColor(params.row.percentileCost);
        return (
          <span
            style={{
              fontFamily: 'Vazirmatn, sans-serif',
              color,
              backgroundColor: bgColor,
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: 500,
            }}
          >
            {formatAmount(params.value)}
          </span>
        );
      },
    },
    {
      field: 'effectiveRate',
      headerName: 'نرخ مؤثر',
      width: 100,
      headerAlign: 'right',
      align: 'right',
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      renderCell: (params) => (
        <span style={{ fontFamily: 'monospace' }}>
          {formatPercent(params.value)}
        </span>
      ),
    },
    {
      field: 'riskScore',
      headerName: 'امتیاز',
      width: 100,
      headerAlign: 'right',
      align: 'right',
      type: 'number',
      renderCell: (params) => {
        const score = params.value;
        const color = score >= 70 ? '#03DAC5' : score >= 40 ? '#f59e0b' : '#CF6679';
        const bgColor = score >= 70 ? 'rgba(3, 218, 197, 0.1)' : score >= 40 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(207, 102, 121, 0.1)';
        return (
          <Chip
            label={score.toLocaleString('fa-IR', { maximumFractionDigits: 0 })}
            size="small"
            sx={{
              backgroundColor: bgColor,
              color,
              fontWeight: 600,
              fontFamily: 'Vazirmatn, sans-serif',
              fontSize: '0.875rem',
            }}
          />
        );
      },
    },
    {
      field: 'breakEvenPrivilegePrice',
      headerName: 'قیمت سر‌به‌سر امتیاز',
      width: 150,
      headerAlign: 'right',
      align: 'right',
      type: 'number',
      valueFormatter: (value) => formatAmount(value),
      renderCell: (params) => (
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              fontFamily: 'Vazirmatn, sans-serif',
              color: '#e5e5e5',
            }}
          >
            {formatAmount(params.value)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: '#999999', fontSize: '0.7rem', fontFamily: 'Vazirmatn, sans-serif' }}
          >
            حداکثر قیمت خرید
          </Typography>
        </Box>
      ),
    },
    {
      field: 'maxWaitMonths',
      headerName: 'حداکثر انتظار',
      width: 140,
      headerAlign: 'right',
      align: 'right',
      type: 'number',
      renderCell: (params) => {
        const canAfford = params.row.canAffordCurrentWait;
        return (
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontFamily: 'Vazirmatn, sans-serif',
                color: canAfford ? '#10b981' : '#ef4444',
              }}
            >
              {params.value.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} ماه
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                fontFamily: 'Vazirmatn, sans-serif',
                color: canAfford ? '#10b981' : '#ef4444',
              }}
            >
              {canAfford ? '✓ قابل قبول' : '✗ بیش از حد'}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'recommendation',
      headerName: 'توصیه',
      width: 180,
      headerAlign: 'right',
      align: 'right',
      filterable: true,
      renderCell: (params) => (
        <Box sx={{ textAlign: 'right', width: '100%' }}>
          <RecommendationChip recommendation={params.value} />
          {params.row.reasoning && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: '#999999',
                fontSize: '0.7rem',
                mt: 0.5,
                maxWidth: '160px',
              }}
            >
              {params.row.reasoning}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'meetsRequirement',
      headerName: 'وضعیت',
      width: 80,
      headerAlign: 'center',
      align: 'center',
      type: 'boolean',
      renderCell: (params) => <StatusIndicator meetsRequirement={params.value} />,
    },
  ], []); // Empty deps: columns are static, renderCell closures access current state

  if (filteredData.length === 0) {
    return (
      <div className="bg-surface-800 rounded-lg p-8 border border-surface-700 text-center">
        <p className="text-gray-400 text-lg">
          هیچ وامی یافت نشد
        </p>
      </div>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          height: 'auto',
          minHeight: 400,
          width: '100%',
          backgroundColor: '#020202',
          borderRadius: '8px',
          border: '1px solid #040404',
          overflow: 'hidden',
        }}
      >
        <DataGrid
          key={`datagrid-${rows.length}-${onlySuitable}`}
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25, page: 0 },
            },
            sorting: {
              sortModel: [{ field: 'riskScore', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[25, 50, 100]}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
              csvOptions: {
                fileName: `loan-optimizer-results-${new Date().toISOString().split('T')[0]}`,
                delimiter: ',',
                utf8WithBom: true,
              },
              printOptions: { disableToolbarButton: true },
            },
          }}
          localeText={faIR.components.MuiDataGrid.defaultProps.localeText}
          disableRowSelectionOnClick
          autoHeight
          density="comfortable"
          sx={{
            border: 'none',
            '& .MuiDataGrid-main': {
              backgroundColor: '#020202',
            },
            '& .MuiDataGrid-cell': {
              borderColor: '#040404',
              color: '#b3b3b3',
              fontSize: '0.875rem',
              padding: '12px 16px',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#000000',
              borderColor: '#040404',
              color: '#b3b3b3',
              fontSize: '0.75rem',
              fontWeight: 600,
            },
            '& .MuiDataGrid-columnHeader': {
              '&:hover': {
                backgroundColor: '#020202',
              },
            },
            '& .MuiDataGrid-row': {
              '&:hover': {
                backgroundColor: '#040404',
              },
            },
            '& .MuiDataGrid-footerContainer': {
              backgroundColor: '#000000',
              borderColor: '#040404',
              color: '#999999',
            },
            '& .MuiTablePagination-root': {
              color: '#999999',
            },
            '& .MuiDataGrid-toolbarContainer': {
              padding: '12px 16px',
              backgroundColor: '#000000',
              borderBottom: '1px solid #040404',
              gap: '8px',
              '& .MuiButton-root': {
                color: '#b3b3b3',
                fontSize: '0.875rem',
                '&:hover': {
                  backgroundColor: '#020202',
                },
              },
              '& .MuiInputBase-root': {
                color: '#e5e5e5',
                backgroundColor: '#020202',
                borderRadius: '4px',
                fontSize: '0.875rem',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3d3d3d',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#BB86FC',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#BB86FC',
                },
              },
            },
            '& .MuiDataGrid-columnSeparator': {
              color: '#3d3d3d',
            },
          }}
        />
        <Box
          sx={{
            backgroundColor: '#000000',
            padding: '12px 16px',
            borderTop: '1px solid #040404',
          }}
        >
          <Typography variant="body2" sx={{ color: '#999999' }}>
            تعداد وام‌ها: {filteredData.length.toLocaleString('fa-IR')} از {data.length.toLocaleString('fa-IR')}
          </Typography>
        </Box>
      </Box>

      {/* Expanded Row Details */}
      {expandedRows.size > 0 && (
        <Box sx={{ mt: 3 }}>
          {Array.from(expandedRows).map((rowId) => {
            const loan = rows.find((r) => r.id === rowId);
            if (!loan) return null;

            return (
              <Collapse key={rowId} in={expandedRows.has(rowId)} timeout={300}>
                <Box sx={{ mb: 3 }}>
                  <LoanCalculationDetail loan={loan} />
                </Box>
              </Collapse>
            );
          })}
        </Box>
      )}
    </ThemeProvider>
  );
};

export default memo(OptimizerResultsTable);
