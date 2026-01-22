import { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { SidebarNav } from '@/shared/components/SidebarNav';
import { JobsPanel } from '@/shared/components/JobsPanel';
import { useUiStore } from '@/shared/stores/ui';
import { useI18n } from '@/shared/providers/I18nProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

export function DashboardLayout({ children }: { children?: ReactNode }) {
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background lg:flex lg:h-screen lg:flex-row">
      <SidebarNav
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col lg:overflow-hidden">
        <header className="sticky top-0 z-[var(--z-index-sticky)] flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t('a11y.openSidebar')}
                >
                  <span className="block h-0.5 w-5 rounded bg-current" />
                  <span className="mt-1 block h-0.5 w-5 rounded bg-current" />
                  <span className="mt-1 block h-0.5 w-5 rounded bg-current" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('a11y.openSidebar')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link to="/projects" className="text-base font-semibold text-foreground">
            {t('app.name')}
          </Link>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 py-6 focus:outline-none lg:px-8 lg:py-8"
        >
          {children ?? <Outlet />}
        </main>
        <JobsPanel />
      </div>
    </div>
  );
}




