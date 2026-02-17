import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { STORAGE_KEYS, STORAGE_VERSION } from '@/constants/app.constants';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

/**
 * SidebarProvider manages the sidebar collapse state with localStorage persistence
 *
 * Features:
 * - Persists collapse state to localStorage
 * - Version check to clear stale data
 * - Desktop-only (mobile always expanded)
 * - Safe error handling for localStorage quota issues
 *
 * Storage Format:
 * {
 *   version: "1.0",
 *   collapsed: boolean
 * }
 */
export function SidebarProvider({ children }: SidebarProviderProps) {
  // Initialize state from localStorage with lazy function
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
      if (!stored) return false;

      const data = JSON.parse(stored);

      // Version check - clear if version mismatch
      if (data.version !== STORAGE_VERSION.SIDEBAR_COLLAPSED) {
        localStorage.removeItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
        return false;
      }

      return data.collapsed ?? false;
    } catch (error) {
      console.error('Failed to load sidebar state from localStorage:', error);
      return false;
    }
  });

  // Track if this is the first render to skip initial persistence
  const isFirstRender = useRef(true);

  // Persist to localStorage whenever state changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    try {
      const data = {
        version: STORAGE_VERSION.SIDEBAR_COLLAPSED,
        collapsed: isCollapsed,
      };
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save sidebar state to localStorage:', error);
    }
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  const value: SidebarContextType = {
    isCollapsed,
    toggleCollapse,
    setCollapsed,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

/**
 * Hook to access sidebar collapse state
 * Must be used within SidebarProvider
 */
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}
