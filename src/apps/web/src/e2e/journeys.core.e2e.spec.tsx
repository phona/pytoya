import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useJobsStore } from '@/shared/stores/jobs';
import { useAuthStore } from '@/shared/stores/auth';
import { setupMswForJourneyTests } from '@/tests/journey/msw';
import { clearAuthSession } from '@/tests/journey/auth';
import { renderApp } from '@/tests/journey/render-app';
import { server } from '@/tests/mocks/server';

setupMswForJourneyTests();

vi.mock('@/api/manifests', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/manifests')>();

  return {
    ...actual,
    manifestsApi: {
      ...actual.manifestsApi,
      uploadManifestsBatch: vi.fn(async (_groupId: number, files: File[]) => {
        return files.map((file, index) => ({
          status: 'fulfilled' as const,
          value: {
            id: index === 1 ? 1 : 2,
            originalFilename: file.name,
            isDuplicate: index === 1,
          },
        }));
      }),
    },
  };
});

describe('Core journeys (RTL + MSW)', () => {
  beforeEach(() => {
    localStorage.setItem('pytoya-locale', 'en');
  });

  afterEach(async () => {
    useJobsStore.getState().reset();
    await clearAuthSession();
    localStorage.removeItem('pytoya-locale');
  });

  it('redirects unauthenticated user to /login with next_url', async () => {
    const { router } = renderApp({ route: '/projects?page=2' });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toContain('next_url=');
    expect(router.state.location.search).toContain(encodeURIComponent('/projects?page=2'));
  });

  it('logs in and lands on next_url destination', async () => {
    const user = userEvent.setup();

    const { router } = renderApp({ route: '/projects?page=2' });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Username'), 'test-user');
    await user.type(screen.getByLabelText('Password'), 'test-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByRole('heading', { name: 'Projects' });
    expect(router.state.location.pathname).toBe('/projects');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('navigates projects -> project detail -> manifests list', async () => {
    const user = userEvent.setup();

    // Pre-auth via store (less typing than going through login UI again).
    useAuthStore.getState().setAuth(
      { id: 1, username: 'test-user', role: 'user' },
      'mock-jwt-token',
    );
    useAuthStore.getState().setHasHydrated(true);

    const { router } = renderApp({ route: '/projects' });

    await screen.findByText('Test Project');
    const projectCardButton = screen.getByText('Test Project').closest('[role="button"]');
    expect(projectCardButton).not.toBeNull();
    await user.click(projectCardButton as HTMLElement);

    await screen.findByRole('heading', { name: /test project/i });

    await screen.findByText('Test Group');
    const groupCardButton = screen.getByText('Test Group').closest('[role="button"]');
    expect(groupCardButton).not.toBeNull();
    await user.click(groupCardButton as HTMLElement);

    await screen.findByRole('heading', { name: 'Manifests' });
    expect(router.state.location.pathname).toBe('/projects/1/groups/1/manifests');
  });

  it('uploads two files and reports duplicates', async () => {
    const user = userEvent.setup();

    useAuthStore.getState().setAuth(
      { id: 1, username: 'test-user', role: 'user' },
      'mock-jwt-token',
    );
    useAuthStore.getState().setHasHydrated(true);

    renderApp({ route: '/projects/1/groups/1/manifests' });
    await screen.findByRole('heading', { name: 'Manifests' });

    await user.click(screen.getByRole('button', { name: /upload/i }));
    await screen.findByRole('heading', { name: 'Upload Manifests' });

    const fileA = new File([new Uint8Array([1, 2, 3])], 'new.pdf', { type: 'application/pdf' });
    const fileB = new File([new Uint8Array([1, 2, 3])], 'dup.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Select PDF files'), [fileA, fileB]);
    await user.click(screen.getByRole('button', { name: /upload 2/i }));

    await screen.findByTestId('upload-results');

    await waitFor(() => {
      const statuses = [
        screen.getByTestId('upload-item-0').getAttribute('data-upload-status'),
        screen.getByTestId('upload-item-1').getAttribute('data-upload-status'),
      ];

      expect(statuses).toEqual(expect.arrayContaining(['duplicate', 'success']));
    });
  });

  it('starts extraction via Extract modal and seeds Jobs store', async () => {
    const user = userEvent.setup();

    useAuthStore.getState().setAuth(
      { id: 1, username: 'test-user', role: 'user' },
      'mock-jwt-token',
    );
    useAuthStore.getState().setHasHydrated(true);

    server.use(
      http.post('/api/groups/:groupId/manifests/extract-filtered', () => {
        return HttpResponse.json({
          jobId: 'batch_123',
          jobs: [{ jobId: 'job-1', manifestId: 1 }],
          manifestCount: 1,
        });
      }),
      http.get('/api/extractors', () => HttpResponse.json([])),
      http.get('/api/extractors/types', () => HttpResponse.json([])),
    );

    renderApp({ route: '/projects/1/groups/1/manifests' });
    await screen.findByRole('heading', { name: 'Manifests' });

    await user.click(screen.getByRole('button', { name: 'Extract' }));
    await user.click(screen.getByRole('button', { name: 'Start extraction' }));

    await waitFor(() => {
      expect(useJobsStore.getState().jobs.some((job) => job.id === 'job-1')).toBe(true);
    });
  });

  it('redirects / to /projects when authenticated', async () => {
    useAuthStore.getState().setAuth(
      { id: 1, username: 'test-user', role: 'user' },
      'mock-jwt-token',
    );
    useAuthStore.getState().setHasHydrated(true);

    const { router } = renderApp({ route: '/' });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects');
    });
    expect(document.querySelector('a[href="/projects"][aria-current="page"]')).not.toBeNull();
  });

  it('redirects /models to /projects for non-admin users', async () => {
    useAuthStore.getState().setAuth(
      { id: 1, username: 'test-user', role: 'user' },
      'mock-jwt-token',
    );
    useAuthStore.getState().setHasHydrated(true);

    const { router } = renderApp({ route: '/models' });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects');
    });
    expect(document.querySelector('a[href="/projects"][aria-current="page"]')).not.toBeNull();
  });

  it('allows admins to access /models', async () => {
    useAuthStore.getState().setAuth(
      { id: 1, username: 'admin-user', role: 'admin' },
      'mock-jwt-token',
    );
    useAuthStore.getState().setHasHydrated(true);

    const { router } = renderApp({ route: '/models' });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/models');
    });
    expect(document.querySelector('a[href="/models"][aria-current="page"]')).not.toBeNull();
    expect(router.state.location.pathname).toBe('/models');
  });
});
