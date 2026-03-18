import { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import type { OperationLog } from '@/api/manifests';
import { useOperationLogs } from '@/shared/hooks/use-manifests';
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

interface CorrectionHistoryPanelProps {
  manifestId: number;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value || '""';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}

export function CorrectionHistoryPanel({ manifestId }: CorrectionHistoryPanelProps) {
  const { t } = useI18n();
  const { data: logs, isLoading } = useOperationLogs(manifestId);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-orange-500" />
            {t('audit.correctionHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('audit.correctionHistory.empty')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-orange-500" />
          {t('audit.correctionHistory.title')}
          <Badge variant="secondary" className="ml-auto">
            {logs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {logs.map((log) => {
          const isExpanded = expandedId === log.id;

          return (
            <Collapsible
              key={log.id}
              open={isExpanded}
              onOpenChange={() => setExpandedId(isExpanded ? null : log.id)}
              className="border border-border rounded-lg overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3 bg-card hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {format(new Date(log.createdAt), 'PPp')}
                    </span>
                    {log.action === 'manual_edit' ? (
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                        <Edit3 className="h-3 w-3 mr-1" />
                        {t('audit.correctionHistory.action.manual_edit')}
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        {t('audit.correctionHistory.action.human_verified')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('audit.correctionHistory.by', { user: log.username })}
                    {log.diffs.length > 0
                      ? ` · ${t('audit.correctionHistory.fieldsChanged', { count: log.diffs.length })}`
                      : null}
                  </div>
                </div>

                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                {log.diffs.length > 0 ? (
                  <div className="border-t border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[35%]">{t('audit.correctionHistory.field')}</TableHead>
                          <TableHead className="w-[32.5%]">{t('audit.correctionHistory.before')}</TableHead>
                          <TableHead className="w-[32.5%]">{t('audit.correctionHistory.after')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {log.diffs.map((diff, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs break-all">{diff.path}</TableCell>
                            <TableCell className="text-xs text-red-600 dark:text-red-400 break-all">
                              {formatValue(diff.before)}
                            </TableCell>
                            <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 break-all">
                              {formatValue(diff.after)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/30 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {t('audit.correctionHistory.noDiffs')}
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
