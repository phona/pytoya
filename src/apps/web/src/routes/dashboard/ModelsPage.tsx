import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/api/client';
import { AdapterSchema, CreateModelDto, Model, UpdateModelDto } from '@/api/models';
import { ModelCard } from '@/shared/components/ModelCard';
import { ModelForm } from '@/shared/components/ModelForm';
import { getAdapterByType, useModelAdapters, useModelMutations, useModels } from '@/shared/hooks/use-models';

type ModelCategory = 'ocr' | 'llm';

export function ModelsPage() {
  const [activeTab, setActiveTab] = useState<ModelCategory>('ocr');
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [selectedAdapterType, setSelectedAdapterType] = useState<string>('');
  const [testingId, setTestingId] = useState<string | null>(null);

  const { models, isLoading } = useModels();
  const { adapters, isLoading: adaptersLoading } = useModelAdapters();
  const { createModel, updateModel, deleteModel, testModel, isCreating, isUpdating } =
    useModelMutations();

  const availableAdapters = useMemo(
    () => adapters.filter((adapter) => adapter.category === activeTab),
    [adapters, activeTab],
  );

  const filteredModels = useMemo(
    () => models.filter((model) => model.category === activeTab),
    [models, activeTab],
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
    setShowForm(true);
  };

  const handleCreate = async (data: CreateModelDto) => {
    await createModel(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: UpdateModelDto) => {
    if (!editingModel) return;
    await updateModel({ id: editingModel.id, data });
    setEditingModel(null);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this model?')) return;
    await deleteModel(id);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testModel(id);
      alert(result.message);
    } catch (error) {
      alert(getApiErrorMessage(error, 'Connection test failed. Please try again.'));
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Models</h1>
            <p className="mt-1 text-sm text-gray-600">
              {filteredModels.length} {filteredModels.length === 1 ? 'model' : 'models'}
            </p>
          </div>
          <button
            onClick={openCreateForm}
            className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            New Model
          </button>
        </div>

        <div className="mb-6 flex gap-3">
          {(['ocr', 'llm'] as ModelCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveTab(category);
                setEditingModel(null);
                setShowForm(false);
              }}
              className={`rounded-full px-4 py-1 text-sm font-medium ${
                activeTab === category
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {category === 'ocr' ? 'OCR Models' : 'LLM Models'}
            </button>
          ))}
        </div>

        {(showForm || editingModel) && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {editingModel ? 'Edit Model' : 'Create New Model'}
            </h2>

            {!editingModel && (
              <div className="mb-4">
                <label htmlFor="adapterType" className="block text-sm font-medium text-gray-700">
                  Adapter Type
                </label>
                <select
                  id="adapterType"
                  value={selectedAdapterType}
                  onChange={(e) => setSelectedAdapterType(e.target.value)}
                  className="mt-1 block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  {availableAdapters.map((adapter) => (
                    <option key={adapter.type} value={adapter.type}>
                      {adapter.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeAdapter && (
              <ModelForm
                key={`${editingModel?.id ?? 'new'}-${activeAdapter.type}`}
                adapter={activeAdapter}
                model={editingModel ?? undefined}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingModel(null);
                }}
                isLoading={isCreating || isUpdating}
              />
            )}
            {!activeAdapter && !adaptersLoading && (
              <div className="text-sm text-gray-500">No adapter available for this category.</div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            No models configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                onEdit={(selected) => {
                  setEditingModel(selected);
                  setShowForm(true);
                }}
                onDelete={handleDelete}
                onTest={handleTest}
                isTesting={testingId === model.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
