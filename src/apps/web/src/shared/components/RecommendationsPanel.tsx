import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { AnalyticsRecommendation } from '@/api/projects';
import { useI18n } from '@/shared/providers/I18nProvider';

const SEVERITY_STYLES: Record<
  AnalyticsRecommendation['severity'],
  { badge: string; Icon: typeof Info }
> = {
  critical: {
    badge: 'bg-red-500/10 text-red-600 border-red-500/30',
    Icon: AlertCircle,
  },
  warning: {
    badge: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    Icon: AlertTriangle,
  },
  info: {
    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    Icon: Info,
  },
};

export function RecommendationsPanel({
  recommendations,
}: {
  recommendations: AnalyticsRecommendation[];
}) {
  const { t } = useI18n();

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        {t('analytics.recommendations.title')}
      </h3>
      <div className="space-y-3">
        {recommendations.map((rec) => {
          const { badge, Icon } = SEVERITY_STYLES[rec.severity];
          return (
            <div
              key={rec.id}
              className="flex flex-col gap-2 rounded-md border border-border/60 bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}
                  >
                    <Icon className="h-3 w-3" />
                    {t(`analytics.recommendations.severity.${rec.severity}`)}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {t(rec.titleKey, rec.titleVars)}
                  </span>
                </div>
                {rec.evidence.length > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {rec.evidence.map((ev, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span>{t(ev.labelKey, ev.labelVars)}</span>
                        {ev.value && (
                          <span className="font-mono text-foreground">
                            {ev.value}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {rec.actionHref && rec.actionLabelKey && (
                <Link
                  to={rec.actionHref}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  {t(rec.actionLabelKey)}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
