import { useMemo, useState } from 'react';
import { Package, PencilLine } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject, useProjects } from '@/shared/hooks/use-projects';
import { useExtractors } from '@/shared/hooks/use-extractors';
import { useExtractorCostSummary } from '@/shared/hooks/use-extractor-costs';
import { ExtractorSelectDialog } from '@/shared/components/ExtractorSelectDialog';
import { ExtractorCostSummary } from '@/shared/components/ExtractorCostSummary';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';

export function ProjectSettingsExtractorsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const projectId = Number(params.id);

  const { project, isLoading } = useProject(projectId);
  const { updateProjectExtractor } = useProjects();
  const { extractors } = useExtractors();
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentExtractor = useMemo(() => {
    if (!project?.textExtractorId) return undefined;
    return extractors.find((extractor) => extractor.id === project.textExtractorId);
  }, [extractors, project?.textExtractorId]);

  const { summary, isLoading: costLoading } = useExtractorCostSummary(currentExtractor?.id);

  const handleSelect = async (extractorId: string) => {
    if (!project) return;
    setIsSaving(true);
    await updateProjectExtractor({ id: project.id, data: { textExtractorId: extractorId } });
    setIsSaving(false);
  };

  return (
    <ProjectSettingsShell projectId={projectId} activeTab="extractors">
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
            <h2 className="text-2xl font-bold text-foreground">Extractor Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select the text extractor used for this project.
            </p>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Current Extractor
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Project ID: {project.id}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setIsSelecting(true)}>
                <PencilLine className="mr-2 h-4 w-4" />
                Change
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Extractor</div>
                <div className="mt-1 text-foreground">
                  {currentExtractor ? currentExtractor.name : 'No extractor selected'}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Type</div>
                <div className="mt-1 text-foreground">
                  {currentExtractor ? currentExtractor.extractorType : 'Unknown'}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
                <div className="mt-1 text-foreground">
                  {currentExtractor ? (currentExtractor.isActive ? 'Active' : 'Inactive') : 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>

          <ExtractorCostSummary summary={costLoading ? undefined : summary} />

          <ExtractorSelectDialog
            open={isSelecting}
            onOpenChange={setIsSelecting}
            extractors={extractors}
            selectedId={project.textExtractorId ?? undefined}
            onConfirm={handleSelect}
          />

          {isSaving && (
            <div className="fixed inset-0 z-[var(--z-index-overlay)] bg-black/30 flex items-center justify-center">
              <div className="rounded-md bg-card px-4 py-2 text-sm text-foreground">
                Saving...
              </div>
            </div>
          )}
        </>
      )}
    </ProjectSettingsShell>
  );
}
