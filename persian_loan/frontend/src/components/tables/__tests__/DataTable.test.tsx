/**
 * Tests for DataTable Component
 *
 * Covers: rendering, columns, rows, loading state, empty state,
 * row click handling, custom renderers, Persian text, keyExtractor,
 * className passthrough, and module exports.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '../DataTable';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

interface TestRow {
  id: string;
  name: string;
  amount: number;
  status: string;
  [key: string]: unknown;
}

const sampleColumns = [
  { key: 'name', header: 'نام' },
  { key: 'amount', header: 'مبلغ' },
  { key: 'status', header: 'وضعیت' },
];

const sampleData: TestRow[] = [
  { id: '1', name: 'وام مسکن', amount: 500000000, status: 'فعال' },
  { id: '2', name: 'وام خودرو', amount: 300000000, status: 'غیرفعال' },
  { id: '3', name: 'وام ازدواج', amount: 200000000, status: 'فعال' },
];

const keyExtractor = (item: TestRow) => item.id;

// ===========================================================================
// DataTable Component
// ===========================================================================

describe('DataTable', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('should render without crashing with valid data', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      expect(container.firstElementChild).toBeInTheDocument();
    });

    it('should render a table element', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    it('should render within an overflow-x-auto wrapper', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('overflow-x-auto');
    });
  });

  // -------------------------------------------------------------------------
  // Column headers
  // -------------------------------------------------------------------------

  describe('column headers', () => {
    it('should render all column headers', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      expect(screen.getByText('نام')).toBeInTheDocument();
      expect(screen.getByText('مبلغ')).toBeInTheDocument();
      expect(screen.getByText('وضعیت')).toBeInTheDocument();
    });

    it('should render column headers as <th> elements', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const headerEl = screen.getByText('نام');
      expect(headerEl.tagName).toBe('TH');
    });

    it('should apply correct styling classes to column headers', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const headerEl = screen.getByText('نام');
      expect(headerEl).toHaveClass('px-6', 'py-3', 'text-right', 'text-xs');
    });

    it('should render headers inside a thead element', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const thead = container.querySelector('thead');
      expect(thead).toBeInTheDocument();
      expect(thead).toHaveClass('bg-surface-50');
    });

    it('should apply custom className to column headers', () => {
      const columnsWithClass = [
        { key: 'name', header: 'نام', className: 'custom-header-class' },
      ];
      render(
        <DataTable data={sampleData} columns={columnsWithClass} keyExtractor={keyExtractor} />
      );
      const headerEl = screen.getByText('نام');
      expect(headerEl).toHaveClass('custom-header-class');
    });
  });

  // -------------------------------------------------------------------------
  // Data rows
  // -------------------------------------------------------------------------

  describe('data rows', () => {
    it('should render a row for each data item', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const tbody = container.querySelector('tbody');
      const rows = tbody?.querySelectorAll('tr');
      expect(rows).toHaveLength(3);
    });

    it('should display cell values from data using column keys', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      expect(screen.getByText('وام مسکن')).toBeInTheDocument();
      expect(screen.getByText('500000000')).toBeInTheDocument();
      // 'فعال' appears in multiple rows, so use getAllByText
      const activeTexts = screen.getAllByText('فعال');
      expect(activeTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('should render cell values as <td> elements', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const cell = screen.getByText('وام مسکن');
      expect(cell.tagName).toBe('TD');
    });

    it('should apply correct styling classes to data cells', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const cell = screen.getByText('وام مسکن');
      expect(cell).toHaveClass('px-6', 'py-4', 'whitespace-nowrap', 'text-sm');
    });

    it('should render rows inside a tbody element', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
      expect(tbody).toHaveClass('bg-surface-100');
    });

    it('should apply custom className to data cells', () => {
      const columnsWithClass = [
        { key: 'name', header: 'نام', className: 'custom-cell-class' },
      ];
      render(
        <DataTable data={sampleData} columns={columnsWithClass} keyExtractor={keyExtractor} />
      );
      const cell = screen.getByText('وام مسکن');
      expect(cell).toHaveClass('custom-cell-class');
    });

    it('should handle undefined values gracefully (render empty string)', () => {
      const dataWithMissing: TestRow[] = [
        { id: '1', name: 'Test', amount: 100, status: 'active' },
      ];
      const columnsWithMissing = [
        { key: 'name', header: 'Name' },
        { key: 'missingKey', header: 'Missing' },
      ];
      const { container } = render(
        <DataTable
          data={dataWithMissing as any}
          columns={columnsWithMissing}
          keyExtractor={(item: any) => item.id}
        />
      );
      // The missing key cell should render empty string
      const cells = container.querySelectorAll('td');
      expect(cells).toHaveLength(2);
      expect(cells[1].textContent).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Persian text rendering
  // -------------------------------------------------------------------------

  describe('Persian text', () => {
    it('should correctly render Persian column headers', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      expect(screen.getByText('نام')).toBeInTheDocument();
      expect(screen.getByText('مبلغ')).toBeInTheDocument();
      expect(screen.getByText('وضعیت')).toBeInTheDocument();
    });

    it('should correctly render Persian cell values', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      expect(screen.getByText('وام مسکن')).toBeInTheDocument();
      expect(screen.getByText('وام خودرو')).toBeInTheDocument();
      expect(screen.getByText('وام ازدواج')).toBeInTheDocument();
    });

    it('should render the default empty message in Persian', () => {
      render(
        <DataTable data={[]} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      expect(screen.getByText('اطلاعاتی یافت نشد')).toBeInTheDocument();
    });

    it('should use text-right alignment for headers (RTL support)', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const header = screen.getByText('نام');
      expect(header).toHaveClass('text-right');
    });
  });

  // -------------------------------------------------------------------------
  // Custom renderers
  // -------------------------------------------------------------------------

  describe('custom column renderers', () => {
    it('should use custom render function when provided', () => {
      const columnsWithRenderer = [
        {
          key: 'amount',
          header: 'مبلغ',
          render: (item: TestRow) => (
            <span data-testid="formatted-amount">{item.amount.toLocaleString('fa-IR')} ریال</span>
          ),
        },
      ];
      render(
        <DataTable data={sampleData} columns={columnsWithRenderer} keyExtractor={keyExtractor} />
      );
      const formatted = screen.getAllByTestId('formatted-amount');
      expect(formatted).toHaveLength(3);
    });

    it('should pass the full item to the render function', () => {
      const renderFn = vi.fn((item: TestRow) => <span>{item.name} - {item.status}</span>);
      const columnsWithRenderer = [
        { key: 'name', header: 'نام', render: renderFn },
      ];
      render(
        <DataTable data={sampleData} columns={columnsWithRenderer} keyExtractor={keyExtractor} />
      );
      expect(renderFn).toHaveBeenCalledTimes(3);
      expect(renderFn).toHaveBeenCalledWith(sampleData[0]);
      expect(renderFn).toHaveBeenCalledWith(sampleData[1]);
      expect(renderFn).toHaveBeenCalledWith(sampleData[2]);
    });

    it('should fall back to string display when render is not provided', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      // The amount should be displayed as a plain string
      expect(screen.getByText('500000000')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Row click handling
  // -------------------------------------------------------------------------

  describe('row click handling', () => {
    it('should call onRowClick with the item when a row is clicked', () => {
      const onRowClick = vi.fn();
      render(
        <DataTable
          data={sampleData}
          columns={sampleColumns}
          keyExtractor={keyExtractor}
          onRowClick={onRowClick}
        />
      );
      const firstRowCell = screen.getByText('وام مسکن');
      fireEvent.click(firstRowCell.closest('tr')!);
      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenCalledWith(sampleData[0]);
    });

    it('should add cursor-pointer class when onRowClick is provided', () => {
      const onRowClick = vi.fn();
      render(
        <DataTable
          data={sampleData}
          columns={sampleColumns}
          keyExtractor={keyExtractor}
          onRowClick={onRowClick}
        />
      );
      const firstRow = screen.getByText('وام مسکن').closest('tr')!;
      expect(firstRow).toHaveClass('cursor-pointer');
    });

    it('should not add cursor-pointer class when onRowClick is not provided', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const firstRow = screen.getByText('وام مسکن').closest('tr')!;
      expect(firstRow).not.toHaveClass('cursor-pointer');
    });

    it('should apply hover class to rows', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const firstRow = screen.getByText('وام مسکن').closest('tr')!;
      expect(firstRow).toHaveClass('hover:bg-surface-50', 'transition-colors');
    });

    it('should not throw when clicking a row without onRowClick', () => {
      render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const firstRow = screen.getByText('وام مسکن').closest('tr')!;
      expect(() => fireEvent.click(firstRow)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe('loading state', () => {
    it('should render a loading spinner when isLoading is true', () => {
      const { container } = render(
        <DataTable
          data={sampleData}
          columns={sampleColumns}
          keyExtractor={keyExtractor}
          isLoading={true}
        />
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not render the table when loading', () => {
      const { container } = render(
        <DataTable
          data={sampleData}
          columns={sampleColumns}
          keyExtractor={keyExtractor}
          isLoading={true}
        />
      );
      const table = container.querySelector('table');
      expect(table).not.toBeInTheDocument();
    });

    it('should render the spinner inside a centered container', () => {
      const { container } = render(
        <DataTable
          data={sampleData}
          columns={sampleColumns}
          keyExtractor={keyExtractor}
          isLoading={true}
        />
      );
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center', 'h-32');
    });

    it('should render the spinner with correct size and border classes', () => {
      const { container } = render(
        <DataTable
          data={sampleData}
          columns={sampleColumns}
          keyExtractor={keyExtractor}
          isLoading={true}
        />
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-primary-400');
    });

    it('should not show loading state when isLoading is false', () => {
      const { container } = render(
        <DataTable
          data={sampleData}
          columns={sampleColumns}
          keyExtractor={keyExtractor}
          isLoading={false}
        />
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  describe('empty state', () => {
    it('should render default empty message when data is empty', () => {
      render(
        <DataTable data={[]} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      expect(screen.getByText('اطلاعاتی یافت نشد')).toBeInTheDocument();
    });

    it('should render custom empty message when provided', () => {
      render(
        <DataTable
          data={[]}
          columns={sampleColumns}
          keyExtractor={keyExtractor}
          emptyMessage="داده‌ای موجود نیست"
        />
      );
      expect(screen.getByText('داده‌ای موجود نیست')).toBeInTheDocument();
    });

    it('should not render a table when data is empty', () => {
      const { container } = render(
        <DataTable data={[]} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const table = container.querySelector('table');
      expect(table).not.toBeInTheDocument();
    });

    it('should apply centered text styling to empty message', () => {
      render(
        <DataTable data={[]} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const message = screen.getByText('اطلاعاتی یافت نشد');
      expect(message).toHaveClass('text-center', 'py-8', 'text-gray-400');
    });
  });

  // -------------------------------------------------------------------------
  // keyExtractor
  // -------------------------------------------------------------------------

  describe('keyExtractor', () => {
    it('should use keyExtractor to provide unique keys for rows', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      // Verify rows are rendered (keys are internal React concerns, but we verify row count)
      const tbody = container.querySelector('tbody');
      const rows = tbody?.querySelectorAll('tr');
      expect(rows).toHaveLength(3);
    });

    it('should work with a custom keyExtractor function', () => {
      const customKeyExtractor = (item: TestRow) => `custom-${item.id}`;
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={customKeyExtractor} />
      );
      const tbody = container.querySelector('tbody');
      const rows = tbody?.querySelectorAll('tr');
      expect(rows).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Priority of states: loading > empty > table
  // -------------------------------------------------------------------------

  describe('state priority', () => {
    it('should show loading over empty state when both conditions met', () => {
      const { container } = render(
        <DataTable
          data={[]}
          columns={sampleColumns}
          keyExtractor={keyExtractor}
          isLoading={true}
        />
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(screen.queryByText('اطلاعاتی یافت نشد')).not.toBeInTheDocument();
    });

    it('should show loading over data when both conditions met', () => {
      const { container } = render(
        <DataTable
          data={sampleData}
          columns={sampleColumns}
          keyExtractor={keyExtractor}
          isLoading={true}
        />
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      const table = container.querySelector('table');
      expect(table).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Multiple columns scenario
  // -------------------------------------------------------------------------

  describe('multiple columns', () => {
    it('should render the correct number of header cells', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const headers = container.querySelectorAll('th');
      expect(headers).toHaveLength(3);
    });

    it('should render the correct number of data cells per row', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const firstRow = container.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');
      expect(cells).toHaveLength(3);
    });

    it('should maintain column order as defined', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} keyExtractor={keyExtractor} />
      );
      const headers = container.querySelectorAll('th');
      expect(headers[0].textContent).toBe('نام');
      expect(headers[1].textContent).toBe('مبلغ');
      expect(headers[2].textContent).toBe('وضعیت');
    });
  });

  // -------------------------------------------------------------------------
  // Module exports
  // -------------------------------------------------------------------------

  describe('module exports', () => {
    it('should export DataTable as a named export', async () => {
      const mod = await import('../DataTable');
      expect(mod.DataTable).toBeDefined();
      expect(typeof mod.DataTable).toBe('function');
    });

    it('should export DataTable as the default export', async () => {
      const mod = await import('../DataTable');
      expect(mod.default).toBeDefined();
      expect(mod.default).toBe(mod.DataTable);
    });
  });
});
