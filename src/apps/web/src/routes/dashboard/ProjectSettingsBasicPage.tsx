import { useEffect, useState } from 'react';
import { PencilLine } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';

export function ProjectSettingsBasicPage() {
  const navigate = useNavigate();
  const params = useParams();
  const projectId = Number(params.id);
  const { project, isLoading } = useProject(projectId);
  const { updateProject } = useProjects();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!project) return;
    setName(project.name ?? '');
    setDescription(project.description ?? '');
  }, [project]);

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    await updateProject({
      id: project.id,
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
        llmModelId: project.llmModelId,
      },
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <ProjectSettingsShell projectId={projectId} activeTab="basic">
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
            <h2 className="text-2xl font-bold text-foreground">Basic Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update the project name and description.
            </p>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{project.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Project ID: {project.id}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                <PencilLine className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              {project.description ? (
                <p className="text-sm text-foreground">{project.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description set.</p>
              )}
            </CardContent>
          </Card>

          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit project basics</DialogTitle>
                <DialogDescription>Update the name and description.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium text-foreground">
                    Project Name *
                  </label>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="project-description" className="block text-sm font-medium text-foreground">
                    Description
                  </label>
                  <Textarea
                    id="project-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={!name.trim() || isSaving}>
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




