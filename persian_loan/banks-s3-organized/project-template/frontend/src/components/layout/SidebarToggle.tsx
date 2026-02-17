import { ChevronRight } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { Tooltip } from '@/components/ui';

/**
 * SidebarToggle - Collapse/Expand button for desktop sidebar
 *
 * Features:
 * - ChevronRight icon that rotates 180° when collapsed
 * - Hidden on mobile (sidebar always expanded on mobile)
 * - Tooltip for accessibility
 * - Positioned at top of sidebar
 */
export function SidebarToggle() {
  const { isCollapsed, toggleCollapse } = useSidebar();

  return (
    <div className="hidden lg:flex px-3 py-4 border-b border-border-light">
      <Tooltip content={isCollapsed ? 'باز کردن منو' : 'بستن منو'} position="left">
        <button
          onClick={toggleCollapse}
          className="flex items-center justify-center w-full p-2 rounded-lg transition-colors hover:bg-surface-100 text-text-secondary hover:text-text-primary"
          aria-label={isCollapsed ? 'باز کردن منو' : 'بستن منو'}
        >
          <ChevronRight
            className={`w-5 h-5 transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </Tooltip>
    </div>
  );
}
