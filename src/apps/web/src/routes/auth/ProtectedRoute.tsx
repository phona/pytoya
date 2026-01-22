import { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth';
import { useI18n } from '@/shared/providers/I18nProvider';

type ProtectedRouteProps = {
  children?: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { t } = useI18n();

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">{t('session.checking')}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const nextUrl = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?next_url=${encodeURIComponent(nextUrl)}`}
        replace
        state={{ from: location }}
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
}




