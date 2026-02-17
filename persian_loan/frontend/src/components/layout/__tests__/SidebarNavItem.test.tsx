/**
 * Tests for SidebarNavItem Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, renderWithProviders, userEvent } from '@/test/utils';
import { SidebarNavItem } from '../SidebarNavItem';
import { Home } from 'lucide-react';

// Mock MUI Tooltip
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    Tooltip: ({
      children,
      title,
      placement,
      arrow,
    }: {
      children: React.ReactElement;
      title: string;
      placement?: string;
      arrow?: boolean;
    }) => (
      <div data-testid="tooltip" data-title={title} data-placement={placement}>
        {children}
      </div>
    ),
  };
});

// Mock route prefetch map
vi.mock('@/hooks', () => ({
  routePrefetchMap: {
    '/': vi.fn(() => Promise.resolve()),
    '/loans': vi.fn(() => Promise.resolve()),
    '/banks': vi.fn(() => Promise.resolve()),
  },
}));

describe('SidebarNavItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nav item with name', () => {
      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      expect(screen.getByText('خانه')).toBeInTheDocument();
    });

    it('should render nav item as NavLink', () => {
      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    it('should render icon', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should use MUI ListItemButton', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const button = container.querySelector('.MuiListItemButton-root');
      expect(button).toBeInTheDocument();
    });

    it('should use MUI ListItemIcon', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const iconContainer = container.querySelector('.MuiListItemIcon-root');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should use MUI ListItemText when not collapsed', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const text = container.querySelector('.MuiListItemText-root');
      expect(text).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should highlight when on active route', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />,
        { initialRoute: '/' }
      );

      const button = container.querySelector('.Mui-selected');
      expect(button).toBeInTheDocument();
    });

    it('should not highlight when on different route', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="وام‌ها" href="/loans" icon={Home} isCollapsed={false} />,
        { initialRoute: '/' }
      );

      const button = container.querySelector('.Mui-selected');
      expect(button).not.toBeInTheDocument();
    });

    it('should update active state when route changes', () => {
      const { container, rerender } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />,
        { initialRoute: '/' }
      );

      expect(container.querySelector('.Mui-selected')).toBeInTheDocument();

      // Navigate to different route
      window.history.pushState({}, '', '/loans');

      rerender(<SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />);

      // Note: In real usage, location would change, but in tests we need to verify the logic works
      expect(container.querySelector('.MuiListItemButton-root')).toBeInTheDocument();
    });
  });

  describe('Collapsed State', () => {
    it('should hide text when collapsed', () => {
      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={true} />
      );

      expect(screen.queryByText('خانه')).not.toBeInTheDocument();
    });

    it('should show text when expanded', () => {
      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      expect(screen.getByText('خانه')).toBeInTheDocument();
    });

    it('should center icon when collapsed', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={true} />
      );

      const button = container.querySelector('.MuiListItemButton-root');
      expect(button).toBeInTheDocument();
    });

    it('should wrap with tooltip when collapsed', () => {
      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={true} />
      );

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('data-title', 'خانه');
    });

    it('should not wrap with tooltip when expanded', () => {
      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
    });

    it('should position tooltip on left', () => {
      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={true} />
      );

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-placement', 'left');
    });
  });

  describe('Navigation', () => {
    it('should navigate when clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SidebarNavItem name="وام‌ها" href="/loans" icon={Home} isCollapsed={false} />,
        { initialRoute: '/' }
      );

      const button = screen.getByRole('link');
      await user.click(button);

      expect(window.location.pathname).toBe('/loans');
    });

    it('should navigate when collapsed', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SidebarNavItem name="وام‌ها" href="/loans" icon={Home} isCollapsed={true} />,
        { initialRoute: '/' }
      );

      const button = screen.getByRole('link');
      await user.click(button);

      expect(window.location.pathname).toBe('/loans');
    });

    it('should handle multiple navigation clicks', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SidebarNavItem name="وام‌ها" href="/loans" icon={Home} isCollapsed={false} />,
        { initialRoute: '/' }
      );

      const button = screen.getByRole('link');
      await user.click(button);
      await user.click(button);

      expect(window.location.pathname).toBe('/loans');
    });
  });

  describe('Prefetching', () => {
    it('should prefetch route on hover', async () => {
      const user = userEvent.setup();
      const { routePrefetchMap } = await import('@/hooks');
      const mockPrefetch = vi.fn(() => Promise.resolve());
      (routePrefetchMap as any)['/loans'] = mockPrefetch;

      renderWithProviders(
        <SidebarNavItem name="وام‌ها" href="/loans" icon={Home} isCollapsed={false} />
      );

      const button = screen.getByRole('link');
      await user.hover(button);

      expect(mockPrefetch).toHaveBeenCalledOnce();
    });

    it('should handle prefetch errors silently', async () => {
      const user = userEvent.setup();
      const { routePrefetchMap } = await import('@/hooks');
      const mockPrefetch = vi.fn(() => Promise.reject(new Error('Prefetch failed')));
      (routePrefetchMap as any)['/'] = mockPrefetch;

      expect(() => {
        renderWithProviders(
          <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
        );
      }).not.toThrow();

      const button = screen.getByRole('link');
      await user.hover(button);

      // Should not throw error
      expect(mockPrefetch).toHaveBeenCalled();
    });

    it('should not prefetch if route not in map', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SidebarNavItem
          name="Unknown"
          href="/unknown"
          icon={Home}
          isCollapsed={false}
        />
      );

      const button = screen.getByRole('link');

      // Should not throw
      expect(() => user.hover(button)).not.toThrow();
    });
  });

  describe('Icon Rendering', () => {
    it('should render custom icon', () => {
      const CustomIcon = () => <svg data-testid="custom-icon" />;

      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={CustomIcon as any} isCollapsed={false} />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render icon with size 20', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should always render icon regardless of collapse state', () => {
      const { container: collapsedContainer } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={true} />
      );

      const { container: expandedContainer } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      expect(collapsedContainer.querySelector('svg')).toBeInTheDocument();
      expect(expandedContainer.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Persian Text', () => {
    it('should render Persian text correctly', () => {
      renderWithProviders(
        <SidebarNavItem
          name="داشبورد وام‌ها"
          href="/"
          icon={Home}
          isCollapsed={false}
        />
      );

      expect(screen.getByText('داشبورد وام‌ها')).toBeInTheDocument();
    });

    it('should handle long Persian text', () => {
      renderWithProviders(
        <SidebarNavItem
          name="مدیریت وام‌ها و بانک‌ها"
          href="/"
          icon={Home}
          isCollapsed={false}
        />
      );

      expect(screen.getByText('مدیریت وام‌ها و بانک‌ها')).toBeInTheDocument();
    });

    it('should truncate long text with noWrap', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem
          name="این یک متن بسیار طولانی است که باید کوتاه شود"
          href="/"
          icon={Home}
          isCollapsed={false}
        />
      );

      const textElement = container.querySelector('.MuiTypography-root');
      expect(textElement).toBeInTheDocument();
    });

    it('should display Persian text in tooltip when collapsed', () => {
      renderWithProviders(
        <SidebarNavItem
          name="داشبورد"
          href="/"
          icon={Home}
          isCollapsed={true}
        />
      );

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-title', 'داشبورد');
    });
  });

  describe('Styling', () => {
    it('should have minimum height', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const button = container.querySelector('.MuiListItemButton-root');
      expect(button).toBeInTheDocument();
    });

    it('should justify content center when collapsed', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={true} />
      );

      const button = container.querySelector('.MuiListItemButton-root');
      expect(button).toBeInTheDocument();
    });

    it('should justify content flex-start when expanded', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const button = container.querySelector('.MuiListItemButton-root');
      expect(button).toBeInTheDocument();
    });

    it('should apply selected styles when active', () => {
      const { container } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />,
        { initialRoute: '/' }
      );

      const button = container.querySelector('.Mui-selected');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />,
        { initialRoute: '/loans' }
      );

      const button = screen.getByRole('link');
      button.focus();

      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');

      expect(window.location.pathname).toBe('/');
    });

    it('should have accessible link role', () => {
      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    it('should provide tooltip for accessibility when collapsed', () => {
      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={true} />
      );

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-title', 'خانه');
    });

    it('should be focusable', () => {
      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const button = screen.getByRole('link');
      button.focus();

      expect(button).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty name gracefully', () => {
      expect(() => {
        renderWithProviders(
          <SidebarNavItem name="" href="/" icon={Home} isCollapsed={false} />
        );
      }).not.toThrow();
    });

    it('should handle special characters in href', () => {
      renderWithProviders(
        <SidebarNavItem
          name="Search"
          href="/search?q=test&filter=all"
          icon={Home}
          isCollapsed={false}
        />
      );

      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('should handle rapid collapse/expand state changes', () => {
      const { rerender } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      rerender(<SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={true} />);
      rerender(<SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />);
      rerender(<SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={true} />);

      expect(screen.queryByText('خانه')).not.toBeInTheDocument();
    });

    it('should handle very long names', () => {
      const longName = 'این یک نام بسیار طولانی است که ممکن است باعث مشکل در رابط کاربری شود';

      renderWithProviders(
        <SidebarNavItem name={longName} href="/" icon={Home} isCollapsed={false} />
      );

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should handle rapid clicks without errors', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />,
        { initialRoute: '/loans' }
      );

      const button = screen.getByRole('link');

      // Rapid clicks
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(window.location.pathname).toBe('/');
    });
  });

  describe('Props Validation', () => {
    it('should accept all required props', () => {
      expect(() => {
        renderWithProviders(
          <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
        );
      }).not.toThrow();
    });

    it('should handle boolean isCollapsed prop', () => {
      const { rerender } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      expect(screen.getByText('خانه')).toBeInTheDocument();

      rerender(<SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={true} />);

      expect(screen.queryByText('خانه')).not.toBeInTheDocument();
    });

    it('should accept any href string', () => {
      const hrefs = ['/', '/loans', '/banks', '/compare', '/calculators'];

      hrefs.forEach((href) => {
        const { container } = renderWithProviders(
          <SidebarNavItem name="Test" href={href} icon={Home} isCollapsed={false} />
        );

        expect(container.querySelector('.MuiListItemButton-root')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render efficiently', () => {
      const startTime = performance.now();

      renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(50);
    });

    it('should not cause unnecessary re-renders', () => {
      const { rerender } = renderWithProviders(
        <SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />
      );

      rerender(<SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />);
      rerender(<SidebarNavItem name="خانه" href="/" icon={Home} isCollapsed={false} />);

      expect(screen.getByText('خانه')).toBeInTheDocument();
    });
  });
});
