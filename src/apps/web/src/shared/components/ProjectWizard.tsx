import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/api/client';
import { CreateProjectDto } from '@/api/projects';
import { useModels } from '@/shared/hooks/use-models';
import { useExtractors } from '@/shared/hooks/use-extractors';
import { useProjects } from '@/shared/hooks/use-projects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

export type ProjectWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: number) => void;
};

export function ProjectWizard({ isOpen, onClose, onCreated }: ProjectWizardProps) {
  const { createProject } = useProjects();
  const { extractors } = useExtractors();
  const { models: llmModels } = useModels({ category: 'llm' });
  const [name, setName] = useState('');
  const [textExtractorId, setTextExtractorId] = useState('');
  const [llmModelId, setLlmModelId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setTextExtractorId('');
    setLlmModelId('');
    setError(null);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!onCreated) return;
    const trimmedName = name.trim();
    if (!trimmedName || !llmModelId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreateProjectDto = {
        name: trimmedName,
        textExtractorId,
        llmModelId,
      };
      const project = await createProject(payload);
      onCreated(project.id);
      resetForm();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to create project.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = name.trim().length > 0 && textExtractorId && llmModelId;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Quick Create Project</DialogTitle>
          <DialogDescription>
            Create a project with a name, text extractor, and LLM model. Configure schema, rules, and scripts later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-foreground">
              Project Name *
            </label>
            <Input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1"
              placeholder="Invoice Extraction Project"
              required
            />
          </div>
          <div>
            <label htmlFor="text-extractor" className="block text-sm font-medium text-foreground">
              Text Extractor *
            </label>
            <Select value={textExtractorId} onValueChange={setTextExtractorId}>
              <SelectTrigger id="text-extractor" className="mt-1">
                <SelectValue placeholder="Select text extractor..." />
              </SelectTrigger>
              <SelectContent>
                {extractors.map((extractor) => (
                  <SelectItem key={extractor.id} value={extractor.id}>
                    {extractor.name} {extractor.isActive ? '' : '(Inactive)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="llm-model" className="block text-sm font-medium text-foreground">
              LLM Model *
            </label>
            <Select value={llmModelId} onValueChange={setLlmModelId}>
              <SelectTrigger id="llm-model" className="mt-1">
                <SelectValue placeholder="Select LLM model..." />
              </SelectTrigger>
              <SelectContent>
                {llmModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} {model.isActive ? '' : '(Inactive)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}




