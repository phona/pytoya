import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/use-auth';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { useI18n } from '@/shared/providers/I18nProvider';

type SidebarNavProps = {
  isOpen: boolean;
  onClose: () => void;
};

const navItems = [
  { labelKey: 'nav.projects', to: '/projects' },
  { labelKey: 'nav.extractors', to: '/extractors' },
  { labelKey: 'nav.models', to: '/models' },
];

const isPathActive = (currentPath: string, targetPath: string) => {
  if (currentPath === targetPath) {
    return true;
  }
  return currentPath.startsWith(`${targetPath}/`);
};

export function SidebarNav({ isOpen, onClose }: SidebarNavProps) {
  const location = useLocation();
  const { logout } = useAuth();
  const { locale, setLocale, t } = useI18n();

  return (
    <>
      <button
        type="button"
        aria-label={t('a11y.closeSidebar')}
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        className={`fixed inset-0 z-[var(--z-index-overlay)] bg-[hsl(var(--overlay)/0.4)] transition-opacity duration-200 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!isOpen}
      />
      <aside
        className={`fixed left-0 top-0 z-[var(--z-index-popover)] flex h-full min-h-screen w-72 flex-col border-r border-border bg-card shadow-lg transition-transform duration-200 lg:static lg:h-full lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label={t('a11y.sidebar')}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link
            to="/projects"
            className="text-lg font-semibold text-foreground"
            onClick={onClose}
          >
            {t('app.name')}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label={t('a11y.closeSidebar')}
          >
            <span className="text-sm font-semibold">{t('common.close')}</span>
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 text-sm font-medium text-muted-foreground">
          {navItems.map((item) => {
            const isActive = isPathActive(location.pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center justify-between rounded-md px-3 py-2 transition ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{t(item.labelKey)}</span>
                {isActive ? (
                  <span className="h-2 w-2 rounded-full bg-primary/100" />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-3 py-4">
          <div className="mb-3 grid gap-3">
            <ThemeToggle />
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              <span>{t('common.language')}</span>
              <select
                className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                value={locale}
                onChange={(event) => {
                  const nextLocale = event.target.value === 'zh-CN' ? 'zh-CN' : 'en';
                  setLocale(nextLocale);
                }}
              >
                <option value="en">English</option>
                <option value="zh-CN">中文</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {t('common.signOut')}
          </button>
        </div>
      </aside>
    </>
  );
}




