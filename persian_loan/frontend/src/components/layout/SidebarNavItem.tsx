/**
 * SidebarNavItem - MUI ListItemButton with Navigation
 */

import { NavLink, useLocation } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import { ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import { routePrefetchMap, type RoutePath } from '@/hooks';

interface SidebarNavItemProps {
  name: string;
  href: string;
  icon: LucideIcon;
  isCollapsed: boolean;
}

/**
 * SidebarNavItem - Individual navigation item with MUI
 *
 * Features:
 * - Active state highlighting with MUI styling
 * - Tooltip on hover when sidebar is collapsed
 * - ListItemIcon with Lucide icons
 * - RTL support for Persian text
 * - Responsive text truncation
 */
export function SidebarNavItem({ name, href, icon: Icon, isCollapsed }: SidebarNavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href;

  // Prefetch route on hover for faster navigation
  const handleMouseEnter = () => {
    const prefetchFn = routePrefetchMap[href as RoutePath];
    if (prefetchFn) {
      prefetchFn().catch(() => {
        // Silently fail - prefetch is a performance enhancement
      });
    }
  };

  const navItem = (
    <ListItemButton
      component={NavLink}
      to={href}
      selected={isActive}
      onMouseEnter={handleMouseEnter}
      sx={{
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        minHeight: 44,
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: isCollapsed ? 'unset' : 40,
          justifyContent: 'center',
        }}
      >
        <Icon size={20} />
      </ListItemIcon>
      {!isCollapsed && (
        <ListItemText
          primary={name}
          primaryTypographyProps={{
            noWrap: true,
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        />
      )}
    </ListItemButton>
  );

  // Wrap with tooltip when collapsed
  if (isCollapsed) {
    return (
      <Tooltip title={name} placement="left" arrow>
        {navItem}
      </Tooltip>
    );
  }

  return navItem;
}
