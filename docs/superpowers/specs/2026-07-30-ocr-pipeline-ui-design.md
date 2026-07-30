# OCR Pipeline UI Design

Date: 2026-07-30
Status: Final

## Problem

The project settings page `/projects/:id/settings/extractors` currently only supports selecting a single text extractor via `project.textExtractorId`. The backend already supports multi-OCR pipeline execution via `schema.validationSettings.ocrExtractors`, but there is no frontend UI to configure it. Users cannot:

- See which OCR engines run in their extraction pipeline
- Add/remove/reorder OCR engines
- Configure per-engine pipeline parameters (timeout, confidence threshold, etc.)

The old `project.textExtractorId` field is deprecated — the extraction pipeline no longer reads it — but it still lingers in the UI, DTOs, and a few backend code paths.

## Scope

- Redesign `/projects/:id/settings/extractors` to manage `schema.validationSettings.ocrExtractors[]`
- Update `ocrExtractors` format from `{ type, config }` to `{ extractorId, config }` in backend and migration
- Drop `project.textExtractorId` from project creation, DTOs, and remaining references
- Normalize `text`/`markdown` semantics in OCR results
- Do NOT touch admin `/extractors` page (CRUD for ExtractorEntity instances)

## Backend Constraints

The current `ocrExtractors` uses `{ type: string, config: {} }` (`type` = extractor type name like `"paddle-ocr-vl"`). The new design changes to `{ extractorId: uuid, config: {} }`. This requires a backend update to `text-extractor.service.ts`:

- `extractMultiple` must accept `extractorId` instead of `type`
- Resolve `extractorId` → `ExtractorEntity` to get `extractorType` (for class lookup) + infrastructure `config`
- Pipeline `config` is merged on top of infrastructure config (pipeline overrides infra)

## Architecture

### Data Model

`schema.validationSettings.ocrExtractors`:

```json
[
  { "extractorId": "uuid-abc", "config": { "timeout": 30000 } },
  { "extractorId": "uuid-def", "config": { "confidenceThreshold": 0.8 } }
]
```

| Field | Type | Source |
|-------|------|--------|
| `extractorId` | UUID | References `ExtractorEntity.id` in `extractors` table |
| `config` | `Record<string, unknown>` | Pipeline-level parameters, schema defined by the extractor type's `configSchema` |

The `extractorId` links to an `ExtractorEntity` instance which provides:
- `extractorType` — which registered extractor class to run
- `config` — infrastructure config (API URL, keys, pricing)
- `name` — human-readable display name
- `isActive` — whether the instance is usable

### Data Flow

```
ProjectSettingsExtractorsPage
  → GET /schemas/:id → schema.validationSettings.ocrExtractors[]
  → GET /extractors → ExtractorEntity[] (for display names + add dialog)
  → GET /extractor-types → { type → configSchema } (for dynamic form rendering)

  Save:
  → PATCH /schemas/:id { validationSettings: { ..., ocrExtractors: [...] } }
```

## UI Design

### Page Layout

```
/projects/:id/settings/extractors  (ProjectSettingsShell, tab="extractors")
```

```
┌─────────────────────────────────────────────────────────────┐
│  Project Settings: <name>                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ basic │ models │ extractors │ costs │ schema │ rules │…  │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  OCR Pipeline                                                │
│  Configure which OCR engines run in parallel during          │
│  extraction. Results are merged and sent to the LLM.         │
│  Order determines priority (first = primary).                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ⠿  PaddleOCR-VL (Production)                [✎] [×] │  │
│  │     Type: paddle-ocr-vl · timeout: 30000ms             │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  ⠿  Inference OCR (Dev Server)                [✎] [×] │  │
│  │     Type: inference-ocr · threshold: 0.8               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [+ Add OCR Engine]                      [💾 Save]          │
└─────────────────────────────────────────────────────────────┘
```

**States:**

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton/spinner while schema and extractors list load |
| **Empty** | "No OCR engines configured" placeholder + "Add OCR Engine" CTA |
| **Populated** | Sortable list of configured engines |
| **Saving** | Save button shows spinner, inputs disabled |
| **Error** | Inline error message near Save button |

### Extractor List Items

Each item shows:
- Drag handle (⠿) for reorder
- Extractor instance name (from `ExtractorEntity.name`)
- Type badge (from `ExtractorEntity.extractorType`)
- Config summary line: key=value pairs from `config`
- ✎ button → opens edit dialog
- × button → removes from list (with confirmation)

