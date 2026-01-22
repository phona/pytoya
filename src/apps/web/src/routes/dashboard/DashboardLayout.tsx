import { ReactNode, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { SidebarNav } from '@/shared/components/SidebarNav';
import { JobsPanel } from '@/shared/components/JobsPanel';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { useI18n } from '@/shared/providers/I18nProvider';
import { useUiStore } from '@/shared/stores/ui';
import { Button } from '@/shared/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

export function DashboardLayout({ children }: { children?: ReactNode }) {
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const isDesktopSidebarCollapsed = useUiStore((state) => state.isDesktopSidebarCollapsed);
  const setDesktopSidebarCollapsed = useUiStore((state) => state.setDesktopSidebarCollapsed);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { t } = useI18n();

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false);
    }
  }, [isDesktop, setSidebarOpen]);

  return (
    <div className="min-h-screen bg-background lg:flex lg:h-screen lg:flex-row">
      <SidebarNav
        isDesktop={isDesktop}
        isDesktopCollapsed={isDesktop && isDesktopSidebarCollapsed}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onDesktopCollapse={() => setDesktopSidebarCollapsed(true)}
        onDesktopExpand={() => setDesktopSidebarCollapsed(false)}
      />
      <div className="flex flex-1 flex-col lg:overflow-hidden">
        {!isDesktop ? (
          <header className="sticky top-0 z-[var(--z-index-sticky)] flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(true)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={t('a11y.openSidebar')}
                  >
                    <span className="block h-0.5 w-5 rounded bg-current" />
                    <span className="mt-1 block h-0.5 w-5 rounded bg-current" />
                    <span className="mt-1 block h-0.5 w-5 rounded bg-current" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('a11y.openSidebar')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Link to="/projects" className="text-base font-semibold text-foreground">
              {t('app.name')}
            </Link>
          </header>
        ) : null}
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




