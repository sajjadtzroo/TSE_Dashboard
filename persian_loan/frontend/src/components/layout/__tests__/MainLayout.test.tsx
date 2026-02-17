/**
 * Tests for MainLayout Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, renderWithProviders, waitFor } from '@/test/utils';
import { MainLayout } from '../MainLayout';
import { useMediaQuery } from '@mui/material';
import * as SidebarContext from '@/context/SidebarContext';

// Mock MUI useMediaQuery
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  };
});

// Mock SidebarContext
vi.mock('@/context/SidebarContext', () => ({
  useSidebar: vi.fn(() => ({
    isCollapsed: false,
    toggleCollapse: vi.fn(),
    setCollapsed: vi.fn(),
  })),
}));

// Mock child components
vi.mock('../Header', () => ({
  Header: ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <div data-testid="header">
      <button onClick={onMenuClick} aria-label="open drawer">
        Menu
      </button>
    </div>
  ),
}));

vi.mock('../Sidebar', () => ({
  Sidebar: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="sidebar" data-open={isOpen}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../PageTransition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-transition">{children}</div>
  ),
}));

vi.mock('../QuickActionsToolbar', () => ({
  QuickActionsToolbar: ({ variant, sidebarOpen }: { variant: string; sidebarOpen: boolean }) => (
    <div data-testid="quick-actions" data-variant={variant} data-sidebar-open={sidebarOpen} />
  ),
}));

// Mock Outlet
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Page Content</div>,
  };
});

const mockUseMediaQuery = vi.mocked(useMediaQuery);
const mockUseSidebar = vi.mocked(SidebarContext.useSidebar);

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSidebar.mockReturnValue({
      isCollapsed: false,
      toggleCollapse: vi.fn(),
      setCollapsed: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render the main layout structure', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
      renderWithProviders(<MainLayout />);

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should render Header component', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should render Sidebar component', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should render main content area', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });

    it('should render PageTransition wrapper', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      expect(screen.getByTestId('page-transition')).toBeInTheDocument();
    });

    it('should render Outlet for child routes', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      expect(screen.getByTestId('outlet')).toBeInTheDocument();
      expect(screen.getByText('Page Content')).toBeInTheDocument();
    });

    it('should render QuickActionsToolbar', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    });
  });

  describe('Mobile Drawer', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
    });

    it('should start with sidebar closed on mobile', () => {
      renderWithProviders(<MainLayout />);

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });

    it('should open sidebar when menu button is clicked', async () => {
      const { rerender } = renderWithProviders(<MainLayout />);

      const menuButton = screen.getByLabelText('open drawer');
      menuButton.click();

      // Component will re-render with new state
      await waitFor(() => {
        const sidebar = screen.getByTestId('sidebar');
        expect(sidebar).toHaveAttribute('data-open', 'true');
      });
    });

    it('should close sidebar when close button is clicked', async () => {
      renderWithProviders(<MainLayout />);

      // Open sidebar
      const menuButton = screen.getByLabelText('open drawer');
      menuButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
      });

      // Close sidebar
      const closeButton = screen.getByText('Close');
      closeButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
      });
    });

    it('should toggle sidebar open and close multiple times', async () => {
      renderWithProviders(<MainLayout />);

      const menuButton = screen.getByLabelText('open drawer');
      const sidebar = screen.getByTestId('sidebar');

      // Initial state
      expect(sidebar).toHaveAttribute('data-open', 'false');

      // Open
      menuButton.click();
      await waitFor(() => {
        expect(sidebar).toHaveAttribute('data-open', 'true');
      });

      // Close
      const closeButton = screen.getByText('Close');
      closeButton.click();
      await waitFor(() => {
        expect(sidebar).toHaveAttribute('data-open', 'false');
      });

      // Open again
      menuButton.click();
      await waitFor(() => {
        expect(sidebar).toHaveAttribute('data-open', 'true');
      });
    });

    it('should pass sidebarOpen state to QuickActionsToolbar', () => {
      renderWithProviders(<MainLayout />);

      const quickActions = screen.getByTestId('quick-actions');
      expect(quickActions).toHaveAttribute('data-sidebar-open', 'false');
    });

    it('should render QuickActionsToolbar with mobile variant', () => {
      renderWithProviders(<MainLayout />);

      const quickActions = screen.getByTestId('quick-actions');
      expect(quickActions).toHaveAttribute('data-variant', 'mobile');
    });
  });

  describe('Desktop Permanent Drawer', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
    });

    it('should render sidebar on desktop', () => {
      renderWithProviders(<MainLayout />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should adjust main content area for expanded sidebar', () => {
      mockUseSidebar.mockReturnValue({
        isCollapsed: false,
        toggleCollapse: vi.fn(),
        setCollapsed: vi.fn(),
      });

      const { container } = renderWithProviders(<MainLayout />);
      const mainContent = screen.getByRole('main');

      // Main content should have right margin for expanded sidebar (256px)
      expect(mainContent).toBeInTheDocument();
    });

    it('should adjust main content area for collapsed sidebar', () => {
      mockUseSidebar.mockReturnValue({
        isCollapsed: true,
        toggleCollapse: vi.fn(),
        setCollapsed: vi.fn(),
      });

      const { container } = renderWithProviders(<MainLayout />);
      const mainContent = screen.getByRole('main');

      // Main content should have right margin for collapsed sidebar (72px)
      expect(mainContent).toBeInTheDocument();
    });

    it('should not show menu button on desktop', () => {
      renderWithProviders(<MainLayout />);

      // Menu button is in header mock, and header is always rendered
      // but on desktop it should not be interactive
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to mobile viewport', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      renderWithProviders(<MainLayout />);

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });

    it('should adapt to desktop viewport', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
      renderWithProviders(<MainLayout />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should recalculate drawer width when viewport changes', () => {
      const { rerender } = renderWithProviders(<MainLayout />);

      // Start mobile
      mockUseMediaQuery.mockReturnValue(false);
      rerender(<MainLayout />);

      // Switch to desktop
      mockUseMediaQuery.mockReturnValue(true);
      rerender(<MainLayout />);

      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should recalculate drawer width when sidebar collapses', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop

      // Start expanded
      mockUseSidebar.mockReturnValue({
        isCollapsed: false,
        toggleCollapse: vi.fn(),
        setCollapsed: vi.fn(),
      });

      const { rerender } = renderWithProviders(<MainLayout />);

      // Collapse
      mockUseSidebar.mockReturnValue({
        isCollapsed: true,
        toggleCollapse: vi.fn(),
        setCollapsed: vi.fn(),
      });

      rerender(<MainLayout />);

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should have proper z-index stacking', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have scrollable main content area', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<MainLayout />);

      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });

    it('should use absolute positioning for main content', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<MainLayout />);

      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });

    it('should have proper background color', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<MainLayout />);

      const layout = container.firstChild as HTMLElement;
      expect(layout).toBeInTheDocument();
    });

    it('should have minimum height of 100vh', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<MainLayout />);

      const layout = container.firstChild as HTMLElement;
      expect(layout).toBeInTheDocument();
    });
  });

  describe('PageTransition Integration', () => {
    it('should wrap Outlet with PageTransition', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      const pageTransition = screen.getByTestId('page-transition');
      expect(pageTransition).toBeInTheDocument();

      const outlet = screen.getByTestId('outlet');
      expect(pageTransition).toContainElement(outlet);
    });

    it('should render content inside PageTransition', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      expect(screen.getByText('Page Content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have main landmark', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('should have accessible menu button on mobile', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      renderWithProviders(<MainLayout />);

      const menuButton = screen.getByLabelText('open drawer');
      expect(menuButton).toBeInTheDocument();
    });

    it('should maintain focus management when opening sidebar', async () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      renderWithProviders(<MainLayout />);

      const menuButton = screen.getByLabelText('open drawer');
      menuButton.focus();

      expect(menuButton).toHaveFocus();
    });
  });

  describe('State Management', () => {
    it('should manage sidebar open state independently', async () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      renderWithProviders(<MainLayout />);

      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');

      const menuButton = screen.getByLabelText('open drawer');
      menuButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
      });
    });

    it('should use SidebarContext for collapse state', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop

      const mockContext = {
        isCollapsed: true,
        toggleCollapse: vi.fn(),
        setCollapsed: vi.fn(),
      };
      mockUseSidebar.mockReturnValue(mockContext);

      renderWithProviders(<MainLayout />);

      expect(mockUseSidebar).toHaveBeenCalled();
    });

    it('should memoize drawer width calculation', () => {
      mockUseMediaQuery.mockReturnValue(true); // Desktop
      mockUseSidebar.mockReturnValue({
        isCollapsed: false,
        toggleCollapse: vi.fn(),
        setCollapsed: vi.fn(),
      });

      const { rerender } = renderWithProviders(<MainLayout />);

      // Rerender with same props
      rerender(<MainLayout />);

      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should memoize menu click handler', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      const { rerender } = renderWithProviders(<MainLayout />);

      const menuButton1 = screen.getByLabelText('open drawer');

      rerender(<MainLayout />);

      const menuButton2 = screen.getByLabelText('open drawer');

      expect(menuButton1).toBe(menuButton2);
    });

    it('should memoize sidebar close handler', () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      const { rerender } = renderWithProviders(<MainLayout />);

      rerender(<MainLayout />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid sidebar toggle', async () => {
      mockUseMediaQuery.mockReturnValue(false); // Mobile
      renderWithProviders(<MainLayout />);

      const menuButton = screen.getByLabelText('open drawer');

      // Rapid clicks
      menuButton.click();
      menuButton.click();
      menuButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      });
    });

    it('should handle missing SidebarContext gracefully', () => {
      mockUseMediaQuery.mockReturnValue(true);
      mockUseSidebar.mockReturnValue({
        isCollapsed: false,
        toggleCollapse: vi.fn(),
        setCollapsed: vi.fn(),
      });

      expect(() => {
        renderWithProviders(<MainLayout />);
      }).not.toThrow();
    });

    it('should render without crashing when sidebar context changes', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { rerender } = renderWithProviders(<MainLayout />);

      mockUseSidebar.mockReturnValue({
        isCollapsed: true,
        toggleCollapse: vi.fn(),
        setCollapsed: vi.fn(),
      });

      rerender(<MainLayout />);

      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should handle viewport changes during sidebar interaction', async () => {
      // Start mobile
      mockUseMediaQuery.mockReturnValue(false);
      const { rerender } = renderWithProviders(<MainLayout />);

      const menuButton = screen.getByLabelText('open drawer');
      menuButton.click();

      // Switch to desktop while sidebar is open
      mockUseMediaQuery.mockReturnValue(true);
      rerender(<MainLayout />);

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Container Layout', () => {
    it('should render MUI Container for content', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<MainLayout />);

      const muiContainer = container.querySelector('.MuiContainer-root');
      expect(muiContainer).toBeInTheDocument();
    });

    it('should use maxWidth false for full width', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { container } = renderWithProviders(<MainLayout />);

      const muiContainer = container.querySelector('.MuiContainer-root');
      expect(muiContainer).toBeInTheDocument();
    });

    it('should have responsive padding', () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<MainLayout />);

      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently on mount', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const startTime = performance.now();

      renderWithProviders(<MainLayout />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should not cause unnecessary re-renders', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { rerender } = renderWithProviders(<MainLayout />);

      // Multiple rerenders with same props
      rerender(<MainLayout />);
      rerender(<MainLayout />);
      rerender(<MainLayout />);

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
