import { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { SidebarNav } from '@/shared/components/SidebarNav';
import { useUiStore } from '@/shared/stores/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

export function DashboardLayout({ children }: { children?: ReactNode }) {
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex lg:h-screen lg:flex-row">
      <SidebarNav
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col lg:overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:hidden">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Open sidebar"
                >
                  <span className="block h-0.5 w-5 rounded bg-current" />
                  <span className="mt-1 block h-0.5 w-5 rounded bg-current" />
                  <span className="mt-1 block h-0.5 w-5 rounded bg-current" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Open sidebar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link to="/projects" className="text-base font-semibold text-slate-900">
            PyToYa
          </Link>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 py-6 focus:outline-none lg:px-8 lg:py-8"
        >
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
