import { format } from 'date-fns';
import { AlertTriangle, CircleAlert, CircleCheck } from 'lucide-react';
import { ValidationIssue, ValidationResult, ValidationSeverity } from '@/api/validation';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

interface ValidationResultsPanelProps {
  result: ValidationResult | null;
  isLoading?: boolean;
}

const SEVERITY_COLORS: Record<ValidationSeverity, string> = {
  error: 'text-destructive bg-destructive/10 border-destructive/30',
  warning: 'text-[color:var(--status-warning-text)] bg-[color:var(--status-warning-bg)] border-border',
};

export function ValidationResultsPanel({ result, isLoading }: ValidationResultsPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-primary border-r-transparent"></div>
          <span className="ml-2 text-sm text-muted-foreground">Running validation...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="text-center py-8">
          <CircleCheck className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No validation results</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Run validation to check for data integrity issues.
          </p>
        </div>
      </div>
    );
  }

  const { issues, errorCount, warningCount, validatedAt } = result;
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const hasIssues = errors.length > 0 || warnings.length > 0;
  const defaultTab = errors.length > 0 ? 'errors' : 'warnings';

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">Validation Results</h3>
          <div className="flex gap-4 text-sm items-center">
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <CircleAlert className="h-3.5 w-3.5" />
                {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
              </Badge>
            )}
            {errorCount === 0 && warningCount === 0 && (
              <span className="flex items-center text-[color:var(--status-completed-text)]">
                <CircleCheck className="mr-1 h-4 w-4" />
                All checks passed
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Validated at {format(new Date(validatedAt), 'PPpp')}
        </p>
      </div>

      {!hasIssues ? (
        <div className="p-6 text-center">
          <CircleCheck className="mx-auto h-12 w-12 text-[color:var(--status-completed-text)]" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No issues found</h3>
          <p className="mt-1 text-sm text-muted-foreground">All validation checks passed successfully.</p>
        </div>
      ) : (
        <Tabs defaultValue={defaultTab} className="p-4">
          <TabsList className="mb-4">
            <TabsTrigger value="errors">
              Errors
              <Badge variant="secondary" className="ml-2">
                {errors.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="warnings">
              Warnings
              <Badge variant="secondary" className="ml-2">
                {warnings.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="errors">
            {errors.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                No errors detected.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {errors.map((issue, index) => (
                  <ValidationIssueItem key={index} issue={issue} />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="warnings">
            {warnings.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                No warnings detected.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {warnings.map((issue, index) => (
                  <ValidationIssueItem key={index} issue={issue} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ValidationIssueItem({ issue }: { issue: ValidationIssue }) {
  const colorClass = SEVERITY_COLORS[issue.severity];
  const icon = issue.severity === 'error' ? (
    <AlertTriangle className="h-4 w-4" />
  ) : (
    <CircleAlert className="h-4 w-4" />
  );

  return (
    <div className={`p-4 ${colorClass} border-l-4`}>
      <div className="flex items-start">
        <span className="flex-shrink-0 text-lg mr-3" role="img" aria-label={issue.severity}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium truncate">{issue.field}</h4>
            <span className="text-xs uppercase font-semibold ml-2">{issue.severity}</span>
          </div>
          <p className="text-sm mt-1">{issue.message}</p>
          {(issue.actual !== undefined || issue.expected !== undefined) && (
            <div className="mt-2 text-xs space-y-1">
              {issue.actual !== undefined && (
                <div>
                  <span className="font-medium">Actual: </span>
                  <code className="bg-card bg-opacity-50 px-1 rounded">
                    {JSON.stringify(issue.actual)}
                  </code>
                </div>
              )}
              {issue.expected !== undefined && (
                <div>
                  <span className="font-medium">Expected: </span>
                  <code className="bg-card bg-opacity-50 px-1 rounded">
                    {JSON.stringify(issue.expected)}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




