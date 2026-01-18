import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/use-auth';

type SidebarNavProps = {
  isOpen: boolean;
  onClose: () => void;
};

const navItems = [
  { label: 'Projects', to: '/projects' },
  { label: 'Models', to: '/models' },
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

  return (
    <>
      <button
        type="button"
        aria-label="Close sidebar"
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!isOpen}
      />
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full min-h-screen w-72 flex-col border-r border-slate-200 bg-white shadow-lg transition-transform duration-200 lg:static lg:h-full lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar"
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <Link
            to="/projects"
            className="text-lg font-semibold text-slate-900"
            onClick={onClose}
          >
            PyToYa
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close sidebar"
          >
            <span className="text-sm font-semibold">Close</span>
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 text-sm font-medium text-slate-600">
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
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{item.label}</span>
                {isActive ? (
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 px-3 py-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
