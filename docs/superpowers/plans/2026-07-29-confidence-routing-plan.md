# Multi-OCR + Confidence Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run multiple OCR extractors in parallel (pipeline), merge results, route low-confidence fields to human reviewers via crop-level verification.

**Architecture:** `schema.ocrExtractors` stores default OCR pipeline. `TextExtractorService.extract(pipeline, input)` runs all steps in parallel via `Promise.allSettled`, merges results into `pages[].markdown` with `=== Extractor: <name> ===` delimiter. Each extractor class declares its own `configSchema` for frontend UI rendering and `promptContribution` for LLM context. DeepSeek cross-validates multi-source text and marks `_human_review[]`. Three review endpoints serve pending crops, page images, and accept verifications.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, sharp, JSON Schema

**Spec:** `docs/superpowers/specs/2026-07-29-confidence-routing-design.md`

## Global Constraints

- No new database tables
- All existing `ManifestStatus`, `humanVerified`, extraction phases unchanged
- Single extractor failure must not block other extractors (use `Promise.allSettled`)
- Text concatenation delimiter: `=== Extractor: <name> ===`
- `_human_review[]` bbox format: `[x, y, w, h]`
- New endpoints follow existing `JwtAuthGuard` + `@CurrentUser()` pattern
- Training data collection is pytoya-ocr's responsibility (reads `extraction_history`)

---

### Task 1: Create inference-ocr Extractor

**Files:**
- Create: `src/apps/api/src/text-extractor/extractors/inference-ocr.extractor.ts`
- Create: `src/apps/api/src/text-extractor/ocr-service.client.ts`
- Modify: `src/apps/api/src/text-extractor/types/extractor.types.ts`
- Modify: `src/apps/api/src/text-extractor/text-extractor.registry.ts`
- Modify: `src/apps/api/src/text-extractor/text-extractor.module.ts`

**Interfaces:**
- Produces: `InferenceOcrExtractor` with `configSchema` + `promptContribution`
- Produces: `OcrServiceClient` — HTTP client for pytoya-ocr `/infer` endpoint

- [ ] **Step 1: Add configSchema and promptContribution to ExtractorMetadata type**

```typescript
// src/apps/api/src/text-extractor/types/extractor.types.ts

// Add to existing ExtractorMetadata:
export interface ExtractorMetadata {
  type: string;
  supportedFormats: string[];
  configSchema: Record<string, unknown>;     // JSON Schema for pipeline config
  promptContribution: string;                 // Tells LLM what this extractor outputs
}
```

- [ ] **Step 2: Create OcrServiceClient**

```typescript
// src/apps/api/src/text-extractor/ocr-service.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface OcrBoxResult {
  text: string;
  confidence: number;
  bbox: [number, number, number, number];
}

@Injectable()
export class OcrServiceClient {
  private readonly logger = new Logger(OcrServiceClient.name);
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.get<string>('ocrService.baseUrl', 'http://localhost:8090');
  }

  async infer(imageBuffer: Buffer): Promise<OcrBoxResult[]> {
    try {
      const base64 = imageBuffer.toString('base64');
      const response = await axios.post(
        `${this.baseUrl}/infer`,
        { image: base64 },
        { timeout: 30000 },
      );
      return response.data.results;
    } catch (error) {
      this.logger.warn(`inference-ocr service call failed: ${error.message}`);
      return [];
    }
  }
}
```

- [ ] **Step 3: Create InferenceOcrExtractor**

