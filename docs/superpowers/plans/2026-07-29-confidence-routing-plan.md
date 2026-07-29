# Multi-OCR + Confidence Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run multiple OCR extractors in parallel, merge results, route low-confidence fields to human reviewers via crop-level verification.

**Architecture:** `TextExtractorService.extract()` accepts `extractorIds: string[]`, runs all in parallel via `Promise.allSettled`, merges successful results into `pages[].markdown` with `=== Extractor: <name> ===` delimiter. DeepSeek cross-validates multi-source text and marks `_human_review[]`. Two endpoints serve pending crops and accept verifications. Crop images generated locally via sharp.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, sharp

**Spec:** `docs/superpowers/specs/2026-07-29-confidence-routing-design.md`

## Global Constraints

- No new database tables
- All existing `ManifestStatus`, `humanVerified`, extraction phases unchanged
- Single extractor failure must not block other extractors (use `Promise.allSettled`)
- Text concatenation delimiter: `=== Extractor: <name> ===`
- `_human_review[]` bbox format: `[x, y, w, h]`
- New endpoints follow existing `JwtAuthGuard` + `@CurrentUser()` pattern
- Crop images generated locally with sharp, not via external service
- Training data collection is pytoya-ocr's responsibility, not this repo's

---

### Task 1: Create inference-ocr Extractor

**Files:**
- Create: `src/apps/api/src/text-extractor/extractors/inference-ocr.extractor.ts`
- Create: `src/apps/api/src/text-extractor/ocr-service.client.ts`
- Modify: `src/apps/api/src/text-extractor/text-extractor.registry.ts`
- Modify: `src/apps/api/src/text-extractor/text-extractor.module.ts`
- Modify: `src/apps/api/config.yaml`
- Modify: `src/apps/api/src/config/env.validation.ts`

**Interfaces:**
- Produces: `InferenceOcrExtractor` implementing `TextExtractor`, type `inference-ocr`
- Produces: `OcrServiceClient` — HTTP client for pytoya-ocr `/infer` endpoint
- Consumes: pytoya-ocr service at `ocrService.baseUrl`

- [ ] **Step 1: Create OcrServiceClient**

```typescript
// src/apps/api/src/text-extractor/ocr-service.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface OcrBoxResult {
  text: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, w, h
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

- [ ] **Step 2: Create InferenceOcrExtractor**

```typescript
// src/apps/api/src/text-extractor/extractors/inference-ocr.extractor.ts
import { Injectable } from '@nestjs/common';
import { BaseTextExtractor } from '../base-text-extractor';
import { OcrServiceClient } from '../ocr-service.client';
import { TextExtractionInput, TextExtractionResult } from '../types/extractor.types';

@Injectable()
export class InferenceOcrExtractor extends BaseTextExtractor {
  static metadata = {
    name: 'inference-ocr',
    supportedFormats: ['image/png', 'image/jpeg', 'image/tiff'],
    supportedTypes: ['inference-ocr'] as const,
  };

  constructor(private readonly ocrServiceClient: OcrServiceClient) {
    super();
  }