Drag-and-drop reorder updates array position immediately (in local state, not saved until Save).

### Add/Edit Dialog

Two-step dialog:

**Step 1: Select Instance**

Radio list of available `ExtractorEntity` instances (filtered to `isActive: true`), fetched from `GET /extractors`.

Each option shows:
- Instance name
- Type badge
- Brief description (truncated)

Search/filter field at top for long lists.

**Step 2: Pipeline Config**

Dynamic form rendered from the selected type's `configSchema` (fetched from `GET /extractor-types`).

Form field mapping (JSON Schema → HTML):

| JSON Schema | UI Element |
|-------------|-----------|
| `{ type: "string" }` | `<input type="text">` |
| `{ type: "number" }` | `<input type="number">` |
| `{ type: "boolean" }` | `<input type="checkbox">` |
| `{ type: "string", enum: [...] }` | `<select>` |

- `default` values pre-filled
- `title` used as label
- `description` shown as help text below field
- `required` fields marked with asterisk

Edit dialog skips Step 1 and pre-fills Step 2 with current config.

### Save Flow

- Explicit "Save" button only (no auto-save)
- On click: `PATCH /schemas/:id` with updated `validationSettings.ocrExtractors`
- React Query mutation with optimistic update
- Save button shows loading spinner during save
- Error shown inline if save fails

## Associated Cleanup Tasks

### 1. Remove `project.textExtractorId`

| Area | File(s) | Change |
|------|---------|--------|
| DTOs | `create-project.dto.ts`, `update-project.dto.ts`, `update-project-extractor.dto.ts`, `project-response.dto.ts` | Remove `textExtractorId` field |
| Endpoint | `projects.controller.ts` | Remove `PUT /projects/:id/extractor` |
| Service | `projects.service.ts` | Remove `textExtractorId` validation in `ensureDefaultsExist`; remove `updateExtractor` method |
| OCR refresh | `manifests.service.ts:634` | Change fallback to read `schema.validationSettings.ocrExtractors[0].extractorId` |
| Usage stats | `extractors.service.ts:111` | Keep `textExtractorId` column on manifests for historical tracking, but drop project-level reference |
| Frontend | `ProjectSettingsExtractorsPage.tsx` | Remove old "Current Extractor" card |
| Frontend | `GuidedSetupWizard.tsx`, `ProjectWizard.tsx` | Remove extractor selection step |
| Frontend | `ProjectCard.tsx` | Remove `textExtractorId` display |
| Migration | `scripts/migrate-ocr-extractors.ts` | Update to produce `{ extractorId, config }` format; verify all schemas migrated |

### 2. Update backend to use `extractorId` format

| File | Change |
|------|--------|
| `text-extractor/text-extractor.service.ts` | `extractMultiple`: resolve each `extractorId` → `ExtractorEntity` → get `extractorType` + infra config. Merge pipeline config on top. |
| `extraction/extraction.service.ts` | `runExtraction`: update schema format validation to expect `extractorId`. Update `manifest.textExtractorId` assignment to use the resolved type name. |

### 3. Normalize `text`/`markdown` semantics

| File | Change |
|------|--------|
| `text-extractor/types/extractor.types.ts` | Add doc comments: `text` = flat plain text (token estimation, search); `markdown` = structured text (LLM prompt) |
| `text-extractor/text-extractor.service.ts` | After multi-extractor merge, rebuild `text` from all extractors: `text = pages.map(p => p.text).join('\n')` |
| `inference-ocr.extractor.ts` | Change `markdown` output to be genuine markdown (not debug format). `text` = plain text, `markdown` = same text or structured version. |

## Non-Goals

- Admin extractor CRUD (already at `/extractors`)
- Correction/review UI enhancements
- Confidence routing or review queue dashboard
- "textExtractorId" removal from `ManifestEntity` (keep for historical tracking)
- Changes to `ExtractorEntity` structure

## Testing

- MSW handlers for `GET /extractors`, `GET /extractor-types`, `PATCH /schemas/:id`
- Unit test: add/edit/remove/reorder extractors in list
- Unit test: dynamic form renders correct field types from configSchema
- Unit test: save writes correct payload to API
- Integration test: page loads empty state, populated state, error states
