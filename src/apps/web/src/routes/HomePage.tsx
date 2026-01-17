import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth';

export function HomePage() {
  const { isAuthenticated, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-600">Checking your session...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />;
  }

  return <Navigate to="/login" replace />;
}