  async extract(input: TextExtractionInput): Promise<TextExtractionResult> {
    if (!input.fileBuffer || input.fileBuffer.length === 0) {
      return { text: '', markdown: '', metadata: { processingTimeMs: 0 } };
    }

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

- [ ] **Step 3: Register in extractor registry**

```typescript
// src/apps/api/src/text-extractor/text-extractor.registry.ts
import { InferenceOcrExtractor } from './extractors/inference-ocr.extractor';

// In the register() method or constructor:
this.register('inference-ocr', InferenceOcrExtractor);
```

- [ ] **Step 4: Add providers and exports to module**

```typescript
// src/apps/api/src/text-extractor/text-extractor.module.ts
import { OcrServiceClient } from './ocr-service.client';
import { InferenceOcrExtractor } from './extractors/inference-ocr.extractor';

@Module({
  providers: [
    ...,
    OcrServiceClient,
    InferenceOcrExtractor,
  ],
  exports: [
    ...,
    OcrServiceClient,
  ],
})
```

- [ ] **Step 5: Add config and env validation**

```yaml
// config.yaml
ocrService:
  baseUrl: http://localhost:8090
```

```typescript
// src/apps/api/src/config/env.validation.ts
export class OcrServiceConfig {
  @IsString()
  @IsOptional()
  baseUrl?: string;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/apps/api/src/text-extractor/extractors/inference-ocr.extractor.ts \
       src/apps/api/src/text-extractor/ocr-service.client.ts \
       src/apps/api/src/text-extractor/text-extractor.registry.ts \
       src/apps/api/src/text-extractor/text-extractor.module.ts \
       src/apps/api/config.yaml \
       src/apps/api/src/config/env.validation.ts
git commit -m "feat: add inference-ocr extractor (det_v4+rec_v8 via HTTP)"
```

---

### Task 2: Modify TextExtractorService for Multi-Extractor Execution

**Files:**
- Modify: `src/apps/api/src/text-extractor/text-extractor.service.ts`

**Interfaces:**
- Consumes: `TextExtractorService.extract()` signature changes from `extractorId: string` to `extractorIds: string[]`
- Produces: Merged `TextExtractionResult` with all extractors' contributions in `pages[].markdown`
- Consumes: Existing `TextExtractor` interface, `OcrResultDto`

- [ ] **Step 1: Update `extract()` signature and implementation**

```typescript
// src/apps/api/src/text-extractor/text-extractor.service.ts

// Change signature from single extractorId to array:
async extract(extractorIds: string[], input: TextExtractionInput): Promise<{
  extractors: ExtractorEntity[];  // was: extractor
  result: TextExtractionResult;
}> {
  // Run all extractors in parallel
  const results = await Promise.allSettled(
    extractorIds.map(async (id) => {
      const extractor = await this.extractorRepository.findOne(id);
      if (!extractor || !extractor.isActive) return null;

      const extractorType = extractor.extractorType;
      const extractorClass = this.extractorRegistry.get(extractorType);
      if (!extractorClass) return null;

      const instance = this.extractorFactory.createInstance(
        extractorType, extractor.config ?? {}, extractor.id,
      );

      const supportedFormats = extractorClass.metadata.supportedFormats ?? [];
      const shouldConvert =
        input.fileType === FileType.PDF &&
        !supportedFormats.includes('pdf') &&
        supportedFormats.includes('image');

      const pages = shouldConvert
        ? await this.convertPdfToPages(input.filePath)
        : input.pages;

      const result = await instance.extract({ ...input, pages });
      return { extractor, result };
    }),
  );

  // Collect successful results
  const succeeded = results.filter(
    (r): r is PromiseFulfilledResult<NonNullable<typeof r.value>> =>
      r.status === 'fulfilled' && r.value !== null,
  ).map(r => r.value);

  if (succeeded.length === 0) {
    throw new BadRequestException('All extractors failed');
  }

  // Use first extractor's result as base
  const primary = succeeded[0];
  const mergedResult = { ...primary.result };
  const mergedMetadata = mergedResult.metadata ?? { processingTimeMs: 0 };

  // Build base OCR result from primary
  if (!mergedMetadata.ocrResult) {
    mergedMetadata.ocrResult = this.buildFallbackOcrResult(mergedResult, primary.extractor.name);
  }

  // Merge remaining extractors' markdown into pages[].markdown with delimiter
  for (let i = 1; i < succeeded.length; i++) {
    const { extractor, result } = succeeded[i];
    const ocrResult = result.metadata?.ocrResult;
    if (!ocrResult) continue;

    const delimiter = `\n\n=== Extractor: ${extractor.name} ===\n`;
    for (let p = 0; p < Math.min(mergedMetadata.ocrResult.pages.length, ocrResult.pages.length); p++) {
      mergedMetadata.ocrResult.pages[p].markdown +=
        delimiter + ocrResult.pages[p].markdown;
    }
  }

  // Calculate quality score from merged result
  if (mergedMetadata.qualityScore === undefined) {
    mergedMetadata.qualityScore = calculateOcrQualityScore(mergedMetadata.ocrResult);
  }

  mergedResult.metadata = mergedMetadata;

  return {
    extractors: succeeded.map(s => s.extractor),
    result: mergedResult,
  };
}
```

- [ ] **Step 2: Update internal callers of `extract()`**

Check `extraction.service.ts` and any other files that call `textExtractorService.extract()` — they need to pass `extractorIds: string[]` instead of `extractorId: string`.

- [ ] **Step 3: Verify existing tests pass**

Run: `npx jest --testPathPattern="text-extractor" --no-coverage`
Expected: All tests pass (note: tests that call `extract(id, input)` will need updating to `extract([id], input)`)

- [ ] **Step 4: Commit**

```bash
git add src/apps/api/src/text-extractor/text-extractor.service.ts
git commit -m "feat: multi-extractor parallel execution with result merge"
```

---

### Task 3: Add Multi-OCR System Prompt

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

- [ ] **Step 2: Register in PromptsService**

```typescript
// src/apps/api/src/prompts/prompts.service.ts
import { MULTI_OCR_SYSTEM_PROMPT } from './constants/system-prompts.constant';

getMultiOcrSystemPrompt(): string {
  return MULTI_OCR_SYSTEM_PROMPT;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/apps/api/src/prompts/
git commit -m "feat: add multi-OCR cross-validation system prompt"
```

---

### Task 4: Modify ExtractionService to Pass Multiple Extractor IDs

**Files:**
- Modify: `src/apps/api/src/extraction/extraction.service.ts`
- Modify: `src/apps/api/src/extraction/dto/extract.dto.ts`

- [ ] **Step 1: Update extract DTO to accept array**

```typescript
// src/apps/api/src/extraction/dto/extract.dto.ts
export class ExtractDto {
  // ... existing fields ...

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extractorIds?: string[];
}
```

- [ ] **Step 2: Update extraction logic**

In `extraction.service.ts`, locate where `textExtractorService.extract(extractorId, input)` is called. Change to:

```typescript
const extractorIds = options.extractorIds ?? [schema.defaultExtractorId];
const { extractors, result } = await this.textExtractorService.extract(extractorIds, input);
```

- [ ] **Step 3: Commit**

```bash
git add src/apps/api/src/extraction/
git commit -m "feat: extraction supports multiple extractor IDs"
```

---

### Task 5: Implement pending-crops, page image, and verify Endpoints

**Files:**
- Create: `src/apps/api/src/manifests/dto/pending-crops.dto.ts`
- Create: `src/apps/api/src/manifests/dto/verify-crop.dto.ts`
- Create: `src/apps/api/src/manifests/crops.service.ts`
- Modify: `src/apps/api/src/manifests/manifests.controller.ts`
- Modify: `src/apps/api/src/manifests/manifests.module.ts`
- Modify: `package.json` (add sharp dependency)

**Interfaces:**
- Consumes: `ExtractionHistoryEntity` (existing)
- Consumes: `UpdateManifestUseCase` (existing)
- Produces: `GET /manifests/:id/pending-crops?threshold=0.8`
- Produces: `GET /manifests/:id/pages/:page/image`
- Produces: `POST /manifests/:id/crops/verify`

- [ ] **Step 1: Install sharp**

```bash
npm install sharp
```

- [ ] **Step 2: Create request/response DTOs**

```typescript
// src/apps/api/src/manifests/dto/pending-crops.dto.ts
import { IsOptional, IsNumber, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class PendingCropsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number = 0.8;
}

export class PendingCropItemDto {
  field!: string;
  page!: number;
  cropImage!: string;
  ocrText!: string;
  confidence!: number;
  reason!: string;
  bbox!: number[];  // [x, y, w, h] — returned for frontend bbox overlay
}

export class PendingCropsResponseDto {
  items!: PendingCropItemDto[];
  total!: number;
}
```

```typescript
// src/apps/api/src/manifests/dto/verify-crop.dto.ts
import { IsString, IsInt, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class VerifyCropDto {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsInt()
  page!: number;

  @IsString()
  @IsNotEmpty()
  correctedText!: string;

  @IsOptional()
  @IsArray()
  adjustedBbox?: number[];  // [x, y, w, h] — user-adjusted box, optional
}
```

- [ ] **Step 3: Create CropsService**

```typescript
// src/apps/api/src/manifests/crops.service.ts
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sharp from 'sharp';
import { ManifestEntity } from '../entities/manifest.entity';
import { ExtractionHistoryEntity } from '../entities/extraction-history.entity';
import { UpdateManifestUseCase } from '../usecases/update-manifest.usecase';
import { PendingCropItemDto } from './dto/pending-crops.dto';

@Injectable()
export class CropsService {
  private readonly logger = new Logger(CropsService.name);

  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepo: Repository<ManifestEntity>,
    @InjectRepository(ExtractionHistoryEntity)
    private readonly historyRepo: Repository<ExtractionHistoryEntity>,
    private readonly updateManifestUseCase: UpdateManifestUseCase,
  ) {}

  async getPendingCrops(
    manifestId: number,
    threshold: number,
  ): Promise<{ items: PendingCropItemDto[]; total: number }> {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest) throw new NotFoundException('Manifest not found');

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
      (item: any) =>
        item.confidence < threshold && !verifiedFields.has(item.field),
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

  async getPageImage(
    manifestId: number,
    page: number,
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest) throw new NotFoundException('Manifest not found');
    if (!manifest.storagePath) return null;

    const fs = await import('fs/promises');
    const buffer = await fs.readFile(manifest.storagePath);

    // For v1: return the full file. Multi-page PDF extraction is a later enhancement.
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
  ): Promise<void> {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest) throw new NotFoundException('Manifest not found');

    const verifiedRecords = await this.historyRepo.find({
      where: { manifestId, reason: 'manual_crop_verification' },
    });
    if (verifiedRecords.some((r) => (r.changes as any)?.field === field)) {
      throw new ConflictException(`Field "${field}" has already been verified`);
    }

    const latestExtraction = await this.historyRepo.findOne({
      where: { manifestId, reason: 'extraction' },
      order: { createdAt: 'DESC' },
    });
    const humanReview = (latestExtraction?.extractedData as any)?._human_review ?? [];
    const reviewItem = humanReview.find((r: any) => r.field === field);
    const originalText = reviewItem?.ocr_text ?? '';
    const originalBbox = reviewItem?.bbox as number[] | undefined;

    // Save full record: pytoya-ocr reads this for training data
    await this.historyRepo.save({
      manifestId,
      reason: 'manual_crop_verification',
      changes: {
        field,
        page,
        originalText,
        correctedText,
        originalBbox,
        adjustedBbox,  // user-adjusted box, or undefined if unchanged
      },
      createdBy: userId,
    });

    const extractedData = { ...((manifest.extractedData as any) || {}) };
    this.setNestedField(extractedData, field, correctedText);
    await this.updateManifestUseCase.execute(manifestId, {
      extractedData,
      humanVerified: false,
    });
  }

  private async cropFromFile(
    filePath: string | undefined,
    bbox: number[],
  ): Promise<string | null> {
    if (!filePath || bbox.length < 4) return null;
    try {
      const [x, y, w, h] = bbox;
      const buffer = await sharp(filePath)
        .extract({
          left: Math.round(x),
          top: Math.round(y),
          width: Math.round(w),
          height: Math.round(h),
        })
        .png()
        .toBuffer();
      return buffer.toString('base64');
    } catch (e) {
      this.logger.warn(`Crop failed for ${filePath}: ${(e as Error).message}`);
      return null;
    }
  }

  private setNestedField(obj: any, path: string, value: any): void {
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
// src/apps/api/src/manifests/manifests.controller.ts
import { CropsService } from './crops.service';
import { PendingCropsQueryDto, PendingCropsResponseDto } from './dto/pending-crops.dto';
import { VerifyCropDto } from './dto/verify-crop.dto';

@Get('manifests/:id/pending-crops')
@UseGuards(JwtAuthGuard)
async getPendingCrops(
  @Param('id', ParseIntPipe) id: number,
  @Query() query: PendingCropsQueryDto,
): Promise<PendingCropsResponseDto> {
  return this.cropsService.getPendingCrops(id, query.threshold ?? 0.8);
}

@Get('manifests/:id/pages/:page/image')
@UseGuards(JwtAuthGuard)
async getPageImage(
  @Param('id', ParseIntPipe) id: number,
  @Param('page', ParseIntPipe) page: number,
  @Res() res: Response,
): Promise<void> {
  const result = await this.cropsService.getPageImage(id, page);
  if (!result) {
    throw new NotFoundException('Page image not available');
  }
  res.setHeader('Content-Type', result.mimeType);
  res.send(result.buffer);
}

@Post('manifests/:id/crops/verify')
@UseGuards(JwtAuthGuard)
async verifyCrop(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: VerifyCropDto,
  @CurrentUser() user: any,
): Promise<void> {
  await this.cropsService.verifyCrop(
    id,
    dto.field,
    dto.page,
    dto.correctedText,
    dto.adjustedBbox,
    user.id,
  );
}
```

- [ ] **Step 5: Register CropsService in module**

```typescript
// src/apps/api/src/manifests/manifests.module.ts
import { CropsService } from './crops.service';
import { ExtractionHistoryEntity } from '../entities/extraction-history.entity';
import { UpdateManifestUseCase } from '../usecases/update-manifest.usecase';
import { TextExtractorModule } from '../text-extractor/text-extractor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([..., ExtractionHistoryEntity]),
    TextExtractorModule,
    ...,
  ],
  providers: [..., CropsService, UpdateManifestUseCase],
})
```

- [ ] **Step 6: Commit**

```bash
git add src/apps/api/src/manifests/ package.json
git commit -m "feat: add pending-crops, page image, and verify endpoints"
```
