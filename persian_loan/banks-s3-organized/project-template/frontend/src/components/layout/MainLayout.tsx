/**
 * Main Layout Component - Dark Theme
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';
import { QuickActionsToolbar } from './QuickActionsToolbar';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#121212]">
      <Header onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10 bg-[#121212]">
          <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>

      {/* Mobile Quick Actions FAB */}
      <QuickActionsToolbar variant="mobile" sidebarOpen={sidebarOpen} />
    </div>
  );
}

export default MainLayout;