```typescript
// src/apps/api/src/text-extractor/extractors/inference-ocr.extractor.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTextExtractor } from '../base-text-extractor';
import { OcrServiceClient } from '../ocr-service.client';
import { TextExtractionInput, TextExtractionResult } from '../types/extractor.types';

@Injectable()
export class InferenceOcrExtractor extends BaseTextExtractor {
  static metadata = {
    type: 'inference-ocr',
    supportedFormats: ['image/png', 'image/jpeg', 'image/tiff'],
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
        serviceUrl: {
          type: 'string',
          title: 'Inference Service URL',
          default: 'http://localhost:8090',
        },
      },
      required: ['serviceUrl'],
    },
    promptContribution:
      'I provide individual text boxes with confidence scores and positions. '
      + 'Each box includes: text, confidence (0-1), bbox [x, y, w, h]. '
      + 'Boxes with confidence < 0.8 may be inaccurate.',
  };

  constructor(
    private readonly ocrServiceClient: OcrServiceClient,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async extract(input: TextExtractionInput): Promise<TextExtractionResult> {
    if (!input.fileBuffer || input.fileBuffer.length === 0) {
      return { text: '', markdown: '', metadata: { processingTimeMs: 0 } };
    }

    // Pipeline config (per-call) merged with static config (creation-time)
    const pipelineConfig = input.pipelineConfig ?? {};
    const serviceUrl = (pipelineConfig.serviceUrl as string)
      ?? this.configService.get<string>('ocrService.baseUrl', 'http://localhost:8090');

    const startTime = Date.now();
    const boxes = await this.ocrServiceClient.infer(input.fileBuffer);
    const processingTimeMs = Date.now() - startTime;

    const text = boxes.map((b) => b.text).join('\n');
    const boxLines = boxes.map(
      (b) => `text=${b.text}  conf=${b.confidence}  bbox=[${b.bbox.join(',')}]`,
    );
    const markdown = boxLines.join('\n');

    return {
      text,
      markdown,
      metadata: {
        processingTimeMs,
        ocrResult: {
          document: { type: 'unknown', language: [], pages: 1 },
          pages: [{
            pageNumber: 1,
            text,
            markdown,
            confidence: boxes.length > 0
              ? boxes.reduce((s, b) => s + b.confidence, 0) / boxes.length
              : 0,
            layout: {
              elements: boxes.map((b) => ({
                type: 'text',
                confidence: b.confidence,
                position: { left: b.bbox[0], top: b.bbox[1], width: b.bbox[2], height: b.bbox[3] },
              })),
              tables: [],
            },
          }],
          metadata: { processedAt: new Date().toISOString(), modelVersion: 'inference-ocr', processingTimeMs },
          rawResponse: boxes,
        },
      },
    };
  }
}
```

- [ ] **Step 4: Register in extractor registry**

```typescript
// src/apps/api/src/text-extractor/text-extractor.registry.ts
import { InferenceOcrExtractor } from './extractors/inference-ocr.extractor';

this.register('inference-ocr', InferenceOcrExtractor);
```

- [ ] **Step 5: Add providers and exports to module**

```typescript
// src/apps/api/src/text-extractor/text-extractor.module.ts
import { OcrServiceClient } from './ocr-service.client';

@Module({
  providers: [..., OcrServiceClient],
  exports: [..., OcrServiceClient],
})
```

- [ ] **Step 6: Commit**

```bash
git add src/apps/api/src/text-extractor/
git commit -m "feat: add inference-ocr extractor with configSchema and promptContribution"
```

---

### Task 2: Create/Get Extractor Registry Endpoint and Refactor TextExtractorService

**Files:**
- Create: `src/apps/api/src/text-extractor/extractors.controller.ts`
- Modify: `src/apps/api/src/text-extractor/text-extractor.service.ts`
- Modify: `src/apps/api/src/text-extractor/text-extractor.module.ts`
- Add: `src/apps/api/src/text-extractor/types/pipeline.types.ts`

**Interfaces:**
- Produces: `GET /extractors` — returns all registered extractor types + their metadata
- Consumes: `PipelineStep[]` instead of `extractorIds: string[]`
- Produces: `TextExtractorService.extract(pipeline, input)` — parallel + merge

- [ ] **Step 1: Create pipeline type definitions**

```typescript
// src/apps/api/src/text-extractor/types/pipeline.types.ts
export interface PipelineStep {
  type: string;
  config?: Record<string, unknown>;
}

export interface PipelineResult {
  extractorName: string;
  result: TextExtractionResult;
}
```

- [ ] **Step 2: Create GET /extractors endpoint**

```typescript
// src/apps/api/src/text-extractor/extractors.controller.ts
import { Controller, Get } from '@nestjs/common';
import { TextExtractorRegistry } from './text-extractor.registry';

@Controller('extractors')
export class ExtractorsController {
  constructor(private readonly registry: TextExtractorRegistry) {}

  @Get()
  getExtractors() {
    return this.registry.getAll().map(({ type, metadata }) => ({
      type,
      configSchema: metadata.configSchema,
      promptContribution: metadata.promptContribution,
    }));
  }
}
```

Register in module:

```typescript
// src/apps/api/src/text-extractor/text-extractor.module.ts
import { ExtractorsController } from './extractors.controller';

@Module({
  controllers: [ExtractorsController],
  ...
})
```

- [ ] **Step 3: Modify TextExtractorRegistry to expose metadata**

```typescript
// src/apps/api/src/text-extractor/text-extractor.registry.ts
// Add method:
getAll(): Array<{ type: string; metadata: ExtractorMetadata }> {
  return Array.from(this.registry.entries()).map(([type, cls]) => ({
    type,
    metadata: cls.metadata,
  }));
}
```

