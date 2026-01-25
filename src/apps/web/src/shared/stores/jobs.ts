import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JobHistory } from '@/api/jobs';

export type JobKind = 'extraction' | 'ocr';

export type JobStatus =
  | 'waiting'
  | 'active'
  | 'delayed'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'unknown';

export type JobCostBreakdown = {
  text?: number;
  llm?: number;
  total?: number | null;
  currency?: string | null;
};

export type JobItem = {
  id: string;
  kind: JobKind;
  manifestId: number;
  status: JobStatus;
  progress: number;
  error: string | null;
  currency?: string | null;
  costBreakdown?: JobCostBreakdown;
  extractorId?: string | null;
  textPagesProcessed?: number;
  textPagesTotal?: number;
  createdAt: string;
  updatedAt: string;
};

const MAX_JOBS = 200;

const normalizeStatus = (status: string): JobStatus => {
  const normalized = status.toLowerCase();
  if (normalized === 'pending' || normalized === 'queued') {
    return 'waiting';
  }
  if (normalized === 'processing' || normalized === 'running') {
    return 'active';
  }
  if (
    normalized === 'waiting' ||
    normalized === 'active' ||
    normalized === 'delayed' ||
    normalized === 'paused' ||
    normalized === 'completed' ||
    normalized === 'failed' ||
    normalized === 'canceled'
  ) {
    return normalized;
  }
  return 'unknown';
};

const normalizeProgress = (progress: unknown): number => {
  if (typeof progress !== 'number' || Number.isNaN(progress)) {
    return 0;
  }
  if (progress < 0) return 0;
  if (progress > 100) return 100;
  return progress;
};

const isTerminal = (status: JobStatus) =>
  status === 'completed' || status === 'failed' || status === 'canceled';

const upsertById = (jobs: JobItem[], next: JobItem): JobItem[] => {
  const index = jobs.findIndex((job) => job.id === next.id);
  const merged = index === -1 ? next : { ...jobs[index], ...next };
  const nextJobs = index === -1 ? [merged, ...jobs] : jobs.map((j, i) => (i === index ? merged : j));
  return nextJobs
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_JOBS);
};

export interface JobsState {
  ownerUserId: number | null;
  hasHydrated: boolean;
  jobs: JobItem[];

  setHasHydrated: (hydrated: boolean) => void;
  setOwnerUserId: (userId: number | null) => void;
  reset: () => void;
  clearCompleted: () => void;

  upsertJob: (job: JobItem) => void;
  upsertFromHistory: (history: JobHistory[]) => void;
  upsertFromJobUpdate: (update: {
    jobId?: string;
    manifestId: number;
    kind?: JobKind;
    progress: number;
    status: string;
    error?: string;
    currency?: string | null;
    costBreakdown?: JobCostBreakdown;
    extractorId?: string | null;
    textPagesProcessed?: number;
    textPagesTotal?: number;
  }) => void;
}

export const useJobsStore = create<JobsState>()(
  persist(
    (set, get) => ({
      ownerUserId: null,
      hasHydrated: false,
      jobs: [],

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      setOwnerUserId: (userId) =>
        set((state) => {
          if (userId !== null && state.ownerUserId !== userId && state.jobs.length > 0) {
            return { ownerUserId: userId, jobs: [] };
          }
          return { ownerUserId: userId };
        }),

      reset: () => set({ jobs: [], ownerUserId: null }),

      clearCompleted: () =>
        set((state) => ({ jobs: state.jobs.filter((job) => !isTerminal(job.status)) })),

      upsertJob: (job) =>
        set((state) => ({
          jobs: upsertById(state.jobs, job),
        })),

      upsertFromHistory: (history) => {
        const now = new Date().toISOString();
        for (const entry of history) {
          const id = entry.queueJobId ? String(entry.queueJobId) : `history-${entry.id}`;
          const updatedAt =
            entry.completedAt ?? entry.startedAt ?? entry.createdAt ?? now;
          const kind = (entry.kind as JobKind | undefined) ?? 'extraction';
          get().upsertJob({
            id,
            kind,
            manifestId: entry.manifestId,
            status: normalizeStatus(entry.status),
            progress: normalizeProgress(entry.progress),
            error: entry.error ?? null,
            createdAt: entry.createdAt ?? now,
            updatedAt,
          });
        }
      },

      upsertFromJobUpdate: (update) => {
        const now = new Date().toISOString();
        const id = update.jobId ? String(update.jobId) : `manifest-${update.manifestId}`;
        const status = normalizeStatus(update.status);
        const progress = normalizeProgress(update.progress);
        const existing = get().jobs.find((j) => j.id === id);
        const kind = update.kind ?? existing?.kind ?? 'extraction';
        get().upsertJob({
          id,
          kind,
          manifestId: update.manifestId,
          status,
          progress,
          error: update.error ?? existing?.error ?? null,
          currency: update.currency ?? existing?.currency ?? null,
          costBreakdown: update.costBreakdown ?? existing?.costBreakdown,
          extractorId: update.extractorId ?? existing?.extractorId ?? null,
          textPagesProcessed: update.textPagesProcessed ?? existing?.textPagesProcessed,
          textPagesTotal: update.textPagesTotal ?? existing?.textPagesTotal,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        });
      },
    }),
    {
      name: 'pytoya-jobs',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        jobs: state.jobs,
      }),
    },
  ),
);
