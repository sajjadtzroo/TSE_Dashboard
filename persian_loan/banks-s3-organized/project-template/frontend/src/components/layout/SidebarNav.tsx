import { navigationGroups } from '@/constants/navigation.constants';
import { SidebarNavItem } from './SidebarNavItem';

interface SidebarNavProps {
  isCollapsed: boolean;
}

/**
 * SidebarNav - Renders grouped navigation items
 *
 * Features:
 * - 4 navigation groups with visual separation
 * - Group titles (hidden when collapsed)
 * - Dividers between groups
 * - RTL support for Persian text
 */
export function SidebarNav({ isCollapsed }: SidebarNavProps) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
      {navigationGroups.map((group, groupIndex) => (
        <div key={group.id}>
          {/* Group title - hidden when collapsed */}
          {!isCollapsed && (
            <h3 className="px-3 mb-2 text-xs font-semibold tracking-wider text-text-tertiary uppercase">
              {group.title}
            </h3>
          )}

          {/* Group items */}
          <div className="space-y-1">
            {group.items.map((item) => (
              <SidebarNavItem
                key={item.href}
                name={item.name}
                href={item.href}
                icon={item.icon}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>

          {/* Divider between groups (except last group) */}
          {groupIndex < navigationGroups.length - 1 && (
            <div className="mt-4 border-t border-border-light" />
          )}
        </div>
      ))}
    </nav>
  );
}
