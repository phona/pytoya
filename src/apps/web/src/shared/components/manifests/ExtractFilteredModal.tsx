import { useState } from 'react';
import { manifestsApi } from '@/api/manifests';
import { useExtractors } from '@/shared/hooks/use-extractors';
import { useI18n } from '@/shared/providers/I18nProvider';
import { useJobsStore } from '@/shared/stores/jobs';
import { useUiStore } from '@/shared/stores/ui';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Separator } from '@/shared/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import type { ManifestFilterValues, ManifestSort } from '@/shared/types/manifests';

type ExtractScope = 'selected' | 'filtered';

const buildDynamicFieldFilters = (filters: ManifestFilterValues, sort: ManifestSort) => {
  const filter: Record<string, string> = {};
  for (const entry of filters.dynamicFilters ?? []) {
    const field = entry.field?.trim();
    const value = entry.value?.trim();
    if (field && value) {
      filter[field] = value;
    }
  }

  return {
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    sortBy: sort.field || undefined,
    order: sort.order || undefined,
    status: filters.status || undefined,
    humanVerified: filters.humanVerified,
    confidenceMin: filters.confidenceMin,
    confidenceMax: filters.confidenceMax,
    ocrQualityMin: filters.ocrQualityMin,
    ocrQualityMax: filters.ocrQualityMax,
    extractionStatus: filters.extractionStatus,
    costMin: filters.costMin,
    costMax: filters.costMax,
    textExtractorId: filters.textExtractorId,
    extractorType: filters.extractorType,
  };
};

const seedJobs = (jobs: Array<{ jobId: string; manifestId: number }>) => {
  const now = new Date().toISOString();
  const store = useJobsStore.getState();
  for (const job of jobs) {
    store.upsertJob({
      id: job.jobId,
      kind: 'extraction',
      manifestId: job.manifestId,
      status: 'waiting',
      progress: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
  }
};

export function ExtractFilteredModal({
  open,
  onClose,
  groupId,
  totalManifests,
  selectedManifestIds,
  filters,
  sort,
}: {
  open: boolean;
  onClose: () => void;
  groupId: number;
  totalManifests: number;
  selectedManifestIds: number[];
  filters: ManifestFilterValues;
  sort: ManifestSort;
}) {
  const { t } = useI18n();
  const { extractors } = useExtractors();

  const hasSelection = selectedManifestIds.length > 0;
  const defaultScope: ExtractScope = 'filtered';

  const [scope, setScope] = useState<ExtractScope>(defaultScope);
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [includeProcessing, setIncludeProcessing] = useState(false);
  const [overrideTextExtractorId, setOverrideTextExtractorId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const resolvedScope: ExtractScope = hasSelection ? scope : 'filtered';
  const extractorOverrideValue = overrideTextExtractorId || '__none__';

  const manifestCount =
    resolvedScope === 'selected' ? selectedManifestIds.length : totalManifests;

  const canStart = manifestCount > 0 && !isRunning;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (!isRunning) {
        onClose();
      }
      return;
    }

    setScope(defaultScope);
    setIncludeCompleted(false);
    setIncludeProcessing(false);
    setOverrideTextExtractorId('');
    setErrorMessage(null);
  };

  const handleStart = async () => {
    if (!canStart) return;

    setIsRunning(true);
    setErrorMessage(null);
    try {
      if (resolvedScope === 'selected') {
        const response = await manifestsApi.extractBulk({
          manifestIds: selectedManifestIds,
        });
        if (response.jobs?.length) {
          seedJobs(response.jobs);
        }
        useUiStore.getState().setJobsPanelOpen(true);
        onClose();
        return;
      }

      const response = await manifestsApi.extractFiltered(groupId, {
        filters: buildDynamicFieldFilters(filters, sort),
        behavior: { includeCompleted, includeProcessing },
        textExtractorId: overrideTextExtractorId || undefined,
      });
      if (response.jobs?.length) {
        seedJobs(response.jobs);
      }
      useUiStore.getState().setJobsPanelOpen(true);
      onClose();
    } catch (error) {
      console.error('Start extraction failed:', error);
      setErrorMessage(t('errors.generic'));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('manifests.extractModal.title')}</DialogTitle>
          <DialogDescription>{t('manifests.extractModal.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">
              {t('manifests.extractModal.scopeTitle')}
            </div>
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-start gap-2 text-sm">
                <input
                  id="extract-scope-selected"
                  type="radio"
                  name="extract-scope"
                  value="selected"
                  checked={resolvedScope === 'selected'}
                  disabled={!hasSelection}
                  onChange={() => setScope('selected')}
                />
                <label htmlFor="extract-scope-selected" className="min-w-0 cursor-pointer">
                  <div className="font-medium">
                    {t('manifests.extractModal.scopeSelected', { count: selectedManifestIds.length })}
                  </div>
                  {!hasSelection ? (
                    <div className="text-xs text-muted-foreground">{t('manifests.extractModal.noSelection')}</div>
                  ) : null}
                </label>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <input
                  id="extract-scope-filtered"
                  type="radio"
                  name="extract-scope"
                  value="filtered"
                  checked={resolvedScope === 'filtered'}
                  onChange={() => setScope('filtered')}
                />
                <label htmlFor="extract-scope-filtered" className="min-w-0 cursor-pointer">
                  <div className="font-medium">
                    {t('manifests.extractModal.scopeFiltered', { count: totalManifests })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('manifests.extractModal.scopeFilteredHint')}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {resolvedScope === 'filtered' ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t('manifests.extractModal.behaviorTitle')}</div>
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="extract-include-completed"
                    checked={includeCompleted}
                    onCheckedChange={(next) => setIncludeCompleted(Boolean(next))}
                  />
                  <label htmlFor="extract-include-completed">{t('manifests.extractModal.includeCompleted')}</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="extract-include-processing"
                    checked={includeProcessing}
                    onCheckedChange={(next) => setIncludeProcessing(Boolean(next))}
                  />
                  <label htmlFor="extract-include-processing">{t('manifests.extractModal.includeProcessing')}</label>
                </div>
              </div>
            </div>
          ) : null}

          <Separator />

          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">{t('manifests.extractModal.settingsTitle')}</div>

            {resolvedScope === 'filtered' ? (
              <div className="space-y-2">
                <Label htmlFor="extract-text-extractor">{t('manifests.extractModal.extractorOverrideLabel')}</Label>
                <Select
                  value={extractorOverrideValue}
                  onValueChange={(value) => setOverrideTextExtractorId(value === '__none__' ? '' : value)}
                >
                  <SelectTrigger id="extract-text-extractor">
                    <SelectValue placeholder={t('manifests.extractModal.extractorOverridePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('manifests.extractModal.extractorOverrideNone')}</SelectItem>
                    {extractors.map((extractor) => (
                      <SelectItem key={extractor.id} value={extractor.id}>
                        {extractor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-destructive bg-destructive/5 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            {t('manifests.extractModal.notice')}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isRunning}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleStart()} disabled={!canStart}>
              {isRunning ? t('manifests.extractModal.starting') : t('manifests.extractModal.start')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
