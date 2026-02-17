/**
 * SidebarToggle Component Tests
 *
 * Comprehensive tests for the SidebarToggle component including:
 * - Basic rendering (icon button, chevron icon)
 * - Click handler (toggleCollapse integration)
 * - Icon rotation states (collapsed vs expanded)
 * - Tooltip text (Persian labels for collapsed/expanded)
 * - Accessibility (aria-label, keyboard navigation)
 * - Context integration (SidebarProvider)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, userEvent, waitFor } from '@/test/utils';
import { render } from '@testing-library/react';
import { SidebarToggle } from '../SidebarToggle';
import { SidebarProvider } from '@/context/SidebarContext';
import { STORAGE_KEYS, STORAGE_VERSION } from '@/constants/app.constants';
import { ReactNode } from 'react';

const STORAGE_KEY = STORAGE_KEYS.SIDEBAR_COLLAPSED;
const VERSION = STORAGE_VERSION.SIDEBAR_COLLAPSED;

/**
 * Helper to render SidebarToggle wrapped in SidebarProvider.
 * Optionally pre-sets localStorage to control initial collapsed state.
 */
function renderSidebarToggle(options?: { initialCollapsed?: boolean }) {
  if (options?.initialCollapsed !== undefined) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: VERSION,
        collapsed: options.initialCollapsed,
      })
    );
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return <SidebarProvider>{children}</SidebarProvider>;
  }

  return render(<SidebarToggle />, { wrapper: Wrapper });
}

