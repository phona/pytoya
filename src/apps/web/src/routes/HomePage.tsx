import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/api/auth-store';

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

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 focus:outline-none"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Document Intelligence Platform
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            PyToYa turns documents into structured data, fast.
          </h1>
          <p className="text-lg text-slate-600">
            Extract, validate, and iterate on document pipelines with OCR, LLM
            models, and schema-driven automation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
            >
              Create account
            </Link>
          </div>
        </div>
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Built for production workflows
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
              OCR ingestion with configurable model adapters.
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
              LLM-assisted extraction with schema-based validation.
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
              Automated validation scripts for every batch.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
