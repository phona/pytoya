import { useEffect, useState } from 'react';
import { ArrowLeft, Cpu, PencilLine } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useModels } from '@/shared/hooks/use-models';
import { useProject, useProjects } from '@/shared/hooks/use-projects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

export function ProjectSettingsModelsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const projectId = Number(params.id);
  const { project, isLoading } = useProject(projectId);
  const { updateProject } = useProjects();
  const { models: ocrModels } = useModels({ category: 'ocr' });
  const { models: llmModels } = useModels({ category: 'llm' });

  const [isEditing, setIsEditing] = useState(false);
  const [useOcr, setUseOcr] = useState(false);
  const [ocrModelId, setOcrModelId] = useState('');
  const [llmModelId, setLlmModelId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!project) return;
    setUseOcr(Boolean(project.ocrModelId));
    setOcrModelId(project.ocrModelId ?? '');
    setLlmModelId(project.llmModelId ?? '');
  }, [project]);

  const handleSave = async () => {
    if (!project || !llmModelId) return;
    setIsSaving(true);
    await updateProject({
      id: project.id,
      data: {
        llmModelId,
        ocrModelId: useOcr ? ocrModelId || undefined : undefined,
      },
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-foreground">Project not found</h2>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const activeOcrModel = ocrModels.find((model) => model.id === project.ocrModelId);
  const activeLlmModel = llmModels.find((model) => model.id === project.llmModelId);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(`/projects/${projectId}`)}
          className="mb-4 inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Model Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the OCR and LLM models used for extraction.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                Current Models
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Project ID: {project.id}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
              <PencilLine className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">LLM Model</div>
              <div className="mt-1 text-foreground">
                {activeLlmModel ? activeLlmModel.name : 'No LLM model selected'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">OCR Model</div>
              <div className="mt-1 text-foreground">
                {activeOcrModel ? activeOcrModel.name : 'OCR disabled'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit model settings</DialogTitle>
            <DialogDescription>Choose the OCR and LLM models.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="llm-model" className="block text-sm font-medium text-foreground">
                LLM Model *
              </label>
              <Select value={llmModelId || undefined} onValueChange={setLlmModelId}>
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
            <div>
              <label htmlFor="use-ocr" className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  id="use-ocr"
                  checked={useOcr}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setUseOcr(isChecked);
                    if (!isChecked) {
                      setOcrModelId('');
                    }
                  }}
                />
                Use OCR before LLM
              </label>
            </div>
            {useOcr && (
              <div>
                <label htmlFor="ocr-model" className="block text-sm font-medium text-foreground">
                  OCR Model
                </label>
                <Select
                  value={ocrModelId || 'none'}
                  onValueChange={(value) => {
                    setOcrModelId(value === 'none' ? '' : value);
                  }}
                >
                  <SelectTrigger id="ocr-model" className="mt-1">
                    <SelectValue placeholder="Select OCR model..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No OCR model</SelectItem>
                    {ocrModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} {model.isActive ? '' : '(Inactive)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={!llmModelId || isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}




