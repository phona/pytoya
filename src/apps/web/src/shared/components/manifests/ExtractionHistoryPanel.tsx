import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  DollarSign,
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
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const expandedJobId = expandedEntryId ? Number(expandedEntryId) : null;

  const entryDetails = useManifestExtractionHistoryEntry(manifestId, expandedJobId, {
    enabled: expandedJobId !== null,
  });

  const stats = useMemo(() => {
    const totalCost = history.reduce((sum, entry) => sum + (entry.actualCost ?? entry.estimatedCost ?? 0), 0);
    const totalTextCost = history.reduce((sum, entry) => sum + (entry.textActualCost ?? entry.textEstimatedCost ?? 0), 0);
    const totalLlmCost = history.reduce((sum, entry) => sum + (entry.llmActualCost ?? entry.llmEstimatedCost ?? 0), 0);
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
      totalCost,
      totalTextCost,
      totalLlmCost,
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
            Completed
          </Badge>
        );
      case 'running':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-muted text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'canceled':
        return (
          <Badge className="bg-slate-200 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <Ban className="h-3 w-3 mr-1" />
            Canceled
          </Badge>
        );
      case 'failed':
      default:
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
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
            Extraction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Total Runs</div>
              <div className="text-2xl font-semibold">{stats.totalRuns}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Spent</div>
              <div className="text-2xl font-semibold">${stats.totalCost.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
              <div className="text-2xl font-semibold">
                {stats.totalRuns > 0 ? Math.round((stats.completedCount / stats.totalRuns) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.completedCount} completed • {stats.runningCount} running • {stats.pendingCount} pending • {stats.canceledCount} canceled • {stats.failedCount} failed
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avg Tokens</div>
              <div className="text-2xl font-semibold">
                {stats.totalRuns > 0 ? Math.round(stats.totalTokens / stats.totalRuns).toLocaleString() : 0}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm font-medium mb-2">Cost Breakdown</div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-blue-500" />
                <span className="text-muted-foreground">Text:</span>
                <span className="font-medium">${stats.totalTextCost.toFixed(4)}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-purple-500" />
                <span className="text-muted-foreground">LLM:</span>
                <span className="font-medium">${stats.totalLlmCost.toFixed(4)}</span>
              </div>
              {stats.avgDurationMs ? (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Avg time:</span>
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
            <CardTitle className="text-base">Extraction Runs</CardTitle>
            {selectedEntries.size === 2 && onCompare && (
              <Button variant="outline" size="sm" onClick={() => onCompare(Array.from(selectedEntries))}>
                <GitCompare className="h-4 w-4 mr-1" />
                Compare Selected
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No extraction history found for this document.
            </p>
          ) : (
            history.map((entry) => {
              const entryId = String(entry.jobId);
              const isExpanded = expandedEntryId === entryId;
              const isSelected = selectedEntries.has(entryId);

              const createdAt = new Date(entry.createdAt);
              const modelLabel = entry.llmModelName ?? entry.llmModelId ?? 'Default model';
              const promptLabel = entry.promptName ?? (entry.promptId ? `Prompt #${entry.promptId}` : 'Default prompt');
              const fieldLabel = entry.fieldName ? `Field: ${entry.fieldName}` : 'Full extraction';

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
                        {modelLabel} • {promptLabel} • {fieldLabel} • {entry.pagesProcessed ?? '—'} pages • {(entry.llmInputTokens ?? 0)}→{(entry.llmOutputTokens ?? 0)} tokens
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="h-4 w-4" />
                        {totalCost.toFixed(4)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Text: ${textCost.toFixed(4)} • LLM: ${llmCost.toFixed(4)}
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
                          <span className="text-muted-foreground">Job</span>
                          <div className="font-medium">
                            ID: {entry.jobId}{entry.queueJobId ? ` (queue: ${entry.queueJobId})` : ''}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration</span>
                          <div className="font-medium">
                            {entry.durationMs ? `${(entry.durationMs / 1000).toFixed(1)}s` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Model</span>
                          <div className="font-medium">{modelLabel}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prompt</span>
                          <div className="font-medium">{promptLabel}</div>
                        </div>
                      </div>

                      {(entry.error || entry.cancelReason) ? (
                        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800 dark:bg-red-950 dark:border-red-900 dark:text-red-200">
                          {entry.cancelReason ? `Canceled: ${entry.cancelReason}` : entry.error}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyRunDetails(entry)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy details
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadRunDetails(entry)}>
                          <Download className="h-3 w-3 mr-1" />
                          Download JSON
                        </Button>
                      </div>

                      {/* Prompt I/O (lazy-loaded) */}
                      {isExpanded && (
                        <div className="space-y-3">
                          {entryDetails.isLoading ? (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading prompt details…
                            </div>
                          ) : entryDetails.isError ? (
                            <div className="text-xs text-destructive">
                              Failed to load prompt details.
                            </div>
                          ) : (
                            <>
                              {entryDetails.data?.promptTemplateContent ? (
                                <div className="rounded-md border border-border bg-background p-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium">Prompt Template</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => copyText(entryDetails.data?.promptTemplateContent ?? null)}
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy
                                    </Button>
                                  </div>
                                  <pre className="text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {entryDetails.data.promptTemplateContent}
                                  </pre>
                                </div>
                              ) : null}

                              <div className="rounded-md border border-border bg-background p-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">System Prompt (input)</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => copyText(entryDetails.data?.systemPrompt ?? null)}
                                    disabled={!entryDetails.data?.systemPrompt}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                                {entryDetails.data?.systemPrompt ? (
                                  <pre className="text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {entryDetails.data.systemPrompt}
                                  </pre>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    Not recorded for this run (run extraction again to capture it).
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border border-border bg-background p-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">User Prompt (input)</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => copyText(entryDetails.data?.userPrompt ?? null)}
                                    disabled={!entryDetails.data?.userPrompt}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                                {entryDetails.data?.userPrompt ? (
                                  <pre className="text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {entryDetails.data.userPrompt}
                                  </pre>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    Not recorded for this run (run extraction again to capture it).
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border border-border bg-background p-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">Assistant Output (raw)</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => copyText(entryDetails.data?.assistantResponse ?? null)}
                                    disabled={!entryDetails.data?.assistantResponse}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                                {entryDetails.data?.assistantResponse ? (
                                  <pre className="text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                                    {entryDetails.data.assistantResponse}
                                  </pre>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    Not recorded for this run (run extraction again to capture it).
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
            <CardTitle className="text-base">Cost Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Text</TableHead>
                  <TableHead className="text-right">LLM</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.jobId}>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(entry.createdAt), 'PPp')}</TableCell>
                    <TableCell className="text-sm">{entry.llmModelName ?? entry.llmModelId ?? 'Default model'}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-sm text-right">
                      ${(entry.textActualCost ?? entry.textEstimatedCost ?? 0).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      ${(entry.llmActualCost ?? entry.llmEstimatedCost ?? 0).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      ${(entry.actualCost ?? entry.estimatedCost ?? 0).toFixed(4)}
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
