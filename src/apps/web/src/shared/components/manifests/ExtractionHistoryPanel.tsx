import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  GitCompare,
  Loader2,
  XCircle,
} from 'lucide-react';
import type { ManifestExtractionHistoryEntry } from '@/api/manifests';
import { useManifestExtractionHistoryEntry } from '@/shared/hooks/use-manifests';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useI18n } from '@/shared/providers/I18nProvider';
import { formatCostWithCurrency } from '@/shared/utils/cost';

export type ExtractionHistoryEntry = ManifestExtractionHistoryEntry;

interface ExtractionHistoryPanelProps {
  manifestId: number;
  manifestName: string;
  history: ExtractionHistoryEntry[];
  onCompare?: (entryIds: string[]) => void;
  loading?: boolean;
}

export function ExtractionHistoryPanel({
  manifestId,
  manifestName,
  history,
  onCompare,
  loading = false,
}: ExtractionHistoryPanelProps) {
  const { t } = useI18n();
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const expandedJobId = expandedEntryId ? Number(expandedEntryId) : null;

  const entryDetails = useManifestExtractionHistoryEntry(manifestId, expandedJobId, {
    enabled: expandedJobId !== null,
  });

  const stats = useMemo(() => {
    const totalsByCurrency = new Map<string, { total: number; text: number; llm: number }>();
    for (const entry of history) {
      const currency = entry.currency ?? 'unknown';
      const total = entry.actualCost ?? entry.estimatedCost ?? 0;
      const text = entry.textActualCost ?? entry.textEstimatedCost ?? 0;
      const llm = entry.llmActualCost ?? entry.llmEstimatedCost ?? 0;
      const existing = totalsByCurrency.get(currency) ?? { total: 0, text: 0, llm: 0 };
      totalsByCurrency.set(currency, {
        total: existing.total + total,
        text: existing.text + text,
        llm: existing.llm + llm,
      });
    }

    const completedCount = history.filter((e) => e.status === 'completed').length;
    const failedCount = history.filter((e) => e.status === 'failed').length;
    const canceledCount = history.filter((e) => e.status === 'canceled').length;
    const runningCount = history.filter((e) => e.status === 'running').length;
    const pendingCount = history.filter((e) => e.status === 'pending').length;
    const totalTokens = history.reduce((sum, entry) => sum + (entry.llmInputTokens ?? 0) + (entry.llmOutputTokens ?? 0), 0);
    const avgDurationMs =
      history.filter((e) => e.durationMs).reduce((sum, entry) => sum + (entry.durationMs ?? 0), 0) /
      Math.max(1, history.filter((e) => e.durationMs).length);

    return {
      totalsByCurrency: Array.from(totalsByCurrency.entries())
        .map(([currency, values]) => ({ currency, ...values }))
        .sort((a, b) => a.currency.localeCompare(b.currency)),
      completedCount,
      failedCount,
      canceledCount,
      runningCount,
      pendingCount,
      totalRuns: history.length,
      totalTokens,
      avgDurationMs,
    };
  }, [history]);

  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else if (next.size < 2) {
        next.add(entryId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: ExtractionHistoryEntry['status']) => {
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
            <Ban className="h-3 w-3 mr-1" />
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

  const copyRunDetails = (entry: ExtractionHistoryEntry) => {
    navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
  };

  const copyText = (value: string | null) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
  };

  const downloadRunDetails = (entry: ExtractionHistoryEntry) => {
    const blob = new Blob([JSON.stringify({ manifestId, manifestName, ...entry }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extraction-run-${entry.jobId}.json`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            {t('audit.extractionHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">{t('audit.extractionHistory.stats.totalRuns')}</div>
              <div className="text-2xl font-semibold">{stats.totalRuns}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('audit.extractionHistory.stats.totalSpent')}</div>
              {stats.totalsByCurrency.length <= 1 ? (
                <div className="text-2xl font-semibold">
                  {formatCostWithCurrency(stats.totalsByCurrency[0]?.total ?? 0, stats.totalsByCurrency[0]?.currency)}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {stats.totalsByCurrency.map((row) => (
                    <div key={row.currency} className="text-sm font-semibold tabular-nums">
                      {formatCostWithCurrency(row.total, row.currency)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('audit.extractionHistory.stats.successRate')}</div>
              <div className="text-2xl font-semibold">
                {stats.totalRuns > 0 ? Math.round((stats.completedCount / stats.totalRuns) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">
                {t('audit.extractionHistory.stats.statusSummary', {
                  completed: stats.completedCount,
                  running: stats.runningCount,
                  pending: stats.pendingCount,
                  canceled: stats.canceledCount,
                  failed: stats.failedCount,
                })}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('audit.extractionHistory.stats.avgTokens')}</div>
              <div className="text-2xl font-semibold">
                {stats.totalRuns > 0 ? Math.round(stats.totalTokens / stats.totalRuns).toLocaleString() : 0}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm font-medium mb-2">{t('audit.extractionHistory.costBreakdown.title')}</div>
            <div className="flex flex-col gap-2 text-sm">
              {stats.totalsByCurrency.map((row) => (
                <div key={row.currency} className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t('audit.extractionHistory.costBreakdown.text')}:</span>
                    <span className="font-medium tabular-nums">
                      {formatCostWithCurrency(row.text, row.currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t('audit.extractionHistory.costBreakdown.llm')}:</span>
                    <span className="font-medium tabular-nums">
                      {formatCostWithCurrency(row.llm, row.currency)}
                    </span>
                  </div>
                </div>
              ))}
              {stats.avgDurationMs ? (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('audit.extractionHistory.costBreakdown.avgTime')}:</span>
                  <span className="font-medium">{(stats.avgDurationMs / 1000).toFixed(1)}s</span>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('audit.extractionHistory.runsTitle')}</CardTitle>
            {selectedEntries.size === 2 && onCompare && (
              <Button variant="outline" size="sm" onClick={() => onCompare(Array.from(selectedEntries))}>
                <GitCompare className="h-4 w-4 mr-1" />
                {t('audit.extractionHistory.compareSelected')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('audit.extractionHistory.empty')}
            </p>
          ) : (
            history.map((entry) => {
              const entryId = String(entry.jobId);
              const isExpanded = expandedEntryId === entryId;
              const isSelected = selectedEntries.has(entryId);

              const createdAt = new Date(entry.createdAt);
              const modelLabel =
                entry.llmModelName ?? entry.llmModelId ?? t('audit.extractionHistory.defaultModel');
              const promptLabel =
                entry.promptName ??
                (entry.promptId
                  ? t('audit.extractionHistory.promptNumber', { id: entry.promptId })
                  : t('audit.extractionHistory.defaultPrompt'));
              const fieldLabel = entry.fieldName
                ? t('audit.extractionHistory.fieldLabel', { field: entry.fieldName })
                : t('audit.extractionHistory.fullExtraction');
              const pagesLabel = t('audit.extractionHistory.pages', {
                count: entry.pagesProcessed ?? '—',
              });
              const tokensLabel = t('audit.extractionHistory.tokens', {
                input: entry.llmInputTokens ?? 0,
                output: entry.llmOutputTokens ?? 0,
              });

              const totalCost = entry.actualCost ?? entry.estimatedCost ?? 0;
              const textCost = entry.textActualCost ?? entry.textEstimatedCost ?? 0;
              const llmCost = entry.llmActualCost ?? entry.llmEstimatedCost ?? 0;

              return (
                <Collapsible
                  key={entryId}
                  open={isExpanded}
                  onOpenChange={() => setExpandedEntryId(isExpanded ? null : entryId)}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 bg-card hover:bg-muted/50 transition-colors">
                    {onCompare && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEntrySelection(entryId)}
                        className="rounded border-border"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{format(createdAt, 'PPp')}</span>
                        {getStatusBadge(entry.status)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {modelLabel} • {promptLabel} • {fieldLabel} • {pagesLabel} • {tokensLabel}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium tabular-nums">
                        {formatCostWithCurrency(totalCost, entry.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('audit.extractionHistory.costLine', {
                          text: formatCostWithCurrency(textCost, entry.currency),
                          llm: formatCostWithCurrency(llmCost, entry.currency),
                        })}
                      </div>
                    </div>

                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <div className="p-4 bg-muted/30 border-t border-border space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">{t('audit.extractionHistory.details.job')}</span>
                          <div className="font-medium">
                            {t('audit.extractionHistory.details.jobIdLine', {
                              id: entry.jobId,
                              queue: entry.queueJobId
                                ? t('audit.extractionHistory.details.jobQueuePart', { id: entry.queueJobId })
                                : '',
                            })}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('audit.extractionHistory.details.duration')}</span>
                          <div className="font-medium">
                            {entry.durationMs ? `${(entry.durationMs / 1000).toFixed(1)}s` : t('common.na')}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('audit.extractionHistory.details.model')}</span>
                          <div className="font-medium">{modelLabel}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('audit.extractionHistory.details.prompt')}</span>
                          <div className="font-medium">{promptLabel}</div>
                        </div>
                      </div>

                      {(entry.error || entry.cancelReason) ? (
                        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800 dark:bg-red-950 dark:border-red-900 dark:text-red-200">
                          {entry.cancelReason
                            ? t('audit.extractionHistory.details.canceledReason', { reason: entry.cancelReason })
                            : entry.error}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyRunDetails(entry)}>
                          <Copy className="h-3 w-3 mr-1" />
                          {t('audit.extractionHistory.details.copyDetails')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadRunDetails(entry)}>
                          <Download className="h-3 w-3 mr-1" />
                          {t('audit.extractionHistory.details.downloadJson')}
                        </Button>
                      </div>

                      {/* Prompt I/O (lazy-loaded) */}
                      {isExpanded && (
                        <div className="space-y-3">
                          {entryDetails.isLoading ? (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {t('audit.extractionHistory.prompt.loading')}
                            </div>
                          ) : entryDetails.isError ? (
                            <div className="text-xs text-destructive">
                              {t('audit.extractionHistory.prompt.failedToLoad')}
                            </div>
                          ) : (
                            <>
                              {entryDetails.data?.promptTemplateContent ? (
                                <div className="rounded-md border border-border bg-background p-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium">{t('audit.extractionHistory.prompt.template')}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => copyText(entryDetails.data?.promptTemplateContent ?? null)}
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      {t('common.copy')}
                                    </Button>
                                  </div>
                                  <pre className="text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {entryDetails.data.promptTemplateContent}
                                  </pre>
                                </div>
                              ) : null}

                              <div className="rounded-md border border-border bg-background p-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">{t('audit.extractionHistory.prompt.system')}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => copyText(entryDetails.data?.systemPrompt ?? null)}
                                    disabled={!entryDetails.data?.systemPrompt}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    {t('common.copy')}
                                  </Button>
                                </div>
                                {entryDetails.data?.systemPrompt ? (
                                  <pre className="text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {entryDetails.data.systemPrompt}
                                  </pre>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    {t('audit.extractionHistory.prompt.notRecorded')}
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border border-border bg-background p-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">{t('audit.extractionHistory.prompt.user')}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => copyText(entryDetails.data?.userPrompt ?? null)}
                                    disabled={!entryDetails.data?.userPrompt}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    {t('common.copy')}
                                  </Button>
                                </div>
                                {entryDetails.data?.userPrompt ? (
                                  <pre className="text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {entryDetails.data.userPrompt}
                                  </pre>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    {t('audit.extractionHistory.prompt.notRecorded')}
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border border-border bg-background p-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">{t('audit.extractionHistory.prompt.assistant')}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => copyText(entryDetails.data?.assistantResponse ?? null)}
                                    disabled={!entryDetails.data?.assistantResponse}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    {t('common.copy')}
                                  </Button>
                                </div>
                                {entryDetails.data?.assistantResponse ? (
                                  <pre className="text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                                    {entryDetails.data.assistantResponse}
                                  </pre>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    {t('audit.extractionHistory.prompt.notRecorded')}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>

      {history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('audit.extractionHistory.costSummary.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('audit.extractionHistory.costSummary.time')}</TableHead>
                  <TableHead>{t('audit.extractionHistory.costSummary.model')}</TableHead>
                  <TableHead>{t('audit.extractionHistory.costSummary.status')}</TableHead>
                  <TableHead className="text-right">{t('audit.extractionHistory.costSummary.text')}</TableHead>
                  <TableHead className="text-right">{t('audit.extractionHistory.costSummary.llm')}</TableHead>
                  <TableHead className="text-right">{t('audit.extractionHistory.costSummary.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.jobId}>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(entry.createdAt), 'PPp')}</TableCell>
                    <TableCell className="text-sm">{entry.llmModelName ?? entry.llmModelId ?? t('audit.extractionHistory.defaultModel')}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-sm text-right">
                      {formatCostWithCurrency(entry.textActualCost ?? entry.textEstimatedCost ?? 0, entry.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {formatCostWithCurrency(entry.llmActualCost ?? entry.llmEstimatedCost ?? 0, entry.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {formatCostWithCurrency(entry.actualCost ?? entry.estimatedCost ?? 0, entry.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
