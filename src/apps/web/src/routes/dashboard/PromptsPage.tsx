import { useState, useEffect } from 'react';
import { promptsApi, Prompt, CreatePromptDto, UpdatePromptDto } from '@/api/prompts';
import { PromptEditor } from '@/shared/components/PromptEditor';

export function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const data = await promptsApi.listPrompts();
      setPrompts(data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const handleCreate = async (data: CreatePromptDto) => {
    setIsSaving(true);
    try {
      await promptsApi.createPrompt(data);
      setShowForm(false);
      loadPrompts();
    } catch (error) {
      console.error('Failed to create prompt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: UpdatePromptDto) => {
    if (!editingPrompt) return;
    setIsSaving(true);
    try {
      await promptsApi.updatePrompt(editingPrompt.id, data);
      setEditingPrompt(null);
      setShowForm(false);
      loadPrompts();
    } catch (error) {
      console.error('Failed to update prompt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this prompt?')) return;
    try {
      await promptsApi.deletePrompt(id);
      loadPrompts();
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    }
  };

  const handleFormSubmit = async (data: CreatePromptDto | UpdatePromptDto) => {
    if (editingPrompt) {
      await handleUpdate(data as UpdatePromptDto);
    } else {
      await handleCreate(data as CreatePromptDto);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prompt Templates</h1>
            <p className="mt-1 text-sm text-gray-600">
              {prompts.length} {prompts.length === 1 ? 'prompt' : 'prompts'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingPrompt(null);
            }}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            New Prompt
          </button>
        </div>

        {(showForm || editingPrompt) && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
            </h2>
            <PromptEditor
              prompt={editingPrompt ?? undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingPrompt(null);
              }}
              isLoading={isSaving}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{prompt.name}</h3>
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    {prompt.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3 font-mono bg-gray-50 p-2 rounded">
                  {prompt.content.slice(0, 150)}...
                </p>
                {prompt.variables && prompt.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {prompt.variables.map((v) => (
                        <span key={v} className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded">
                          {'{{' + v + '}}'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingPrompt(prompt);
                      setShowForm(true);
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(prompt.id)}
                    className="text-sm text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