- [ ] **Step 4: Rewrite TextExtractorService.extract() for pipeline execution**

```typescript
// src/apps/api/src/text-extractor/text-extractor.service.ts

import { PipelineStep } from './types/pipeline.types';

async extract(pipeline: PipelineStep[], input: TextExtractionInput): Promise<{
  results: PipelineResult[];
}> {
  // Run all pipeline steps in parallel
  const extractionResults = await Promise.allSettled(
    pipeline.map(async (step) => {
      const extractorClass = this.extractorRegistry.get(step.type);
      if (!extractorClass) return null;

      // Merge: static config (from DB) is handled upstream.
      // Pipeline config (from request) is passed through.
      const instance = this.extractorFactory.createInstance(
        step.type,
        {},
        step.type,
      );
      instance.pipelineConfig = step.config ?? {};

      const supportedFormats = extractorClass.metadata.supportedFormats ?? [];
      const shouldConvert =
        input.fileType === FileType.PDF &&
        !supportedFormats.includes('pdf') &&
        supportedFormats.includes('image');

      const pages = shouldConvert
        ? await this.convertPdfToPages(input.filePath)
        : input.pages;

      const result = await instance.extract({ ...input, pages, pipelineConfig: step.config });
      return { extractorName: step.type, result };
    }),
  );

  const succeeded = extractionResults.filter(
    (r): r is PromiseFulfilledResult<NonNullable<typeof r.value>> =>
      r.status === 'fulfilled' && r.value !== null,
  ).map(r => r.value);

  if (succeeded.length === 0) {
    throw new BadRequestException('All extractors in pipeline failed');
  }

  // Merge results into first extractor's OCR result
  const primary = succeeded[0];
  const mergedMetadata = primary.result.metadata;

  for (let i = 1; i < succeeded.length; i++) {
    const { extractorName, result } = succeeded[i];
    const ocrResult = result.metadata?.ocrResult;
    if (!ocrResult) continue;

    const delimiter = `\n\n=== Extractor: ${extractorName} ===\n`;
    for (let p = 0; p < Math.min(mergedMetadata.ocrResult.pages.length, ocrResult.pages.length); p++) {
      mergedMetadata.ocrResult.pages[p].markdown +=
        delimiter + ocrResult.pages[p].markdown;
    }
  }

  if (mergedMetadata.qualityScore === undefined) {
    mergedMetadata.qualityScore = calculateOcrQualityScore(mergedMetadata.ocrResult);
  }

  return { results: succeeded };
}
```

- [ ] **Step 5: Verify existing tests pass**

Run: `npx jest --testPathPattern="text-extractor" --no-coverage`
Expected: All tests pass (note: tests calling `extract(id, input)` need updating)

- [ ] **Step 6: Commit**

```bash
git add src/apps/api/src/text-extractor/
git commit -m "feat: pipeline-based multi-extractor execution with GET /extractors"
```

---

### Task 3: Add Multi-OCR System Prompt with promptContribution Collection

**Files:**
- Modify: `src/apps/api/src/prompts/constants/system-prompts.constant.ts`
- Modify: `src/apps/api/src/prompts/prompts.service.ts`

- [ ] **Step 1: Add multi-OCR prompt entry**

```typescript
// src/apps/api/src/prompts/constants/system-prompts.constant.ts

export const MULTI_OCR_SYSTEM_PROMPT = [
  'You will receive OCR results from multiple extractors,',
  'separated by "=== Extractor: <name> ===" markers.',
  '',
  'Each extractor describes its own output below:',
  '',
  '<EXTRACTOR_CONTRIBUTIONS>',
  '',
  'Cross-reference rules:',
  '- Text matches across extractors → high confidence, extract directly',
  '- Text differs → mark for human review',
  '- Box confidence < 0.8 → mark for human review',
  '',
  'Output JSON:',
  '{',
  '  "extracted_data": { ... your normal extraction fields ... },',
  '  "_human_review": [',
  '    {',
  '      "field": "<json path>",',
  '      "reason": "source_mismatch" | "low_confidence",',
  '      "ocr_text": "<source text from the OCR box>",',
  '      "page": <int>,',
  '      "bbox": [x, y, w, h]',
  '    }',
  '  ]',
  '}',
  '',
  'IMPORTANT: If all fields have high confidence, _human_review should be an empty array.',
  'Do NOT invent fields. Prefer null over guessing.',
].join('\n');
```

The `<EXTRACTOR_CONTRIBUTIONS>` placeholder is replaced at extraction time with the selected extractors' `promptContribution` strings.

- [ ] **Step 2: Build prompt at extraction time with contributions**

