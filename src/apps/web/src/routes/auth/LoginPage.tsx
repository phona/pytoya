import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/use-auth';

const safeNextUrl = (value: string | null) => {
  if (!value) {
    return '/';
  }
  return value.startsWith('/') ? value : '/';
};

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const nextUrl = safeNextUrl(searchParams.get('next_url'));

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(nextUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, nextUrl]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ username, password });
      navigate(nextUrl, { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-indigo-200/60 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-200/60 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
              Secure access
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                Welcome back to PyToYa
              </h1>
              <p className="max-w-md text-base leading-relaxed text-gray-600">
                Sign in to continue managing invoice extraction, validation scripts,
                and model configurations.
              </p>
            </div>
            <div className="grid max-w-md gap-4 text-sm text-gray-600">
              <div className="rounded-lg border border-gray-200 bg-white/70 px-4 py-3 shadow-sm">
                <div className="font-medium text-gray-900">Operational control</div>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Monitor extraction jobs and validation results in one workspace.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white/70 px-4 py-3 shadow-sm">
                <div className="font-medium text-gray-900">Audit ready</div>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Track model configurations and maintain verification logs.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/90 p-8 shadow-xl shadow-indigo-100/40 backdrop-blur">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">Sign in</h2>
              <p className="text-sm text-gray-500">
                Use your account credentials to continue.
              </p>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <label className="grid gap-2 text-sm font-medium text-gray-700" htmlFor="username">
                  Username
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder="your-username"
                  />
                </label>
                <label
                  className="grid gap-2 text-sm font-medium text-gray-700"
                  htmlFor="password"
                >
                  Password
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder="••••••••"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
