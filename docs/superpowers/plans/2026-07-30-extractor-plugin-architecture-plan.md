# Extractor Plugin Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor extractor pipeline into pure orchestration layer. Extractors are plugins that self-describe their output format to the LLM and register correction callbacks. Pipeline does not judge, calculate, or decide anything about extractor data.

**Architecture:** Pipeline runs extractors in parallel, collects `{ markdown, promptContribution, extractorId }`, appends self-descriptions to system prompt, sends to LLM. `_human_review` format and behavior are defined by each extractor's `promptContribution`. Corrections route via `onCorrection( correctionData )`. No quality score, no confidence calculation, no multi-OCR prompt override.

**Tech Stack:** NestJS, TypeORM, PostgreSQL

## Global Constraints

- Pipeline does NOT calculate quality scores
- Pipeline does NOT decide how to merge multi-source data
- Pipeline does NOT replace the database prompt
- `_human_review` format is defined by extractor's `promptContribution`, not by pipeline
- `onCorrection` is a pure side effect — extraction does not depend on it
- Single extractor mode works without `_human_review` or `bbox`

---

### Task 1: Add `onCorrection` to ExtractorMetadata

**Files:**
- Modify: `src/apps/api/src/text-extractor/types/extractor.types.ts`

**Interfaces:**
- Produces: `CorrectionData` interface + `onCorrection` callback on `ExtractorMetadata`

- [ ] **Step 1: Add CorrectionData interface and onCorrection to metadata**

```typescript
// src/apps/api/src/text-extractor/types/extractor.types.ts

export interface CorrectionData {
  field: string;
  page: number;
  originalText: string;
  correctedText: string;
  bbox?: [number, number, number, number];
  confidence?: number;
  manifestId: number;
  userId: number;
}

export interface ExtractorMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: ExtractorCategory;
  paramsSchema: ExtractorParamSchema;
  configSchema: Record<string, unknown>;
  supportedFormats: ExtractorSupportedFormat[];
  defaultConfig?: Record<string, unknown>;
  pricingSchema?: ExtractorParamSchema;
  promptContribution: string;
  onCorrection?: (data: CorrectionData) => Promise<void>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/api/src/text-extractor/types/extractor.types.ts
git commit -m "feat: add CorrectionData and onCorrection to ExtractorMetadata"
```

---

### Task 2: Refactor Inference-OCR extractor (conf/bbox + onCorrection)

**Files:**
- Modify: `src/apps/api/src/text-extractor/extractors/inference-ocr.extractor.ts`

**Interfaces:**
- Consumes: `CorrectionData` type
- Produces: markdown with conf/bbox; `onCorrection` writes `extraction_history`

- [ ] **Step 1: Update promptContribution to include _human_review format**

```typescript
promptContribution: [
  'I provide individual text boxes with confidence scores and positions.',
  'Each box includes: text, confidence (0-1), bbox [x, y, w, h].',
  '',
  'For fields where my confidence < 0.8, or when my text differs from other',
  'sources and my confidence is higher, include in _human_review:',
  '  "_human_review": [{',
  '    "field": "<json path>",',
  '    "reason": "low_confidence" | "ocr_correction",',
  '    "ocr_text": "<original text>",',
  '    "page": <int>,',
  '    "bbox": [x, y, w, h]',
  '  }]',
].join('\n'),
```

- [ ] **Step 2: Restore conf/bbox in markdown output**

Change:

```typescript
const markdown = text;
```

To:

```typescript
const markdown = filteredBoxes.map((b) => {
  const tag = b.confidence >= 0.95 ? '[H]' : b.confidence >= 0.8 ? '[M]' : '[L]';
  return `${tag} ${b.text}`;
}).join('\n');
```

- [ ] **Step 3: Implement onCorrection**

```typescript
import { CorrectionData } from '../types/extractor.types';

// On the class:
static onCorrection = async (data: CorrectionData): Promise<void> => {
  // This is injected with deps at registration time, but the static
  // method signature means the pipeline can call it after resolving
  // the extractor class. Implementation writes extraction_history.
  // Pipeline handles the actual DB write; this is a notification hook.
  return;
};
```

Actually, `onCorrection` needs dependencies (repository). It should be on the **instance**, not static. But the pipeline doesn't keep instances around — it creates them per-request.

Better approach: keep `onCorrection` on the metadata (static), but have the pipeline inject the implementation at registration time, or have the service call a central correction handler.

