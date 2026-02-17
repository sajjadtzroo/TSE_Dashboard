/**
 * Tests for LineChartCard Component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { LineChartCard } from '../LineChartCard';

// Mock Recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, name, stroke }: any) => (
    <div
      data-testid="line"
      data-key={dataKey}
      data-name={name}
      data-stroke={stroke}
    />
  ),
  XAxis: ({ dataKey }: any) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
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
}));

describe('LineChartCard', () => {
  const mockData = [
    { month: 'فروردین', principal: 100, interest: 20 },
    { month: 'اردیبهشت', principal: 120, interest: 25 },
    { month: 'خرداد', principal: 150, interest: 30 },
  ];

  describe('Rendering', () => {
    it('should render card with title', () => {
      renderWithProviders(
        <LineChartCard
          title="نمودار خطی"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      expect(screen.getByText('نمودار خطی')).toBeInTheDocument();
    });

    it('should render card with title and subtitle', () => {
      renderWithProviders(
        <LineChartCard
          title="نمودار خطی"
          subtitle="روند بازپرداخت"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      expect(screen.getByText('نمودار خطی')).toBeInTheDocument();
      expect(screen.getByText('روند بازپرداخت')).toBeInTheDocument();
    });

    it('should render responsive container with default height', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('data-height', '300');
    });

    it('should render responsive container with custom height', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
          height={500}
        />
      );
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('data-height', '500');
    });

    it('should render line chart with data', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      const chart = screen.getByTestId('line-chart');
      expect(chart).toBeInTheDocument();
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toEqual(mockData);
    });
  });

  describe('Chart Configuration', () => {
    it('should render x-axis with correct key', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'month');
    });

    it('should render y-axis', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('should render grid when showGrid is true', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
          showGrid={true}
        />
      );
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('should not render grid when showGrid is false', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
          showGrid={false}
        />
      );
      expect(screen.queryByTestId('cartesian-grid')).not.toBeInTheDocument();
    });

    it('should render tooltip', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should render legend when showLegend is true', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
          showLegend={true}
        />
      );
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should not render legend when showLegend is false', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
          showLegend={false}
        />
      );
      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Lines', () => {
    it('should render single line with string dataKey', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toHaveAttribute('data-key', 'principal');
    });

    it('should render multiple lines with string dataKeys', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal', 'interest']}
          xAxisKey="month"
        />
      );
      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toHaveAttribute('data-key', 'principal');
      expect(lines[1]).toHaveAttribute('data-key', 'interest');
    });

    it('should render lines with object dataKeys', () => {
      const dataKeys = [
        { key: 'principal', name: 'اصل وام', color: '#BB86FC' },
        { key: 'interest', name: 'سود', color: '#03DAC5' },
      ];
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={dataKeys}
          xAxisKey="month"
        />
      );
      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toHaveAttribute('data-key', 'principal');
      expect(lines[0]).toHaveAttribute('data-name', 'اصل وام');
      expect(lines[0]).toHaveAttribute('data-stroke', '#BB86FC');
      expect(lines[1]).toHaveAttribute('data-key', 'interest');
      expect(lines[1]).toHaveAttribute('data-name', 'سود');
      expect(lines[1]).toHaveAttribute('data-stroke', '#03DAC5');
    });
  });

  describe('Color Scheme', () => {
    it('should use default colors for string dataKeys', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal', 'interest']}
          xAxisKey="month"
        />
      );
      const lines = screen.getAllByTestId('line');
      expect(lines[0]).toHaveAttribute('data-stroke', '#BB86FC');
      expect(lines[1]).toHaveAttribute('data-stroke', '#03DAC5');
    });

    it('should use custom colors from object dataKeys', () => {
      const dataKeys = [
        { key: 'principal', name: 'Principal', color: '#FF0000' },
        { key: 'interest', name: 'Interest', color: '#00FF00' },
      ];
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={dataKeys}
          xAxisKey="month"
        />
      );
      const lines = screen.getAllByTestId('line');
      expect(lines[0]).toHaveAttribute('data-stroke', '#FF0000');
      expect(lines[1]).toHaveAttribute('data-stroke', '#00FF00');
    });

    it('should cycle through colors for multiple lines', () => {
      const dataKeys = ['line1', 'line2', 'line3', 'line4', 'line5'];
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={dataKeys}
          xAxisKey="month"
        />
      );
      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(5);
      // Colors should cycle through the COLORS array
      expect(lines[0]).toHaveAttribute('data-stroke', '#BB86FC');
      expect(lines[1]).toHaveAttribute('data-stroke', '#03DAC5');
      expect(lines[2]).toHaveAttribute('data-stroke', '#f59e0b');
    });
  });

  describe('Loading State', () => {
    it('should show skeleton when loading', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
          isLoading={true}
        />
      );
      // Skeleton component is rendered
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('should not show chart when loading', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
          isLoading={true}
        />
      );
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render refresh button when onRefresh is provided', () => {
      const onRefresh = vi.fn();
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
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
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
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
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
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
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
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
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
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
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
          onExpand={onExpand}
        />
      );
      const expandButton = screen.getByLabelText('Expand chart');
      expandButton.click();
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('should render all action buttons when all callbacks are provided', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
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
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
          actions={<button>Custom Action</button>}
        />
      );
      expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
    });
  });

  describe('Persian Text Support', () => {
    it('should render Persian text in title', () => {
      renderWithProviders(
        <LineChartCard
          title="نمودار خطی بازپرداخت"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      expect(screen.getByText('نمودار خطی بازپرداخت')).toBeInTheDocument();
    });

    it('should render Persian text in subtitle', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          subtitle="روند ماهانه پرداخت اقساط"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      expect(screen.getByText('روند ماهانه پرداخت اقساط')).toBeInTheDocument();
    });

    it('should handle Persian data in chart', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal']}
          xAxisKey="month"
        />
      );
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].month).toBe('فروردین');
      expect(chartData[1].month).toBe('اردیبهشت');
    });

    it('should handle Persian line names', () => {
      const dataKeys = [
        { key: 'principal', name: 'اصل وام', color: '#BB86FC' },
        { key: 'interest', name: 'سود', color: '#03DAC5' },
      ];
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={dataKeys}
          xAxisKey="month"
        />
      );
      const lines = screen.getAllByTestId('line');
      expect(lines[0]).toHaveAttribute('data-name', 'اصل وام');
      expect(lines[1]).toHaveAttribute('data-name', 'سود');
    });
  });

  describe('Data Formatting', () => {
    it('should handle numeric data correctly', () => {
      const numericData = [
        { month: 'Jan', value: 1000000 },
        { month: 'Feb', value: 2500000 },
      ];
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={numericData}
          dataKeys={['value']}
          xAxisKey="month"
        />
      );
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].value).toBe(1000000);
      expect(chartData[1].value).toBe(2500000);
    });

    it('should handle multiple data series', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal', 'interest']}
          xAxisKey="month"
        />
      );
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0]).toHaveProperty('principal');
      expect(chartData[0]).toHaveProperty('interest');
    });
  });

  describe('Custom Legend', () => {
    it('should render custom legend when showLegend is true and dataKeys exist', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal', 'interest']}
          xAxisKey="month"
          showLegend={true}
        />
      );
      // Custom legend is rendered below the chart
      expect(screen.getByText('principal')).toBeInTheDocument();
      expect(screen.getByText('interest')).toBeInTheDocument();
    });

    it('should not render custom legend when showLegend is false', () => {
      renderWithProviders(
        <LineChartCard
          title="Chart"
          data={mockData}
          dataKeys={['principal', 'interest']}
          xAxisKey="month"
          showLegend={false}
        />
      );
      // Legend text should not be in document when showLegend is false
      expect(screen.queryByText('principal')).not.toBeInTheDocument();
      expect(screen.queryByText('interest')).not.toBeInTheDocument();
    });
  });
});
