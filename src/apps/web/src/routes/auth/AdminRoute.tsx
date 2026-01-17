import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/api/auth-store';

type AdminRouteProps = {
  children?: ReactNode;
};

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-600">Checking your session...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/projects" replace />;
  }

  return children ? <>{children}</> : null;
}
