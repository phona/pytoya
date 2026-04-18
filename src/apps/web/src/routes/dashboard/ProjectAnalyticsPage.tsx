import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  useProjectAnalytics,
  useProjectOperationLogs,
  useProject,
  useProjectRecommendations,
} from '@/shared/hooks/use-projects';
import { AppBreadcrumbs } from '@/shared/components/AppBreadcrumbs';
import { RecommendationsPanel } from '@/shared/components/RecommendationsPanel';
import { useI18n } from '@/shared/providers/I18nProvider';
import type { ProjectOperationLog } from '@/api/projects';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500',
  completed: 'bg-green-500',
  partial: 'bg-orange-500',
  failed: 'bg-red-500',
};

const OCR_QUALITY_COLORS: Record<string, string> = {
  excellent: 'bg-green-500',
  good: 'bg-blue-500',
  poor: 'bg-red-500',
  unknown: 'bg-gray-400',
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function StatusBar({
  distribution,
  total,
  t,
}: {
  distribution: Record<string, number>;
  total: number;
  t: (key: string) => string;
}) {
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {Object.entries(distribution).map(([status, count]) => {
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={status}
              className={`${STATUS_COLORS[status] ?? 'bg-gray-400'} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${t(`analytics.status.${status}`)} ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(distribution).map(([status, count]) => (
          <span key={status} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-400'}`} />
            {t(`analytics.status.${status}`)} {count}
          </span>
        ))}
      </div>
    </div>
  );
}

