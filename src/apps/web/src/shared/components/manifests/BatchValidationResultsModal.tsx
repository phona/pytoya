import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useI18n } from '@/shared/providers/I18nProvider';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';

export interface BatchValidationManifestResult {
  id: number;
  filename: string;
  errorCount?: number;
  warningCount?: number;
}

export interface BatchValidationResults {
  manifestsWithErrors: BatchValidationManifestResult[];
  manifestsWithWarnings: BatchValidationManifestResult[];
  manifestsPassed: BatchValidationManifestResult[];
  manifestsFailed: Array<{ id: number; filename: string; error?: string }>;
  totalValidated: number;
  totalErrors: number;
  totalWarnings: number;
}

interface BatchValidationResultsModalProps {
  open: boolean;
  onClose: () => void;
  results: BatchValidationResults | null;
  onViewManifest: (manifestId: number) => void;
}

export function BatchValidationResultsModal({
  open,
  onClose,
  results,
  onViewManifest,
}: BatchValidationResultsModalProps) {
  const { t } = useI18n();
  const [errorsExpanded, setErrorsExpanded] = useState(true);
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [passedExpanded, setPassedExpanded] = useState(false);
  const [failedExpanded, setFailedExpanded] = useState(false);

  if (!results) return null;

  const {
    manifestsWithErrors,
    manifestsWithWarnings,
    manifestsPassed,
    manifestsFailed,
    totalValidated,
    totalErrors,
    totalWarnings,
  } = results;

  const handleViewManifest = (manifestId: number) => {
    onViewManifest(manifestId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('manifests.list.batchValidation.completeTitle')}</DialogTitle>
          <DialogDescription>
            {t('manifests.list.batchValidationResults.validated', { count: results?.totalValidated ?? 0 })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {t('manifests.list.batchValidationResults.validated', { count: totalValidated })}
            </span>
            {totalErrors > 0 && (
              <span className="text-destructive">
                {t('manifests.list.batchValidationResults.errors', { count: totalErrors })}
              </span>
            )}
            {totalWarnings > 0 && (
              <span className="text-yellow-600">
                {t('manifests.list.batchValidationResults.warnings', { count: totalWarnings })}
              </span>
            )}
          </div>

          {/* Manifests with Errors */}
          {manifestsWithErrors.length > 0 && (
            <Collapsible open={errorsExpanded} onOpenChange={setErrorsExpanded}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full py-2 text-left hover:bg-muted/50 rounded px-2 -mx-2"
                >
                  {errorsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">
                    {t('manifests.list.batchValidationResults.hasErrors', {
                      count: manifestsWithErrors.length,
                    })}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1 border-l-2 border-destructive/30 pl-4 ml-2">
                  {manifestsWithErrors.map((manifest) => (
                    <div
                      key={manifest.id}
                      className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{manifest.filename}</span>
                        {manifest.errorCount !== undefined && manifest.errorCount > 0 && (
                          <span className="text-xs text-destructive">
                            ({manifest.errorCount} {t('audit.validation.errors', { count: manifest.errorCount }).split(' ')[0].replace(/[0-9]/g, '')})
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewManifest(manifest.id)}
                      >
                        {t('common.view')}
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Manifests with Warnings */}
          {manifestsWithWarnings.length > 0 && (
            <Collapsible open={warningsExpanded} onOpenChange={setWarningsExpanded}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full py-2 text-left hover:bg-muted/50 rounded px-2 -mx-2"
                >
                  {warningsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-600">
                    {t('manifests.list.batchValidationResults.hasWarnings', {
                      count: manifestsWithWarnings.length,
                    })}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1 border-l-2 border-yellow-500/30 pl-4 ml-2">
                  {manifestsWithWarnings.map((manifest) => (
                    <div
                      key={manifest.id}
                      className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{manifest.filename}</span>
                        {manifest.warningCount !== undefined && manifest.warningCount > 0 && (
                          <span className="text-xs text-yellow-600">
                            ({manifest.warningCount})
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewManifest(manifest.id)}
                      >
                        {t('common.view')}
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Manifests that failed validation */}
          {manifestsFailed.length > 0 && (
            <Collapsible open={failedExpanded} onOpenChange={setFailedExpanded}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full py-2 text-left hover:bg-muted/50 rounded px-2 -mx-2"
                >
                  {failedExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">
                    {t('manifests.list.batchValidationResults.failed', {
                      count: manifestsFailed.length,
                    })}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1 border-l-2 border-muted-foreground/30 pl-4 ml-2">
                  {manifestsFailed.map((manifest) => (
                    <div
                      key={manifest.id}
                      className="py-2 px-2 hover:bg-muted/50 rounded"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{manifest.filename}</span>
                      </div>
                      {manifest.error && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {manifest.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Manifests that passed */}
          {manifestsPassed.length > 0 && (
            <Collapsible open={passedExpanded} onOpenChange={setPassedExpanded}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full py-2 text-left hover:bg-muted/50 rounded px-2 -mx-2"
                >
                  {passedExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">
                    {t('manifests.list.batchValidationResults.passed', {
                      count: manifestsPassed.length,
                    })}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1 border-l-2 border-green-500/30 pl-4 ml-2 max-h-48 overflow-y-auto">
                  {manifestsPassed.map((manifest) => (
                    <div
                      key={manifest.id}
                      className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded"
                    >
                      <span className="truncate">{manifest.filename}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewManifest(manifest.id)}
                      >
                        {t('common.view')}
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
