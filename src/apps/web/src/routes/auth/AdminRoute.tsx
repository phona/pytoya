import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth';

type AdminRouteProps = {
  children?: ReactNode;
};

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Checking your session...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/projects" replace />;
  }

  return children ? <>{children}</> : null;
}




