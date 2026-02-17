/**
 * Tests for SidebarContext
 * تست‌های Context نوار کناری
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider, useSidebar } from '../SidebarContext';
import { STORAGE_KEYS, STORAGE_VERSION } from '@/constants/app.constants';
import { ReactNode } from 'react';

describe('SidebarContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Provider Rendering - رندر کردن Provider', () => {
    it('should render children correctly', () => {
      render(
        <SidebarProvider>
          <div>Test Content</div>
        </SidebarProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render multiple children correctly', () => {
      render(
        <SidebarProvider>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </SidebarProvider>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should not crash with null children', () => {
      expect(() => {
        render(<SidebarProvider>{null}</SidebarProvider>);
      }).not.toThrow();
    });

    it('should render with React fragments', () => {
      render(
        <SidebarProvider>
          <>
            <div>Fragment Child 1</div>
            <div>Fragment Child 2</div>
          </>
        </SidebarProvider>
      );

      expect(screen.getByText('Fragment Child 1')).toBeInTheDocument();
      expect(screen.getByText('Fragment Child 2')).toBeInTheDocument();
    });
  });

  describe('Default State - وضعیت پیش‌فرض', () => {
    it('should have isCollapsed as false by default', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it('should provide toggleCollapse function', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(typeof result.current.toggleCollapse).toBe('function');
    });

    it('should provide setCollapsed function', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(typeof result.current.setCollapsed).toBe('function');
    });

    it('should have all required context properties', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(result.current).toHaveProperty('isCollapsed');
      expect(result.current).toHaveProperty('toggleCollapse');
      expect(result.current).toHaveProperty('setCollapsed');
    });
  });

  describe('toggleCollapse Function - تابع تغییر وضعیت نوار کناری', () => {
    it('should toggle collapse state from false to true', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(result.current.isCollapsed).toBe(false);

      act(() => {
        result.current.toggleCollapse();
      });

      expect(result.current.isCollapsed).toBe(true);
    });

    it('should toggle collapse state from true to false', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.toggleCollapse();
      });

      expect(result.current.isCollapsed).toBe(true);

      act(() => {
        result.current.toggleCollapse();
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it('should handle multiple rapid toggles', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.toggleCollapse();
        result.current.toggleCollapse();
        result.current.toggleCollapse();
        result.current.toggleCollapse();
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it('should maintain consistent state after odd number of toggles', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.toggleCollapse();
        result.current.toggleCollapse();
        result.current.toggleCollapse();
      });

      expect(result.current.isCollapsed).toBe(true);
    });
  });

  describe('setCollapsed Function - تابع تنظیم وضعیت نوار کناری', () => {
    it('should set collapse state to true', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setCollapsed(true);
      });

      expect(result.current.isCollapsed).toBe(true);
    });

    it('should set collapse state to false', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setCollapsed(true);
      });

      expect(result.current.isCollapsed).toBe(true);

      act(() => {
        result.current.setCollapsed(false);
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it('should allow setting same value multiple times', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setCollapsed(true);
        result.current.setCollapsed(true);
        result.current.setCollapsed(true);
      });

      expect(result.current.isCollapsed).toBe(true);
    });

    it('should override previous state', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.toggleCollapse();
      });

      expect(result.current.isCollapsed).toBe(true);

      act(() => {
        result.current.setCollapsed(false);
      });

      expect(result.current.isCollapsed).toBe(false);
    });
  });

  describe('localStorage Persistence - ذخیره در localStorage', () => {
    it('should persist collapsed state to localStorage', async () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setCollapsed(true);
      });

      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
        expect(stored).toBeTruthy();
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.collapsed).toBe(true);
          expect(parsed.version).toBe(STORAGE_VERSION.SIDEBAR_COLLAPSED);
        }
      });
    });

    it('should persist expanded state to localStorage', async () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setCollapsed(true);
      });

      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
        expect(stored).toBeTruthy();
      });

      act(() => {
        result.current.setCollapsed(false);
      });

      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.collapsed).toBe(false);
        }
      });
    });

    it('should load collapsed state from localStorage on mount', () => {
      // Pre-populate localStorage
      const storedData = {
        version: STORAGE_VERSION.SIDEBAR_COLLAPSED,
        collapsed: true,
      };
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(storedData));

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(result.current.isCollapsed).toBe(true);
    });

    it('should load expanded state from localStorage on mount', () => {
      // Pre-populate localStorage
      const storedData = {
        version: STORAGE_VERSION.SIDEBAR_COLLAPSED,
        collapsed: false,
      };
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(storedData));

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it('should clear old version data from localStorage', () => {
      // Set old version
      const oldData = {
        version: '0.9',
        collapsed: true,
      };
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(oldData));

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      // Should default to false (expanded) due to version mismatch
      expect(result.current.isCollapsed).toBe(false);

      // Old data should be removed
      const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
      expect(stored).toBeNull();
    });

    it('should handle missing version field', () => {
      // Data without version
      const dataWithoutVersion = {
        collapsed: true,
      };
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(dataWithoutVersion));

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      // Should default to false due to missing version
      expect(result.current.isCollapsed).toBe(false);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Set invalid JSON
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, '{invalid json');

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(result.current.isCollapsed).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle localStorage quota exceeded error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage.setItem to throw quota error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setCollapsed(true);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      // Restore
      Storage.prototype.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });

    it('should not persist on first render (initial load)', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      // Should not call setItem on mount (only reads)
      // The initial render shouldn't trigger the persistence effect
      expect(setItemSpy).not.toHaveBeenCalledWith(
        STORAGE_KEYS.SIDEBAR_COLLAPSED,
        expect.any(String)
      );

      setItemSpy.mockRestore();
    });

    it('should handle missing collapsed field in stored data', () => {
      const dataWithoutCollapsed = {
        version: STORAGE_VERSION.SIDEBAR_COLLAPSED,
      };
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(dataWithoutCollapsed));

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      // Should default to false when collapsed field is missing
      expect(result.current.isCollapsed).toBe(false);
    });

    it('should handle null collapsed field in stored data', () => {
      const dataWithNullCollapsed = {
        version: STORAGE_VERSION.SIDEBAR_COLLAPSED,
        collapsed: null,
      };
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(dataWithNullCollapsed));

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      // Should default to false when collapsed is null
      expect(result.current.isCollapsed).toBe(false);
    });
  });

  describe('Multiple Consumers - چند مصرف‌کننده', () => {
    it('should share state across multiple consumers', () => {
      function Consumer1() {
        const { isCollapsed } = useSidebar();
        return <div>Consumer 1: {isCollapsed ? 'collapsed' : 'expanded'}</div>;
      }

      function Consumer2() {
        const { isCollapsed } = useSidebar();
        return <div>Consumer 2: {isCollapsed ? 'collapsed' : 'expanded'}</div>;
      }

      function Consumer3() {
        const { toggleCollapse } = useSidebar();
        return <button onClick={() => toggleCollapse()}>Toggle</button>;
      }

      render(
        <SidebarProvider>
          <Consumer1 />
          <Consumer2 />
          <Consumer3 />
        </SidebarProvider>
      );

      expect(screen.getByText('Consumer 1: expanded')).toBeInTheDocument();
      expect(screen.getByText('Consumer 2: expanded')).toBeInTheDocument();
    });

    it('should update all consumers when state changes', async () => {
      function Consumer1() {
        const { isCollapsed } = useSidebar();
        return <div data-testid="status1">{isCollapsed ? 'collapsed' : 'expanded'}</div>;
      }

      function Consumer2() {
        const { isCollapsed } = useSidebar();
        return <div data-testid="status2">{isCollapsed ? 'collapsed' : 'expanded'}</div>;
      }

      function Controller() {
        const { toggleCollapse } = useSidebar();
        return <button onClick={() => toggleCollapse()}>Toggle</button>;
      }

      const user = userEvent.setup();

      render(
        <SidebarProvider>
          <Consumer1 />
          <Consumer2 />
          <Controller />
        </SidebarProvider>
      );

      const button = screen.getByText('Toggle');
      await user.click(button);

      expect(screen.getByTestId('status1')).toHaveTextContent('collapsed');
      expect(screen.getByTestId('status2')).toHaveTextContent('collapsed');
    });

    it('should synchronize state between setCollapsed and toggleCollapse', async () => {
      function DisplayComponent() {
        const { isCollapsed } = useSidebar();
        return <div data-testid="display">{isCollapsed ? 'collapsed' : 'expanded'}</div>;
      }

      function SetController() {
        const { setCollapsed } = useSidebar();
        return <button onClick={() => setCollapsed(true)}>Set Collapsed</button>;
      }

      function ToggleController() {
        const { toggleCollapse } = useSidebar();
        return <button onClick={() => toggleCollapse()}>Toggle</button>;
      }

      const user = userEvent.setup();

      render(
        <SidebarProvider>
          <DisplayComponent />
          <SetController />
          <ToggleController />
        </SidebarProvider>
      );

      const setButton = screen.getByText('Set Collapsed');
      await user.click(setButton);

      expect(screen.getByTestId('display')).toHaveTextContent('collapsed');

      const toggleButton = screen.getByText('Toggle');
      await user.click(toggleButton);

      expect(screen.getByTestId('display')).toHaveTextContent('expanded');
    });
  });

  describe('Custom Hook Error Cases - موارد خطای هوک سفارشی', () => {
    it('should throw error when used outside provider', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSidebar());
      }).toThrow('useSidebar must be used within SidebarProvider');

      consoleErrorSpy.mockRestore();
    });

    it('should not throw error when used inside provider', () => {
      expect(() => {
        renderHook(() => useSidebar(), {
          wrapper: SidebarProvider,
        });
      }).not.toThrow();
    });

    it('should provide correct error message', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        renderHook(() => useSidebar());
      } catch (error: any) {
        expect(error.message).toBe('useSidebar must be used within SidebarProvider');
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases - موارد خاص', () => {
    it('should handle empty localStorage gracefully', () => {
      localStorage.clear();

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it('should handle complex toggle sequences', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.toggleCollapse();
        result.current.setCollapsed(false);
        result.current.toggleCollapse();
        result.current.toggleCollapse();
        result.current.setCollapsed(true);
      });

      expect(result.current.isCollapsed).toBe(true);
    });

    it('should maintain state consistency after remount', async () => {
      const { result, unmount } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setCollapsed(true);
      });

      // Wait for persistence
      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
        expect(stored).toBeTruthy();
      });

      unmount();

      // Remount
      const { result: newResult } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(newResult.current.isCollapsed).toBe(true);
    });

    it('should handle string boolean values in localStorage', () => {
      // Some old code might store as string
      const invalidData = {
        version: STORAGE_VERSION.SIDEBAR_COLLAPSED,
        collapsed: 'true' as any,
      };
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(invalidData));

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      // String 'true' is truthy, so ?? false will use the string, which is truthy
      // The component treats any truthy value as collapsed
      expect(result.current.isCollapsed).toBeTruthy();
    });

    it('should handle numeric boolean values in localStorage', () => {
      const invalidData = {
        version: STORAGE_VERSION.SIDEBAR_COLLAPSED,
        collapsed: 1 as any,
      };
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(invalidData));

      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      // Numeric 1 is truthy, ?? false will use the number, which is truthy
      // The component treats any truthy value as collapsed
      expect(result.current.isCollapsed).toBeTruthy();
    });
  });

  describe('Context Value Memoization - حافظه‌سازی مقدار Context', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      const firstToggleRef = result.current.toggleCollapse;
      const firstSetRef = result.current.setCollapsed;

      rerender();

      expect(result.current.toggleCollapse).toBe(firstToggleRef);
      expect(result.current.setCollapsed).toBe(firstSetRef);
    });

    it('should maintain function stability after state changes', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      const toggleRef = result.current.toggleCollapse;
      const setRef = result.current.setCollapsed;

      act(() => {
        result.current.toggleCollapse();
      });

      expect(result.current.toggleCollapse).toBe(toggleRef);
      expect(result.current.setCollapsed).toBe(setRef);
    });
  });

  describe('Integration with Components - ادغام با کامپوننت‌ها', () => {
    it('should work with button clicks', async () => {
      function SidebarController() {
        const { isCollapsed, toggleCollapse } = useSidebar();
        return (
          <div>
            <div data-testid="status">{isCollapsed ? 'collapsed' : 'expanded'}</div>
            <button onClick={toggleCollapse}>Toggle Sidebar</button>
          </div>
        );
      }

      const user = userEvent.setup();

      render(
        <SidebarProvider>
          <SidebarController />
        </SidebarProvider>
      );

      expect(screen.getByTestId('status')).toHaveTextContent('expanded');

      const button = screen.getByText('Toggle Sidebar');
      await user.click(button);

      expect(screen.getByTestId('status')).toHaveTextContent('collapsed');
    });

    it('should work with checkbox controls', async () => {
      function SidebarCheckbox() {
        const { isCollapsed, setCollapsed } = useSidebar();
        return (
          <div>
            <input
              type="checkbox"
              checked={isCollapsed}
              onChange={(e) => setCollapsed(e.target.checked)}
              data-testid="checkbox"
            />
            <span data-testid="label">{isCollapsed ? 'Collapsed' : 'Expanded'}</span>
          </div>
        );
      }

      const user = userEvent.setup();

      render(
        <SidebarProvider>
          <SidebarCheckbox />
        </SidebarProvider>
      );

      const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      expect(screen.getByTestId('label')).toHaveTextContent('Expanded');

      await user.click(checkbox);

      expect(checkbox.checked).toBe(true);
      expect(screen.getByTestId('label')).toHaveTextContent('Collapsed');
    });

    it('should work with conditional rendering', async () => {
      function ConditionalContent() {
        const { isCollapsed, toggleCollapse } = useSidebar();
        return (
          <div>
            <button onClick={toggleCollapse}>Toggle</button>
            {isCollapsed ? (
              <div data-testid="collapsed-content">Collapsed View</div>
            ) : (
              <div data-testid="expanded-content">Expanded View</div>
            )}
          </div>
        );
      }

      const user = userEvent.setup();

      render(
        <SidebarProvider>
          <ConditionalContent />
        </SidebarProvider>
      );

      expect(screen.getByTestId('expanded-content')).toBeInTheDocument();
      expect(screen.queryByTestId('collapsed-content')).not.toBeInTheDocument();

      await user.click(screen.getByText('Toggle'));

      expect(screen.queryByTestId('expanded-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('collapsed-content')).toBeInTheDocument();
    });
  });

  describe('Performance - عملکرد', () => {
    it('should handle many rapid state changes efficiently', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.toggleCollapse();
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 100ms for 100 toggles)
      expect(duration).toBeLessThan(100);
      expect(result.current.isCollapsed).toBe(false); // Even number of toggles
    });

    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0;

      function TestComponent() {
        renderCount++;
        const { isCollapsed } = useSidebar();
        return <div>{isCollapsed ? 'collapsed' : 'expanded'}</div>;
      }

      const { rerender } = render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      );

      const initialRenderCount = renderCount;

      // Rerender without changing props
      rerender(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      );

      // Should only render once more for the rerender
      expect(renderCount).toBe(initialRenderCount + 1);
    });
  });
});