function OcrQualityPanel({
  ocrQuality,
  t,
}: {
  ocrQuality: Array<{ quality: string; count: number; avgScore: number }>;
  t: (key: string, vars?: Record<string, unknown>) => string;
}) {
  const total = ocrQuality.reduce((sum, q) => sum + q.count, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-3">
      {ocrQuality.map((entry) => {
        const pct = total > 0 ? (entry.count / total) * 100 : 0;
        return (
          <div key={entry.quality} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${OCR_QUALITY_COLORS[entry.quality] ?? 'bg-gray-400'}`} />
                {t(`analytics.ocrQuality.${entry.quality}`)}
              </span>
              <span className="text-muted-foreground">
                {entry.count}
                {entry.quality !== 'unknown' && entry.avgScore > 0 && (
                  <span className="ml-2 text-xs">
                    ({t('analytics.ocrQuality.avgScore', { score: entry.avgScore })})
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${OCR_QUALITY_COLORS[entry.quality] ?? 'bg-gray-400'} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityChart({
  activity,
  t,
}: {
  activity: Array<{ date: string; total: number; completed: number; failed: number }>;
  t: (key: string) => string;
}) {
  if (activity.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t('analytics.activityOverTime.empty')}
      </div>
    );
  }

  const maxTotal = Math.max(...activity.map((d) => d.total), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-[2px]" style={{ height: 120 }}>
        {activity.map((day) => {
          const h = (day.total / maxTotal) * 100;
          const completedH = day.total > 0 ? (day.completed / day.total) * h : 0;
          const failedH = day.total > 0 ? (day.failed / day.total) * h : 0;
          const otherH = h - completedH - failedH;
          return (
            <div
              key={day.date}
              className="group relative flex flex-1 flex-col justify-end"
              style={{ height: '100%' }}
              title={`${day.date}: ${day.total} total, ${day.completed} completed, ${day.failed} failed`}
            >
              <div className="flex flex-col justify-end" style={{ height: `${h}%`, minHeight: day.total > 0 ? 2 : 0 }}>
                {failedH > 0 && (
                  <div className="bg-red-500 rounded-t-[1px]" style={{ height: `${(failedH / h) * 100}%`, minHeight: 1 }} />
                )}
                {otherH > 0 && (
                  <div className="bg-yellow-500" style={{ height: `${(otherH / h) * 100}%`, minHeight: 1 }} />
                )}
                {completedH > 0 && (
                  <div className="bg-green-500 rounded-b-[1px]" style={{ height: `${(completedH / h) * 100}%`, minHeight: 1 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{activity[0]?.date.slice(5)}</span>
        <span>{activity[activity.length - 1]?.date.slice(5)}</span>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          {t('analytics.activityOverTime.completed')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          {t('analytics.activityOverTime.failed')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
          {t('analytics.activityOverTime.total')}
        </span>
      </div>
    </div>
  );
}

function DiffRow({ diff }: { diff: { path: string; before: unknown; after: unknown } }) {
  const format = (v: unknown) => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  return (
    <tr className="border-b border-border/50 text-xs">
      <td className="py-1 pr-2 font-mono text-muted-foreground">{diff.path}</td>
      <td className="py-1 pr-2 text-red-500 line-through">{format(diff.before)}</td>
      <td className="py-1 text-green-600">{format(diff.after)}</td>
    </tr>
  );
}

function CorrectionLogRow({ log, t, projectId }: { log: ProjectOperationLog; t: (key: string) => string; projectId: number }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(log.createdAt).toLocaleString();

  return (
    <>
      <tr
        className="border-b border-border text-sm hover:bg-muted/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-2 pr-3">
          <span className="inline-flex items-center gap-1">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Link
              to={`/projects/${projectId}/groups/0/manifests/${log.manifestId}`}
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {log.manifestFilename ?? `#${log.manifestId}`}
            </Link>
          </span>
        </td>
        <td className="py-2 pr-3 text-muted-foreground">{log.username}</td>
        <td className="py-2 pr-3 text-muted-foreground">{log.action}</td>
        <td className="py-2 pr-3 text-muted-foreground">{log.diffs.length}</td>
        <td className="py-2 text-muted-foreground text-xs">{dateStr}</td>
      </tr>
      {expanded && log.diffs.length > 0 && (
        <tr>
          <td colSpan={5} className="bg-muted/30 px-6 py-2">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase text-muted-foreground">
                  <th className="pb-1 pr-2 text-left font-medium">{t('analytics.correctionHistory.field')}</th>
                  <th className="pb-1 pr-2 text-left font-medium">{t('analytics.correctionHistory.before')}</th>
                  <th className="pb-1 text-left font-medium">{t('analytics.correctionHistory.after')}</th>
                </tr>
              </thead>
              <tbody>
                {log.diffs.map((diff, i) => (
                  <DiffRow key={i} diff={diff} />
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

function CorrectionHistorySection({ projectId, t }: { projectId: number; t: (key: string) => string }) {
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const { operationLogs, isLoading } = useProjectOperationLogs(projectId, { limit, offset });

  const logs = operationLogs?.data ?? [];
  const total = operationLogs?.meta?.total ?? 0;
  const hasMore = offset + limit < total;

  return (
    <div className="space-y-3">
      {isLoading && logs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {t('analytics.loading')}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {t('analytics.correctionHistory.empty')}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="pb-2 pr-3 text-left font-medium">{t('analytics.correctionHistory.file')}</th>
                  <th className="pb-2 pr-3 text-left font-medium">{t('analytics.correctionHistory.user')}</th>
                  <th className="pb-2 pr-3 text-left font-medium">{t('analytics.correctionHistory.action')}</th>
                  <th className="pb-2 pr-3 text-left font-medium">{t('analytics.correctionHistory.changes')}</th>
                  <th className="pb-2 text-left font-medium">{t('analytics.correctionHistory.time')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <CorrectionLogRow key={log.id} log={log} t={t} projectId={projectId} />
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setOffset((prev) => prev + limit)}
                className="text-sm text-primary hover:underline"
              >
                {t('analytics.correctionHistory.showMore')} ({total - offset - limit} more)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ProjectAnalyticsPage() {
  const { t } = useI18n();
  const params = useParams();
  const projectId = Number(params.id);
  const { project } = useProject(projectId);
  const { analytics, isLoading } = useProjectAnalytics(projectId);
  const { recommendations } = useProjectRecommendations(projectId);

  const projectLabel = project?.name ?? `Project ${projectId}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {t('analytics.loading')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <AppBreadcrumbs
          items={[
            { label: t('nav.projects'), to: '/projects' },
            { label: projectLabel, to: `/projects/${projectId}` },
            { label: t('analytics.title') },
          ]}
        />

        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('analytics.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('analytics.subtitle')}</p>
        </div>

        <RecommendationsPanel recommendations={recommendations} />

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label={t('analytics.totalManifests')} value={analytics?.totalManifests ?? 0} />
          <StatCard
            label={t('analytics.status.completed')}
            value={analytics?.statusDistribution?.completed ?? 0}
          />
          <StatCard
            label={t('analytics.status.failed')}
            value={analytics?.statusDistribution?.failed ?? 0}
          />
          <StatCard
            label={t('analytics.recentCorrections')}
            value={analytics?.recentCorrectionsCount ?? 0}
          />
        </div>

        {/* Two-column layout for charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Distribution */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">{t('analytics.statusDistribution')}</h3>
            <StatusBar
              distribution={analytics?.statusDistribution ?? {}}
              total={analytics?.totalManifests ?? 0}
              t={t}
            />
          </div>

          {/* OCR Quality */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">{t('analytics.ocrQuality')}</h3>
            <OcrQualityPanel ocrQuality={analytics?.ocrQuality ?? []} t={t} />
          </div>
        </div>

        {/* Activity chart */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{t('analytics.activityOverTime')}</h3>
          <ActivityChart activity={analytics?.activityOverTime ?? []} t={t} />
        </div>

        {/* Correction History */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{t('analytics.correctionHistory')}</h3>
          <CorrectionHistorySection projectId={projectId} t={t} />
        </div>
      </div>
    </div>
  );
}
