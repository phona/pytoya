# OCR Pipeline UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/projects/:id/settings/extractors` to manage the multi-OCR pipeline (`schema.validationSettings.ocrExtractors[]`), remove deprecated `project.textExtractorId`, and normalize `text`/`markdown` semantics.

**Architecture:** Project settings page fetches extractor instances (`GET /extractors`) for display and selection, extractor types (`GET /extractor-types`) for `configSchema`-driven dynamic forms, and schema's `validationSettings.ocrExtractors` for current config. Save writes back via `PATCH /schemas/:id`. Backend `text-extractor.service.ts` resolves `extractorId` → `ExtractorEntity` to get type + infra config, merged with pipeline-level config.

**Tech Stack:** React 18, TypeScript, TanStack React Query v5, Zustand v5, Radix UI, Tailwind CSS v3, NestJS, TypeORM, PostgreSQL

## Global Constraints

- No new database tables
- All existing extractor types unchanged
- `ExtractorEntity` structure unchanged (still has `extractorType`, `config`, `isActive`)
- `configSchema` from `GET /extractor-types` drives dynamic form rendering
- Save is explicit (no auto-save)
- Admin `/extractors` page (CRUD for ExtractorEntity instances) unchanged

---

### Task 1: Backend — Update `text-extractor.service.ts` to resolve `extractorId`

**Files:**
- Modify: `src/apps/api/src/text-extractor/text-extractor.service.ts`
- Modify: `src/apps/api/src/text-extractor/types/extractor.types.ts`

**Interfaces:**
- Consumes: `ocrExtractors` entries now have `extractorId` (uuid) instead of `type` (string)
- Consumes: `ExtractorEntity` from `extractors` repository
- Produces: `extractMultiple()` resolves `extractorId` → type + infra config, merges pipeline config

**Current state:** `extractMultiple()` uses `type` string to look up extractor class via registry, passes empty `{}` entity config:

```typescript
const instance = this.extractorFactory.createInstance(type, {}, type);
```

**Target state:** `extractMultiple()` resolves each `extractorId` → `ExtractorEntity`, uses `extractorEntity.extractorType` for class lookup, `extractorEntity.config` as infra config, and merges pipeline `config` on top.

- [ ] **Step 1: Add `extractorId` to `OcrExtractorConfig` type**

```typescript
// src/apps/api/src/text-extractor/types/extractor.types.ts

export interface OcrExtractorConfig {
  extractorId: string;
  config?: Record<string, unknown>;
}
```

Remove the old `type` field or keep both during migration.

- [ ] **Step 2: Rewrite `extractMultiple` to resolve extractorId**

