/**
 * SidebarNav - MUI List with Grouped Navigation
 */

import { Box, List, ListSubheader, Divider } from '@mui/material';
import { navigationGroups } from '@/constants/navigation.constants';
import { SidebarNavItem } from './SidebarNavItem';

interface SidebarNavProps {
  isCollapsed: boolean;
}

/**
 * SidebarNav - Renders grouped navigation items with MUI
 *
 * Features:
 * - 4 navigation groups with visual separation
 * - Group titles (hidden when collapsed)
 * - MUI List and ListItem components
 * - Dividers between groups
 * - RTL support for Persian text
 */
export function SidebarNav({ isCollapsed }: SidebarNavProps) {
  return (
    <Box
      component="nav"
      sx={{
        px: 1.5,
        py: 2,
      }}
    >
      {navigationGroups.map((group, groupIndex) => (
        <Box key={group.id} sx={{ mb: groupIndex < navigationGroups.length - 1 ? 3 : 0 }}>
          {/* Group Title - hidden when collapsed */}
          {!isCollapsed && (
            <ListSubheader
              component="div"
              sx={{
                px: 1.5,
                py: 1,
                backgroundColor: 'transparent',
                color: 'text.disabled',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                lineHeight: 1.5,
              }}
            >
              {group.title}
            </ListSubheader>
          )}

          {/* Group Items */}
          <List
            component="div"
            disablePadding
            sx={{
              '& .MuiListItemButton-root': {
                px: 1.5,
                py: 1.25,
                mb: 0.5,
              },
            }}
          >
            {group.items.map((item) => (
              <SidebarNavItem
                key={item.href}
                name={item.name}
                href={item.href}
                icon={item.icon}
                isCollapsed={isCollapsed}
              />
            ))}
          </List>

          {/* Divider between groups (except last group) */}
          {groupIndex < navigationGroups.length - 1 && (
            <Divider
              sx={{
                my: 2,
                borderColor: 'divider',
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}