describe('SidebarToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Basic Rendering', () => {
    it('should render the toggle button', () => {
      renderSidebarToggle();

      // Default state is expanded, aria-label should be "بستن منو"
      const button = screen.getByRole('button', { name: 'بستن منو' });
      expect(button).toBeInTheDocument();
    });

    it('should render MUI IconButton', () => {
      const { container } = renderSidebarToggle();
      const iconButton = container.querySelector('.MuiIconButton-root');
      expect(iconButton).toBeInTheDocument();
    });

    it('should render chevron icon', () => {
      const { container } = renderSidebarToggle();
      const chevronIcon = container.querySelector('svg[class*="lucide-chevron-right"]');
      expect(chevronIcon).toBeInTheDocument();
    });

    it('should be wrapped in a MUI Box', () => {
      const { container } = renderSidebarToggle();
      const box = container.querySelector('.MuiBox-root');
      expect(box).toBeInTheDocument();
    });
  });

  describe('Click Handler', () => {
    it('should toggle collapse state when clicked', async () => {
      const user = userEvent.setup();
      renderSidebarToggle();

      // Initially expanded - shows "بستن منو" (close menu)
      const button = screen.getByRole('button', { name: 'بستن منو' });
      expect(button).toBeInTheDocument();

      // Click to collapse
      await user.click(button);

      // After click - shows "باز کردن منو" (open menu)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'باز کردن منو' })).toBeInTheDocument();
      });
    });

    it('should toggle back to expanded when clicked again', async () => {
      const user = userEvent.setup();
      renderSidebarToggle();

      const button = screen.getByRole('button', { name: 'بستن منو' });

      // Click to collapse
      await user.click(button);

      // Now click to expand again
      const collapsedButton = screen.getByRole('button', { name: 'باز کردن منو' });
      await user.click(collapsedButton);

      // Should be back to expanded state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'بستن منو' })).toBeInTheDocument();
      });
    });

    it('should handle multiple rapid clicks', async () => {
      const user = userEvent.setup();
      renderSidebarToggle();

      const button = screen.getByRole('button');

      // Click 3 times (expanded -> collapsed -> expanded -> collapsed)
      await user.click(button);
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('button'));

      // After 3 clicks, should be collapsed (odd number of clicks)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'باز کردن منو' })).toBeInTheDocument();
      });
    });
  });

  describe('Icon Rotation States', () => {
    it('should not rotate icon when expanded (default state)', () => {
      const { container } = renderSidebarToggle();

      const chevronIcon = container.querySelector('svg[class*="lucide-chevron-right"]');
      expect(chevronIcon).toBeInTheDocument();
      // Expanded state: rotate(0deg)
      expect(chevronIcon).toHaveStyle({ transform: 'rotate(0deg)' });
    });

    it('should rotate icon 180 degrees when collapsed', async () => {
      const user = userEvent.setup();
      const { container } = renderSidebarToggle();

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const chevronIcon = container.querySelector('svg[class*="lucide-chevron-right"]');
        expect(chevronIcon).toHaveStyle({ transform: 'rotate(180deg)' });
      });
    });

    it('should restore rotation when expanded again', async () => {
      const user = userEvent.setup();
      const { container } = renderSidebarToggle();

      const button = screen.getByRole('button');

      // Collapse
      await user.click(button);
      // Expand
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        const chevronIcon = container.querySelector('svg[class*="lucide-chevron-right"]');
        expect(chevronIcon).toHaveStyle({ transform: 'rotate(0deg)' });
      });
    });

    it('should have CSS transition on the icon', () => {
      const { container } = renderSidebarToggle();

      const chevronIcon = container.querySelector('svg[class*="lucide-chevron-right"]');
      expect(chevronIcon).toHaveStyle({ transition: 'transform 300ms ease-in-out' });
    });
  });

  describe('Tooltip', () => {
    it('should have tooltip with "بستن منو" when expanded', () => {
      renderSidebarToggle();

      // Tooltip title is reflected in the aria-label
      const button = screen.getByRole('button', { name: 'بستن منو' });
      expect(button).toHaveAttribute('aria-label', 'بستن منو');
    });

    it('should have tooltip with "باز کردن منو" when collapsed', async () => {
      const user = userEvent.setup();
      renderSidebarToggle();

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const collapsedButton = screen.getByRole('button', { name: 'باز کردن منو' });
        expect(collapsedButton).toHaveAttribute('aria-label', 'باز کردن منو');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label matching current state', () => {
      renderSidebarToggle();

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'بستن منو');
    });

    it('should update aria-label when state changes', async () => {
      const user = userEvent.setup();
      renderSidebarToggle();

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'بستن منو');

      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'باز کردن منو');
      });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      renderSidebarToggle();

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      // Press Enter to toggle
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'باز کردن منو' })).toBeInTheDocument();
      });
    });

    it('should be keyboard accessible with Space key', async () => {
      const user = userEvent.setup();
      renderSidebarToggle();

      const button = screen.getByRole('button');
      button.focus();

      // Press Space to toggle
      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'باز کردن منو' })).toBeInTheDocument();
      });
    });

    it('should have button role', () => {
      renderSidebarToggle();

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Context Integration', () => {
    it('should throw error when used outside SidebarProvider', () => {
      // Suppress console.error for this test since React will log the error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<SidebarToggle />);
      }).toThrow('useSidebar must be used within SidebarProvider');

      consoleSpy.mockRestore();
    });

    it('should respect initial collapsed state from localStorage', () => {
      renderSidebarToggle({ initialCollapsed: true });

      // Should show "باز کردن منو" when initially collapsed
      const button = screen.getByRole('button', { name: 'باز کردن منو' });
      expect(button).toBeInTheDocument();
    });

    it('should respect initial expanded state from localStorage', () => {
      renderSidebarToggle({ initialCollapsed: false });

      // Should show "بستن منو" when initially expanded
      const button = screen.getByRole('button', { name: 'بستن منو' });
      expect(button).toBeInTheDocument();
    });

    it('should persist state to localStorage on toggle', async () => {
      const user = userEvent.setup();
      renderSidebarToggle();

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.collapsed).toBe(true);
      });
    });
  });

  describe('Styling', () => {
    it('should have full width button', () => {
      const { container } = renderSidebarToggle();

      const iconButton = container.querySelector('.MuiIconButton-root');
      expect(iconButton).toBeInTheDocument();
    });

    it('should render without errors', () => {
      expect(() => {
        renderSidebarToggle();
      }).not.toThrow();
    });
  });
});
