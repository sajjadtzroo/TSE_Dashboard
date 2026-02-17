/**
 * Tests for QuickActionsToolbar Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, userEvent, renderWithProviders } from '@/test/utils';
import { QuickActionsToolbar } from '../QuickActionsToolbar';
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

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      // Filter out framer-motion specific props
      const {
        initial,
        animate,
        exit,
        transition,
        whileHover,
        whileTap,
        ...domProps
      } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('QuickActionsToolbar', () => {
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

  describe('Desktop Variant - Rendering', () => {
    it('should render compare button with text label', () => {
      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      expect(screen.getByText('مقایسه')).toBeInTheDocument();
    });

    it('should render calculator button with text label', () => {
      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      expect(screen.getByText('ماشین حساب')).toBeInTheDocument();
    });

    it('should render compare button with aria-label', () => {
      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      expect(screen.getByLabelText('مقایسه وام‌ها')).toBeInTheDocument();
    });

    it('should render calculator button with aria-label', () => {
      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      expect(screen.getByLabelText('ماشین حساب‌ها')).toBeInTheDocument();
    });

    it('should render both buttons as button elements', () => {
      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should render icons for both buttons', () => {
      const { container } = renderWithProviders(
        <QuickActionsToolbar variant="desktop" />
      );

      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(2);
    });
  });

  describe('Mobile Variant - Rendering', () => {
    it('should render compare button with aria-label', () => {
      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      expect(screen.getByLabelText('مقایسه وام‌ها')).toBeInTheDocument();
    });

    it('should render calculator button with aria-label', () => {
      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      expect(screen.getByLabelText('ماشین حساب‌ها')).toBeInTheDocument();
    });

    it('should render both FAB buttons', () => {
      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should not render text labels on mobile (icon-only buttons)', () => {
      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      expect(screen.queryByText('مقایسه')).not.toBeInTheDocument();
      expect(screen.queryByText('ماشین حساب')).not.toBeInTheDocument();
    });

    it('should render icons for both buttons on mobile', () => {
      const { container } = renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(2);
    });
  });

  describe('Mobile Variant - Sidebar Visibility', () => {
    it('should show buttons when sidebar is closed', () => {
      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      expect(screen.getByLabelText('مقایسه وام‌ها')).toBeInTheDocument();
      expect(screen.getByLabelText('ماشین حساب‌ها')).toBeInTheDocument();
    });

    it('should hide buttons when sidebar is open', () => {
      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={true} />
      );

      expect(screen.queryByLabelText('مقایسه وام‌ها')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('ماشین حساب‌ها')).not.toBeInTheDocument();
    });

    it('should default sidebarOpen to false when not provided', () => {
      renderWithProviders(<QuickActionsToolbar variant="mobile" />);

      // Should be visible since sidebarOpen defaults to false
      expect(screen.getByLabelText('مقایسه وام‌ها')).toBeInTheDocument();
    });
  });

  describe('Navigation - Click Handlers', () => {
    it('should navigate to /compare when compare button is clicked on desktop', async () => {
      const user = userEvent.setup();

      renderWithProviders(<QuickActionsToolbar variant="desktop" />, {
        initialRoute: '/',
      });

      const compareButton = screen.getByLabelText('مقایسه وام‌ها');
      await user.click(compareButton);

      expect(window.location.pathname).toBe('/compare');
    });

    it('should navigate to /calculators when calculator button is clicked on desktop', async () => {
      const user = userEvent.setup();

      renderWithProviders(<QuickActionsToolbar variant="desktop" />, {
        initialRoute: '/',
      });

      const calculatorButton = screen.getByLabelText('ماشین حساب‌ها');
      await user.click(calculatorButton);

      expect(window.location.pathname).toBe('/calculators');
    });

    it('should navigate to /compare when compare FAB is clicked on mobile', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />,
        { initialRoute: '/' }
      );

      const compareButton = screen.getByLabelText('مقایسه وام‌ها');
      await user.click(compareButton);

      expect(window.location.pathname).toBe('/compare');
    });

    it('should navigate to /calculators when calculator FAB is clicked on mobile', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />,
        { initialRoute: '/' }
      );

      const calculatorButton = screen.getByLabelText('ماشین حساب‌ها');
      await user.click(calculatorButton);

      expect(window.location.pathname).toBe('/calculators');
    });
  });

  describe('Selection Count Badge', () => {
    it('should not show badge when selection count is 0 (desktop)', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 0,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      const { container } = renderWithProviders(
        <QuickActionsToolbar variant="desktop" />
      );

      // Badge (MUI Chip) should not be present
      const chips = container.querySelectorAll('.MuiChip-root');
      expect(chips).toHaveLength(0);
    });

    it('should show badge with count when loans are selected (desktop)', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 3,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show badge with count when loans are selected (mobile)', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 2,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not show badge on mobile when selection is 0', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 0,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      const { container } = renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      const chips = container.querySelectorAll('.MuiChip-root');
      expect(chips).toHaveLength(0);
    });

    it('should handle large selection counts', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 99,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: false,
        maxSelection: 5,
      });

      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('should show badge with count of 1', () => {
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 1,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on compare button (desktop)', () => {
      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      const compareButton = screen.getByLabelText('مقایسه وام‌ها');
      expect(compareButton).toHaveAttribute('aria-label', 'مقایسه وام‌ها');
    });

    it('should have aria-label on calculator button (desktop)', () => {
      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      const calcButton = screen.getByLabelText('ماشین حساب‌ها');
      expect(calcButton).toHaveAttribute('aria-label', 'ماشین حساب‌ها');
    });

    it('should have aria-label on compare button (mobile)', () => {
      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      const compareButton = screen.getByLabelText('مقایسه وام‌ها');
      expect(compareButton).toHaveAttribute('aria-label', 'مقایسه وام‌ها');
    });

    it('should have aria-label on calculator button (mobile)', () => {
      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      const calcButton = screen.getByLabelText('ماشین حساب‌ها');
      expect(calcButton).toHaveAttribute('aria-label', 'ماشین حساب‌ها');
    });

    it('should be keyboard accessible on desktop', async () => {
      const user = userEvent.setup();

      renderWithProviders(<QuickActionsToolbar variant="desktop" />, {
        initialRoute: '/',
      });

      const compareButton = screen.getByLabelText('مقایسه وام‌ها');
      compareButton.focus();
      expect(compareButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(window.location.pathname).toBe('/compare');
    });

    it('should be keyboard accessible for calculator button on desktop', async () => {
      const user = userEvent.setup();

      renderWithProviders(<QuickActionsToolbar variant="desktop" />, {
        initialRoute: '/',
      });

      const calcButton = screen.getByLabelText('ماشین حساب‌ها');
      calcButton.focus();
      expect(calcButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(window.location.pathname).toBe('/calculators');
    });

    it('should be keyboard accessible on mobile', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />,
        { initialRoute: '/' }
      );

      const compareButton = screen.getByLabelText('مقایسه وام‌ها');
      compareButton.focus();
      expect(compareButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(window.location.pathname).toBe('/compare');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render desktop variant with hidden lg:flex classes', () => {
      const { container } = renderWithProviders(
        <QuickActionsToolbar variant="desktop" />
      );

      // Desktop variant has hidden lg:flex classes
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('hidden');
      expect(wrapper).toHaveClass('lg:flex');
    });

    it('should render mobile variant with lg:hidden class', () => {
      const { container } = renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      // Mobile variant has the fixed positioning and lg:hidden class
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('lg:hidden');
    });

    it('should render mobile variant with fixed positioning', () => {
      const { container } = renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('fixed');
    });
  });

  describe('Edge Cases', () => {
    it('should render desktop variant without sidebarOpen prop', () => {
      expect(() => {
        renderWithProviders(<QuickActionsToolbar variant="desktop" />);
      }).not.toThrow();
    });

    it('should handle rapid clicks without error', async () => {
      const user = userEvent.setup();

      renderWithProviders(<QuickActionsToolbar variant="desktop" />, {
        initialRoute: '/',
      });

      const compareButton = screen.getByLabelText('مقایسه وام‌ها');
      await user.click(compareButton);
      await user.click(compareButton);
      await user.click(compareButton);

      // Should not throw and should navigate
      expect(window.location.pathname).toBe('/compare');
    });

    it('should render correctly when selection count changes from 0 to positive', () => {
      const mockUseLoanSelection = vi.mocked(LoanSelectionContext.useLoanSelection);

      mockUseLoanSelection.mockReturnValue({
        selectionCount: 0,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      const { container, unmount } = renderWithProviders(
        <QuickActionsToolbar variant="desktop" />
      );

      // Initially no badge
      expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(0);
      unmount();

      // Update to have selections
      mockUseLoanSelection.mockReturnValue({
        selectionCount: 3,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      renderWithProviders(<QuickActionsToolbar variant="desktop" />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not render anything when mobile sidebar is open', () => {
      const { container } = renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={true} />
      );

      // AnimatePresence with the condition !sidebarOpen means no children rendered
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Button Styling', () => {
    it('should render compare button as a button element on desktop', () => {
      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      const compareButton = screen.getByLabelText('مقایسه وام‌ها');
      expect(compareButton.tagName).toBe('BUTTON');
    });

    it('should render calculator button as a button element on desktop', () => {
      renderWithProviders(<QuickActionsToolbar variant="desktop" />);

      const calcButton = screen.getByLabelText('ماشین حساب‌ها');
      expect(calcButton.tagName).toBe('BUTTON');
    });

    it('should render compare button as a button element on mobile', () => {
      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      const compareButton = screen.getByLabelText('مقایسه وام‌ها');
      expect(compareButton.tagName).toBe('BUTTON');
    });

    it('should render calculator button as a button element on mobile', () => {
      renderWithProviders(
        <QuickActionsToolbar variant="mobile" sidebarOpen={false} />
      );

      const calcButton = screen.getByLabelText('ماشین حساب‌ها');
      expect(calcButton.tagName).toBe('BUTTON');
    });
  });
});
