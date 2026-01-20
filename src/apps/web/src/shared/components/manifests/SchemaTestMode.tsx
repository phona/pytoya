import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  Lightbulb,
  Play,
  RefreshCw,
  X,
} from 'lucide-react';
import { useExtractionStore } from '@/shared/stores/extraction';
import { Manifest } from '@/api/manifests';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Progress } from '@/shared/components/ui/progress';
import { Separator } from '@/shared/components/ui/separator';

interface FieldPerformance {
  fieldName: string;
  successCount: number;
  totalCount: number;
  successRate: number;
}

interface SchemaTestModeProps {
  manifests: Manifest[];
  selectedIds: Set<number>;
  onSelectToggle: (id: number) => void;
  onExtractSelected: (ids: number[]) => void;
  onPreviewOcr?: (manifestId: number) => void;
  onViewManifest?: (manifestId: number) => void;
  isExtracting?: boolean;
}

export function SchemaTestMode({
  manifests,
  selectedIds,
  onSelectToggle,
  onExtractSelected,
  onPreviewOcr,
  onViewManifest,
  isExtracting = false,
}: SchemaTestModeProps) {
  const schemaTestMode = useExtractionStore((state) => state.schemaTestMode);
  const setSchemaTestMode = useExtractionStore((state) => state.setSchemaTestMode);

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Analyze field performance across manifests
  const fieldPerformance = useMemo<FieldPerformance[]>(() => {
    const fieldMap = new Map<string, { success: number; total: number }>();

    manifests.forEach((manifest) => {
      if (!manifest.extractedData) return;

      const extractedData = manifest.extractedData as Record<string, unknown>;
      const validation = manifest.validationResults;

      Object.keys(extractedData).forEach((field) => {
        if (!fieldMap.has(field)) {
          fieldMap.set(field, { success: 0, total: 0 });
        }
        const stats = fieldMap.get(field)!;
        stats.total++;

        // Check if field has validation issues
        const hasIssue = validation?.issues?.some(
          (issue) => issue.field === field || issue.field.startsWith(`${field}.`)
        );
        if (!hasIssue && extractedData[field] !== undefined && extractedData[field] !== null) {
          stats.success++;
        }
      });
    });

    return Array.from(fieldMap.entries())
      .map(([fieldName, { success, total }]) => ({
        fieldName,
        successCount: success,
        totalCount: total,
        successRate: total > 0 ? (success / total) * 100 : 0,
      }))
      .sort((a, b) => a.successRate - b.successRate);
  }, [manifests]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const extractedCount = manifests.filter((m) => m.extractedData).length;
    const completeCount = manifests.filter(
      (m) => m.extractedData && m.validationResults && m.validationResults.errorCount === 0
    ).length;
    const partialCount = extractedCount - completeCount;

    return {
      total: manifests.length,
      extracted: extractedCount,
      complete: completeCount,
      partial: partialCount,
      successRate: extractedCount > 0 ? (completeCount / extractedCount) * 100 : 0,
    };
  }, [manifests]);

  const getManifestStatusBadge = (manifest: Manifest) => {
    if (!manifest.extractedData) {
      return { label: 'Not Extracted', color: 'bg-muted text-muted-foreground' };
    }
    if (!manifest.validationResults) {
      return { label: 'No Validation', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (manifest.validationResults.errorCount === 0) {
      return { label: 'Complete', color: 'bg-emerald-100 text-emerald-800' };
    }
    if (manifest.validationResults.errorCount > 0) {
      return { label: 'Partial', color: 'bg-orange-100 text-orange-800' };
    }
    return { label: 'Unknown', color: 'bg-muted text-muted-foreground' };
  };

  const getRecommendations = (): string[] => {
    const recommendations: string[] = [];
    const poorFields = fieldPerformance.filter((f) => f.successRate < 50);
    const mediumFields = fieldPerformance.filter((f) => f.successRate >= 50 && f.successRate < 80);

    if (poorFields.length > 0) {
      recommendations.push(
        `Fields with low success rate: ${poorFields.map((f) => f.fieldName).join(', ')}. Consider adjusting the prompt or schema field names.`
      );
    }

    if (mediumFields.length > 0) {
      recommendations.push(
        `Fields with medium success rate: ${mediumFields.map((f) => f.fieldName).join(', ')}. Check for format variations.`
      );
    }

    if (overallStats.partial > 0) {
      recommendations.push(
        `${overallStats.partial} documents have partial extractions. Review validation errors for common patterns.`
      );
    }

    if (recommendations.length === 0 && overallStats.extracted > 0) {
      recommendations.push('Extraction looks good! All fields are being extracted successfully.');
    }

    return recommendations;
  };

  if (!schemaTestMode) {
    return (
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSchemaTestMode(true)}
        >
          <Lightbulb className="mr-2 h-4 w-4" />
          Test Mode
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">Schema Test Mode</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSchemaTestMode(false)}
        >
          <X className="h-4 w-4 mr-2" />
          Exit Test Mode
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total Documents</div>
          <div className="text-2xl font-semibold">{overallStats.total}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Extracted</div>
          <div className="text-2xl font-semibold">{overallStats.extracted}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Complete</div>
          <div className="text-2xl font-semibold text-emerald-600">{overallStats.complete}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Success Rate</div>
          <div className="text-2xl font-semibold">{overallStats.successRate.toFixed(0)}%</div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Recommendations</h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              {getRecommendations().map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Separator />

      {/* Field Performance */}
      <div>
        <h4 className="text-sm font-medium mb-3">Field Performance</h4>
        <div className="space-y-2">
          {fieldPerformance.map((field) => (
            <div key={field.fieldName} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{field.fieldName}</span>
                  <span className="text-xs text-muted-foreground">
                    {field.successCount}/{field.totalCount} ({field.successRate.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={field.successRate} className="h-2" />
              </div>
              <Badge
                variant="outline"
                className={
                  field.successRate >= 80
                    ? 'bg-emerald-100 text-emerald-800'
                    : field.successRate >= 50
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }
              >
                {field.successRate >= 80 ? 'Good' : field.successRate >= 50 ? 'Fair' : 'Poor'}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Document List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Documents</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={() => onExtractSelected(Array.from(selectedIds))}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Extract Selected ({selectedIds.size})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {manifests.map((manifest) => {
            const statusBadge = getManifestStatusBadge(manifest);
            const isExpanded = expandedIds.has(manifest.id);

            return (
              <div
                key={manifest.id}
                className="rounded-md border border-border bg-card overflow-hidden"
              >
                {/* Summary Row */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpanded(manifest.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggleExpanded(manifest.id);
                    }
                  }}
                >
                  <Checkbox
                    checked={selectedIds.has(manifest.id)}
                    onCheckedChange={() => onSelectToggle(manifest.id)}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(manifest.id);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>

                  <span className="flex-1 text-sm truncate">{manifest.originalFilename}</span>

                  <Badge className={`px-2 py-1 ${statusBadge.color}`}>
                    {statusBadge.label}
                  </Badge>

                  {manifest.extractedData && manifest.validationResults && (
                    <span className="text-xs text-muted-foreground">
                      {Object.keys(manifest.extractedData).length - manifest.validationResults.errorCount}/
                      {Object.keys(manifest.extractedData).length} fields
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    {onPreviewOcr && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewOcr(manifest.id);
                        }}
                        title="Preview OCR"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    {onViewManifest && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewManifest(manifest.id);
                        }}
                        title="View details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && manifest.extractedData && (
                  <div className="border-t border-border bg-muted/30 p-3">
                    {manifest.validationResults?.issues && manifest.validationResults.issues.length > 0 ? (
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-foreground flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          Validation Issues
                        </h5>
                        <div className="space-y-1">
                          {manifest.validationResults.issues.map((issue, index) => (
                            <div
                              key={index}
                              className={`text-xs rounded px-2 py-1 ${
                                issue.severity === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              <span className="font-medium">{issue.field}:</span> {issue.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        All fields validated successfully
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
