import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Download, FileText, RefreshCw, X, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { Progress } from '@/shared/components/ui/progress';
import { Input } from '@/shared/components/ui/input';

interface CostLogEntry {
  id: string;
  timestamp: Date;
  manifestId: number;
  manifestName: string;
  model: string;
  ocrCost: number;
  llmCost: number;
  totalCost: number;
  status: 'success' | 'partial' | 'failed';
  pages?: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface CostLogModalProps {
  open: boolean;
  onClose: () => void;
  budget?: number;
}

const MOCK_COST_LOGS: CostLogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    manifestId: 1,
    manifestName: 'invoice_001.pdf',
    model: 'GPT-4o',
    ocrCost: 0.003,
    llmCost: 0.067,
    totalCost: 0.07,
    status: 'success',
    pages: 3,
    inputTokens: 2400,
    outputTokens: 480,
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 3 * 60 * 1000),
    manifestId: 2,
    manifestName: 'invoice_002.pdf',
    model: 'GPT-4o',
    ocrCost: 0.003,
    llmCost: 0.047,
    totalCost: 0.05,
    status: 'success',
    pages: 2,
    inputTokens: 1800,
    outputTokens: 320,
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 4 * 60 * 1000),
    manifestId: 3,
    manifestName: 'invoice_003.pdf',
    model: 'GPT-4o',
    ocrCost: 0.003,
    llmCost: 0.087,
    totalCost: 0.09,
    status: 'partial',
    pages: 3,
    inputTokens: 2800,
    outputTokens: 520,
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    manifestId: 4,
    manifestName: 'invoice_004.pdf',
    model: 'GPT-4o',
    ocrCost: 0.002,
    llmCost: 0.062,
    totalCost: 0.064,
    status: 'success',
    pages: 2,
    inputTokens: 2100,
    outputTokens: 380,
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    manifestId: 5,
    manifestName: 'invoice_005.pdf',
    model: 'GPT-4o',
    ocrCost: 0.003,
    llmCost: 0.08,
    totalCost: 0.083,
    status: 'success',
    pages: 3,
    inputTokens: 2500,
    outputTokens: 450,
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    manifestId: 6,
    manifestName: 'invoice_006.pdf',
    model: 'GPT-4o',
    ocrCost: 0.003,
    llmCost: 0.055,
    totalCost: 0.058,
    status: 'failed',
    pages: 2,
    inputTokens: 1900,
    outputTokens: 0,
  },
];

export function CostLogModal({ open, onClose, budget = 50 }: CostLogModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    const total = MOCK_COST_LOGS.reduce((sum, log) => sum + log.totalCost, 0);
    const count = MOCK_COST_LOGS.length;
    const successCount = MOCK_COST_LOGS.filter((l) => l.status === 'success').length;
    const partialCount = MOCK_COST_LOGS.filter((l) => l.status === 'partial').length;
    const failedCount = MOCK_COST_LOGS.filter((l) => l.status === 'failed').length;

    const costs = MOCK_COST_LOGS.map((l) => l.totalCost);
    const mostExpensive = Math.max(...costs);
    const cheapest = Math.min(...costs);

    return {
      total,
      count,
      average: total / count,
      mostExpensive,
      cheapest,
      successCount,
      partialCount,
      failedCount,
    };
  }, []);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return MOCK_COST_LOGS;
    const lower = searchTerm.toLowerCase();
    return MOCK_COST_LOGS.filter(
      (log) =>
        log.manifestName.toLowerCase().includes(lower) ||
        log.model.toLowerCase().includes(lower)
    );
  }, [searchTerm]);

  const handleExportCsv = () => {
    const headers = ['Time', 'Document', 'Model', 'OCR Cost', 'LLM Cost', 'Total', 'Status'];
    const rows = filteredLogs.map((log) => [
      format(log.timestamp, 'PPp'),
      log.manifestName,
      log.model,
      log.ocrCost.toFixed(4),
      log.llmCost.toFixed(4),
      log.totalCost.toFixed(4),
      log.status,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cost-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: CostLogEntry['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Done</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"><AlertTriangle className="h-3 w-3 mr-1" /> Partial</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Extraction Cost Log</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Month Summary */}
          <div>
            <div className="text-sm font-medium mb-3">
              This Month: {format(new Date(), 'MMMM yyyy')}
            </div>

            {/* Budget Progress */}
            <div className="rounded-md border border-border bg-card p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Budget Progress</span>
                <span className="text-sm font-medium">${stats.total.toFixed(2)} / ${budget.toFixed(2)}</span>
              </div>
              <Progress value={(stats.total / budget) * 100} className="h-2" />
              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                <span>{((stats.total / budget) * 100).toFixed(1)}% spent</span>
                <span>${(budget - stats.total).toFixed(2)} remaining</span>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Total Spent</div>
                <div className="text-lg font-semibold">${stats.total.toFixed(2)}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Extractions</div>
                <div className="text-lg font-semibold">{stats.count}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Avg Cost</div>
                <div className="text-lg font-semibold">${stats.average.toFixed(4)}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Success Rate</div>
                <div className="text-lg font-semibold">
                  {((stats.successCount / stats.count) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="text-xs text-muted-foreground flex-1">
                Most expensive: ${stats.mostExpensive.toFixed(4)} | Cheapest: ${stats.cheapest.toFixed(4)}
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCsv} className="text-xs">
                <Download className="h-3 w-3 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>

          <Separator />

          {/* Cost Log Entries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Recent Activity</div>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="max-w-xs h-8 text-xs"
              />
            </div>

            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-xs">Time</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Document</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Model</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Pages</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Tokens</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">OCR</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">LLM</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Total</th>
                    <th className="px-3 py-2 text-center font-medium text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {format(log.timestamp, 'PPp')}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs truncate max-w-[120px]">{log.manifestName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">{log.model}</td>
                      <td className="px-3 py-2 text-xs text-right">{log.pages}</td>
                      <td className="px-3 py-2 text-xs text-right text-muted-foreground">
                        {log.inputTokens?.toLocaleString()} / {log.outputTokens?.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs text-right">${log.ocrCost.toFixed(4)}</td>
                      <td className="px-3 py-2 text-xs text-right">${log.llmCost.toFixed(4)}</td>
                      <td className="px-3 py-2 text-xs text-right font-medium">${log.totalCost.toFixed(4)}</td>
                      <td className="px-3 py-2 text-center">{getStatusBadge(log.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredLogs.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No matching entries found.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
