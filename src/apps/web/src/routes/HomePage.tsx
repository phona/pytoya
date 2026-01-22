import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth';
import { useI18n } from '@/shared/providers/I18nProvider';

export function HomePage() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { t } = useI18n();

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">{t('session.checking')}</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />;
  }

  return <Navigate to="/login" replace />;
}