In extraction service, before sending to LLM:

```typescript
const contributions = pipeline.map(
  step => this.extractorRegistry.get(step.type)?.metadata.promptContribution
).filter(Boolean).join('\n\n');

const systemPrompt = this.multiOcrSystemPrompt.replace(
  '<EXTRACTOR_CONTRIBUTIONS>',
  contributions,
);
```

- [ ] **Step 3: Commit**

```bash
git add src/apps/api/src/prompts/
git commit -m "feat: multi-OCR prompt with dynamic extractor contributions"
```

---

### Task 4: Integrate Pipeline into Schema and Extraction Flow

**Files:**
- Modify: `src/apps/api/src/extraction/extraction.service.ts`
- Modify: `src/apps/api/src/schemas/schemas.service.ts` (or schema entity)
- Modify: `src/apps/api/src/extraction/dto/extract.dto.ts`

- [ ] **Step 1: Add ocrExtractors to schema config**

```typescript
// On SchemaEntity (existing validationSettings JSONB field, or new dedicated field):
// validationSettings.ocrExtractors: Array<{ type: string; config: Record<string, unknown> }>

{
  "ocrExtractors": [
    { "type": "paddle-ocr-vl", "config": { "timeout": 30000 } },
    { "type": "inference-ocr", "config": { "confidenceThreshold": 0.8 } }
  ]
}
```

- [ ] **Step 2: Update ExtractDto**

```typescript
// src/apps/api/src/extraction/dto/extract.dto.ts
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PipelineStepDto {
  @IsString()
  type!: string;

  @IsOptional()
  config?: Record<string, unknown>;
}

export class ExtractDto {
  // ... existing fields ...

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStepDto)
  pipeline?: PipelineStepDto[];
}
```

- [ ] **Step 3: Update extraction service to resolve pipeline**

```typescript
// In extraction.service.ts, where textExtractorService.extract() is called:

const pipeline = options.pipeline
  ?? (schema.validationSettings as any)?.ocrExtractors
  ?? [{ type: 'paddle-ocr-vl', config: {} }];

const { results } = await this.textExtractorService.extract(pipeline, input);
```

- [ ] **Step 4: Commit**

```bash
git add src/apps/api/src/extraction/ src/apps/api/src/schemas/
git commit -m "feat: pipeline config in schema + ExtractDto"
```

---

### Task 5: Implement Review Endpoints (pending-crops, page image, verify)

**Files:**
- Create: `src/apps/api/src/manifests/dto/pending-crops.dto.ts`
- Create: `src/apps/api/src/manifests/dto/verify-crop.dto.ts`
- Create: `src/apps/api/src/manifests/crops.service.ts`
- Modify: `src/apps/api/src/manifests/manifests.controller.ts`
- Modify: `src/apps/api/src/manifests/manifests.module.ts`
- Modify: `package.json` (add sharp dependency)

**Interfaces:**
- Consumes: `ExtractionHistoryEntity`, `UpdateManifestUseCase`
- Produces: `GET /manifests/:id/pending-crops?threshold=0.8`
- Produces: `GET /manifests/:id/pages/:page/image`
- Produces: `POST /manifests/:id/crops/verify`

- [ ] **Step 1: Install sharp**

```bash
npm install sharp
```

- [ ] **Step 2: Create DTOs**

```typescript
// src/apps/api/src/manifests/dto/pending-crops.dto.ts
export class PendingCropsQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1)
  threshold?: number = 0.8;
}

export class PendingCropItemDto {
  field!: string;
  page!: number;
  cropImage!: string;
  ocrText!: string;
  confidence!: number;
  reason!: string;
  bbox!: number[];
}

export class PendingCropsResponseDto {
  items!: PendingCropItemDto[];
  total!: number;
}
```

```typescript
// src/apps/api/src/manifests/dto/verify-crop.dto.ts
export class VerifyCropDto {
  @IsString() @IsNotEmpty() field!: string;
  @IsInt() page!: number;
  @IsString() @IsNotEmpty() correctedText!: string;
  @IsOptional() @IsArray() adjustedBbox?: number[];
}
```

- [ ] **Step 3: Create CropsService**

