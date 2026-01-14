import { ValidationResult, ValidationIssue, ValidationSeverity } from '@/lib/api/validation';

interface ValidationResultsPanelProps {
  result: ValidationResult | null;
  isLoading?: boolean;
}

const SEVERITY_COLORS: Record<ValidationSeverity, string> = {
  error: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
};

const SEVERACY_ICONS: Record<ValidationSeverity, string> = {
  error: '✖',
  warning: '⚠',
};

export function ValidationResultsPanel({ result, isLoading }: ValidationResultsPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-indigo-600 border-r-transparent"></div>
          <span className="ml-2 text-sm text-gray-600">Running validation...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No validation results</h3>
          <p className="mt-1 text-sm text-gray-500">
            Run validation to check for data integrity issues.
          </p>
        </div>
      </div>
    );
  }

  const { issues, errorCount, warningCount, validatedAt } = result;

  const groupedIssues = issues.reduce(
    (acc, issue) => {
      if (!acc[issue.severity]) {
        acc[issue.severity] = [];
      }
      acc[issue.severity].push(issue);
      return acc;
    },
    {} as Record<ValidationSeverity, ValidationIssue[]>,
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Summary Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Validation Results</h3>
          <div className="flex gap-4 text-sm">
            {errorCount > 0 && (
              <span className="flex items-center text-red-600">
                <span className="mr-1">{SEVERACY_ICONS.error}</span>
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center text-yellow-600">
                <span className="mr-1">{SEVERACY_ICONS.warning}</span>
                {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
              </span>
            )}
            {errorCount === 0 && warningCount === 0 && (
              <span className="flex items-center text-green-600">
                <span className="mr-1">✓</span>
                All checks passed
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Validated at {new Date(validatedAt).toLocaleString()}
        </p>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No issues found</h3>
          <p className="mt-1 text-sm text-gray-500">All validation checks passed successfully.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {issues.map((issue, index) => (
            <ValidationIssueItem key={index} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

function ValidationIssueItem({ issue }: { issue: ValidationIssue }) {
  const colorClass = SEVERITY_COLORS[issue.severity];
  const icon = SEVERACY_ICONS[issue.severity];

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
                  <code className="bg-white bg-opacity-50 px-1 rounded">
                    {JSON.stringify(issue.actual)}
                  </code>
                </div>
              )}
              {issue.expected !== undefined && (
                <div>
                  <span className="font-medium">Expected: </span>
                  <code className="bg-white bg-opacity-50 px-1 rounded">
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
