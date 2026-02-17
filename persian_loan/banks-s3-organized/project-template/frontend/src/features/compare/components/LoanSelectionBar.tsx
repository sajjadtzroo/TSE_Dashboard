/**
 * Loan Selection Bar
 * Floating action bar that appears when loans are selected
 */

import { useNavigate } from 'react-router-dom';
import { GitCompare, X } from 'lucide-react';
import { useLoanSelection } from '../../../context/LoanSelectionContext';
import { Button, Badge } from '../../../components/ui';

export function LoanSelectionBar() {
  const navigate = useNavigate();
  const { clearSelection, selectionCount, maxSelection } =
    useLoanSelection();

  if (selectionCount === 0) {
    return null;
  }

  const canCompare = selectionCount >= 2;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-bg-dark border border-border-dark rounded-lg shadow-dark-xl p-4 flex items-center gap-4 min-w-[400px]">
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <Badge variant="blue" size="sm">
            {selectionCount} / {maxSelection}
          </Badge>
          <span className="text-gray-300 text-sm">وام انتخاب شده</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mr-auto">
          {canCompare ? (
            <Button
              onClick={() => navigate('/compare')}
              variant="primary"
              size="md"
              className="gap-2"
            >
              <GitCompare className="w-4 h-4" />
              مقایسه وام‌ها
            </Button>
          ) : (
            <span className="text-sm text-gray-400">
              حداقل ۲ وام انتخاب کنید
            </span>
          )}

          <Button
            onClick={clearSelection}
            variant="ghost"
            size="md"
            className="gap-2 text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
            پاک کردن
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LoanSelectionBar;
