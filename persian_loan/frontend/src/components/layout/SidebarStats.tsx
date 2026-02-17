/**
 * SidebarStats - MUI Box with Quick Stats
 */

import { Box, Chip } from '@mui/material';
import { useLoanSelection } from '@/context/LoanSelectionContext';
import { CreditCard, Bell } from 'lucide-react';

interface SidebarStatsProps {
  isCollapsed: boolean;
}

/**
 * SidebarStats - Quick stats display in sidebar footer with MUI
 *
 * Features:
 * - Shows selected loans count
 * - Shows alerts/notifications count (placeholder)
 * - MUI Chips for badges
 * - Hidden when sidebar is collapsed to save space
 */
export function SidebarStats({ isCollapsed }: SidebarStatsProps) {
  const { selectionCount } = useLoanSelection();

  // Hide stats when collapsed to save space
  if (isCollapsed) {
    return null;
  }

  return (
    <Box
      sx={{
        px: 1.5,
        py: 2,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {/* Selected Loans */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          backgroundColor: 'rgba(45, 45, 45, 0.5)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          <CreditCard size={16} />
          <Box component="span" sx={{ fontSize: '0.875rem' }}>
            وام‌های انتخابی
          </Box>
        </Box>
        {selectionCount > 0 && (
          <Chip
            label={selectionCount}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#03DAC5',
              color: '#000000',
            }}
          />
        )}
      </Box>

      {/* Alerts/Notifications - Placeholder for future feature */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          backgroundColor: 'rgba(45, 45, 45, 0.5)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          <Bell size={16} />
          <Box component="span" sx={{ fontSize: '0.875rem' }}>
            یادآوری‌ها
          </Box>
        </Box>
        <Chip
          label="0"
          size="small"
          sx={{
            height: 20,
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: 'rgba(128, 128, 128, 0.3)',
            color: 'text.secondary',
          }}
        />
      </Box>
    </Box>
  );
}
