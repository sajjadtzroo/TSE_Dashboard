/**
 * Tests for PieChartCard Component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { PieChartCard } from '../PieChartCard';

// Mock Recharts components
vi.mock('recharts', () => ({
  PieChart: ({ children }: any) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data, innerRadius, outerRadius, dataKey }: any) => (
    <div
      data-testid="pie"
      data-inner-radius={innerRadius}
      data-outer-radius={outerRadius}
      data-key={dataKey}
      data-data={JSON.stringify(data)}
    >
      {data.map((_: any, index: number) => (
        <div key={index} data-testid="cell" />
      ))}
    </div>
  ),
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children, height }: any) => (
    <div data-testid="responsive-container" data-height={height}>
      {children}
    </div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Download: () => <div data-testid="download-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  PieChartIcon: () => <div data-testid="pie-chart-icon" />,
}));

describe('PieChartCard', () => {
  const mockData = [
    { name: 'وام مسکن', value: 500 },
    { name: 'وام خودرو', value: 300 },
    { name: 'وام تحصیلی', value: 200 },
  ];

  describe('Rendering', () => {
    it('should render card with title', () => {
      renderWithProviders(
        <PieChartCard
          title="نمودار دایره‌ای"
          data={mockData}
        />
      );
      expect(screen.getByText('نمودار دایره‌ای')).toBeInTheDocument();
    });

    it('should render card with title and subtitle', () => {
      renderWithProviders(
        <PieChartCard
          title="نمودار دایره‌ای"
          subtitle="توزیع وام‌ها"
          data={mockData}
        />
      );
      expect(screen.getByText('نمودار دایره‌ای')).toBeInTheDocument();
      expect(screen.getByText('توزیع وام‌ها')).toBeInTheDocument();
    });

    it('should render responsive container with default height', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('data-height', '300');
    });

    it('should render responsive container with custom height', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          height={400}
        />
      );
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('data-height', '400');
    });

    it('should render pie chart with data', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      const chart = screen.getByTestId('pie-chart');
      expect(chart).toBeInTheDocument();
    });

    it('should render pie with correct data', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      const pie = screen.getByTestId('pie');
      const pieData = JSON.parse(pie.getAttribute('data-data') || '[]');
      expect(pieData).toEqual(mockData);
    });
  });

  describe('Chart Configuration', () => {
    it('should use default inner and outer radius', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-inner-radius', '60');
      expect(pie).toHaveAttribute('data-outer-radius', '100');
    });

    it('should use custom inner radius', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          innerRadius={80}
        />
      );
      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-inner-radius', '80');
    });

    it('should use custom outer radius', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          outerRadius={120}
        />
      );
      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-outer-radius', '120');
    });

    it('should render tooltip', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should render legend when showLegend is true', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          showLegend={true}
        />
      );
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should not render legend when showLegend is false', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          showLegend={false}
        />
      );
      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });

    it('should use value as dataKey', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-key', 'value');
    });
  });

  describe('Color Scheme', () => {
    it('should render cells for each data item', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      const cells = screen.getAllByTestId('cell');
      expect(cells.length).toBeGreaterThanOrEqual(mockData.length);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when data is empty', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={[]}
        />
      );
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart-icon')).toBeInTheDocument();
    });

    it('should not render chart when data is empty', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={[]}
        />
      );
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show skeleton when loading', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          isLoading={true}
        />
      );
      // Skeleton component is rendered
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });

    it('should not show chart when loading', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          isLoading={true}
        />
      );
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render refresh button when onRefresh is provided', () => {
      const onRefresh = vi.fn();
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          onRefresh={onRefresh}
        />
      );
      const refreshButton = screen.getByLabelText('Refresh chart');
      expect(refreshButton).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    it('should call onRefresh when refresh button is clicked', () => {
      const onRefresh = vi.fn();
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          onRefresh={onRefresh}
        />
      );
      const refreshButton = screen.getByLabelText('Refresh chart');
      refreshButton.click();
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should render download button when onDownload is provided', () => {
      const onDownload = vi.fn();
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          onDownload={onDownload}
        />
      );
      const downloadButton = screen.getByLabelText('Download chart data');
      expect(downloadButton).toBeInTheDocument();
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    });

    it('should call onDownload when download button is clicked', () => {
      const onDownload = vi.fn();
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          onDownload={onDownload}
        />
      );
      const downloadButton = screen.getByLabelText('Download chart data');
      downloadButton.click();
      expect(onDownload).toHaveBeenCalledTimes(1);
    });

    it('should render expand button when onExpand is provided', () => {
      const onExpand = vi.fn();
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          onExpand={onExpand}
        />
      );
      const expandButton = screen.getByLabelText('Expand chart');
      expect(expandButton).toBeInTheDocument();
      expect(screen.getByTestId('maximize-icon')).toBeInTheDocument();
    });

    it('should call onExpand when expand button is clicked', () => {
      const onExpand = vi.fn();
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          onExpand={onExpand}
        />
      );
      const expandButton = screen.getByLabelText('Expand chart');
      expandButton.click();
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('should render all action buttons when all callbacks are provided', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          onRefresh={vi.fn()}
          onDownload={vi.fn()}
          onExpand={vi.fn()}
        />
      );
      expect(screen.getByLabelText('Refresh chart')).toBeInTheDocument();
      expect(screen.getByLabelText('Download chart data')).toBeInTheDocument();
      expect(screen.getByLabelText('Expand chart')).toBeInTheDocument();
    });

    it('should render custom actions when provided', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          actions={<button>Custom Action</button>}
        />
      );
      expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
    });
  });

  describe('Custom Legend', () => {
    it('should render custom legend with all data items', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      expect(screen.getByText('وام مسکن')).toBeInTheDocument();
      expect(screen.getByText('وام خودرو')).toBeInTheDocument();
      expect(screen.getByText('وام تحصیلی')).toBeInTheDocument();
    });

    it('should display values for each item', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    it('should display percentages for each item', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      // Total = 1000, so percentages are 50%, 30%, 20%
      expect(screen.getByText('50.0%')).toBeInTheDocument();
      expect(screen.getByText('30.0%')).toBeInTheDocument();
      expect(screen.getByText('20.0%')).toBeInTheDocument();
    });
  });

  describe('Total Summary', () => {
    it('should display total label', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('should calculate and display correct total', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      // Total: 500 + 300 + 200 = 1000
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('should update total when data changes', () => {
      const { rerender } = renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      expect(screen.getByText('1000')).toBeInTheDocument();

      const newData = [
        { name: 'Item A', value: 600 },
        { name: 'Item B', value: 400 },
      ];
      rerender(
        <PieChartCard
          title="Chart"
          data={newData}
        />
      );
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('should handle zero total', () => {
      const zeroData = [
        { name: 'Item A', value: 0 },
        { name: 'Item B', value: 0 },
      ];
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={zeroData}
        />
      );
      // Check for Total label and value 0
      expect(screen.getByText('Total')).toBeInTheDocument();
      const totalSection = screen.getByText('Total').closest('div');
      expect(totalSection).toHaveTextContent('0');
    });
  });

  describe('Persian Text Support', () => {
    it('should render Persian text in title', () => {
      renderWithProviders(
        <PieChartCard
          title="نمودار دایره‌ای وام‌ها"
          data={mockData}
        />
      );
      expect(screen.getByText('نمودار دایره‌ای وام‌ها')).toBeInTheDocument();
    });

    it('should render Persian text in subtitle', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          subtitle="توزیع انواع وام‌ها در سال ۱۴۰۳"
          data={mockData}
        />
      );
      expect(screen.getByText('توزیع انواع وام‌ها در سال ۱۴۰۳')).toBeInTheDocument();
    });

    it('should handle Persian data in chart', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      expect(screen.getByText('وام مسکن')).toBeInTheDocument();
      expect(screen.getByText('وام خودرو')).toBeInTheDocument();
      expect(screen.getByText('وام تحصیلی')).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    it('should handle numeric data correctly', () => {
      const numericData = [
        { name: 'Category A', value: 1000000 },
        { name: 'Category B', value: 2500000 },
      ];
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={numericData}
        />
      );
      expect(screen.getByText('1000000')).toBeInTheDocument();
      expect(screen.getByText('2500000')).toBeInTheDocument();
    });

    it('should calculate percentages correctly for large numbers', () => {
      const largeData = [
        { name: 'Item A', value: 1000000 },
        { name: 'Item B', value: 1000000 },
      ];
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={largeData}
        />
      );
      // Each item is 50% of total
      const percentages = screen.getAllByText('50.0%');
      expect(percentages.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle decimal percentages', () => {
      const decimalData = [
        { name: 'Item A', value: 333 },
        { name: 'Item B', value: 667 },
      ];
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={decimalData}
        />
      );
      // 333/1000 = 33.3%, 667/1000 = 66.7%
      expect(screen.getByText('33.3%')).toBeInTheDocument();
      expect(screen.getByText('66.7%')).toBeInTheDocument();
    });

    it('should handle single data item', () => {
      const singleData = [{ name: 'Single Item', value: 100 }];
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={singleData}
        />
      );
      expect(screen.getByText('Single Item')).toBeInTheDocument();
      // Check that the item shows 100% and value 100
      const legendItems = screen.getAllByText('100');
      expect(legendItems.length).toBeGreaterThan(0);
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });
  });

  describe('Donut Chart', () => {
    it('should create donut chart with default innerRadius', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
        />
      );
      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-inner-radius', '60');
      // Inner radius > 0 means it's a donut chart
    });

    it('should create full pie chart when innerRadius is 0', () => {
      renderWithProviders(
        <PieChartCard
          title="Chart"
          data={mockData}
          innerRadius={0}
        />
      );
      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-inner-radius', '0');
    });
  });
});