```typescript
// src/apps/api/src/text-extractor/text-extractor.service.ts

private async resolveExtractorConfig(extractorId: string): Promise<{
  type: string;
  infraConfig: Record<string, unknown>;
} | null> {
  const entity = await this.extractorRepository.findOne({
    where: { id: extractorId, isActive: true },
  });
  if (!entity) return null;
  return {
    type: entity.extractorType,
    infraConfig: entity.config ?? {},
  };
}

private async runSingleExtractor(
  extractorId: string,
  pipelineConfig: Record<string, unknown> | undefined,
  input: TextExtractionInput,
) {
  const resolved = await this.resolveExtractorConfig(extractorId);
  if (!resolved) return null;

  const extractorClass = this.extractorRegistry.get(resolved.type);
  if (!extractorClass) return null;

  const mergedConfig = {
    ...resolved.infraConfig,
    ...(pipelineConfig ?? {}),
  };

  const instance = this.extractorFactory.createInstance(
    resolved.type,
    resolved.infraConfig,
    extractorId,
  );

  const supportedFormats = extractorClass.metadata.supportedFormats ?? [];
  const shouldConvert =
    input.fileType === FileType.PDF &&
    !supportedFormats.includes('pdf') &&
    supportedFormats.includes('image');

  const pages = shouldConvert
    ? await this.convertPdfToPages(input.filePath)
    : input.pages;

  const result = await instance.extract({
    ...input,
    pages,
    extractorConfig: mergedConfig,
  });

  return { extractorName: resolved.type, result };
}

async extractMultiple(
  ocrExtractors: OcrExtractorConfig[],
  input: TextExtractionInput,
): Promise<{
  extractors: string[];
  result: TextExtractionResult;
}> {
  const extractionResults = await Promise.allSettled(
    ocrExtractors.map((e) =>
      this.runSingleExtractor(e.extractorId, e.config, input),
    ),
  );

  const succeeded = extractionResults
    .filter(
      (r): r is PromiseFulfilledResult<NonNullable<typeof r.value>> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map((r) => r.value);

  if (succeeded.length === 0) {
    throw new BadRequestException('All extractors failed');
  }

  const primary = succeeded[0];
  const mergedMetadata = primary.result.metadata;

  for (let i = 1; i < succeeded.length; i++) {
    const { extractorName, result } = succeeded[i];
    const ocrResult = result.metadata?.ocrResult;
    if (!ocrResult) continue;

    const delimiter = `\n\n=== Extractor: ${extractorName} ===\n`;
    for (
      let p = 0;
      p < Math.min(
        mergedMetadata.ocrResult.pages.length,
        ocrResult.pages.length,
      );
      p++
    ) {
      mergedMetadata.ocrResult.pages[p].markdown +=
        delimiter + ocrResult.pages[p].markdown;
    }
  }

  // Rebuild text from all extractors after merge
  if (mergedMetadata.ocrResult) {
    for (const page of mergedMetadata.ocrResult.pages) {
      page.text = page.markdown.replace(/=== Extractor:.*?===\n/g, '').trim();
    }
  }

  if (mergedMetadata.qualityScore === undefined) {
    mergedMetadata.qualityScore = calculateOcrQualityScore(
      mergedMetadata.ocrResult,
    );
  }

  return {
    extractors: succeeded.map((s) => s.extractorName),
    result: primary.result,
  };
}
```

- [ ] **Step 3: Inject `ExtractorEntity` repository**

```typescript
// In TextExtractorService constructor, add:
@InjectRepository(ExtractorEntity)
private readonly extractorRepository: Repository<ExtractorEntity>,
```

Also import `ExtractorEntity` and `InjectRepository`.

- [ ] **Step 4: Update extraction.service.ts to validate new format**

```typescript
// src/apps/api/src/extraction/extraction.service.ts
// Where ocrExtractors are read from schema:
const ocrExtractors = (schema?.validationSettings as any)?.ocrExtractors as
  | OcrExtractorConfig[]
  | undefined;

if (!ocrExtractors || ocrExtractors.length === 0) {
  throw new BadRequestException(
    'Schema ocrExtractors required. Run migration to backfill.',
  );
}

// Update manifest.textExtractorId to store the resolved type name
// (already done in existing code)
manifest.textExtractorId = extractors[0] ?? null;
```

- [ ] **Step 5: Update `GET /extractor-types` to return extractorId-suitable data**

Ensure the endpoint still returns `{ type, configSchema, promptContribution }` — no change needed since `configSchema` is per-type, not per-instance.

- [ ] **Step 6: Verify existing tests pass**

```bash
npx jest --testPathPattern="text-extractor" --no-coverage
```

- [ ] **Step 7: Commit**

```bash
git add src/apps/api/src/text-extractor/ src/apps/api/src/extraction/
git commit -m "feat: resolve extractorId in multi-extractor pipeline"
```

---

### Task 2: Backend — Remove `project.textExtractorId`

**Files:**
- Modify: `src/apps/api/src/projects/dto/create-project.dto.ts`
- Modify: `src/apps/api/src/projects/dto/update-project.dto.ts`
- Delete: `src/apps/api/src/projects/dto/update-project-extractor.dto.ts`
- Modify: `src/apps/api/src/projects/dto/project-response.dto.ts`
- Modify: `src/apps/api/src/projects/projects.controller.ts`
- Modify: `src/apps/api/src/projects/projects.service.ts`
- Modify: `src/apps/api/src/manifests/manifests.service.ts`
- Modify: `src/apps/api/src/manifests/manifests.controller.ts`
- Modify: `scripts/migrate-ocr-extractors.ts`

**Interfaces:**
- Consumes: Removes `textExtractorId` from project DTOs
- Consumes: `validationSettings.ocrExtractors[0].extractorId` for OCR preview fallback
- Produces: Cleaner project creation without extractor requirement

- [ ] **Step 1: Remove `textExtractorId` from project DTOs**

