import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitCompare,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

export interface ExtractionHistoryEntry {
  id: string;
  timestamp: Date;
  model: string;
  modelId: string;
  promptId?: number;
  textCost: number;
  llmCost: number;
  totalCost: number;
  status: 'success' | 'partial' | 'failed';
  pages?: number;
  inputTokens?: number;
  outputTokens?: number;
  duration?: number; // in milliseconds
  extractedData?: Record<string, unknown>;
  errorMessage?: string;
  fieldsAttempted?: number;
  fieldsSuccessful?: number;
}

interface ExtractionHistoryPanelProps {
  manifestId: number;
  manifestName: string;
  history: ExtractionHistoryEntry[];
  onCompare?: (entryIds: string[]) => void;
  onReRun?: (entryId: string) => void;
  loading?: boolean;
}

export function ExtractionHistoryPanel({
  manifestId,
  manifestName,
  history,
  onCompare,
  onReRun,
  loading = false,
}: ExtractionHistoryPanelProps) {
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalCost = history.reduce((sum, entry) => sum + entry.totalCost, 0);
    const totalTextCost = history.reduce((sum, entry) => sum + entry.textCost, 0);
    const totalLlmCost = history.reduce((sum, entry) => sum + entry.llmCost, 0);
    const successCount = history.filter((e) => e.status === 'success').length;
    const partialCount = history.filter((e) => e.status === 'partial').length;
    const failedCount = history.filter((e) => e.status === 'failed').length;
    const totalTokens = history.reduce(
      (sum, entry) => sum + (entry.inputTokens || 0) + (entry.outputTokens || 0),
      0
    );
    const avgDuration =
      history.filter((e) => e.duration).reduce((sum, entry) => sum + (entry.duration || 0), 0) /
      history.filter((e) => e.duration).length;

    return {
      totalCost,
      totalTextCost,
      totalLlmCost,
      successCount,
      partialCount,
      failedCount,
      totalRuns: history.length,
      totalTokens,
      avgDuration,
    };
  }, [history]);

  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else if (next.size < 2) {
        // Allow max 2 entries for comparison
        next.add(entryId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: ExtractionHistoryEntry['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
    }
  };

  const copyExtractedData = (data: Record<string, unknown>) => {
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
  };

  const downloadExtractedData = (entry: ExtractionHistoryEntry) => {
      const data = {
      manifestId,
      manifestName,
      extractionId: entry.id,
      timestamp: entry.timestamp.toISOString(),
      model: entry.model,
      data: entry.extractedData,
      costs: {
        text: entry.textCost,
        llm: entry.llmCost,
        total: entry.totalCost,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extraction-${entry.id}.json`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
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
                {stats.totalRuns > 0
                  ? Math.round(((stats.successCount + stats.partialCount) / stats.totalRuns) * 100)
                  : 0}
                %
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avg Tokens</div>
              <div className="text-2xl font-semibold">
                {stats.totalRuns > 0 ? Math.round(stats.totalTokens / stats.totalRuns).toLocaleString() : 0}
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
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
              {stats.avgDuration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Avg Duration:</span>
                  <span className="font-medium">{(stats.avgDuration / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compare Button */}
      {selectedEntries.size === 2 && onCompare && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800 dark:text-blue-200">
                2 extractions selected for comparison
              </span>
              <Button size="sm" onClick={() => onCompare(Array.from(selectedEntries))}>
                <GitCompare className="h-4 w-4 mr-2" />
                Compare Runs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No extraction history found for this document.
            </div>
          ) : (
            history.map((entry, index) => {
              const isExpanded = expandedEntryId === entry.id;
              const isSelected = selectedEntries.has(entry.id);

              return (
                <Collapsible
                  key={entry.id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedEntryId(open ? entry.id : null)}
                >
                  <div
                    className={`rounded-md border transition-colors ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
                        : 'border-border bg-card'
                    }`}
                  >
                    {/* Summary Row */}
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Select for comparison */}
                          {onCompare && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleEntrySelection(entry.id);
                              }}
                              className="h-4 w-4"
                            />
                          )}

                          {/* Status icon */}
                          <div className="flex-shrink-0">
                            {entry.status === 'success' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : entry.status === 'partial' ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Run {history.length - index}
                              </span>
                              {getStatusBadge(entry.status)}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{format(entry.timestamp, 'PPp')}</span>
                              <span>•</span>
                              <span>{entry.model}</span>
                              {entry.duration && (
                                <>
                                  <span>•</span>
                                  <span>{(entry.duration / 1000).toFixed(1)}s</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Cost */}
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold">
                              ${entry.totalCost.toFixed(4)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.textCost > 0 && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  ${entry.textCost.toFixed(4)} Text
                                </span>
                              )}
                              {entry.llmCost > 0 && entry.textCost > 0 && ' + '}
                              {entry.llmCost > 0 && (
                                <span className="text-purple-600 dark:text-purple-400">
                                  ${entry.llmCost.toFixed(4)} LLM
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expand button */}
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    {/* Expanded Details */}
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t border-border mt-2">
                        <div className="pt-3 space-y-3">
                          {/* Token Usage */}
                          {(entry.inputTokens || entry.outputTokens) && (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {entry.inputTokens && (
                                <div>
                                  <span className="text-muted-foreground">Input Tokens:</span>{' '}
                                  <span className="font-medium">{entry.inputTokens.toLocaleString()}</span>
                                </div>
                              )}
                              {entry.outputTokens && (
                                <div>
                                  <span className="text-muted-foreground">Output Tokens:</span>{' '}
                                  <span className="font-medium">{entry.outputTokens.toLocaleString()}</span>
                                </div>
                              )}
                              {entry.pages && (
                                <div>
                                  <span className="text-muted-foreground">Pages:</span>{' '}
                                  <span className="font-medium">{entry.pages}</span>
                                </div>
                              )}
                              {entry.fieldsAttempted && (
                                <div>
                                  <span className="text-muted-foreground">Fields:</span>{' '}
                                  <span className="font-medium">
                                    {entry.fieldsSuccessful}/{entry.fieldsAttempted} successful
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Error Message */}
                          {entry.errorMessage && (
                            <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800 dark:bg-red-950 dark:border-red-900 dark:text-red-200">
                              {entry.errorMessage}
                            </div>
                          )}

                          {/* Extracted Data Preview */}
                          {entry.extractedData && Object.keys(entry.extractedData).length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium">Extracted Data</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => copyExtractedData(entry.extractedData!)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => downloadExtractedData(entry)}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                              <div className="rounded-md border border-border bg-muted p-2 max-h-48 overflow-y-auto">
                                <pre className="text-xs font-mono">
                                  {JSON.stringify(entry.extractedData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          {onReRun && entry.status !== 'success' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onReRun(entry.id)}
                            >
                              Re-run with Same Settings
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Cost Summary Table */}
      {history.length > 0 && (
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
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(entry.timestamp, 'PPp')}
                    </TableCell>
                    <TableCell className="text-sm">{entry.model}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-sm text-right">
                      ${entry.textCost.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      ${entry.llmCost.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      ${entry.totalCost.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
