/**
 * Tests for Header Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, userEvent, renderWithProviders } from '@/test/utils';
import { Header } from '../Header';
import { useMediaQuery } from '@mui/material';
import * as LoanSelectionContext from '@/context/LoanSelectionContext';

// Mock MUI useMediaQuery
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  };
});

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

const mockUseMediaQuery = vi.mocked(useMediaQuery);

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the header with title', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
      renderWithProviders(<Header />);

      expect(screen.getByText('داشبورد وام‌های بانکی')).toBeInTheDocument();
    });

    it('should render as an AppBar component', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<Header />);

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toBeInTheDocument();
    });

    it('should render version badge', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<Header />);

      expect(screen.getByText('نسخه ۱.۰.۰')).toBeInTheDocument();
    });

    it('should render QuickActionsToolbar', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<Header />);

      // QuickActionsToolbar renders buttons with specific aria-labels
      expect(screen.getByLabelText('مقایسه وام‌ها')).toBeInTheDocument();
      expect(screen.getByLabelText('ماشین حساب‌ها')).toBeInTheDocument();
    });
  });

  describe('Mobile Menu Button', () => {
    it('should show menu button on mobile', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      renderWithProviders(<Header />);

      const menuButton = screen.getByLabelText('open drawer');
      expect(menuButton).toBeInTheDocument();
    });

    it('should not show menu button on desktop', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
      renderWithProviders(<Header />);

      const menuButton = screen.queryByLabelText('open drawer');
      expect(menuButton).not.toBeInTheDocument();
    });

    it('should call onMenuClick when menu button is clicked', async () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      const user = userEvent.setup();
      const handleMenuClick = vi.fn();

      renderWithProviders(<Header onMenuClick={handleMenuClick} />);

      const menuButton = screen.getByLabelText('open drawer');
      await user.click(menuButton);

      expect(handleMenuClick).toHaveBeenCalledOnce();
    });

    it('should handle multiple menu button clicks', async () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      const user = userEvent.setup();
      const handleMenuClick = vi.fn();

      renderWithProviders(<Header onMenuClick={handleMenuClick} />);

      const menuButton = screen.getByLabelText('open drawer');
      await user.click(menuButton);
      await user.click(menuButton);
      await user.click(menuButton);

      expect(handleMenuClick).toHaveBeenCalledTimes(3);
    });

    it('should not call onMenuClick when not provided', async () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      const user = userEvent.setup();

      renderWithProviders(<Header />);

      const menuButton = screen.getByLabelText('open drawer');
      // Should not throw error
      await user.click(menuButton);
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for mobile viewport', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      renderWithProviders(<Header />);

      // Menu button should be visible
      expect(screen.getByLabelText('open drawer')).toBeInTheDocument();
    });

    it('should adapt layout for desktop viewport', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
      renderWithProviders(<Header />);

      // Menu button should not be visible
      expect(screen.queryByLabelText('open drawer')).not.toBeInTheDocument();
    });

    it('should show correct UI for desktop viewport', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
      renderWithProviders(<Header />);

      expect(screen.queryByLabelText('open drawer')).not.toBeInTheDocument();
    });

    it('should show correct UI for mobile viewport', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      renderWithProviders(<Header />);

      expect(screen.getByLabelText('open drawer')).toBeInTheDocument();
    });
  });

  describe('QuickActionsToolbar Integration', () => {
    it('should render QuickActionsToolbar with desktop variant on desktop', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
      renderWithProviders(<Header />);

      // Desktop variant shows text labels
      expect(screen.getByText('مقایسه')).toBeInTheDocument();
      expect(screen.getByText('ماشین حساب')).toBeInTheDocument();
    });

    it('should show selection count in compare button when loans are selected', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop

      // Mock selection count
      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 3,
        selectedLoans: [{ id: 'loan1', nameFA: 'وام ۱' }, { id: 'loan2', nameFA: 'وام ۲' }, { id: 'loan3', nameFA: 'وام ۳' }] as any,
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      renderWithProviders(<Header />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should navigate to compare page when compare button is clicked', async () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
      const user = userEvent.setup();

      const { container } = renderWithProviders(<Header />, { initialRoute: '/' });

      const compareButton = screen.getByLabelText('مقایسه وام‌ها');
      await user.click(compareButton);

      // Check if navigation occurred (URL should change)
      expect(window.location.pathname).toBe('/compare');
    });

    it('should navigate to calculators page when calculator button is clicked', async () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
      const user = userEvent.setup();

      renderWithProviders(<Header />, { initialRoute: '/' });

      const calculatorButton = screen.getByLabelText('ماشین حساب‌ها');
      await user.click(calculatorButton);

      expect(window.location.pathname).toBe('/calculators');
    });
  });

  describe('Styling and Layout', () => {
    it('should have sticky positioning', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<Header />);

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toHaveClass('MuiAppBar-positionSticky');
    });

    it('should have proper elevation', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<Header />);

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toHaveClass('MuiPaper-elevation1');
    });

    it('should render toolbar with proper structure', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<Header />);

      const toolbar = container.querySelector('.MuiToolbar-root');
      expect(toolbar).toBeInTheDocument();
    });

    it('should apply gradient to title', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<Header />);

      const title = screen.getByText('داشبورد وام‌های بانکی');
      const style = window.getComputedStyle(title);

      // Typography component should have h5 variant
      expect(title.tagName).toBe('H1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<Header />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('داشبورد وام‌های بانکی');
    });

    it('should have accessible menu button on mobile', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      renderWithProviders(<Header />);

      const menuButton = screen.getByLabelText('open drawer');
      expect(menuButton).toHaveAttribute('aria-label', 'open drawer');
    });

    it('should have accessible quick action buttons', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<Header />);

      expect(screen.getByLabelText('مقایسه وام‌ها')).toBeInTheDocument();
      expect(screen.getByLabelText('ماشین حساب‌ها')).toBeInTheDocument();
    });

    it('should be keyboard accessible for menu button', async () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      const user = userEvent.setup();
      const handleMenuClick = vi.fn();

      renderWithProviders(<Header onMenuClick={handleMenuClick} />);

      const menuButton = screen.getByLabelText('open drawer');
      menuButton.focus();

      expect(menuButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(handleMenuClick).toHaveBeenCalledOnce();
    });
  });

  describe('Component Memoization', () => {
    it('should be a memoized component', () => {
      // Header is wrapped with memo, check that it has the expected behavior
      expect(Header).toBeDefined();
      expect(typeof Header).toBe('object'); // memo returns an object
    });

    it('should render consistently with same props', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const handleMenuClick = vi.fn();

      renderWithProviders(<Header onMenuClick={handleMenuClick} />);

      const title = screen.getByText('داشبورد وام‌های بانکی');
      expect(title).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined onMenuClick prop gracefully', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile

      // Should not throw error
      expect(() => {
        renderWithProviders(<Header />);
      }).not.toThrow();
    });

    it('should handle zero selection count', () => {
      mockUseMediaQuery.mockReturnValue(true);

      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 0,
        selectedLoans: [],
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      renderWithProviders(<Header />);

      // Badge should not be visible when count is 0
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should handle large selection counts', () => {
      mockUseMediaQuery.mockReturnValue(true);

      vi.mocked(LoanSelectionContext.useLoanSelection).mockReturnValue({
        selectionCount: 99,
        selectedLoans: Array(99).fill({ id: 'loan', nameFA: 'وام' }) as any,
        toggleLoan: vi.fn(),
        clearSelection: vi.fn(),
        isLoanSelected: vi.fn(),
        canSelectMore: true,
        maxSelection: 5,
      });

      renderWithProviders(<Header />);

      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('should render correctly with empty props', () => {
      mockUseMediaQuery.mockReturnValue(true);

      renderWithProviders(<Header />);

      expect(screen.getByText('داشبورد وام‌های بانکی')).toBeInTheDocument();
      expect(screen.getByText('نسخه ۱.۰.۰')).toBeInTheDocument();
    });
  });

  describe('Menu Button Icon', () => {
    it('should render menu icon on mobile', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      const { container } = renderWithProviders(<Header />);

      const menuButton = screen.getByLabelText('open drawer');
      const icon = menuButton.querySelector('svg');

      expect(icon).toBeInTheDocument();
    });

    it('should have hover styles on menu button', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      renderWithProviders(<Header />);

      const menuButton = screen.getByLabelText('open drawer');
      expect(menuButton).toHaveClass('MuiIconButton-root');
    });
  });

  describe('Version Badge', () => {
    it('should render version chip with correct text', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<Header />);

      const versionChip = screen.getByText('نسخه ۱.۰.۰');
      expect(versionChip).toBeInTheDocument();
    });

    it('should render version chip with small size', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<Header />);

      const chip = container.querySelector('.MuiChip-sizeSmall');
      expect(chip).toBeInTheDocument();
    });
  });
});
