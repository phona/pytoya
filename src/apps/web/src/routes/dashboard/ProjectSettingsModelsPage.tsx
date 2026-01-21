import { useEffect, useState } from 'react';
import { Cpu, PencilLine } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';

export function ProjectSettingsModelsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const projectId = Number(params.id);
  const { project, isLoading } = useProject(projectId);
  const { updateProject } = useProjects();
  const { models: llmModels } = useModels({ category: 'llm' });

  const [isEditing, setIsEditing] = useState(false);
  const [llmModelId, setLlmModelId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!project) return;
    setLlmModelId(project.llmModelId ?? '');
  }, [project]);

  const handleSave = async () => {
    if (!project || !llmModelId) return;
    setIsSaving(true);
    await updateProject({
      id: project.id,
      data: {
        llmModelId,
      },
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  const activeLlmModel = llmModels.find((model) => model.id === project?.llmModelId);

  return (
    <ProjectSettingsShell projectId={projectId} activeTab="models">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        </div>
      ) : !project ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <h2 className="text-xl font-medium text-foreground">Project not found</h2>
            <Button type="button" variant="ghost" onClick={() => navigate('/projects')} className="mt-4">
              Back to Projects
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Model Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update the LLM model used for structured extraction.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Text extraction is configured in the Extractors settings.
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
            </CardContent>
          </Card>

          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit model settings</DialogTitle>
                <DialogDescription>Choose the LLM model for structured extraction.</DialogDescription>
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
        </>
      )}
    </ProjectSettingsShell>
  );
}




