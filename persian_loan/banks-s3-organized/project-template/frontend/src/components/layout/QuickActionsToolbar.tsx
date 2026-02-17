import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompare, Calculator } from 'lucide-react';
import { useLoanSelection } from '@/context/LoanSelectionContext';
import { Badge } from '@/components/ui';
import { clsx } from 'clsx';

interface QuickActionsToolbarProps {
  variant: 'mobile' | 'desktop';
  sidebarOpen?: boolean;
}

/**
 * QuickActionsToolbar - Floating action buttons or inline toolbar
 *
 * Features:
 * - Mobile: Floating FAB at bottom-left
 * - Desktop: Integrated into header
 * - Compare button with badge showing selection count
 * - Calculator button
 * - Smooth animations with Framer Motion
 *
 * Mobile FAB:
 * - Position: bottom-6 left-6
 * - Z-index: 50
 * - Hidden when sidebar is open
 * - Stacked vertically
 *
 * Desktop:
 * - Horizontal layout
 * - Integrated into header
 * - Natural z-index from header
 */
export function QuickActionsToolbar({ variant, sidebarOpen = false }: QuickActionsToolbarProps) {
  const navigate = useNavigate();
  const { selectionCount } = useLoanSelection();

  if (variant === 'mobile') {
    return (
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 lg:hidden"
          >
            {/* Compare Button */}
            <button
              onClick={() => navigate('/compare')}
              className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary-600 text-white shadow-glow hover:bg-primary-700 transition-colors"
              aria-label="مقایسه وام‌ها"
            >
              <GitCompare className="w-6 h-6" />
              {selectionCount > 0 && (
                <div className="absolute -top-1 -right-1">
                  <Badge variant="green" size="sm">
                    {selectionCount}
                  </Badge>
                </div>
              )}
            </button>

            {/* Calculator Button */}
            <button
              onClick={() => navigate('/calculators')}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-surface-50 border border-border-light text-primary-400 shadow-dark-lg hover:bg-surface-100 transition-colors"
              aria-label="ماشین حساب‌ها"
            >
              <Calculator className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Desktop variant - horizontal layout
  return (
    <div className="hidden lg:flex items-center gap-3">
      {/* Compare Button */}
      <button
        onClick={() => navigate('/compare')}
        className={clsx(
          'relative flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
          'bg-primary-600 text-white hover:bg-primary-700',
          'shadow-glow-sm'
        )}
        aria-label="مقایسه وام‌ها"
      >
        <GitCompare className="w-4 h-4" />
        <span className="text-sm font-medium">مقایسه</span>
        {selectionCount > 0 && (
          <Badge variant="green" size="sm">
            {selectionCount}
          </Badge>
        )}
      </button>

      {/* Calculator Button */}
      <button
        onClick={() => navigate('/calculators')}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
          'bg-surface-50 border border-border-light text-primary-400',
          'hover:bg-surface-100 hover:border-primary-600',
          'shadow-dark'
        )}
        aria-label="ماشین حساب‌ها"
      >
        <Calculator className="w-4 h-4" />
        <span className="text-sm font-medium">ماشین حساب</span>
      </button>
    </div>
  );
}
