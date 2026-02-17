import { NavLink } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import { Tooltip } from '@/components/ui';

interface SidebarNavItemProps {
  name: string;
  href: string;
  icon: LucideIcon;
  isCollapsed: boolean;
}

/**
 * SidebarNavItem - Individual navigation item with tooltip support
 *
 * Features:
 * - Active state highlighting
 * - Tooltip on hover when sidebar is collapsed
 * - RTL support for Persian text
 * - Responsive text truncation
 */
export function SidebarNavItem({ name, href, icon: Icon, isCollapsed }: SidebarNavItemProps) {
  const navItem = (
    <NavLink
      to={href}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-600 text-white shadow-glow'
            : 'text-text-secondary hover:bg-surface-100 hover:text-text-primary'
        } ${isCollapsed ? 'justify-center' : ''}`
      }
    >
      <Icon className={`flex-shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-5 h-5'}`} />
      {!isCollapsed && <span className="truncate">{name}</span>}
    </NavLink>
  );

  // Wrap with tooltip when collapsed
  if (isCollapsed) {
    return (
      <Tooltip content={name} position="left">
        {navItem}
      </Tooltip>
    );
  }

  return navItem;
}
