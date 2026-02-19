/**
 * Prop type definitions for shared Rally design system components.
 * These types document the component APIs without requiring component conversion to .tsx.
 */
import type { ReactNode } from 'react';
import type { ChartPoint } from './market';

// ── RallyKPICard ─────────────────────────────────────────────────────────────

export interface RallyKPICardProps {
  title: string;
  value: ReactNode;
  icon: React.ComponentType<{ size?: number | string }>;
  color?: string;
  bgColor?: string;
  subtitle?: string;
  variant?: 'filled' | 'accent-bar';
  trend?: number | null;
  sparklineData?: number[];
  compact?: boolean;
  animateValue?: boolean;
}

// ── RallyMainCard ────────────────────────────────────────────────────────────

export interface RallyMainCardProps {
  title?: ReactNode;
  secondary?: ReactNode;
  children?: ReactNode;
  noPadding?: boolean;
  fullscreenable?: boolean;
  [key: string]: unknown;
}

// ── RallyDataTable ───────────────────────────────────────────────────────────

export interface RallyColumnDef<T = Record<string, unknown>> {
  accessor: string;
  title: string;
  width?: number;
  textAlign?: 'start' | 'end' | 'center';
  sortable?: boolean;
  render?: (record: T) => ReactNode;
}

export interface SortStatus {
  columnAccessor: string;
  direction: 'asc' | 'desc';
}

export interface RallyDataTableProps<T = Record<string, unknown>> {
  records: T[];
  columns: RallyColumnDef<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  onRowClick?: (params: { record: T }) => void;
  idAccessor?: string;
  page?: number;
  onPageChange?: (page: number) => void;
  recordsPerPage?: number;
  recordsPerPageOptions?: number[];
  onRecordsPerPageChange?: (perPage: number) => void;
  totalRecords?: number;
  sortStatus?: SortStatus;
  onSortStatusChange?: (status: SortStatus) => void;
  minHeight?: number;
  pinLeftColumns?: boolean;
  density?: 'compact' | 'normal' | 'comfortable';
  resizable?: boolean;
  storeColumnsKey?: string;
  selectedRecords?: T[];
  onSelectedRecordsChange?: (records: T[]) => void;
}

// ── PageShell ────────────────────────────────────────────────────────────────

export interface PageShellProps {
  loading: boolean;
  error?: string | null;
  hasData: boolean;
  skeleton?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}

// ── PageHeader ───────────────────────────────────────────────────────────────

export interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

// ── Chart Components ─────────────────────────────────────────────────────────

export interface RallyBarChartProps {
  data: ChartPoint[];
  horizontal?: boolean;
  autoColorByValue?: boolean;
  height?: number;
  barWidth?: number;
  cornerRadius?: number;
  xTickAngle?: number;
  yFormatter?: (value: number) => string;
  tooltipFormatter?: (datum: ChartPoint) => string;
}

export interface RallyLineChartProps {
  data: ChartPoint[];
  lineColor?: string;
  height?: number;
  xTickAngle?: number;
  xTickCount?: number;
  yFormatter?: (value: number) => string;
  xFormatter?: (value: string) => string;
  tooltipFormatter?: (datum: ChartPoint) => string;
}

export interface RallyAreaChartProps {
  data: ChartPoint[];
  fillColor?: string;
  strokeColor?: string;
  height?: number;
  xTickAngle?: number;
  xTickCount?: number;
  yFormatter?: (value: number) => string;
  xFormatter?: (value: string) => string;
  tooltipFormatter?: (datum: ChartPoint) => string;
  zoomable?: boolean;
  brushHeight?: number;
}

export interface RallyPieChartProps {
  data: ChartPoint[];
  colorScale?: string[];
  innerRadius?: number;
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
  width?: number;
}
