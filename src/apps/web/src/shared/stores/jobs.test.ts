import { beforeEach, describe, expect, it } from 'vitest';
import { useJobsStore } from './jobs';

describe('useJobsStore', () => {
  beforeEach(() => {
    localStorage.removeItem('pytoya-jobs');
    useJobsStore.setState({ ownerUserId: null, hasHydrated: true, jobs: [] });
  });

  it('upserts jobs from job-update events', () => {
    useJobsStore.getState().upsertFromJobUpdate({
      jobId: '123',
      manifestId: 42,
      progress: 55,
      status: 'active',
      currency: 'USD',
      costBreakdown: { total: 0.25, currency: 'USD' },
      textPagesProcessed: 1,
      textPagesTotal: 4,
    });

    const job = useJobsStore.getState().jobs[0];
    expect(job.id).toBe('123');
    expect(job.manifestId).toBe(42);
    expect(job.status).toBe('active');
    expect(job.progress).toBe(55);
    expect(job.currency).toBe('USD');
    expect(job.costBreakdown?.total).toBe(0.25);
    expect(job.textPagesProcessed).toBe(1);
    expect(job.textPagesTotal).toBe(4);
  });

  it('clears jobs when user changes', () => {
    const now = new Date().toISOString();
    useJobsStore.setState({
      ownerUserId: 1,
      hasHydrated: true,
      jobs: [
        {
          id: 'job-1',
          kind: 'extraction',
          manifestId: 1,
          status: 'active',
          progress: 10,
          error: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    useJobsStore.getState().setOwnerUserId(2);
    expect(useJobsStore.getState().jobs).toEqual([]);
    expect(useJobsStore.getState().ownerUserId).toBe(2);
  });

  it('clearCompleted removes terminal jobs', () => {
    const now = new Date().toISOString();
    useJobsStore.setState({
      ownerUserId: 1,
      hasHydrated: true,
      jobs: [
        {
          id: 'job-active',
          kind: 'extraction',
          manifestId: 1,
          status: 'active',
          progress: 10,
          error: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'job-completed',
          kind: 'extraction',
          manifestId: 2,
          status: 'completed',
          progress: 100,
          error: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'job-failed',
          kind: 'extraction',
          manifestId: 3,
          status: 'failed',
          progress: 100,
          error: 'boom',
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    useJobsStore.getState().clearCompleted();
    const jobs = useJobsStore.getState().jobs;
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('job-active');
  });
});