Simplest clean approach: `ExtractorMetadata.onCorrection?` is a **callback function** that the extractor class registers. The pipeline gets the extractor's `extractorType`, looks up the class, and calls `Class.metadata.onCorrection(data)`.

The actual `onCorrection` for inference-ocr writes to `extraction_history`. Since it needs repositories, it should be implemented in a service that's registered at app boot:

```typescript
// In text-extractor.module.ts or crops.service.ts:
InferenceOcrExtractor.metadata.onCorrection = async (data: CorrectionData) => {
  // Write extraction_history
  // This is wired at module init
};
```

Actually even simpler: the CropsService already exists and does the verify logic. The `onCorrection` callback can be set by the module at bootstrap:

```typescript
// manifests.module.ts or text-extractor.module.ts
export class ManifestModule implements OnModuleInit {
  constructor(private readonly cropsService: CropsService) {}
  
  onModuleInit() {
    InferenceOcrExtractor.metadata.onCorrection = (data) =>
      this.cropsService.recordCorrection(data);
  }
}
```

But this creates a circular dependency risk. Cleanest approach: **the controller/caller routes to the right handler, not the extractor**. The `onCorrection` on metadata is just a **contract marker** — the actual implementation lives in `CropsService` which already exists.

Actually, simplest approach: keep the existing `POST /manifests/:id/crops/verify` endpoint, and have it call `CropsService.verifyCrop()`. The `onCorrection` on ExtractorMetadata is an optional interface that extractors CAN implement. If present, the pipeline calls it after the verify is complete. If not, no-op.

Let me simplify:

```typescript
// In extraction.service.ts or manifests.controller.ts, after verify:
const extractorClass = this.extractorRegistry.get(extractorType);
if (extractorClass?.metadata?.onCorrection) {
  await extractorClass.metadata.onCorrection(data);
}
```

The `onCorrection` for `InferenceOcrExtractor` is set at module init to call `CropsService.recordCorrection()`.

- [ ] **Step 4: Commit**

```bash
git add src/apps/api/src/text-extractor/extractors/inference-ocr.extractor.ts
git commit -m "feat(inference-ocr): restore conf/bbox markdown, add onCorrection"
```

---

### Task 3: Simplify TextExtractorService — remove quality score and type-specific logic

**Files:**
- Modify: `src/apps/api/src/text-extractor/text-extractor.service.ts`

**Interfaces:**
- Consumes: unchanged
- Produces: simpler `extractMultiple()` — no quality score calculation, no conditional logic per extractor type

- [ ] **Step 1: Remove qualityScore calculation from extractMultiple**

Remove:

```typescript
import { calculateOcrQualityScore } from '../ocr/ocr-cache.util';
// and
if (mergedMetadata.qualityScore === undefined) {
  mergedMetadata.qualityScore = calculateOcrQualityScore(mergedMetadata.ocrResult);
}
```

- [ ] **Step 2: Remove qualityScore from extractSingle**

Remove the qualityScore calculation block at lines 96-98.

- [ ] **Step 3: Commit**

```bash
git add src/apps/api/src/text-extractor/text-extractor.service.ts
git commit -m "refactor: remove qualityScore from pipeline orchestration"
```

---

### Task 4: Fix getSystemPrompt — single path, append not replace

**Files:**
- Modify: `src/apps/api/src/extraction/extraction.service.ts`
- Modify: `src/apps/api/src/prompts/prompts.service.ts`
- Delete: `src/apps/api/src/prompts/constants/system-prompts.constant.ts` (remove MULTI_OCR_SYSTEM_PROMPT)

**Interfaces:**
- Consumes: `ExtractorMetadata.promptContribution`
- Produces: single-path `getSystemPrompt()` — base prompt + extractor self-descriptions + promptRulesMarkdown

- [ ] **Step 1: Remove MULTI_OCR_SYSTEM_PROMPT constant**

```typescript
// Delete the MULTI_OCR_SYSTEM_PROMPT block from system-prompts.constant.ts
// Keep SYSTEM_PROMPT and RE_EXTRACT_SYSTEM_PROMPT
```

- [ ] **Step 2: Replace getMultiOcrSystemPrompt with getExtractorContributions**