```typescript
// create-project.dto.ts — remove textExtractorId field
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
  // textExtractorId removed
  @IsOptional()
  @IsString()
  llmModelId?: string;
}
```

Same for `update-project.dto.ts`. Delete `update-project-extractor.dto.ts` entirely.

In `project-response.dto.ts`, remove `textExtractorId` from the response mapping.

- [ ] **Step 2: Remove endpoint and service methods**

```typescript
// projects.controller.ts — remove:
@Put(':id/extractor')
async updateExtractor(...) { ... }

// projects.service.ts — remove:
async updateExtractor(user, id, textExtractorId) { ... }
async ensureExtractorExists(textExtractorId) { ... }
```

Also remove the `textExtractorId` validation from `ensureDefaultsExist`:

```typescript
// projects.service.ts — in ensureDefaultsExist, remove:
if (!dto.textExtractorId) {
  throw new BadRequestException('textExtractorId is required');
}
```

- [ ] **Step 3: Update OCR preview fallback in manifests.service.ts**

```typescript
// manifests.service.ts — processOcrForManifest method
// Change from:
const extractorId = options.textExtractorId ?? manifest.group?.project?.textExtractorId ?? null;

// To:
const schemaOcrExtractors = (manifest.group?.project?.schemas?.[0]?.validationSettings as any)
  ?.ocrExtractors as Array<{ extractorId: string }> | undefined;
const extractorId = options.textExtractorId ?? schemaOcrExtractors?.[0]?.extractorId ?? null;

if (!extractorId) {
  throw new BadRequestException(
    'No OCR engine configured. Configure the OCR pipeline in project settings.',
  );
}
```

- [ ] **Step 4: Update migration script**

```typescript
// scripts/migrate-ocr-extractors.ts
// Change output format from:
//   { type: entity.extractorType, config: {} }
// To:
//   { extractorId: entity.id, config: {} }
```

- [ ] **Step 5: Run migration and verify**

```bash
npx ts-node scripts/migrate-ocr-extractors.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/apps/api/src/projects/ src/apps/api/src/manifests/ scripts/
git commit -m "refactor: remove project.textExtractorId, use ocrExtractors instead"
```

---

### Task 3: Frontend — Create `JsonSchemaForm` component

**Files:**
- Create: `src/apps/web/src/shared/components/JsonSchemaForm.tsx`

**Interfaces:**
- Consumes: JSON Schema object (`Record<string, unknown>`) of type `{ type: "object", properties: { ... } }`
- Produces: Controlled form with typed values `Record<string, unknown>`

This component renders a form from a JSON Schema `configSchema`. It maps JSON Schema types to HTML inputs.

- [ ] **Step 1: Write the component**

```typescript
// src/apps/web/src/shared/components/JsonSchemaForm.tsx
import { useCallback } from 'react';

interface JsonSchemaFormProps {
  schema: Record<string, unknown>;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
}

type JsonSchemaProperty = {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: string[];
};

export function JsonSchemaForm({ schema, value, onChange, disabled }: JsonSchemaFormProps) {
  const properties = (schema as any)?.properties as Record<string, JsonSchemaProperty> | undefined;
  if (!properties) return <p className="text-xs text-muted-foreground">No configurable parameters</p>;

  const handleChange = useCallback(
    (key: string, newValue: unknown) => {
      onChange({ ...value, [key]: newValue });
    },
    [value, onChange],
  );

  const entries = Object.entries(properties);

  return (
    <div className="space-y-3">
      {entries.map(([key, prop]) => (
        <div key={key} className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            {prop.title ?? key}
            {(schema as any).required?.includes(key) && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </label>
          {prop.description && (
            <p className="text-xs text-muted-foreground">{prop.description}</p>
          )}
          {renderField(key, prop, value[key] ?? prop.default, (v) => handleChange(key, v), disabled)}
        </div>
      ))}
    </div>
  );
}

function renderField(
  key: string,
  prop: JsonSchemaProperty,
  value: unknown,
  onChange: (v: unknown) => void,
  disabled?: boolean,
) {
  const baseClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';

  if (prop.enum && prop.type === 'string') {
    return (
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={baseClass}
      >
        {prop.enum.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (prop.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="rounded border-border"
      />
    );
  }

  if (prop.type === 'number' || prop.type === 'integer') {
    return (
      <input
        type="number"
        value={value as number ?? ''}
        onChange={(e) => {
          const v = e.target.value === '' ? undefined : Number(e.target.value);
          onChange(v);
        }}
        min={prop.minimum}
        max={prop.maximum}
        disabled={disabled}
        className={baseClass}
      />
    );
  }

  // Default: string
  return (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={baseClass}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/web/src/shared/components/JsonSchemaForm.tsx
git commit -m "feat(web): add JsonSchemaForm component for dynamic config forms"
```

