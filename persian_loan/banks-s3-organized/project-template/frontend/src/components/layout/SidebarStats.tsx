import { useLoanSelection } from '@/context/LoanSelectionContext';
import { CreditCard, Bell } from 'lucide-react';
import { Badge } from '@/components/ui';

interface SidebarStatsProps {
  isCollapsed: boolean;
}

/**
 * SidebarStats - Quick stats display in sidebar footer
 *
 * Features:
 * - Shows selected loans count
 * - Shows alerts/notifications count (placeholder)
 * - Tooltips when collapsed
 * - Hidden when sidebar is collapsed to save space
 */
export function SidebarStats({ isCollapsed }: SidebarStatsProps) {
  const { selectionCount } = useLoanSelection();

  // Hide stats when collapsed to save space
  if (isCollapsed) {
    return null;
  }

  return (
    <div className="px-3 py-4 border-t border-border-light space-y-2">
      {/* Selected Loans */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-100">
        <div className="flex items-center gap-2 text-text-secondary">
          <CreditCard className="w-4 h-4" />
          <span className="text-sm">وام‌های انتخابی</span>
        </div>
        {selectionCount > 0 && (
          <Badge variant="green" size="sm">
            {selectionCount}
          </Badge>
        )}
      </div>

      {/* Alerts/Notifications - Placeholder for future feature */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-100">
        <div className="flex items-center gap-2 text-text-secondary">
          <Bell className="w-4 h-4" />
          <span className="text-sm">یادآوری‌ها</span>
        </div>
        <Badge variant="gray" size="sm">
          0
        </Badge>
      </div>
    </div>
  );
}
