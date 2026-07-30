import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GripVertical, Plus, PencilLine, Trash2, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';
import { AddExtractorDialog } from '@/shared/components/AddExtractorDialog';
import { useOcrPipeline } from '@/shared/hooks/use-ocr-pipeline';
import { useProject } from '@/shared/hooks/use-projects';
import { useProjectSchemas } from '@/shared/hooks/use-schemas';
import { useI18n } from '@/shared/providers/I18nProvider';
import type { OcrPipelineEntry } from '@/shared/hooks/use-ocr-pipeline';

function ConfigSummary({ config }: { config: Record<string, unknown> }) {
  const entries = Object.entries(config).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return <span className="text-xs text-muted-foreground italic">Default config</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {entries.map(([k, v]) => `${k}: ${v}`).join(' · ')}
    </span>
  );
}

export function ProjectSettingsExtractorsPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const navigate = useNavigate();
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { project } = useProject(projectId);
  const { schemas } = useProjectSchemas(projectId);
  const schemaId = schemas[0]?.id ?? 0;

  const {
    pipeline,
    isDirty,
    extractorInstances,
    instanceMap,
    extractorTypeMap,
    add,
    update,
    remove,
    move,
    save,
    isSaving,
    saveError,
    isLoading,
  } = useOcrPipeline(schemaId);

  const dragRef = useRef<{ from: number } | null>(null);

  const handleConfirmAdd = useCallback(
    (entry: OcrPipelineEntry) => {
      if (editingIndex !== null) {
        update(editingIndex, entry.config);
      } else {
        add(entry);
      }
      setEditingIndex(null);
    },
    [editingIndex, add, update],
  );

  const openEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setDialogOpen(true);
  }, []);

  const editingEntry = useMemo(() => {
    if (editingIndex === null) return null;
    return pipeline[editingIndex] ?? null;
  }, [editingIndex, pipeline]);

  if (!schemaId) {
    return (
      <ProjectSettingsShell projectId={projectId} activeTab="extractors">
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Create a schema first to configure the OCR pipeline.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => navigate(`/projects/${projectId}/settings/schema`)}
          >
            Create Schema
          </Button>
        </div>
      </ProjectSettingsShell>
    );
  }

  return (
    <ProjectSettingsShell projectId={projectId} activeTab="extractors">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">OCR Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Configure which OCR engines run in parallel during extraction.
            Results are merged and sent to the LLM. Order determines priority
            (first = primary). Drag to reorder.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          </div>
        ) : pipeline.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No OCR engines configured.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {pipeline.map((entry, index) => {
              const instance = instanceMap.get(entry.extractorId);
              return (
                <div
                  key={`${entry.extractorId}-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                  draggable
                  onDragStart={() => { dragRef.current = { from: index }; }}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={() => {
                    if (dragRef.current && dragRef.current.from !== index) {
                      move(dragRef.current.from, index);
                      dragRef.current = null;
                    }
                  }}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {instance?.name ?? entry.extractorId.slice(0, 8) + '...'}
                      </span>
                      {instance && (
                        <Badge variant="outline" className="text-xs">
                          {instance.extractorType}
                        </Badge>
                      )}
                    </div>
                    <ConfigSummary config={entry.config} />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(index)}
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit config</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove</TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={() => { setEditingIndex(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add OCR Engine
        </Button>
        <Button type="button" onClick={save} disabled={!isDirty || isSaving || isLoading}>
          {isSaving ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>

      {saveError && (
        <p className="text-sm text-destructive">
          Failed to save: {(saveError as Error).message}
        </p>
      )}

      <AddExtractorDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingIndex(null);
        }}
        extractorInstances={extractorInstances}
        extractorTypeMap={extractorTypeMap}
        onConfirm={handleConfirmAdd}
        initialEntry={editingEntry}
      />
    </ProjectSettingsShell>
  );
}