---

### Task 4: Frontend — Create `useOcrPipeline` hook

**Files:**
- Create: `src/apps/web/src/shared/hooks/use-ocr-pipeline.ts`

**Interfaces:**
- Consumes: `PATCH /schemas/:id`, `GET /extractor-types`, `GET /extractors`, `GET /schemas/:id`
- Produces: `{ pipeline, extractorInstances, extractorTypeMap, add, update, remove, move, save, isSaving, isDirty }`

- [ ] **Step 1: Write the hook**

```typescript
// src/apps/web/src/shared/hooks/use-ocr-pipeline.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { schemasApi } from '@/api/schemas';
import { extractorsApi } from '@/api/extractors';
import { apiClient } from '@/api/client';

export interface OcrPipelineEntry {
  extractorId: string;
  config: Record<string, unknown>;
}

export interface ExtractorTypeInfo {
  type: string;
  configSchema: Record<string, unknown>;
  promptContribution: string;
}

export function useOcrPipeline(schemaId: number) {
  const queryClient = useQueryClient();
  const [draftPipeline, setDraftPipeline] = useState<OcrPipelineEntry[] | null>(null);

  // Load schema for current ocrExtractors
  const { data: schema, isLoading: schemaLoading } = useQuery({
    queryKey: ['schema', schemaId],
    queryFn: () => schemasApi.getSchema(schemaId),
    enabled: !!schemaId,
  });

  // Load extractor instances for display names + add dialog
  const { data: instances = [], isLoading: instancesLoading } = useQuery({
    queryKey: ['extractors'],
    queryFn: () => extractorsApi.listExtractors({ isActive: true }),
  });

  // Load extractor types for configSchema lookup
  const { data: typeInfos = [] } = useQuery({
    queryKey: ['extractor-types-info'],
    queryFn: async () => {
      const res = await apiClient.get<ExtractorTypeInfo[]>('/extractor-types');
      return res.data;
    },
  });

  const savedPipeline = useMemo(() => {
    const raw = (schema?.validationSettings as any)?.ocrExtractors as OcrPipelineEntry[] | undefined;
    return raw ?? [];
  }, [schema?.validationSettings]);

  const pipeline = draftPipeline ?? savedPipeline;
  const isDirty = draftPipeline !== null;

  const extractorTypeMap = useMemo(() => {
    const map = new Map<string, ExtractorTypeInfo>();
    for (const info of typeInfos) map.set(info.type, info);
    return map;
  }, [typeInfos]);

  const instanceMap = useMemo(() => {
    const map = new Map<string, typeof instances[0]>();
    for (const inst of instances) map.set(inst.id, inst);
    return map;
  }, [instances]);

  const add = useCallback((entry: OcrPipelineEntry) => {
    setDraftPipeline((prev) => {
      const base = prev ?? savedPipeline;
      return [...base, entry];
    });
  }, [savedPipeline]);

  const update = useCallback((index: number, config: Record<string, unknown>) => {
    setDraftPipeline((prev) => {
      const base = prev ?? savedPipeline;
      const next = [...base];
      next[index] = { ...next[index], config };
      return next;
    });
  }, [savedPipeline]);

  const remove = useCallback((index: number) => {
    setDraftPipeline((prev) => {
      const base = prev ?? savedPipeline;
      return base.filter((_, i) => i !== index);
    });
  }, [savedPipeline]);

  const move = useCallback((fromIndex: number, toIndex: number) => {
    setDraftPipeline((prev) => {
      const base = prev ?? savedPipeline;
      const next = [...base];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, [savedPipeline]);

  const saveMutation = useMutation({
    mutationFn: async (pipelineData: OcrPipelineEntry[]) => {
      const nextValidationSettings = {
        ...(schema?.validationSettings ?? {}),
        ocrExtractors: pipelineData,
      };
      await schemasApi.updateSchema(schemaId, { validationSettings: nextValidationSettings });
    },
    onSuccess: () => {
      setDraftPipeline(null);
      queryClient.invalidateQueries({ queryKey: ['schema', schemaId] });
    },
  });

  const save = useCallback(() => {
    if (!draftPipeline) return;
    saveMutation.mutate(draftPipeline);
  }, [draftPipeline, saveMutation]);

  return {
    pipeline,
    savedPipeline,
    isDirty,
    extractorInstances: instances,
    instanceMap,
    extractorTypeMap,
    add,
    update,
    remove,
    move,
    save,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    isLoading: schemaLoading || instancesLoading,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/web/src/shared/hooks/use-ocr-pipeline.ts
git commit -m "feat(web): add useOcrPipeline hook"
```

