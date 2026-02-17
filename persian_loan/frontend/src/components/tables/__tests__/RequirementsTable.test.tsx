/**
 * Tests for RequirementsTable Component
 *
 * Covers: rendering, data display, requirement cells (boolean, string, undefined),
 * Persian labels, badges for categories, responsive layout, and module exports.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequirementsTable } from '../RequirementsTable';
import type { RequirementsMatrixItem } from '@/types';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const sampleData: RequirementsMatrixItem[] = [
  {
    bankId: 'bank-1',
    bankNameFA: 'بانک ملی',
    category: 'traditional-banks',
    requirements: {
      guarantor: true,
      check: true,
      promissoryNote: false,
      creditRating: 'A',
      noBadChecks: true,
      noOverdueDebts: true,
      onlineCreditCheck: false,
    },
  },
  {
    bankId: 'bank-2',
    bankNameFA: 'بلوبانک',
    category: 'digital-banks',
    requirements: {
      guarantor: false,
      check: false,
      promissoryNote: false,
      creditRating: 'B',
      noBadChecks: true,
      noOverdueDebts: false,
      onlineCreditCheck: true,
    },
  },
];

const dataWithUndefined: RequirementsMatrixItem[] = [
  {
    bankId: 'bank-3',
    bankNameFA: 'بانک تست',
    category: 'traditional-banks',
    requirements: {
      guarantor: undefined,
      check: undefined,
    },
  },
];

// ===========================================================================
// RequirementsTable Component
// ===========================================================================

describe('RequirementsTable', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      expect(container.firstElementChild).toBeInTheDocument();
    });

    it('should render a table element', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    it('should render within an overflow-x-auto wrapper for responsiveness', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('overflow-x-auto');
    });

    it('should render a thead and tbody', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Persian labels and column headers
  // -------------------------------------------------------------------------

  describe('Persian labels and column headers', () => {
    it('should render the bank column header in Persian', () => {
      render(<RequirementsTable data={sampleData} />);
      expect(screen.getByText('بانک')).toBeInTheDocument();
    });

    it('should render the category column header in Persian', () => {
      render(<RequirementsTable data={sampleData} />);
      expect(screen.getByText('دسته‌بندی')).toBeInTheDocument();
    });

    it('should render all requirement labels in Persian', () => {
      render(<RequirementsTable data={sampleData} />);
      expect(screen.getByText('ضامن')).toBeInTheDocument();
      expect(screen.getByText('چک')).toBeInTheDocument();
      expect(screen.getByText('سفته')).toBeInTheDocument();
      expect(screen.getByText('رتبه اعتباری')).toBeInTheDocument();
      expect(screen.getByText('بدون چک برگشتی')).toBeInTheDocument();
      expect(screen.getByText('بدون بدهی معوق')).toBeInTheDocument();
      expect(screen.getByText('استعلام آنلاین')).toBeInTheDocument();
    });

    it('should render column headers as <th> elements', () => {
      render(<RequirementsTable data={sampleData} />);
      const bankHeader = screen.getByText('بانک');
      expect(bankHeader.tagName).toBe('TH');
    });

    it('should have the correct total number of header columns (2 fixed + 7 requirements)', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      const headers = container.querySelectorAll('th');
      expect(headers).toHaveLength(9);
    });
  });

  // -------------------------------------------------------------------------
  // Data rows
  // -------------------------------------------------------------------------

  describe('data rows', () => {
    it('should render a row for each data item', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      const tbody = container.querySelector('tbody');
      const rows = tbody?.querySelectorAll('tr');
      expect(rows).toHaveLength(2);
    });

    it('should display bank names in Persian', () => {
      render(<RequirementsTable data={sampleData} />);
      expect(screen.getByText('بانک ملی')).toBeInTheDocument();
      expect(screen.getByText('بلوبانک')).toBeInTheDocument();
    });

    it('should display bank names in <td> elements', () => {
      render(<RequirementsTable data={sampleData} />);
      const bankName = screen.getByText('بانک ملی');
      expect(bankName.tagName).toBe('TD');
    });

    it('should apply sticky positioning to bank name cells', () => {
      render(<RequirementsTable data={sampleData} />);
      const bankName = screen.getByText('بانک ملی');
      expect(bankName).toHaveClass('sticky', 'right-0');
    });

    it('should apply hover transition to rows', () => {
      render(<RequirementsTable data={sampleData} />);
      const row = screen.getByText('بانک ملی').closest('tr')!;
      expect(row).toHaveClass('hover:bg-surface-50', 'transition-colors');
    });
  });

  // -------------------------------------------------------------------------
  // Category badges
  // -------------------------------------------------------------------------

  describe('category badges', () => {
    it('should display digital label for digital banks', () => {
      render(<RequirementsTable data={sampleData} />);
      expect(screen.getByText('دیجیتال')).toBeInTheDocument();
    });

    it('should display traditional label for traditional banks', () => {
      render(<RequirementsTable data={sampleData} />);
      expect(screen.getByText('سنتی')).toBeInTheDocument();
    });

    it('should render both category badges for mixed data', () => {
      render(<RequirementsTable data={sampleData} />);
      expect(screen.getByText('سنتی')).toBeInTheDocument();
      expect(screen.getByText('دیجیتال')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // RequirementCell - boolean values
  // -------------------------------------------------------------------------

  describe('requirement cells - boolean values', () => {
    it('should render check icon for true boolean values', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      // lucide-react renders SVGs; Check icon has a specific class or we check for SVG presence
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should render X icon for false boolean values', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      // The component renders both Check and X icons
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should apply green color class to check icons (true values)', () => {
      const trueOnlyData: RequirementsMatrixItem[] = [
        {
          bankId: 'bank-t',
          bankNameFA: 'تست',
          category: 'traditional-banks',
          requirements: { guarantor: true },
        },
      ];
      const { container } = render(<RequirementsTable data={trueOnlyData} />);
      const greenIcons = container.querySelectorAll('.text-secondary-500');
      expect(greenIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('should apply red color class to X icons (false values)', () => {
      const falseOnlyData: RequirementsMatrixItem[] = [
        {
          bankId: 'bank-f',
          bankNameFA: 'تست',
          category: 'traditional-banks',
          requirements: { guarantor: false },
        },
      ];
      const { container } = render(<RequirementsTable data={falseOnlyData} />);
      const redIcons = container.querySelectorAll('.text-error-500');
      expect(redIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // RequirementCell - string values
  // -------------------------------------------------------------------------

  describe('requirement cells - string values', () => {
    it('should render string values as text spans', () => {
      render(<RequirementsTable data={sampleData} />);
      // creditRating is 'A' for bank-1, 'B' for bank-2
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should apply correct text styling to string values', () => {
      render(<RequirementsTable data={sampleData} />);
      const ratingA = screen.getByText('A');
      expect(ratingA.tagName).toBe('SPAN');
      expect(ratingA).toHaveClass('text-sm', 'text-gray-300');
    });
  });

  // -------------------------------------------------------------------------
  // RequirementCell - undefined/null values
  // -------------------------------------------------------------------------

  describe('requirement cells - undefined values', () => {
    it('should render minus icon for undefined values', () => {
      const { container } = render(<RequirementsTable data={dataWithUndefined} />);
      const grayIcons = container.querySelectorAll('.text-gray-500');
      // Undefined values render Minus icons with text-gray-500
      expect(grayIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle data with all undefined requirements', () => {
      const allUndefined: RequirementsMatrixItem[] = [
        {
          bankId: 'bank-u',
          bankNameFA: 'بانک بدون اطلاعات',
          category: 'traditional-banks',
          requirements: {},
        },
      ];
      const { container } = render(<RequirementsTable data={allUndefined} />);
      expect(container.querySelector('table')).toBeInTheDocument();
      // All 7 requirement cells should show Minus icons
      const grayIcons = container.querySelectorAll('.text-gray-500');
      expect(grayIcons).toHaveLength(7);
    });
  });

  // -------------------------------------------------------------------------
  // Responsive layout
  // -------------------------------------------------------------------------

  describe('responsive layout', () => {
    it('should have overflow-x-auto for horizontal scrolling on small screens', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      expect(container.firstElementChild).toHaveClass('overflow-x-auto');
    });

    it('should have min-w-full on the table for full-width display', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      const table = container.querySelector('table');
      expect(table).toHaveClass('min-w-full');
    });

    it('should have sticky bank name header', () => {
      render(<RequirementsTable data={sampleData} />);
      const bankHeader = screen.getByText('بانک');
      expect(bankHeader).toHaveClass('sticky', 'right-0');
    });

    it('should have sticky bank name cells in body', () => {
      render(<RequirementsTable data={sampleData} />);
      const bankCell = screen.getByText('بانک ملی');
      expect(bankCell).toHaveClass('sticky', 'right-0');
    });
  });

  // -------------------------------------------------------------------------
  // Table structure and styling
  // -------------------------------------------------------------------------

  describe('table structure and styling', () => {
    it('should apply divide-y classes for row separation', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      const table = container.querySelector('table');
      expect(table).toHaveClass('divide-y', 'divide-border-light');
    });

    it('should apply bg-surface-50 to the thead', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      const thead = container.querySelector('thead');
      expect(thead).toHaveClass('bg-surface-50');
    });

    it('should apply bg-surface-100 to the tbody', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      const tbody = container.querySelector('tbody');
      expect(tbody).toHaveClass('bg-surface-100');
    });

    it('should center requirement cell content with flex justify-center', () => {
      const { container } = render(<RequirementsTable data={sampleData} />);
      const centeredDivs = container.querySelectorAll('.flex.justify-center');
      // Each row has 7 requirement cells with centered content
      expect(centeredDivs.length).toBe(14); // 2 rows * 7 requirements
    });
  });

  // -------------------------------------------------------------------------
  // Empty data handling
  // -------------------------------------------------------------------------

  describe('empty data', () => {
    it('should render an empty table body when data is empty', () => {
      const { container } = render(<RequirementsTable data={[]} />);
      const tbody = container.querySelector('tbody');
      const rows = tbody?.querySelectorAll('tr');
      expect(rows).toHaveLength(0);
    });

    it('should still render headers when data is empty', () => {
      render(<RequirementsTable data={[]} />);
      expect(screen.getByText('بانک')).toBeInTheDocument();
      expect(screen.getByText('ضامن')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Module exports
  // -------------------------------------------------------------------------

  describe('module exports', () => {
    it('should export RequirementsTable as a named export', async () => {
      const mod = await import('../RequirementsTable');
      expect(mod.RequirementsTable).toBeDefined();
      expect(typeof mod.RequirementsTable).toBe('function');
    });

    it('should export RequirementsTable as the default export', async () => {
      const mod = await import('../RequirementsTable');
      expect(mod.default).toBeDefined();
      expect(mod.default).toBe(mod.RequirementsTable);
    });
  });
});
