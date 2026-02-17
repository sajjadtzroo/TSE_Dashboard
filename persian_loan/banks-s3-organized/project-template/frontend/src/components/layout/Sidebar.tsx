/**
 * Sidebar Component - Dark Theme with Grouped Navigation and Collapse Support
 */

import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { SidebarToggle } from './SidebarToggle';
import { SidebarNav } from './SidebarNav';
import { SidebarStats } from './SidebarStats';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Sidebar Component
 *
 * Features:
 * - Mobile: Drawer overlay (always expanded)
 * - Desktop: Fixed sidebar with collapse support
 * - Grouped navigation with 4 sections
 * - Quick stats in footer
 * - Smooth width transitions (300ms)
 * - localStorage persistence for collapse state
 *
 * Width:
 * - Collapsed: w-18 (72px) - icon only
 * - Expanded: w-64 (256px) - full with labels
 */
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isCollapsed } = useSidebar();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-900 bg-opacity-80 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 right-0 z-50 bg-surface-100 border-l border-border-light shadow-dark-lg transform transition-all duration-300 ease-in-out lg:static lg:inset-auto',
          // Mobile: always w-64, slide in/out
          'w-64',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          // Desktop: collapse support, always visible
          'lg:translate-x-0',
          isCollapsed ? 'lg:w-18' : 'lg:w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 border-b border-border-dark lg:hidden">
            <span className="text-lg font-semibold text-gray-50">منو</span>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-300 hover:text-gray-50 hover:bg-surface-50 transition-colors"
              aria-label="بستن منو"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop toggle button */}
          <SidebarToggle />

          {/* Navigation */}
          <SidebarNav isCollapsed={isCollapsed} />

          {/* Stats Footer */}
          <SidebarStats isCollapsed={isCollapsed} />

          {/* Footer text (hidden when collapsed) */}
          {!isCollapsed && (
            <div className="p-4 border-t border-border-light">
              <p className="text-xs text-gray-400 text-center">
                تحلیل وام‌های بانک‌های ایران
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
