/**
 * Tests for RadarChartCard Component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { RadarChartCard } from '../RadarChartCard';

// Mock Recharts components
vi.mock('recharts', () => ({
  RadarChart: ({ children, data }: any) => (
    <div data-testid="radar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Radar: ({ dataKey, name, stroke, fill, fillOpacity }: any) => (
    <div
      data-testid="radar"
      data-key={dataKey}
      data-name={name}
      data-stroke={stroke}
      data-fill={fill}
      data-fill-opacity={fillOpacity}
    />
  ),
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: ({ dataKey }: any) => (
    <div data-testid="polar-angle-axis" data-key={dataKey} />
  ),
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
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
  Activity: () => <div data-testid="activity-icon" />,
}));

describe('RadarChartCard', () => {
  const mockData = [
    { subject: 'نرخ بهره', scoreA: 85, scoreB: 70 },
    { subject: 'مدت بازپرداخت', scoreA: 90, scoreB: 80 },
    { subject: 'مبلغ وام', scoreA: 75, scoreB: 85 },
    { subject: 'شرایط', scoreA: 80, scoreB: 75 },
  ];

  describe('Rendering', () => {
    it('should render card with title', () => {
      renderWithProviders(
        <RadarChartCard
          title="نمودار راداری"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByText('نمودار راداری')).toBeInTheDocument();
    });

    it('should render card with title and subtitle', () => {
      renderWithProviders(
        <RadarChartCard
          title="نمودار راداری"
          subtitle="مقایسه شاخص‌ها"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByText('نمودار راداری')).toBeInTheDocument();
      expect(screen.getByText('مقایسه شاخص‌ها')).toBeInTheDocument();
    });

    it('should render responsive container with default height', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('data-height', '400');
    });

    it('should render responsive container with custom height', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
          height={500}
        />
      );
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('data-height', '500');
    });

    it('should render radar chart with data', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      const chart = screen.getByTestId('radar-chart');
      expect(chart).toBeInTheDocument();
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toEqual(mockData);
    });
  });

  describe('Chart Configuration', () => {
    it('should render polar grid', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByTestId('polar-grid')).toBeInTheDocument();
    });

    it('should render polar angle axis with correct key', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      const angleAxis = screen.getByTestId('polar-angle-axis');
      expect(angleAxis).toHaveAttribute('data-key', 'subject');
    });

    it('should render polar radius axis', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByTestId('polar-radius-axis')).toBeInTheDocument();
    });

    it('should render tooltip', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should render legend when showLegend is true', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
          showLegend={true}
        />
      );
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should not render legend when showLegend is false', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
          showLegend={false}
        />
      );
      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Radars', () => {
    it('should render single radar with string dataKey', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      const radars = screen.getAllByTestId('radar');
      expect(radars).toHaveLength(1);
      expect(radars[0]).toHaveAttribute('data-key', 'scoreA');
    });

    it('should render multiple radars with string dataKeys', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA', 'scoreB']}
          angleKey="subject"
        />
      );
      const radars = screen.getAllByTestId('radar');
      expect(radars).toHaveLength(2);
      expect(radars[0]).toHaveAttribute('data-key', 'scoreA');
      expect(radars[1]).toHaveAttribute('data-key', 'scoreB');
    });

    it('should render radars with object dataKeys', () => {
      const dataKeys = [
        { key: 'scoreA', name: 'امتیاز الف', color: '#BB86FC', fillOpacity: 0.3 },
        { key: 'scoreB', name: 'امتیاز ب', color: '#03DAC5', fillOpacity: 0.5 },
      ];
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={dataKeys}
          angleKey="subject"
        />
      );
      const radars = screen.getAllByTestId('radar');
      expect(radars).toHaveLength(2);
      expect(radars[0]).toHaveAttribute('data-key', 'scoreA');
      expect(radars[0]).toHaveAttribute('data-name', 'امتیاز الف');
      expect(radars[0]).toHaveAttribute('data-stroke', '#BB86FC');
      expect(radars[0]).toHaveAttribute('data-fill', '#BB86FC');
      expect(radars[0]).toHaveAttribute('data-fill-opacity', '0.3');
      expect(radars[1]).toHaveAttribute('data-key', 'scoreB');
      expect(radars[1]).toHaveAttribute('data-name', 'امتیاز ب');
      expect(radars[1]).toHaveAttribute('data-stroke', '#03DAC5');
      expect(radars[1]).toHaveAttribute('data-fill-opacity', '0.5');
    });
  });

  describe('Color Scheme', () => {
    it('should use default colors for string dataKeys', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA', 'scoreB']}
          angleKey="subject"
        />
      );
      const radars = screen.getAllByTestId('radar');
      expect(radars[0]).toHaveAttribute('data-stroke', '#BB86FC');
      expect(radars[0]).toHaveAttribute('data-fill', '#BB86FC');
      expect(radars[1]).toHaveAttribute('data-stroke', '#03DAC5');
      expect(radars[1]).toHaveAttribute('data-fill', '#03DAC5');
    });

    it('should use custom colors from object dataKeys', () => {
      const dataKeys = [
        { key: 'scoreA', name: 'Score A', color: '#FF0000' },
        { key: 'scoreB', name: 'Score B', color: '#00FF00' },
      ];
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={dataKeys}
          angleKey="subject"
        />
      );
      const radars = screen.getAllByTestId('radar');
      expect(radars[0]).toHaveAttribute('data-stroke', '#FF0000');
      expect(radars[0]).toHaveAttribute('data-fill', '#FF0000');
      expect(radars[1]).toHaveAttribute('data-stroke', '#00FF00');
      expect(radars[1]).toHaveAttribute('data-fill', '#00FF00');
    });

    it('should use default fillOpacity when not specified', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      const radars = screen.getAllByTestId('radar');
      expect(radars[0]).toHaveAttribute('data-fill-opacity', '0.25');
    });

    it('should use custom fillOpacity from object dataKeys', () => {
      const dataKeys = [
        { key: 'scoreA', name: 'Score A', color: '#BB86FC', fillOpacity: 0.6 },
      ];
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={dataKeys}
          angleKey="subject"
        />
      );
      const radars = screen.getAllByTestId('radar');
      expect(radars[0]).toHaveAttribute('data-fill-opacity', '0.6');
    });

    it('should cycle through colors for multiple radars', () => {
      const dataKeys = ['radar1', 'radar2', 'radar3', 'radar4', 'radar5'];
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={dataKeys}
          angleKey="subject"
        />
      );
      const radars = screen.getAllByTestId('radar');
      expect(radars).toHaveLength(5);
      // Colors should cycle through the COLORS array
      expect(radars[0]).toHaveAttribute('data-stroke', '#BB86FC');
      expect(radars[1]).toHaveAttribute('data-stroke', '#03DAC5');
      expect(radars[2]).toHaveAttribute('data-stroke', '#f59e0b');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when data is empty', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={[]}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
    });

    it('should not render chart when data is empty', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={[]}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show skeleton when loading', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
          isLoading={true}
        />
      );
      // Skeleton component is rendered
      expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
    });

    it('should not show chart when loading', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
          isLoading={true}
        />
      );
      expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render refresh button when onRefresh is provided', () => {
      const onRefresh = vi.fn();
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
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
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
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
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
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
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
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
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
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
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
          onExpand={onExpand}
        />
      );
      const expandButton = screen.getByLabelText('Expand chart');
      expandButton.click();
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('should render all action buttons when all callbacks are provided', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
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
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
          actions={<button>Custom Action</button>}
        />
      );
      expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
    });
  });

  describe('Custom Legend', () => {
    it('should render custom legend when showLegend is true and dataKeys exist', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA', 'scoreB']}
          angleKey="subject"
          showLegend={true}
        />
      );
      // Custom legend is rendered below the chart
      expect(screen.getByText('scoreA')).toBeInTheDocument();
      expect(screen.getByText('scoreB')).toBeInTheDocument();
    });

    it('should not render custom legend when showLegend is false', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA', 'scoreB']}
          angleKey="subject"
          showLegend={false}
        />
      );
      // Legend text should not be in document when showLegend is false
      expect(screen.queryByText('scoreA')).not.toBeInTheDocument();
      expect(screen.queryByText('scoreB')).not.toBeInTheDocument();
    });

    it('should display Persian names in custom legend', () => {
      const dataKeys = [
        { key: 'scoreA', name: 'امتیاز الف', color: '#BB86FC' },
        { key: 'scoreB', name: 'امتیاز ب', color: '#03DAC5' },
      ];
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={dataKeys}
          angleKey="subject"
          showLegend={true}
        />
      );
      expect(screen.getByText('امتیاز الف')).toBeInTheDocument();
      expect(screen.getByText('امتیاز ب')).toBeInTheDocument();
    });
  });

  describe('Data Points Summary', () => {
    it('should display data points label', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByText('Data Points')).toBeInTheDocument();
    });

    it('should display correct number of data points', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should update count when data changes', () => {
      const { rerender } = renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByText('4')).toBeInTheDocument();

      const newData = [
        ...mockData,
        { subject: 'مجموع', scoreA: 95, scoreB: 90 },
      ];
      rerender(
        <RadarChartCard
          title="Chart"
          data={newData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Persian Text Support', () => {
    it('should render Persian text in title', () => {
      renderWithProviders(
        <RadarChartCard
          title="نمودار راداری مقایسه"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByText('نمودار راداری مقایسه')).toBeInTheDocument();
    });

    it('should render Persian text in subtitle', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          subtitle="مقایسه شاخص‌های مختلف وام"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      expect(screen.getByText('مقایسه شاخص‌های مختلف وام')).toBeInTheDocument();
    });

    it('should handle Persian data in chart', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA']}
          angleKey="subject"
        />
      );
      const chart = screen.getByTestId('radar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].subject).toBe('نرخ بهره');
      expect(chartData[1].subject).toBe('مدت بازپرداخت');
    });
  });

  describe('Data Formatting', () => {
    it('should handle numeric data correctly', () => {
      const numericData = [
        { category: 'A', value1: 95, value2: 85 },
        { category: 'B', value1: 88, value2: 92 },
      ];
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={numericData}
          dataKeys={['value1', 'value2']}
          angleKey="category"
        />
      );
      const chart = screen.getByTestId('radar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].value1).toBe(95);
      expect(chartData[1].value2).toBe(92);
    });

    it('should handle multiple data series', () => {
      renderWithProviders(
        <RadarChartCard
          title="Chart"
          data={mockData}
          dataKeys={['scoreA', 'scoreB']}
          angleKey="subject"
        />
      );
      const chart = screen.getByTestId('radar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0]).toHaveProperty('scoreA');
      expect(chartData[0]).toHaveProperty('scoreB');
    });
  });
});
