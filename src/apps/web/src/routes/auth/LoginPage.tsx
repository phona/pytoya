import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '@/api/client';
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
      setError(getApiErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              Secure access
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Welcome back to PyToYa
              </h1>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                Sign in to continue managing invoice extraction, validation scripts,
                and model configurations.
              </p>
            </div>
            <div className="grid max-w-md gap-4 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border bg-card/70 px-4 py-3 shadow-sm">
                <div className="font-medium text-foreground">Operational control</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Monitor extraction jobs and validation results in one workspace.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card/70 px-4 py-3 shadow-sm">
                <div className="font-medium text-foreground">Audit ready</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Track model configurations and maintain verification logs.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/90 p-8 shadow-xl shadow-primary/20 backdrop-blur">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Sign in</h2>
              <p className="text-sm text-muted-foreground">
                Use your account credentials to continue.
              </p>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor="username">
                  Username
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    placeholder="your-username"
                  />
                </label>
                <label
                  className="grid gap-2 text-sm font-medium text-foreground"
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
                    className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    placeholder="••••••••"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
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




