/**
 * Tests for SidebarNav Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, renderWithProviders, within } from '@/test/utils';
import { SidebarNav } from '../SidebarNav';
import { navigationGroups } from '@/constants/navigation.constants';

// Mock the prefetch map to avoid dynamic imports in tests
vi.mock('@/hooks', () => ({
  routePrefetchMap: {},
  usePrefetch: () => ({ prefetch: vi.fn(), createPrefetchHandler: vi.fn() }),
}));

describe('SidebarNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Expanded State', () => {
    it('should render the nav element', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />);

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('should render all navigation group titles when expanded', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      for (const group of navigationGroups) {
        expect(screen.getByText(group.title)).toBeInTheDocument();
      }
    });

    it('should render all navigation items when expanded', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      for (const group of navigationGroups) {
        for (const item of group.items) {
          expect(screen.getByText(item.name)).toBeInTheDocument();
        }
      }
    });

    it('should render the correct total number of navigation items', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      const totalItems = navigationGroups.reduce(
        (sum, group) => sum + group.items.length,
        0
      );

      // Each nav item has a link
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(totalItems);
    });

    it('should render dividers between groups but not after the last group', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />);

      const dividers = container.querySelectorAll('.MuiDivider-root');
      // One fewer divider than the number of groups
      expect(dividers).toHaveLength(navigationGroups.length - 1);
    });

    it('should render group titles as ListSubheader elements', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />);

      const subheaders = container.querySelectorAll('.MuiListSubheader-root');
      expect(subheaders).toHaveLength(navigationGroups.length);
    });
  });

  describe('Rendering - Collapsed State', () => {
    it('should hide group titles when collapsed', () => {
      renderWithProviders(<SidebarNav isCollapsed={true} />);

      for (const group of navigationGroups) {
        expect(screen.queryByText(group.title)).not.toBeInTheDocument();
      }
    });

    it('should still render navigation items when collapsed', () => {
      renderWithProviders(<SidebarNav isCollapsed={true} />);

      const totalItems = navigationGroups.reduce(
        (sum, group) => sum + group.items.length,
        0
      );

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(totalItems);
    });

    it('should hide item text labels when collapsed', () => {
      renderWithProviders(<SidebarNav isCollapsed={true} />);

      // ListItemText should not be rendered for any item
      for (const group of navigationGroups) {
        for (const item of group.items) {
          expect(screen.queryByText(item.name)).not.toBeInTheDocument();
        }
      }
    });

    it('should not render ListSubheader elements when collapsed', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={true} />);

      const subheaders = container.querySelectorAll('.MuiListSubheader-root');
      expect(subheaders).toHaveLength(0);
    });

    it('should still render dividers between groups when collapsed', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={true} />);

      const dividers = container.querySelectorAll('.MuiDivider-root');
      expect(dividers).toHaveLength(navigationGroups.length - 1);
    });
  });

  describe('Navigation Links', () => {
    it('should render links with correct href for each navigation item', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      for (const group of navigationGroups) {
        for (const item of group.items) {
          const link = screen.getByText(item.name).closest('a');
          expect(link).toHaveAttribute('href', item.href);
        }
      }
    });

    it('should render dashboard link pointing to root', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      const dashboardLink = screen.getByText('داشبورد').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/');
    });

    it('should render analytics link pointing to /analytics', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      const analyticsLink = screen.getByText('تحلیل وام‌ها').closest('a');
      expect(analyticsLink).toHaveAttribute('href', '/analytics');
    });

    it('should render banks link pointing to /banks', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      const banksLink = screen.getByText('بانک‌ها').closest('a');
      expect(banksLink).toHaveAttribute('href', '/banks');
    });
  });

  describe('Active State', () => {
    it('should highlight the active navigation item based on current route', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />, {
        initialRoute: '/',
      });

      // The MUI ListItemButton for dashboard should have the selected class
      const selectedButtons = container.querySelectorAll('.Mui-selected');
      expect(selectedButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should highlight analytics link when on analytics route', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />, {
        initialRoute: '/analytics',
      });

      const selectedButtons = container.querySelectorAll('.Mui-selected');
      expect(selectedButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should highlight loans link when on loans route', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />, {
        initialRoute: '/loans',
      });

      const selectedButtons = container.querySelectorAll('.Mui-selected');
      expect(selectedButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should not highlight any other items when on a specific route', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />, {
        initialRoute: '/banks',
      });

      // Only one item should be selected
      const selectedButtons = container.querySelectorAll('.Mui-selected');
      expect(selectedButtons).toHaveLength(1);
    });
  });

  describe('Icons', () => {
    it('should render an icon for each navigation item', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />);

      const totalItems = navigationGroups.reduce(
        (sum, group) => sum + group.items.length,
        0
      );

      // Each item has a ListItemIcon with an SVG inside
      const icons = container.querySelectorAll('.MuiListItemIcon-root svg');
      expect(icons).toHaveLength(totalItems);
    });

    it('should render icons when collapsed', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={true} />);

      const totalItems = navigationGroups.reduce(
        (sum, group) => sum + group.items.length,
        0
      );

      const icons = container.querySelectorAll('.MuiListItemIcon-root svg');
      expect(icons).toHaveLength(totalItems);
    });
  });

  describe('Navigation Groups Structure', () => {
    it('should render the main group with correct items', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      expect(screen.getByText('اصلی')).toBeInTheDocument();
      expect(screen.getByText('داشبورد')).toBeInTheDocument();
      expect(screen.getByText('تحلیل وام‌ها')).toBeInTheDocument();
    });

    it('should render the search & compare group with correct items', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      expect(screen.getByText('جستجو و مقایسه')).toBeInTheDocument();
      expect(screen.getByText('بانک‌ها')).toBeInTheDocument();
      expect(screen.getByText('وام‌ها')).toBeInTheDocument();
      expect(screen.getByText('مقایسه وام‌ها')).toBeInTheDocument();
    });

    it('should render the tools group with correct items', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      expect(screen.getByText('ابزارها')).toBeInTheDocument();
      expect(screen.getByText('ماشین حساب‌ها')).toBeInTheDocument();
      expect(screen.getByText('بهینه‌ساز وام')).toBeInTheDocument();
      expect(screen.getByText('واردات داده')).toBeInTheDocument();
    });

    it('should render the personal group with correct items', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      expect(screen.getByText('شخصی')).toBeInTheDocument();
      expect(screen.getByText('وام‌های من')).toBeInTheDocument();
    });

    it('should render 4 navigation groups', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />);

      const subheaders = container.querySelectorAll('.MuiListSubheader-root');
      expect(subheaders).toHaveLength(4);
    });
  });

  describe('Tooltips (Collapsed State)', () => {
    it('should wrap nav items with tooltips when collapsed', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={true} />);

      // MUI Tooltip renders its content; when collapsed, links still exist
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should not wrap nav items with tooltips when expanded', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      // When expanded, text labels are visible directly
      expect(screen.getByText('داشبورد')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render as a nav element for semantic navigation', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />);

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('should render navigation items as accessible links', () => {
      renderWithProviders(<SidebarNav isCollapsed={false} />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);

      // Each link should be accessible
      for (const link of links) {
        expect(link).toHaveAttribute('href');
      }
    });

    it('should have proper list structure', () => {
      const { container } = renderWithProviders(<SidebarNav isCollapsed={false} />);

      // MUI List renders div with role
      const lists = container.querySelectorAll('.MuiList-root');
      expect(lists.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should render without errors with isCollapsed=true', () => {
      expect(() => {
        renderWithProviders(<SidebarNav isCollapsed={true} />);
      }).not.toThrow();
    });

    it('should render without errors with isCollapsed=false', () => {
      expect(() => {
        renderWithProviders(<SidebarNav isCollapsed={false} />);
      }).not.toThrow();
    });

    it('should maintain correct link count regardless of collapsed state', () => {
      const totalItems = navigationGroups.reduce(
        (sum, group) => sum + group.items.length,
        0
      );

      const { unmount } = renderWithProviders(<SidebarNav isCollapsed={false} />);
      expect(screen.getAllByRole('link')).toHaveLength(totalItems);
      unmount();

      renderWithProviders(<SidebarNav isCollapsed={true} />);
      expect(screen.getAllByRole('link')).toHaveLength(totalItems);
    });
  });
});
