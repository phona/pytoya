import { useEffect, useMemo, useState } from 'react';
import { manifestsApi, type Manifest } from '@/api/manifests';
import { useI18n } from '@/shared/providers/I18nProvider';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import type { ManifestFilterValues, ManifestSort } from '@/shared/types/manifests';

type Scope = 'selected' | 'filtered';
type ExportFormat = 'csv' | 'xlsx';

const MAX_FILTERED_SCOPE = 5000;
const API_MAX_PAGE_SIZE = 200;

type Eligibility = {
  hint: string;
  isEligible: (manifest: Manifest) => boolean;
};

export function ManifestBatchScopeModal({
  open,
  onClose,
  title,
  subtitle,
  startLabel,
  startVariant,
  notice,
  filteredScopeEnabled,
  filteredScopeDisabledHint,
  groupId,
  filters,
  sort,
  selectedManifests,
  eligibility,
  formatOptions,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  startLabel: string;
  startVariant?: 'default' | 'destructive';
  notice?: string;
  filteredScopeEnabled?: boolean;
  filteredScopeDisabledHint?: string;
  groupId: number;
  filters: ManifestFilterValues;
  sort: ManifestSort;
  selectedManifests: Manifest[];
  eligibility?: Eligibility;
  formatOptions?: {
    defaultFormat?: ExportFormat;
  };
  onStart: (manifestIds: number[], scope: Scope, format?: ExportFormat) => Promise<void>;
}) {
  const { t } = useI18n();
  const hasSelection = selectedManifests.length > 0;
  const resolvedStartVariant = startVariant ?? 'default';
  const isFilteredScopeEnabled = filteredScopeEnabled !== false;
  const isFormatEnabled = Boolean(formatOptions);

  const [scope, setScope] = useState<Scope>('filtered');
  const [format, setFormat] = useState<ExportFormat>(formatOptions?.defaultFormat ?? 'csv');
  const [filteredManifests, setFilteredManifests] = useState<Manifest[]>([]);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [isLoadingFiltered, setIsLoadingFiltered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScope(isFilteredScopeEnabled ? 'filtered' : 'selected');
    setFormat(formatOptions?.defaultFormat ?? 'csv');
    setError(null);
    setIsRunning(false);
  }, [formatOptions?.defaultFormat, isFilteredScopeEnabled, open]);

  useEffect(() => {
    if (!open) return;
    if (!isFilteredScopeEnabled) {
      setFilteredManifests([]);
      setFilteredCount(null);
      setIsLoadingFiltered(false);
      setError(null);
      return;
    }

    const run = async () => {
      setIsLoadingFiltered(true);
      setError(null);
      try {
        const first = await manifestsApi.listManifests(groupId, {
          filters,
          sort,
          page: 1,
          pageSize: API_MAX_PAGE_SIZE,
        });

        const total = first.meta.total ?? first.data.length;
        setFilteredCount(total);

        if (total > MAX_FILTERED_SCOPE) {
          setFilteredManifests([]);
          setError(t('manifests.batchAction.tooMany', { count: total }));
          return;
        }

        const pages = total > 0 ? Math.ceil(total / API_MAX_PAGE_SIZE) : 0;
        const all: Manifest[] = [...first.data];
        for (let page = 2; page <= pages; page++) {
          const next = await manifestsApi.listManifests(groupId, {
            filters,
            sort,
            page,
            pageSize: API_MAX_PAGE_SIZE,
          });
          all.push(...next.data);
          if (all.length >= total) break;
        }

        setFilteredManifests(all);
      } catch (e) {
        console.error('Failed to load filtered manifests for batch action:', e);
        setFilteredManifests([]);
        setFilteredCount(null);
        setError(t('errors.generic'));
      } finally {
        setIsLoadingFiltered(false);
      }
    };

    void run();
  }, [filters, groupId, isFilteredScopeEnabled, open, sort, t]);

  const scopeManifests = scope === 'selected' ? selectedManifests : filteredManifests;
  const scopeCount = scope === 'selected' ? selectedManifests.length : filteredCount;

  const eligibleIds = useMemo(() => {
    if (!eligibility) return scopeManifests.map((m) => m.id);
    return scopeManifests.filter(eligibility.isEligible).map((m) => m.id);
  }, [eligibility, scopeManifests]);

  const eligibleCount = eligibleIds.length;

  const canStart =
    !isRunning &&
    !isLoadingFiltered &&
    !error &&
    (scope !== 'filtered' || isFilteredScopeEnabled) &&
    (scope !== 'selected' || hasSelection) &&
    eligibleCount > 0 &&
    (scope !== 'filtered' || (filteredCount ?? 0) > 0);

  const handleStart = async () => {
    if (!canStart) return;
    setIsRunning(true);
    setError(null);
    try {
      await onStart(eligibleIds, scope, isFormatEnabled ? format : undefined);
      onClose();
    } catch (e) {
      console.error('Batch action failed:', e);
      if (e instanceof Error && e.message.trim()) {
        setError(e.message);
      } else {
        setError(t('errors.generic'));
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isRunning && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{t('manifests.extractModal.scopeTitle')}</div>
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-start gap-2 text-sm">
                <input
                  id="batch-scope-filtered"
                  type="radio"
                  name="batch-scope"
                  value="filtered"
                  checked={scope === 'filtered'}
                  disabled={!isFilteredScopeEnabled}
                  onChange={() => setScope('filtered')}
                />
                <label htmlFor="batch-scope-filtered" className="min-w-0 cursor-pointer">
                  <div className="font-medium">
                    {t('manifests.extractModal.scopeFiltered', { count: filteredCount ?? 0 })}
                  </div>
                  {isFilteredScopeEnabled ? (
                    <div className="text-muted-foreground">{t('manifests.extractModal.scopeFilteredHint')}</div>
                  ) : filteredScopeDisabledHint ? (
                    <div className="text-muted-foreground">{filteredScopeDisabledHint}</div>
                  ) : null}
                </label>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <input
                  id="batch-scope-selected"
                  type="radio"
                  name="batch-scope"
                  value="selected"
                  checked={scope === 'selected'}
                  disabled={!hasSelection}
                  onChange={() => setScope('selected')}
                />
                <label htmlFor="batch-scope-selected" className="min-w-0 cursor-pointer">
                  <div className="font-medium">
                    {t('manifests.extractModal.scopeSelected', { count: selectedManifests.length })}
                  </div>
                  {!hasSelection ? (
                    <div className="text-muted-foreground">{t('manifests.extractModal.noSelection')}</div>
                  ) : null}
                </label>
              </div>
            </div>
          </div>

          {isFormatEnabled ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t('manifests.batchAction.formatTitle')}</div>
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-start gap-2 text-sm">
                  <input
                    id="batch-format-csv"
                    type="radio"
                    name="batch-format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={() => setFormat('csv')}
                  />
                  <label htmlFor="batch-format-csv" className="min-w-0 cursor-pointer">
                    <div className="font-medium">{t('manifests.batchAction.formatCsv')}</div>
                    <div className="text-muted-foreground">{t('manifests.batchAction.formatCsvHint')}</div>
                  </label>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <input
                    id="batch-format-xlsx"
                    type="radio"
                    name="batch-format"
                    value="xlsx"
                    checked={format === 'xlsx'}
                    onChange={() => setFormat('xlsx')}
                  />
                  <label htmlFor="batch-format-xlsx" className="min-w-0 cursor-pointer">
                    <div className="font-medium">{t('manifests.batchAction.formatXlsx')}</div>
                    <div className="text-muted-foreground">{t('manifests.batchAction.formatXlsxHint')}</div>
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-md border border-border bg-background p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('manifests.batchAction.summary.scopeCountLabel')}</span>
              <span className="font-medium">
                {scopeCount === null ? t('common.na') : scopeCount}
              </span>
            </div>
            {eligibility ? (
              <>
                <div className="mt-2 text-muted-foreground">{eligibility.hint}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">{t('manifests.batchAction.summary.eligibleCountLabel')}</span>
                  <span className="font-medium">{eligibleCount}</span>
                </div>
              </>
            ) : null}
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}
          {notice ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {notice}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isRunning}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant={resolvedStartVariant} onClick={handleStart} disabled={!canStart}>
            {isRunning ? t('manifests.batchAction.running') : startLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
