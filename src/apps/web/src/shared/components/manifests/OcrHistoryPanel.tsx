import { useMemo } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import type { ManifestOcrHistoryEntry } from '@/api/manifests';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { useI18n } from '@/shared/providers/I18nProvider';

interface OcrHistoryPanelProps {
  history: ManifestOcrHistoryEntry[];
  loading?: boolean;
}

export function OcrHistoryPanel({ history, loading = false }: OcrHistoryPanelProps) {
  const { t } = useI18n();

  const sorted = useMemo(() => {
    return history.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [history]);

  const statusBadge = (status: ManifestOcrHistoryEntry['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('audit.extractionHistory.status.completed')}
          </Badge>
        );
      case 'running':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {t('audit.extractionHistory.status.running')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-muted text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {t('audit.extractionHistory.status.pending')}
          </Badge>
        );
      case 'canceled':
        return (
          <Badge className="bg-slate-200 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <XCircle className="h-3 w-3 mr-1" />
            {t('audit.extractionHistory.status.canceled')}
          </Badge>
        );
      case 'failed':
      default:
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            {t('audit.extractionHistory.status.failed')}
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('audit.ocrHistory.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <div className="text-sm text-muted-foreground">{t('audit.ocrHistory.loading')}</div> : null}
        {!loading && sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('audit.ocrHistory.empty')}</div>
        ) : null}

        {sorted.length > 0 ? (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('audit.ocrHistory.columns.status')}</TableHead>
                  <TableHead>{t('audit.ocrHistory.columns.started')}</TableHead>
                  <TableHead>{t('audit.ocrHistory.columns.completed')}</TableHead>
                  <TableHead className="text-right">{t('audit.ocrHistory.columns.duration')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((entry) => {
                  const started = entry.startedAt ? format(new Date(entry.startedAt), 'yyyy-MM-dd HH:mm') : '—';
                  const completed = entry.completedAt ? format(new Date(entry.completedAt), 'yyyy-MM-dd HH:mm') : '—';
                  const duration = entry.durationMs ? `${Math.round(entry.durationMs / 1000)}s` : '—';
                  return (
                    <TableRow key={String(entry.jobId)}>
                      <TableCell className="whitespace-nowrap">{statusBadge(entry.status)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{started}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{completed}</TableCell>
                      <TableCell className="text-right text-sm">{duration}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {sorted.some((e) => e.error) ? (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            {sorted
              .filter((e) => Boolean(e.error))
              .slice(0, 3)
              .map((e) => `#${e.jobId}: ${e.error}`)
              .join('\n')}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

