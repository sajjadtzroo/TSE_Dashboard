/**
 * Header Component - Dark Theme (Improved)
 */

import { Menu } from 'lucide-react';
import { QuickActionsToolbar } from './QuickActionsToolbar';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="bg-surface-100 border-b border-border-light sticky top-0 z-40 shadow-dark">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-300 hover:text-primary-400 hover:bg-surface-50 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="mr-4 text-xl font-bold bg-gradient-to-r from-primary-400 to-secondary-500 bg-clip-text text-transparent">
              داشبورد وام‌های بانکی
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <QuickActionsToolbar variant="desktop" />
            <span className="text-sm text-gray-300 px-3 py-1 bg-surface-50 rounded-full border border-border-dark">
              نسخه ۱.۰.۰
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