```typescript
// src/apps/api/src/manifests/crops.service.ts
@Injectable()
export class CropsService {
  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepo: Repository<ManifestEntity>,
    @InjectRepository(ExtractionHistoryEntity)
    private readonly historyRepo: Repository<ExtractionHistoryEntity>,
    private readonly updateManifestUseCase: UpdateManifestUseCase,
  ) {}

  async getPendingCrops(manifestId: number, threshold: number) {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest) throw new NotFoundException();

    const latestExtraction = await this.historyRepo.findOne({
      where: { manifestId, reason: 'extraction' },
      order: { createdAt: 'DESC' },
    });
    if (!latestExtraction?.extractedData) return { items: [], total: 0 };

    const humanReview = (latestExtraction.extractedData as any)?._human_review ?? [];
    if (humanReview.length === 0) return { items: [], total: 0 };

    const verifiedRecords = await this.historyRepo.find({
      where: { manifestId, reason: 'manual_crop_verification' },
    });
    const verifiedFields = new Set(
      verifiedRecords.map((r) => (r.changes as any)?.field),
    );

    const pending = humanReview.filter(
      (item: any) => item.confidence < threshold && !verifiedFields.has(item.field),
    );

    const items: PendingCropItemDto[] = [];
    for (const item of pending) {
      const cropBase64 = await this.cropFromFile(manifest.storagePath, item.bbox);
      items.push({
        field: item.field,
        page: item.page,
        cropImage: cropBase64 ?? '',
        ocrText: item.ocr_text,
        confidence: item.confidence,
        reason: item.reason,
        bbox: item.bbox as number[],
      });
    }

    return { items, total: items.length };
  }

  async getPageImage(manifestId: number, page: number) {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest || !manifest.storagePath) return null;
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(manifest.storagePath);
    const mimeType = manifest.fileType === 'pdf' ? 'application/pdf' : 'image/png';
    return { buffer, mimeType };
  }

  async verifyCrop(
    manifestId: number,
    field: string,
    page: number,
    correctedText: string,
    adjustedBbox: number[] | undefined,
    userId: number,
  ) {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest) throw new NotFoundException();

    const verifiedRecords = await this.historyRepo.find({
      where: { manifestId, reason: 'manual_crop_verification' },
    });
    if (verifiedRecords.some((r) => (r.changes as any)?.field === field)) {
      throw new ConflictException();
    }

    const latestExtraction = await this.historyRepo.findOne({
      where: { manifestId, reason: 'extraction' },
      order: { createdAt: 'DESC' },
    });
    const reviewItem = (latestExtraction?.extractedData as any)?._human_review
      ?.find((r: any) => r.field === field);
    const originalText = reviewItem?.ocr_text ?? '';
    const originalBbox = reviewItem?.bbox as number[] | undefined;

    await this.historyRepo.save({
      manifestId,
      reason: 'manual_crop_verification',
      changes: { field, page, originalText, correctedText, originalBbox, adjustedBbox },
      createdBy: userId,
    });

    const extractedData = { ...((manifest.extractedData as any) || {}) };
    this.setNestedField(extractedData, field, correctedText);
    await this.updateManifestUseCase.execute(manifestId, { extractedData, humanVerified: false });
  }

  private async cropFromFile(filePath: string | undefined, bbox: number[]) {
    if (!filePath || bbox.length < 4) return null;
    try {
      const [x, y, w, h] = bbox;
      const buffer = await sharp(filePath)
        .extract({ left: Math.round(x), top: Math.round(y), width: Math.round(w), height: Math.round(h) })
        .png()
        .toBuffer();
      return buffer.toString('base64');
    } catch { return null; }
  }

  private setNestedField(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
}
```

- [ ] **Step 4: Add endpoints to manifests.controller.ts**

```typescript
@Get('manifests/:id/pending-crops')
async getPendingCrops(@Param('id', ParseIntPipe) id: number, @Query() q: PendingCropsQueryDto) {
  return this.cropsService.getPendingCrops(id, q.threshold ?? 0.8);
}

@Get('manifests/:id/pages/:page/image')
async getPageImage(@Param('id', ParseIntPipe) id: number, @Param('page', ParseIntPipe) page: number, @Res() res: Response) {
  const result = await this.cropsService.getPageImage(id, page);
  if (!result) throw new NotFoundException();
  res.setHeader('Content-Type', result.mimeType);
  res.send(result.buffer);
}

@Post('manifests/:id/crops/verify')
async verifyCrop(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyCropDto, @CurrentUser() user: any) {
  await this.cropsService.verifyCrop(id, dto.field, dto.page, dto.correctedText, dto.adjustedBbox, user.id);
}
```

- [ ] **Step 5: Register module dependencies**

```typescript
// src/apps/api/src/manifests/manifests.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([..., ExtractionHistoryEntity]),
  ],
  providers: [..., CropsService, UpdateManifestUseCase],
})
```

- [ ] **Step 6: Commit**

```bash
git add src/apps/api/src/manifests/ package.json
git commit -m "feat: add pending-crops, page image, and verify endpoints"
```