---

### Task 5: Frontend — Create `AddExtractorDialog` component

**Files:**
- Create: `src/apps/web/src/shared/components/AddExtractorDialog.tsx`

**Interfaces:**
- Consumes: `extractorInstances[]`, `extractorTypeMap`, `onConfirm(entry: OcrPipelineEntry)`
- Produces: Two-step dialog (select instance → configure params)

- [ ] **Step 1: Write the component**

```typescript
// src/apps/web/src/shared/components/AddExtractorDialog.tsx
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { JsonSchemaForm } from '@/shared/components/JsonSchemaForm';
import type { OcrPipelineEntry, ExtractorTypeInfo } from '@/shared/hooks/use-ocr-pipeline';
import type { ExtractorResponseDto } from '@/api/extractors';
import { useI18n } from '@/shared/providers/I18nProvider';

interface AddExtractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractorInstances: ExtractorResponseDto[];
  extractorTypeMap: Map<string, ExtractorTypeInfo>;
  onConfirm: (entry: OcrPipelineEntry) => void;
  initialEntry?: OcrPipelineEntry | null; // for edit mode
}

export function AddExtractorDialog({
  open,
  onOpenChange,
  extractorInstances,
  extractorTypeMap,
  onConfirm,
  initialEntry,
}: AddExtractorDialogProps) {
  const { t } = useI18n();
  const isEdit = !!initialEntry;
  const [step, setStep] = useState<'select' | 'config'>(initialEntry ? 'config' : 'select');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(initialEntry?.extractorId ?? '');
  const [config, setConfig] = useState<Record<string, unknown>>(initialEntry?.config ?? {});

  const selectedInstance = extractorInstances.find((inst) => inst.id === selectedInstanceId);
  const typeInfo = selectedInstance ? extractorTypeMap.get(selectedInstance.extractorType) : null;

  const handleNext = () => {
    if (!selectedInstanceId) return;
    setStep('config');
  };

  const handleConfirm = () => {
    if (!selectedInstanceId) return;
    onConfirm({ extractorId: selectedInstanceId, config });
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setStep('select');
      setSelectedInstanceId('');
      setConfig({});
    }, 200);
  };

  const handleBack = () => {
    setStep('select');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit OCR Engine' : 'Add OCR Engine'}
            {step === 'config' && selectedInstance && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                — Step 2 of 2
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {extractorInstances.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active extractors available. Create one in the admin Extractors page first.
              </p>
            ) : (
              extractorInstances.map((inst) => (
                <label
                  key={inst.id}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors
                    ${selectedInstanceId === inst.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                    }`}
                >
                  <input
                    type="radio"
                    name="extractor-instance"
                    value={inst.id}
                    checked={selectedInstanceId === inst.id}
                    onChange={(e) => setSelectedInstanceId(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{inst.name}</span>
                      <span className="text-xs rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {inst.extractorType}
                      </span>
                    </div>
                    {inst.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {inst.description}
                      </p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedInstance && (
              <div className="rounded-md bg-muted/30 p-3 text-sm">
                <span className="font-medium">{selectedInstance.name}</span>
                <span className="text-muted-foreground ml-2">({selectedInstance.extractorType})</span>
              </div>
            )}
            {typeInfo ? (
              <JsonSchemaForm
                schema={typeInfo.configSchema}
                value={config}
                onChange={setConfig}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No configurable parameters for this extractor type.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'select' && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel') ?? 'Cancel'}
              </Button>
              <Button type="button" onClick={handleNext} disabled={!selectedInstanceId}>
                Next →
              </Button>
            </>
          )}
          {step === 'config' && (
            <>
              <Button type="button" variant="outline" onClick={handleBack}>
                ← Back
              </Button>
              <Button type="button" onClick={handleConfirm}>
                {isEdit ? 'Save' : 'Add'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/web/src/shared/components/AddExtractorDialog.tsx
git commit -m "feat(web): add AddExtractorDialog with two-step selection"
```

---

### Task 6: Frontend — Rewrite `ProjectSettingsExtractorsPage`

**Files:**
- Modify: `src/apps/web/src/routes/dashboard/ProjectSettingsExtractorsPage.tsx`

**Interfaces:**
- Consumes: `useOcrPipeline`, `AddExtractorDialog`
- Produces: Full OCR pipeline management page

- [ ] **Step 1: Rewrite the page component**

```typescript
// src/apps/web/src/routes/dashboard/ProjectSettingsExtractorsPage.tsx
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GripVertical, Plus, PencilLine, Trash2, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';
import { AddExtractorDialog } from '@/shared/components/AddExtractorDialog';
import { useOcrPipeline } from '@/shared/hooks/use-ocr-pipeline';
import { useI18n } from '@/shared/providers/I18nProvider';

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

  // Get schemaId from first schema
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

  // Drag state
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

      {/* Pipeline list */}
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

      {/* Actions */}
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
```

Add missing imports at the top:

```typescript
import { useProject } from '@/shared/hooks/use-projects';
import { useProjectSchemas } from '@/shared/hooks/use-schemas';
import type { OcrPipelineEntry } from '@/shared/hooks/use-ocr-pipeline';
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/web/src/routes/dashboard/ProjectSettingsExtractorsPage.tsx
git commit -m "feat(web): redesign extractors page for multi-OCR pipeline"
```

---

### Task 7: Frontend — Remove `textExtractorId` from other pages

**Files:**
- Modify: `src/apps/web/src/shared/components/ProjectCard.tsx`
- Modify: `src/apps/web/src/shared/components/GuidedSetupWizard.tsx`
- Modify: `src/apps/web/src/shared/components/ProjectWizard.tsx`
- Modify: `src/apps/web/src/api/client.ts` (if project DTO references it)

**Interfaces:**
- Consumes: Backend no longer returns `textExtractorId` in project responses
- Produces: Cleaner UI without single-extractor selection

- [ ] **Step 1: Remove from ProjectCard.tsx**

Find and remove:
```typescript
{project.textExtractorId ? project.textExtractorId : 'Not set'}
```
Replace with nothing or remove the whole row.

- [ ] **Step 2: Remove from project wizards**

In `GuidedSetupWizard.tsx` and `ProjectWizard.tsx`:
- Remove `textExtractorId` from form state
- Remove extractor selection `<Select>` component and its data fetching
- Remove `textExtractorId` from the create payload

- [ ] **Step 3: Commit**

```bash
git add src/apps/web/src/shared/components/ProjectCard.tsx src/apps/web/src/shared/components/GuidedSetupWizard.tsx src/apps/web/src/shared/components/ProjectWizard.tsx
git commit -m "refactor(web): remove textExtractorId from project UI"
```

---

### Task 8: Frontend — Normalize `text`/`markdown` semantics

**Files:**
- Modify: `src/apps/web/src/shared/components/manifests/OcrPreviewModal.tsx`
- Modify: `src/apps/web/src/shared/components/manifests/CoveragePanel.tsx`

**Interfaces:**
- Consumes: `ocrResult.pages[].text` and `ocrResult.pages[].markdown`
- Produces: Clearer display with documented intent

- [ ] **Step 1: Add doc comments to clarify intent (backend type)**

In `src/apps/api/src/text-extractor/types/extractor.types.ts`:

```typescript
/**
 * text: Flat plain text (used for token estimation, search, coverage matching).
 * markdown: Structured/formatted text (used for LLM prompt).
 */
export type TextExtractionResult = {
  text: string;
  markdown: string;
  metadata: TextExtractionMetadata;
};
```

- [ ] **Step 2: Fix inference-ocr markdown format**

In `src/apps/api/src/text-extractor/extractors/inference-ocr.extractor.ts`, change:

```typescript
// Before (debug format):
const markdown = boxLines.join('\n');

// After (plain text, same as text):
const markdown = text;
```

- [ ] **Step 3: Commit**

```bash
git add src/apps/api/src/text-extractor/types/extractor.types.ts src/apps/api/src/text-extractor/extractors/inference-ocr.extractor.ts
git commit -m "refactor: normalize text/markdown semantics, fix inference-ocr markdown"
```

---

### Task 9: Frontend — Tests

**Files:**
- Create: `src/apps/web/src/tests/mocks/handlers.ts` (amend existing file)
- Create: `src/apps/web/src/tests/components/JsonSchemaForm.test.tsx`
- Create: `src/apps/web/src/tests/components/ProjectSettingsExtractorsPage.test.tsx`

- [ ] **Step 1: Add MSW handlers for OCR pipeline endpoints**

In `src/apps/web/src/tests/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

// Add to existing handlers:
http.get('*/extractor-types', () => {
  return HttpResponse.json([
    {
      type: 'paddle-ocr-vl',
      configSchema: {
        type: 'object',
        properties: {
          timeout: { type: 'number', title: 'Timeout', default: 30000 },
        },
      },
      promptContribution: 'I provide full-page markdown',
    },
    {
      type: 'inference-ocr',
      configSchema: {
        type: 'object',
        properties: {
          confidenceThreshold: {
            type: 'number',
            title: 'Confidence Threshold',
            default: 0.8,
            minimum: 0,
            maximum: 1,
          },
        },
      },
      promptContribution: 'I provide individual text boxes',
    },
  ]);
}),

http.get('*/extractors', () => {
  return HttpResponse.json([
    {
      id: 'ext-1',
      name: 'PaddleOCR Production',
      extractorType: 'paddle-ocr-vl',
      config: { baseUrl: 'https://ocr-prod:8080' },
      isActive: true,
      description: 'Production instance',
    },
    {
      id: 'ext-2',
      name: 'Inference OCR Dev',
      extractorType: 'inference-ocr',
      config: { baseUrl: 'http://localhost:8090' },
      isActive: true,
      description: 'Dev instance',
    },
  ]);
}),

http.patch('*/schemas/:id', () => {
  return HttpResponse.json({ id: 1, validationSettings: {} });
}),
```

- [ ] **Step 2: Write JsonSchemaForm test**

```typescript
// src/apps/web/src/tests/components/JsonSchemaForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { JsonSchemaForm } from '@/shared/components/JsonSchemaForm';

describe('JsonSchemaForm', () => {
  it('renders inputs from schema properties', () => {
    const schema = {
      type: 'object',
      properties: {
        timeout: { type: 'number', title: 'Timeout', default: 30000 },
        name: { type: 'string', title: 'Name' },
      },
    };
    render(<JsonSchemaForm schema={schema} value={{}} onChange={() => {}} />);
    expect(screen.getByText('Timeout')).toBeTruthy();
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    const schema = {
      type: 'object',
      properties: {
        timeout: { type: 'number', title: 'Timeout' },
      },
    };
    render(<JsonSchemaForm schema={schema} value={{}} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '5000' } });
    expect(onChange).toHaveBeenCalledWith({ timeout: 5000 });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run --reporter=verbose --no-coverage
```

- [ ] **Step 4: Commit**

```bash
git add src/apps/web/src/tests/mocks/handlers.ts src/apps/web/src/tests/components/
git commit -m "test(web): add OCR pipeline tests with MSW handlers"
```

---

## Self-Review Checklist

1. **Spec coverage:** Every section in the spec maps to a task. UI layout → Task 6, Add/Edit dialog → Task 5, Save flow → Task 6, textExtractorId removal → Tasks 2+7, text/markdown normalization → Task 8, Backend extractorId resolution → Task 1, Migration → Task 2, Tests → Task 9.
2. **Placeholder scan:** No TBD/TODO/fill-in-later patterns. Every step has concrete code.
3. **Type consistency:** `OcrPipelineEntry.extractorId` used consistently across hook (Task 4), dialog (Task 5), and page (Task 6).
4. **Testing:** Task 9 covers MSW mocking, component rendering, and form interaction.
