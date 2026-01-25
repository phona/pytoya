import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, XCircle } from 'lucide-react';
import { useJobHistory } from '@/shared/hooks/use-jobs';
import { useWebSocket } from '@/shared/hooks/use-websocket';
import { jobsApi } from '@/api/jobs';
import { useManifest } from '@/shared/hooks/use-manifests';
import { useI18n } from '@/shared/providers/I18nProvider';
import { toast } from '@/shared/hooks/use-toast';
import { useJobsStore, type JobItem } from '@/shared/stores/jobs';
import { useUiStore } from '@/shared/stores/ui';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogSideContent, DialogTitle } from '@/shared/components/ui/dialog';
import { Progress } from '@/shared/components/ui/progress';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { formatCostWithCurrency } from '@/shared/utils/cost';

type JobsTab = 'inProgress' | 'failed' | 'completed' | 'all';

const isTerminal = (status: string) => ['completed', 'failed', 'canceled'].includes(status);
const isFailed = (status: string) => status === 'failed' || status === 'canceled';
const isCompleted = (status: string) => status === 'completed';
const isInProgress = (status: string) => !isTerminal(status);

const isCancellable = (jobId: string, status: string) => {
  if (isTerminal(status)) return false;
  // BullMQ job IDs are strings; we treat synthesized IDs as non-cancellable.
  if (jobId.startsWith('manifest-') || jobId.startsWith('history-')) return false;
  return true;
};

function JobRow({
  job,
  cancelingJobId,
  onCancel,
}: {
  job: JobItem;
  cancelingJobId: string | null;
  onCancel: (jobId: string) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const { data: manifest } = useManifest(job.manifestId, { enabled: isInProgress(job.status) });

  const filename =
    manifest?.originalFilename ??
    manifest?.filename ??
    null;

  const title = filename
    ? t(job.kind === 'ocr' ? 'jobs.ocrLabelFilename' : 'jobs.extractionLabelFilename', { filename })
    : t(job.kind === 'ocr' ? 'jobs.ocrLabel' : 'jobs.extractionLabel', { manifestId: job.manifestId });

  const costCurrency = job.costBreakdown?.currency ?? job.currency ?? null;
  const totalCost =
    job.costBreakdown?.total ?? null;

  const costLine =
    totalCost !== null && totalCost !== undefined && costCurrency
      ? formatCostWithCurrency(totalCost, costCurrency, 4)
      : null;

  const pagesLine =
    typeof job.textPagesProcessed === 'number' && typeof job.textPagesTotal === 'number' && job.textPagesTotal > 0
      ? `${job.textPagesProcessed}/${job.textPagesTotal}`
      : null;

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-foreground">{title}</div>
            <Badge variant="outline" className="text-xs">
              {t(`jobs.status.${job.status}`)}
            </Badge>
          </div>

          {job.error ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              <span className="truncate">{job.error}</span>
            </div>
          ) : null}

          {costLine ? (
            <div className="mt-1 text-xs text-muted-foreground">
              {t('jobs.cost')}: {costLine}
            </div>
          ) : null}

          {pagesLine ? (
            <div className="mt-1 text-xs text-muted-foreground">
              {t('jobs.pages')}: {pagesLine}
            </div>
          ) : null}
        </div>

        {isCancellable(job.id, job.status) ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={cancelingJobId === job.id}
            onClick={() => void onCancel(job.id)}
          >
            {cancelingJobId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t('jobs.cancel')}
          </Button>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('jobs.progress')}</span>
          <span>{Math.round(job.progress)}%</span>
        </div>
        <Progress value={job.progress} />
      </div>
    </div>
  );
}

