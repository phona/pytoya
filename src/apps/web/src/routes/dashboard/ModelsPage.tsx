import { useMemo, useState } from 'react';
import { getApiErrorText } from '@/api/client';
import { AdapterSchema, CreateModelDto, Model, UpdateModelDto } from '@/api/models';
import { ModelCard } from '@/shared/components/ModelCard';
import { ModelForm } from '@/shared/components/ModelForm';
import { getAdapterByType, useModelAdapters, useModelMutations, useModels } from '@/shared/hooks/use-models';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useI18n } from '@/shared/providers/I18nProvider';

export function ModelsPage() {
  const { confirm, alert, ModalDialog } = useModalDialog();
  const { t } = useI18n();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [selectedAdapterType, setSelectedAdapterType] = useState<string>('');
  const [createStep, setCreateStep] = useState<'select' | 'form'>('select');
  const [testingId, setTestingId] = useState<string | null>(null);

  const { models, isLoading } = useModels();
  const { adapters, isLoading: adaptersLoading } = useModelAdapters();
  const { createModel, updateModel, deleteModel, testModel, isCreating, isUpdating } =
    useModelMutations();

  const availableAdapters = useMemo(
    () => adapters.filter((adapter) => adapter.category === 'llm'),
    [adapters],
  );

  const filteredModels = useMemo(
    () => models.filter((model) => model.category === 'llm'),
    [models],
  );

  const activeAdapter: AdapterSchema | undefined = useMemo(() => {
    if (editingModel) {
      return getAdapterByType(adapters, editingModel.adapterType);
    }
    return getAdapterByType(adapters, selectedAdapterType);
  }, [adapters, editingModel, selectedAdapterType]);

  const openCreateForm = () => {
    setEditingModel(null);
    setSelectedAdapterType(availableAdapters[0]?.type ?? '');
    setCreateStep('select');
    setIsDialogOpen(true);
  };

  const handleCreate = async (data: CreateModelDto) => {
    await createModel(data);
    setIsDialogOpen(false);
  };

  const handleUpdate = async (data: UpdateModelDto) => {
    if (!editingModel) return;
    await updateModel({ id: editingModel.id, data });
    setEditingModel(null);
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t('models.deleteTitle'),
      message: t('models.deleteMessage'),
      confirmText: t('common.delete'),
      destructive: true,
    });
    if (!confirmed) return;
    await deleteModel(id);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testModel(id);
      void alert({ title: 'Model test', message: result.message });
    } catch (error) {
      void alert({
        title: 'Model test failed',
        message: getApiErrorText(error, t),
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleFormSubmit = async (data: CreateModelDto | UpdateModelDto) => {
    if (editingModel) {
      await handleUpdate(data as UpdateModelDto);
    } else {
      await handleCreate(data as CreateModelDto);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('models.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('models.count', {
                count: filteredModels.length,
                plural: filteredModels.length === 1 ? '' : 's',
              })}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('models.subtitle')}
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreateForm}
          >
            {t('models.new')}
          </Button>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingModel(null);
              setCreateStep('select');
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingModel
                  ? t('models.dialog.edit')
                  : createStep === 'select'
                  ? t('models.dialog.chooseType')
                  : t('models.dialog.configure')}
              </DialogTitle>
              <DialogDescription>
                {editingModel
                  ? t('models.dialog.descEdit')
                  : t('models.dialog.descCreate')}
              </DialogDescription>
            </DialogHeader>
            {!editingModel && createStep === 'select' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="adapterType" className="block text-sm font-medium text-foreground">
                    {t('models.adapterType')}
                  </label>
                  <select
                    id="adapterType"
                    value={selectedAdapterType}
                    onChange={(e) => setSelectedAdapterType(e.target.value)}
                    className="mt-1 block w-full max-w-md rounded-md border border-border px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
                  >
                    {availableAdapters.map((adapter) => (
                      <option key={adapter.type} value={adapter.type}>
                        {adapter.name}
                      </option>
                    ))}
                  </select>
                  {activeAdapter && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {activeAdapter.description}
                    </p>
                  )}
                </div>
                <DialogFooter className="gap-3 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingModel(null);
                    }}
                  >
                    {t('models.cancel')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCreateStep('form')}
                    disabled={!selectedAdapterType}
                  >
                    {t('models.next')}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {(editingModel || createStep === 'form') && (
              <div className="space-y-4">
                {!editingModel && (
                  <div className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground">
                    <span>
                      {t('models.adapterTypeLine', {
                        name: activeAdapter?.name ?? t('models.unknown'),
                      })}
                    </span>
                    <Button
                      type="button"
                      onClick={() => setCreateStep('select')}
                      variant="link"
                      size="sm"
                      className="px-0 text-primary hover:text-primary"
                    >
                      {t('models.change')}
                    </Button>
                  </div>
                )}

                {activeAdapter && (
                  <ModelForm
                    key={`${editingModel?.id ?? 'new'}-${activeAdapter.type}`}
                    adapter={activeAdapter}
                    model={editingModel ?? undefined}
                    onSubmit={handleFormSubmit}
                    onCancel={() => {
                      setIsDialogOpen(false);
                      setEditingModel(null);
                      setCreateStep('select');
                    }}
                    isLoading={isCreating || isUpdating}
                  />
                )}
                {!activeAdapter && !adaptersLoading && (
                  <div className="text-sm text-muted-foreground">{t('models.noAdapter')}</div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

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
        ) : filteredModels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            {t('models.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                onEdit={(selected) => {
                  setEditingModel(selected);
                  setSelectedAdapterType(selected.adapterType);
                  setCreateStep('form');
                  setIsDialogOpen(true);
                }}
                onDelete={handleDelete}
                onTest={handleTest}
                isTesting={testingId === model.id}
              />
            ))}
          </div>
        )}
      </div>

      <ModalDialog />
    </div>
  );
}




