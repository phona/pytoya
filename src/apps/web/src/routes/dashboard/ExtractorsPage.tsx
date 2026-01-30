import { useMemo, useState } from 'react';
import { getApiErrorText } from '@/api/client';
import { CreateExtractorDto, UpdateExtractorDto, ExtractorCostSummary, extractorsApi } from '@/api/extractors';
import { CostDashboardWidget } from '@/shared/components/CostDashboardWidget';
import { ExtractorFormDialog } from '@/shared/components/ExtractorFormDialog';
import { ExtractorCard } from '@/shared/components/ExtractorCard';
import { useExtractors, useExtractorMutations, useExtractorPresets, useExtractorTypes } from '@/shared/hooks/use-extractors';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useI18n } from '@/shared/providers/I18nProvider';

export function ExtractorsPage() {
  const { confirm, alert, ModalDialog } = useModalDialog();
  const { t } = useI18n();
  const { extractors, isLoading, error } = useExtractors();
  const { types } = useExtractorTypes();
  const { presets } = useExtractorPresets();
  const {
    createExtractor,
    updateExtractor,
    deleteExtractor,
    testExtractor,
    isCreating,
    isUpdating,
    isTesting,
  } = useExtractorMutations();

  const [search, setSearch] = useState('');
  const [editingExtractor, setEditingExtractor] = useState<null | (typeof extractors)[number]>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const costSummariesQuery = useQuery({
    queryKey: ['extractor-cost-summaries', extractors.map((extractor) => extractor.id)],
    queryFn: async () => {
      return extractorsApi.getCostSummaries(extractors.map((extractor) => extractor.id));
    },
    enabled: extractors.length > 0,
  });

  const costSummaryMap = useMemo(() => {
    const map: Record<string, ExtractorCostSummary> = {};
    costSummariesQuery.data?.forEach((summary) => {
      map[summary.extractorId] = summary;
    });
    return map;
  }, [costSummariesQuery.data]);

  const filteredExtractors = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return extractors;
    return extractors.filter((extractor) =>
      extractor.name.toLowerCase().includes(term) ||
      (extractor.description ?? '').toLowerCase().includes(term),
    );
  }, [extractors, search]);

  const openCreate = () => {
    setEditingExtractor(null);
    setDialogOpen(true);
  };

  const handleSave = async (data: CreateExtractorDto | UpdateExtractorDto) => {
    if (editingExtractor) {
      await updateExtractor({ id: editingExtractor.id, data });
    } else {
      await createExtractor(data as CreateExtractorDto);
    }
    setDialogOpen(false);
    setEditingExtractor(null);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t('extractors.deleteTitle'),
      message: t('extractors.deleteMessage'),
      confirmText: t('common.delete'),
      destructive: true,
    });
    if (!confirmed) return;
    await deleteExtractor(id);
  };

  const handleTest = async (id: string) => {
    try {
      const result = await testExtractor(id);
      void alert({ title: 'Extractor test', message: result.message });
    } catch (error) {
      void alert({
        title: 'Extractor test failed',
        message: getApiErrorText(error, t),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('extractors.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('extractors.count', {
                count: filteredExtractors.length,
                plural: filteredExtractors.length === 1 ? '' : 's',
              })}
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            {t('extractors.new')}
          </Button>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('extractors.searchPlaceholder')}
            className="max-w-sm"
          />
        </div>

        <div className="mb-6">
          <CostDashboardWidget mode="text" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-4 h-4 w-20" />
                <Skeleton className="mt-2 h-3 w-40" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-sm text-destructive">
            <div className="font-semibold">{t('extractors.loadErrorTitle')}</div>
            <p className="mt-1">{getApiErrorText(error, t)}</p>
          </div>
        ) : filteredExtractors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            {t('extractors.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredExtractors.map((extractor) => (
              <ExtractorCard
                key={extractor.id}
                extractor={extractor}
                costSummary={costSummaryMap[extractor.id]}
                onEdit={(selected) => {
                  setEditingExtractor(selected);
                  setDialogOpen(true);
                }}
                onDelete={handleDelete}
                onTest={handleTest}
                isTesting={isTesting}
              />
            ))}
          </div>
        )}
      </div>

      <ExtractorFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingExtractor(null);
          }
        }}
        extractor={editingExtractor ?? undefined}
        types={types}
        presets={presets}
        onSubmit={handleSave}
        onTest={editingExtractor ? handleTest : undefined}
        isSaving={isCreating || isUpdating}
        isTesting={isTesting}
      />

      <ModalDialog />
    </div>
  );
}