```typescript
// prompts.service.ts — replace getMultiOcrSystemPrompt with:
getExtractorContributions(ocrExtractors: Array<{ type: string }>): string {
  const contributions = ocrExtractors
    .map(e => this.getPromptContributionFor(e.type))
    .filter(Boolean)
    .join('\n\n');
  if (!contributions) return '';
  return '\n\nAdditional OCR sources:\n' + contributions;
}
```

- [ ] **Step 3: Rewrite getSystemPrompt to single path**

```typescript
// extraction.service.ts
private async getSystemPrompt(
  schema: SchemaEntity | null,
  override?: string,
  ocrExtractors?: OcrExtractorConfig[],
): Promise<string> {
  // Always start with base (database or default)
  const base = (() => {
    if (override) return override;
    if (schema?.systemPromptTemplate) return schema.systemPromptTemplate;
    return this.promptsService.getSystemPrompt();
  })();

  let prompt = base;

  // Always append extractor self-descriptions as fact (no instructions)
  if (ocrExtractors && ocrExtractors.length > 1) {
    const types = await this.resolveExtractorTypes(ocrExtractors);
    const contributions = this.promptsService.getExtractorContributions(
      types.map((t) => ({ type: t })),
    );
    if (contributions) {
      prompt += contributions;
    }
  }

  // Always append prompt rules (if any)
  const promptRulesMarkdown = this.getPromptRulesMarkdown(schema);
  if (promptRulesMarkdown) {
    prompt += `\n\nPrompt Rules (Markdown):\n${promptRulesMarkdown}`;
  }

  return prompt;
}
```

- [ ] **Step 4: Clean up unused imports**

Remove `MULTI_OCR_SYSTEM_PROMPT` import from prompts.service.ts

- [ ] **Step 5: Commit**

```bash
git add src/apps/api/src/extraction/ src/apps/api/src/prompts/
git commit -m "refactor: single-path getSystemPrompt, remove MULTI_OCR_SYSTEM_PROMPT"
```

---

### Task 5: Connect verify endpoint to onCorrection

**Files:**
- Modify: `src/apps/api/src/manifests/crops.service.ts`
- Modify: `src/apps/api/src/manifests/manifests.controller.ts`
- Modify: `src/apps/api/src/manifests/manifests.module.ts`

**Interfaces:**
- Consumes: `CorrectionData`, `ExtractorRegistry`
- Produces: wired verify endpoint that calls `onCorrection`

- [ ] **Step 1: Check if CropsService and endpoints are already registered**

Read `manifests.controller.ts` and `manifests.module.ts` to check current state. The previous implementation created `crops.service.ts`, `pending-crops.dto.ts`, `verify-crop.dto.ts` but never wired them.

- [ ] **Step 2: Wire CropsService into module**

Add `CropsService` to providers and export if needed in `manifests.module.ts`.

- [ ] **Step 3: Register endpoints in manifests.controller.ts**

Add `GET /manifests/:id/pending-crops` and `POST /manifests/:id/crops/verify` endpoints. The verify endpoint calls `CropsService.verifyCrop()` which:
1. Writes `extraction_history` with `reason='manual_crop_verification'`
2. Updates `manifest.extractedData` with corrected value
3. Looks up the extractor type from the manifest's record
4. Calls `extractorClass.metadata.onCorrection?.(correctionData)` if it exists

- [ ] **Step 4: Commit**

```bash
git add src/apps/api/src/manifests/
git commit -m "feat: wire verifyCrop endpoint with onCorrection hook"
```

---

### Task 6: Update database config — enable dual extractors

**Files:**
- Update via psql on server

- [ ] **Step 1: Set both extractors in schema 14**

```sql
UPDATE schemas SET validation_settings = jsonb_set(
  COALESCE(validation_settings, '{}'::jsonb),
  '{ocrExtractors}',
  '[{"extractorId": "eaa203b7-4e51-4b7c-b2f9-b811a62ac174", "config": {}}, {"extractorId": "4ca3e9e3-2318-4669-ba49-d50e217631a8", "config": {"serviceUrl": "http://ocr-service:8090", "confidenceThreshold": 0.8}}]'::jsonb
) WHERE id = 14;
```

- [ ] **Step 2: Verify project points to schema 14**

```sql
UPDATE projects SET default_schema_id = 14 WHERE id = 1;
```

---

## Testing

- Run `npx tsc --noEmit` for backend and frontend
- Run existing backend tests: `npx jest --testPathPattern="text-extractor|extraction" --no-coverage`
- Extract a test manifest and verify `_human_review` has bbox data