export function JobsPanel() {
  const { t } = useI18n();
  const isOpen = useUiStore((state) => state.isJobsPanelOpen);
  const setOpen = useUiStore((state) => state.setJobsPanelOpen);
  const clearCompleted = useJobsStore((state) => state.clearCompleted);
  const jobs = useJobsStore((state) => state.jobs);
  const upsertFromHistory = useJobsStore((state) => state.upsertFromHistory);

  const [tab, setTab] = useState<JobsTab>('inProgress');
  const [cancelingJobId, setCancelingJobId] = useState<string | null>(null);

  const { subscribeToManifest, unsubscribeFromManifest } = useWebSocket();
  const subscribedManifestsRef = useRef<Set<number>>(new Set());

  const { data: history, isLoading: isHistoryLoading } = useJobHistory(undefined, 100);

  useEffect(() => {
    if (!history) return;
    upsertFromHistory(history);
  }, [history, upsertFromHistory]);

  const inProgressCount = useMemo(() => jobs.filter((job) => isInProgress(job.status)).length, [jobs]);

  const inProgressManifestIds = useMemo(() => {
    const ids = new Set<number>();
    for (const job of jobs) {
      if (isInProgress(job.status)) {
        ids.add(job.manifestId);
      }
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [jobs]);

  useEffect(() => {
    const next = new Set(inProgressManifestIds);
    const prev = subscribedManifestsRef.current;

    for (const manifestId of next) {
      if (!prev.has(manifestId)) {
        subscribeToManifest(manifestId);
      }
    }
    for (const manifestId of prev) {
      if (!next.has(manifestId)) {
        unsubscribeFromManifest(manifestId);
      }
    }

    subscribedManifestsRef.current = next;
  }, [inProgressManifestIds, subscribeToManifest, unsubscribeFromManifest]);

  useEffect(() => {
    return () => {
      for (const manifestId of subscribedManifestsRef.current) {
        unsubscribeFromManifest(manifestId);
      }
      subscribedManifestsRef.current.clear();
    };
  }, [unsubscribeFromManifest]);

  const filteredJobs = useMemo(() => {
    if (tab === 'inProgress') return jobs.filter((job) => isInProgress(job.status));
    if (tab === 'failed') return jobs.filter((job) => isFailed(job.status));
    if (tab === 'completed') return jobs.filter((job) => isCompleted(job.status));
    return jobs;
  }, [jobs, tab]);

  const handleCancel = async (jobId: string) => {
    setCancelingJobId(jobId);
    try {
      await jobsApi.cancelJob(jobId);
      toast({
        title: t('jobs.cancelRequestedTitle'),
        description: t('jobs.cancelRequestedBody'),
      });
    } catch (error) {
      console.error('Cancel job failed:', error);
      toast({
        title: t('jobs.cancelFailedTitle'),
        description: t('errors.generic'),
        variant: 'destructive',
      });
    } finally {
      setCancelingJobId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={t('a11y.openJobsPanel')}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[var(--z-index-popover)] flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-lg transition hover:bg-muted"
      >
        <Download className="h-4 w-4" />
        <span>{t('jobs.title')}</span>
        {inProgressCount > 0 ? (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
            {inProgressCount}
          </span>
        ) : null}
      </button>

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogSideContent aria-label={t('a11y.jobsPanel')}>
          <DialogHeader className="pr-10">
            <DialogTitle>{t('jobs.title')}</DialogTitle>
            <DialogDescription>{t('jobs.subtitle')}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={(value) => setTab(value as JobsTab)}>
              <TabsList>
                <TabsTrigger value="inProgress">{t('jobs.tab.inProgress')}</TabsTrigger>
                <TabsTrigger value="failed">{t('jobs.tab.failed')}</TabsTrigger>
                <TabsTrigger value="completed">{t('jobs.tab.completed')}</TabsTrigger>
                <TabsTrigger value="all">{t('jobs.tab.all')}</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button type="button" variant="outline" size="sm" onClick={clearCompleted}>
              {t('jobs.clearCompleted')}
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-14rem)] rounded-md border border-border">
            <div className="p-3 space-y-3">
              {isHistoryLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('jobs.loading')}
                </div>
              ) : null}

              {!isHistoryLoading && filteredJobs.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {t('jobs.empty')}
                </div>
              ) : null}

              {filteredJobs.map((job) => (
                <JobRow key={job.id} job={job} cancelingJobId={cancelingJobId} onCancel={handleCancel} />
              ))}
            </div>
          </ScrollArea>
        </DialogSideContent>
      </Dialog>
    </>
  );
}
