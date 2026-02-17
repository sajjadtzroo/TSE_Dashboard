/**
 * Tests for BarChartCard Component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { BarChartCard } from '../BarChartCard';

// Mock Recharts components
vi.mock('recharts', () => ({
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill, children }: any) => (
    <div data-testid="bar" data-key={dataKey} data-fill={fill}>
      {children}
    </div>
  ),
  XAxis: ({ dataKey, type }: any) => (
    <div data-testid="x-axis" data-key={dataKey} data-type={type} />
  ),
  YAxis: ({ dataKey, type }: any) => (
    <div data-testid="y-axis" data-key={dataKey} data-type={type} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children, height }: any) => (
    <div data-testid="responsive-container" data-height={height}>
      {children}
    </div>
  ),
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Download: () => <div data-testid="download-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  BarChart2: () => <div data-testid="bar-chart-icon" />,
}));

describe('BarChartCard', () => {
  const mockData = [
    { name: 'وام مسکن', value: 500 },
    { name: 'وام خودرو', value: 300 },
    { name: 'وام تحصیلی', value: 200 },
  ];

  describe('Rendering', () => {
    it('should render card with title', () => {
      renderWithProviders(
        <BarChartCard
          title="نمودار میله‌ای"
          data={mockData}
          dataKey="value"
        />
      );
      expect(screen.getByText('نمودار میله‌ای')).toBeInTheDocument();
    });

    it('should render card with title and subtitle', () => {
      renderWithProviders(
        <BarChartCard
          title="نمودار میله‌ای"
          subtitle="توزیع وام‌ها"
          data={mockData}
          dataKey="value"
        />
      );
      expect(screen.getByText('نمودار میله‌ای')).toBeInTheDocument();
      expect(screen.getByText('توزیع وام‌ها')).toBeInTheDocument();
    });

    it('should render responsive container with default height', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
        />
      );
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('data-height', '300');
    });

    it('should render responsive container with custom height', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          height={400}
        />
      );
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('data-height', '400');
    });

    it('should render bar chart with data', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
        />
      );
      const chart = screen.getByTestId('bar-chart');
      expect(chart).toBeInTheDocument();
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toEqual(mockData);
    });

    it('should render bar with correct dataKey', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
        />
      );
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-key', 'value');
    });
  });

  describe('Chart Configuration', () => {
    it('should render with vertical layout by default', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
        />
      );
      const xAxis = screen.getByTestId('x-axis');
      const yAxis = screen.getByTestId('y-axis');
      expect(xAxis).toHaveAttribute('data-type', 'number');
      expect(yAxis).toHaveAttribute('data-type', 'category');
    });

    it('should render with horizontal layout when specified', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          layout="horizontal"
        />
      );
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'name');
    });

    it('should render grid when showGrid is true', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          showGrid={true}
        />
      );
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('should not render grid when showGrid is false', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          showGrid={false}
        />
      );
      expect(screen.queryByTestId('cartesian-grid')).not.toBeInTheDocument();
    });

    it('should render tooltip', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
        />
      );
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should render legend when showLegend is true', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          showLegend={true}
        />
      );
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should not render legend when showLegend is false', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          showLegend={false}
        />
      );
      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });
  });

  describe('Color Scheme', () => {
    it('should use default color for bar', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
        />
      );
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-fill', '#BB86FC');
    });

    it('should use custom color when specified', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          color="#03DAC5"
        />
      );
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-fill', '#03DAC5');
    });

    it('should render cells when multiColor is true', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          multiColor={true}
        />
      );
      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(mockData.length);
    });

    it('should not render cells when multiColor is false', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          multiColor={false}
        />
      );
      expect(screen.queryAllByTestId('cell')).toHaveLength(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when data is empty', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={[]}
          dataKey="value"
        />
      );
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
    });

    it('should not render chart when data is empty', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={[]}
          dataKey="value"
        />
      );
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show skeleton when loading', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          isLoading={true}
        />
      );
      // Skeleton component is rendered
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('should not show chart when loading', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          isLoading={true}
        />
      );
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render refresh button when onRefresh is provided', () => {
      const onRefresh = vi.fn();
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
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
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
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
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
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
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
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
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
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
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          onExpand={onExpand}
        />
      );
      const expandButton = screen.getByLabelText('Expand chart');
      expandButton.click();
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('should render all action buttons when all callbacks are provided', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
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
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
          actions={<button>Custom Action</button>}
        />
      );
      expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
    });
  });

  describe('Data Summary', () => {
    it('should display total items count', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
        />
      );
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should update count when data changes', () => {
      const { rerender } = renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
        />
      );
      expect(screen.getByText('3')).toBeInTheDocument();

      const newData = [...mockData, { name: 'وام ضروری', value: 150 }];
      rerender(
        <BarChartCard
          title="Chart"
          data={newData}
          dataKey="value"
        />
      );
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Persian Text Support', () => {
    it('should render Persian text in title', () => {
      renderWithProviders(
        <BarChartCard
          title="نمودار میله‌ای وام‌ها"
          data={mockData}
          dataKey="value"
        />
      );
      expect(screen.getByText('نمودار میله‌ای وام‌ها')).toBeInTheDocument();
    });

    it('should render Persian text in subtitle', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          subtitle="توزیع انواع وام‌ها در سال ۱۴۰۳"
          data={mockData}
          dataKey="value"
        />
      );
      expect(screen.getByText('توزیع انواع وام‌ها در سال ۱۴۰۳')).toBeInTheDocument();
    });

    it('should handle Persian data in chart', () => {
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mockData}
          dataKey="value"
        />
      );
      const chart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].name).toBe('وام مسکن');
      expect(chartData[1].name).toBe('وام خودرو');
    });
  });

  describe('Data Formatting', () => {
    it('should handle numeric data correctly', () => {
      const numericData = [
        { name: 'Category A', value: 1000000 },
        { name: 'Category B', value: 2500000 },
      ];
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={numericData}
          dataKey="value"
        />
      );
      const chart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].value).toBe(1000000);
      expect(chartData[1].value).toBe(2500000);
    });

    it('should handle mixed data types in data items', () => {
      const mixedData = [
        { name: 'Item 1', value: 100, extra: 'info' },
        { name: 'Item 2', value: 200, extra: 'data' },
      ];
      renderWithProviders(
        <BarChartCard
          title="Chart"
          data={mixedData}
          dataKey="value"
        />
      );
      const chart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].extra).toBe('info');
      expect(chartData[1].extra).toBe('data');
    });
  });
});
