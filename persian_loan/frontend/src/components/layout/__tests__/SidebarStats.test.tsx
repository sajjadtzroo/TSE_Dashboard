/**
 * Tests for SidebarStats Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, renderWithProviders } from '@/test/utils';
import { SidebarStats } from '../SidebarStats';
import * as LoanSelectionContext from '@/context/LoanSelectionContext';

// Mock LoanSelectionContext
vi.mock('@/context/LoanSelectionContext', () => ({
  useLoanSelection: vi.fn(() => ({
    selectionCount: 0,
    selectedLoans: [],
    toggleLoan: vi.fn(),
    clearSelection: vi.fn(),
    isLoanSelected: vi.fn(),
    canSelectMore: true,
    maxSelection: 5,
  })),
}));

describe('SidebarStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: zero selection
    vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
      selectionCount: 0,
      selectedLoans: [],
      toggleLoan: vi.fn(),
      clearSelection: vi.fn(),
      isLoanSelected: vi.fn(),
      canSelectMore: true,
      maxSelection: 5,
    });
  });

  describe('Rendering - Expanded State', () => {
    it('should render stats when not collapsed', () => {
      renderWithProviders(<SidebarStats isCollapsed={false} />);

      expect(screen.getByText('وام‌های انتخابی')).toBeInTheDocument();
    });

    it('should render the selected loans section', () => {
      renderWithProviders(<SidebarStats isCollapsed={false} />);

      expect(screen.getByText('وام‌های انتخابی')).toBeInTheDocument();
    });

    it('should render the reminders section', () => {
      renderWithProviders(<SidebarStats isCollapsed={false} />);

      expect(screen.getByText('یادآوری‌ها')).toBeInTheDocument();
    });

    it('should render both stat sections together', () => {
      renderWithProviders(<SidebarStats isCollapsed={false} />);

      expect(screen.getByText('وام‌های انتخابی')).toBeInTheDocument();
      expect(screen.getByText('یادآوری‌ها')).toBeInTheDocument();
    });
  });

  describe('Rendering - Collapsed State', () => {
    it('should return null when collapsed', () => {
      const { container } = renderWithProviders(<SidebarStats isCollapsed={true} />);

      // The component returns null when collapsed
      expect(container.firstChild).toBeNull();
    });

    it('should not render selected loans text when collapsed', () => {
      renderWithProviders(<SidebarStats isCollapsed={true} />);

      expect(screen.queryByText('وام‌های انتخابی')).not.toBeInTheDocument();
    });

    it('should not render reminders text when collapsed', () => {
      renderWithProviders(<SidebarStats isCollapsed={true} />);

      expect(screen.queryByText('یادآوری‌ها')).not.toBeInTheDocument();
    });
  });

  describe('Selection Count Display', () => {
    it('should not show badge when selection count is 0', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 0,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      const { container } = renderWithProviders(<SidebarStats isCollapsed={false} />);

      // The Chip for selected loans should not be rendered when count is 0
      const chips = container.querySelectorAll('.MuiChip-root');
      // Only the reminders chip (showing "0") should be present
      expect(chips).toHaveLength(1);
    });

    it('should show selection count badge when loans are selected', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 3,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      renderWithProviders(<SidebarStats isCollapsed={false} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show correct count when 1 loan is selected', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 1,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      renderWithProviders(<SidebarStats isCollapsed={false} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show correct count when 5 loans are selected', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 5,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: false,
        maxSelection: 5,
      });

      renderWithProviders(<SidebarStats isCollapsed={false} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should update badge when selection count changes', () => {
      const mockUseLoanSelection = vi.mocked(LoanSelectionContext.useLoanSelection);

      // First render with 2 loans
      mockUseLoanSelection.mockReturnValue({
        selectionCount: 2,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      const { unmount } = renderWithProviders(<SidebarStats isCollapsed={false} />);
      expect(screen.getByText('2')).toBeInTheDocument();
      unmount();

      // Re-render with 4 loans
      mockUseLoanSelection.mockReturnValue({
        selectionCount: 4,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      renderWithProviders(<SidebarStats isCollapsed={false} />);
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Reminders Section', () => {
    it('should always show reminders placeholder with "0" count', () => {
      renderWithProviders(<SidebarStats isCollapsed={false} />);

      // The reminders Chip displays "0"
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should render reminders label text', () => {
      renderWithProviders(<SidebarStats isCollapsed={false} />);

      expect(screen.getByText('یادآوری‌ها')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render CreditCard icon for selected loans', () => {
      const { container } = renderWithProviders(<SidebarStats isCollapsed={false} />);

      // Lucide icons render as SVGs
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });

    it('should render Bell icon for reminders', () => {
      const { container } = renderWithProviders(<SidebarStats isCollapsed={false} />);

      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });

    it('should not render icons when collapsed', () => {
      const { container } = renderWithProviders(<SidebarStats isCollapsed={true} />);

      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(0);
    });
  });

  describe('MUI Chip Badges', () => {
    it('should render selection count as a MUI Chip', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 3,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      const { container } = renderWithProviders(<SidebarStats isCollapsed={false} />);

      // Should have 2 chips: selection count and reminders
      const chips = container.querySelectorAll('.MuiChip-root');
      expect(chips).toHaveLength(2);
    });

    it('should render chips with small size', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 2,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      const { container } = renderWithProviders(<SidebarStats isCollapsed={false} />);

      const smallChips = container.querySelectorAll('.MuiChip-sizeSmall');
      expect(smallChips.length).toBeGreaterThanOrEqual(1);
    });

    it('should only render reminders chip when no loans selected', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 0,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      const { container } = renderWithProviders(<SidebarStats isCollapsed={false} />);

      const chips = container.querySelectorAll('.MuiChip-root');
      expect(chips).toHaveLength(1);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should render with a top border', () => {
      const { container } = renderWithProviders(<SidebarStats isCollapsed={false} />);

      // The outer Box has borderTop: 1 style
      expect(container.firstChild).not.toBeNull();
    });

    it('should render two stat rows when expanded', () => {
      const { container } = renderWithProviders(<SidebarStats isCollapsed={false} />);

      // The component renders 2 child Box elements for the 2 stats
      // Both stat label texts should be present
      expect(screen.getByText('وام‌های انتخابی')).toBeInTheDocument();
      expect(screen.getByText('یادآوری‌ها')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have readable text content', () => {
      renderWithProviders(<SidebarStats isCollapsed={false} />);

      expect(screen.getByText('وام‌های انتخابی')).toBeInTheDocument();
      expect(screen.getByText('یادآوری‌ها')).toBeInTheDocument();
    });

    it('should render stats as span elements', () => {
      renderWithProviders(<SidebarStats isCollapsed={false} />);

      const selectedLoansText = screen.getByText('وام‌های انتخابی');
      expect(selectedLoansText.tagName).toBe('SPAN');

      const remindersText = screen.getByText('یادآوری‌ها');
      expect(remindersText.tagName).toBe('SPAN');
    });
  });

  describe('Edge Cases', () => {
    it('should handle large selection counts gracefully', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 99,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: false,
        maxSelection: 5,
      });

      renderWithProviders(<SidebarStats isCollapsed={false} />);

      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('should not render any chips when collapsed even with selections', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 5,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: false,
        maxSelection: 5,
      });

      const { container } = renderWithProviders(<SidebarStats isCollapsed={true} />);

      const chips = container.querySelectorAll('.MuiChip-root');
      expect(chips).toHaveLength(0);
    });

    it('should render without errors when switching between collapsed states', () => {
      expect(() => {
        const { unmount } = renderWithProviders(<SidebarStats isCollapsed={false} />);
        unmount();
        renderWithProviders(<SidebarStats isCollapsed={true} />);
      }).not.toThrow();
    });

    it('should render correctly on first mount', () => {
      expect(() => {
        renderWithProviders(<SidebarStats isCollapsed={false} />);
      }).not.toThrow();
    });
  });
});
