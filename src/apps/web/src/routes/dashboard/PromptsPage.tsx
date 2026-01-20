import { useState, useEffect } from 'react';
import { promptsApi, Prompt, CreatePromptDto, UpdatePromptDto } from '@/api/prompts';
import { PromptEditor } from '@/shared/components/PromptEditor';
import { Button } from '@/shared/components/ui/button';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';

export function PromptsPage() {
  const { confirm, ModalDialog } = useModalDialog();
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
    const confirmed = await confirm({
      title: 'Delete prompt',
      message: 'Delete this prompt?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prompt Templates</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {prompts.length} {prompts.length === 1 ? 'prompt' : 'prompts'}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setShowForm(true);
              setEditingPrompt(null);
            }}
          >
            New Prompt
          </Button>
        </div>

        {(showForm || editingPrompt) && (
          <div className="mb-8 bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
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
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-foreground">{prompt.name}</h3>
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-muted text-foreground">
                    {prompt.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3 font-mono bg-background p-2 rounded">
                  {prompt.content.slice(0, 150)}...
                </p>
                {prompt.variables && prompt.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {prompt.variables.map((v) => (
                        <span key={v} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                          {'{{' + v + '}}'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingPrompt(prompt);
                      setShowForm(true);
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary"
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDelete(prompt.id)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalDialog />
    </div>
  );
}




