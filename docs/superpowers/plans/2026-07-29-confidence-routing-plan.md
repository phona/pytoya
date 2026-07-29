# Dual OCR + Confidence Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route low-confidence OCR fields to human reviewers via crop-level verification, feeding corrections back into model training and prompt optimization.

**Architecture:** det_v4+rec_v8 runs as an inline enrichment after PaddleOCR-VL, concatenating box results into `pages[].markdown`. DeepSeek receives dual-source text, cross-validates, and marks low-confidence/conflicting fields in `_human_review[]`. Two new endpoints serve pending crops and accept verifications. Corrections stored in `training_samples` table for offline export.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, Python FastAPI + PaddleOCR, DeepSeek-V4-Flash

**Spec:** `docs/superpowers/specs/2026-07-29-confidence-routing-design.md`

## Global Constraints

- No new tables beyond `training_samples`
- All existing `ManifestStatus`, `humanVerified`, extraction phases unchanged
- det_v4+rec_v8 failure must not block main OCR pipeline
- Text concatenation uses `=== PaddleOCR boxes ===` delimiter
- `_human_review[]` bbox format: `[x, y, w, h]`
- Extractors use existing `TextExtractor` interface, not a new `OcrPlugin` interface
- New endpoints follow existing `JwtAuthGuard` + `@CurrentUser()` pattern

---

### Task 1: Python OCR Service (det_v4 + rec_v8)

**Files:**
- Create: `pytoya-ocr-service/app.py`
- Create: `pytoya-ocr-service/requirements.txt`
- Create: `pytoya-ocr-service/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `src/apps/api/config.yaml`
- Modify: `src/apps/api/src/config/env.validation.ts`

**Interfaces:**
- Produces: `POST /infer` endpoint (base64 image in → `[{text, confidence, bbox}]` out)
- Produces: `POST /crop` endpoint (base64 image + bbox in → crop base64 out)
- Consumes: `det_v4.best.pdparams` + `rec_v8.best.pdparams` (model weights, assumed present)

- [ ] **Step 1: Create requirements.txt**

```text
fastapi==0.115.0
paddlepaddle==3.0.0b1
paddleocr==2.8.0
Pillow==10.4.0
pydantic==2.9.0
```

- [ ] **Step 2: Create FastAPI service**

```python
# pytoya-ocr-service/app.py
"""
det_v4 + rec_v8 inference service for pytoya confidence routing.

Endpoints:
  POST /infer  - accepts base64 image, returns [{text, confidence, bbox}]
  POST /crop   - accepts base64 image + bbox, returns cropped region as base64
"""
import base64
import io
import logging
from typing import List

from fastapi import FastAPI, HTTPException
from paddleocr import PaddleOCR
from pydantic import BaseModel
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="pytoya-ocr-service")

ocr = None  # lazy init

def get_ocr():
    global ocr
    if ocr is None:
        logger.info("Loading PaddleOCR det_v4+rec_v8...")
        ocr = PaddleOCR(
            show_log=False,
            lang="ch",
            use_angle_cls=False,
            det_db_thresh=0.1,
            det_db_box_thresh=0.2,
            det_model_dir="models/det_v4.best.pdparams",
            rec_model_dir="models/rec_v8.best.pdparams",
        )
        logger.info("PaddleOCR loaded")
    return ocr


class InferRequest(BaseModel):
    image: str  # base64


class BoxResult(BaseModel):
    text: str
    confidence: float
    bbox: List[float]  # [x, y, w, h]


class InferResponse(BaseModel):
    results: List[BoxResult]


class CropRequest(BaseModel):
    image: str  # base64
    bbox: List[float]  # [x, y, w, h]


class CropResponse(BaseModel):
    crop: str  # base64


@app.post("/infer", response_model=InferResponse)
def infer(req: InferRequest):
    try:
        img_bytes = base64.b64decode(req.image)
        img = Image.open(io.BytesIO(img_bytes))
        ocr_engine = get_ocr()
        result = ocr_engine.ocr(img, cls=False)
        boxes = []
        for line in result:
            for item in line:
                pts, (text, conf) = item
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                x = min(xs)
                y = min(ys)
                w = max(xs) - x
                h = max(ys) - y
                boxes.append(BoxResult(
                    text=text,
                    confidence=round(float(conf), 4),
                    bbox=[round(x, 1), round(y, 1), round(w, 1), round(h, 1)],
                ))
        return InferResponse(results=boxes)
    except Exception as e:
        logger.exception("Infer failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/crop", response_model=CropResponse)
def crop(req: CropRequest):
    try:
        img_bytes = base64.b64decode(req.image)
        img = Image.open(io.BytesIO(img_bytes))
        x, y, w, h = req.bbox
        cropped = img.crop((x, y, x + w, y + h))
        buf = io.BytesIO()
        cropped.save(buf, format="PNG")
        return CropResponse(crop=base64.b64encode(buf.getvalue()).decode())
    except Exception as e:
        logger.exception("Crop failed")
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 3: Create Dockerfile**

```dockerfile
# pytoya-ocr-service/Dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY models/ ./models/
COPY app.py .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090"]
```

- [ ] **Step 4: Add to docker-compose.yml**

```yaml
  ocr-service:
    build: ./pytoya-ocr-service
    ports:
      - "8090:8090"
    volumes:
      - ./pytoya-ocr-service/models:/app/models
    restart: unless-stopped
```

- [ ] **Step 5: Add config to config.yaml**

```yaml
ocrService:
  baseUrl: http://ocr-service:8090
```

- [ ] **Step 6: Add env validation**

```typescript
// src/apps/api/src/config/env.validation.ts
// Add to existing config class (around line 73-80)
export class OcrServiceConfig {
  @IsString()
  @IsOptional()
  baseUrl?: string;
}
```

- [ ] **Step 7: Verify the service starts**

Run: `docker-compose build ocr-service && docker-compose up -d ocr-service`

Run: `curl http://localhost:8090/docs`
Expected: FastAPI Swagger UI renders

- [ ] **Step 8: Commit**

```bash
git add pytoya-ocr-service/ docker-compose.yml src/apps/api/config.yaml src/apps/api/src/config/env.validation.ts
git commit -m "feat: add det_v4+rec_v8 OCR inference service"
```

---

### Task 2: Add OcrServiceClient and Integrate into TextExtractorService

**Files:**
- Create: `src/apps/api/src/text-extractor/ocr-service.client.ts`
- Modify: `src/apps/api/src/text-extractor/text-extractor.service.ts`
- Modify: `src/apps/api/src/text-extractor/text-extractor.module.ts`

**Interfaces:**
- Consumes: `OcrServiceClient` → `infer(image: Buffer): Promise<BoxResult[]>`, `crop(image: Buffer, bbox: number[]): Promise<Buffer>`
- Produces: Modified `TextExtractorService.extract()` that optionally enriches `pages[].markdown` with det_v4+rec_v8 boxes
- Consumes: `OcrResultDto` structure (existing)
- Consumes: OCR service config from `ConfigService`

- [ ] **Step 1: Create OcrServiceClient**

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
      const response = await axios.post(`${this.baseUrl}/infer`, { image: base64 }, { timeout: 30000 });
      return response.data.results;
    } catch (error) {
      this.logger.warn(`OCR service infer failed: ${error.message}`);
      return [];
    }
  }

  async crop(imageBuffer: Buffer, bbox: [number, number, number, number]): Promise<Buffer | null> {
    try {
      const base64 = imageBuffer.toString('base64');
      const response = await axios.post(`${this.baseUrl}/crop`, { image: base64, bbox }, { timeout: 10000 });
      return Buffer.from(response.data.crop, 'base64');
    } catch (error) {
      this.logger.warn(`OCR service crop failed: ${error.message}`);
      return null;
    }
  }
}
```

- [ ] **Step 2: Modify text-extractor.service.ts to enrich with boxes**

Add to `TextExtractorService`:

```typescript
import { OcrServiceClient, OcrBoxResult } from './ocr-service.client';

// In constructor:
constructor(
  ...existing,
  private readonly ocrServiceClient: OcrServiceClient,
) {}

// New method:
private async enrichPagesWithBoxes(
  ocrResult: OcrResultDto,
  fileBuffer: Buffer,
): Promise<OcrResultDto> {
  const boxes = await this.ocrServiceClient.infer(fileBuffer);
  if (boxes.length === 0) return ocrResult;

  // Concatenate boxes into the first page's markdown (the full document text
  // is typically on page 1 for images, or split across pages for PDFs).
  // For v1, all boxes go to page 0. Multi-page PDF inference is a later
  // enhancement.
  const delimiter = '\n\n=== PaddleOCR boxes ===\n';
  const boxLines = boxes.map(
    (b) => `text=${b.text}  conf=${b.confidence}  bbox=[${b.bbox.join(',')}]`,
  );
  ocrResult.pages[0].markdown = `${ocrResult.pages[0].markdown}${delimiter}${boxLines.join('\n')}`;
  return ocrResult;
}
```

Call `enrichPagesWithBoxes` in `extract()` after the main extractor completes, before returning:

```typescript
// In extract(), around line 77, after calculateOcrQualityScore:
if (metadata.ocrResult && extractor.type === 'ocr') {
  metadata.ocrResult = await this.enrichPagesWithBoxes(metadata.ocrResult, input.fileBuffer);
}
```

- [ ] **Step 3: Register OcrServiceClient in module**

```typescript
// src/apps/api/src/text-extractor/text-extractor.module.ts
import { OcrServiceClient } from './ocr-service.client';

@Module({
  providers: [..., OcrServiceClient],
  exports: [..., OcrServiceClient],
})
export class TextExtractorModule {}
```

- [ ] **Step 4: Verify existing tests still pass**

Run: `npx jest --testPathPattern="text-extractor" --no-coverage`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/apps/api/src/text-extractor/
git commit -m "feat: add OcrServiceClient and enrich pages with det_v4+rec_v8 boxes"
```

---

### Task 3: Create TrainingSamples Entity and Migration

**Files:**
- Create: `src/apps/api/src/entities/training-sample.entity.ts`
- Create: `src/apps/api/src/database/migrations/1720000000000-CreateTrainingSamplesTable.ts`
- Modify: `src/apps/api/src/entities/index.ts`

**Interfaces:**
- Produces: `TrainingSampleEntity` (TypeORM entity)
- Produces: Migration SQL for `training_samples` table

- [ ] **Step 1: Create the entity**

```typescript
// src/apps/api/src/entities/training-sample.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ManifestEntity } from './manifest.entity';

export type TrainingSampleSource = 'paddleocr_vl' | 'det_v4_rec_v8';

@Entity({ name: 'training_samples' })
export class TrainingSampleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'manifest_id' })
  manifestId!: number;

  @ManyToOne(() => ManifestEntity)
  @JoinColumn({ name: 'manifest_id' })
  manifest!: ManifestEntity;

  @Column({ type: 'varchar', length: 255 })
  field!: string;

  @Column({ type: 'integer' })
  page!: number;

  @Column({ name: 'ocr_text', type: 'text' })
  ocrText!: string;

  @Column({ name: 'corrected_text', type: 'text' })
  correctedText!: string;

  @Column({ type: 'float' })
  confidence!: number;

  @Column({ name: 'crop_image', type: 'text', nullable: true })
  cropImage!: string | null;

  @Column({ type: 'varchar', length: 50 })
  source!: TrainingSampleSource;

  @Column({ type: 'boolean', default: false })
  exported!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'exported_at', type: 'timestamp', nullable: true })
  exportedAt!: Date | null;
}
```

- [ ] **Step 2: Add to entities/index.ts**

```typescript
// src/apps/api/src/entities/index.ts
export { TrainingSampleEntity } from './training-sample.entity';
// Also add to the entities array for TypeORM connection:
// TrainingSampleEntity,
// (add to both the export list and the entities array in the module)
```

- [ ] **Step 3: Create migration**

```typescript
// src/apps/api/src/database/migrations/1720000000000-CreateTrainingSamplesTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrainingSamplesTable1720000000000 implements MigrationInterface {
  name = 'CreateTrainingSamplesTable1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE training_samples (
        id            SERIAL PRIMARY KEY,
        manifest_id   INTEGER NOT NULL REFERENCES manifests(id) ON DELETE CASCADE,
        field         VARCHAR(255) NOT NULL,
        page          INTEGER NOT NULL DEFAULT 1,
        ocr_text      TEXT NOT NULL,
        corrected_text TEXT NOT NULL,
        confidence    DOUBLE PRECISION NOT NULL,
        crop_image    TEXT,
        source        VARCHAR(50) NOT NULL,
        exported      BOOLEAN NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        exported_at   TIMESTAMP
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_training_samples_exported ON training_samples(exported);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_training_samples_manifest ON training_samples(manifest_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_training_samples_manifest`);
    await queryRunner.query(`DROP INDEX idx_training_samples_exported`);
    await queryRunner.query(`DROP TABLE training_samples`);
  }
}
```

- [ ] **Step 4: Run migrations**

Run: `npx typeorm migration:run -d src/apps/api/ormconfig.ts`
Expected: `CREATE TABLE training_samples` executed successfully

- [ ] **Step 5: Commit**

```bash
git add src/apps/api/src/entities/training-sample.entity.ts src/apps/api/src/entities/index.ts src/apps/api/src/database/migrations/
git commit -m "feat: add training_samples entity and migration"
```

---

### Task 4: Add Dual-OCR System Prompt

**Files:**
- Modify: `src/apps/api/src/prompts/constants/system-prompts.constant.ts`

**Interfaces:**
- Produces: Dual-OCR system prompt segment that DeepSeek uses for cross-validation

- [ ] **Step 1: Add dual-OCR prompt entry**

```typescript
// src/apps/api/src/prompts/constants/system-prompts.constant.ts
// Add after existing constants:

export const DUAL_OCR_SYSTEM_PROMPT = [
  'You will receive TWO OCR sources for the same document, separated by "=== PaddleOCR boxes ===":',
  '1. Before delimiter: full-page markdown from Qwen-VL (structured text)',
  '2. After delimiter: individual text boxes with confidence scores and positions',
  '',
  'Cross-reference rules:',
  '- Text matches in both sources → high confidence, extract directly',
  '- Text differs between sources → mark for human review, include both texts',
  '- Box confidence < 0.8 → mark for human review',
  '',
  'Output JSON:',
  '{',
  '  "extracted_data": { ... your normal extraction fields ... },',
  '  "_human_review": [',
  '    {',
  '      "field": "<json path of the field>",',
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

- [ ] **Step 2: Register the new prompt constant in PromptsService**

```typescript
// src/apps/api/src/prompts/prompts.service.ts
import { DUAL_OCR_SYSTEM_PROMPT } from './constants/system-prompts.constant';

getDualOcrSystemPrompt(): string {
  return DUAL_OCR_SYSTEM_PROMPT;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/apps/api/src/prompts/
git commit -m "feat: add dual-OCR cross-validation system prompt"
```

---

### Task 5: Implement pending-crops and verify Endpoints

**Files:**
- Create: `src/apps/api/src/manifests/dto/pending-crops.dto.ts`
- Create: `src/apps/api/src/manifests/dto/verify-crop.dto.ts`
- Create: `src/apps/api/src/manifests/crops.service.ts`
- Modify: `src/apps/api/src/manifests/manifests.controller.ts`
- Modify: `src/apps/api/src/manifests/manifests.module.ts`

**Interfaces:**
- Consumes: `OcrServiceClient.crop()` (from Task 2)
- Consumes: `TrainingSampleEntity` (from Task 3)
- Consumes: `ExtractionHistoryEntity` (existing)
- Consumes: `UpdateManifestUseCase` (existing)
- Produces: `GET /manifests/:id/pending-crops?threshold=0.8`
- Produces: `POST /manifests/:id/crops/verify`

- [ ] **Step 1: Create request/response DTOs**

```typescript
// src/apps/api/src/manifests/dto/pending-crops.dto.ts
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
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
}

export class PendingCropsResponseDto {
  items!: PendingCropItemDto[];
  total!: number;
}
```

```typescript
// src/apps/api/src/manifests/dto/verify-crop.dto.ts
import { IsString, IsInt, IsNotEmpty } from 'class-validator';

export class VerifyCropDto {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsInt()
  page!: number;

  @IsString()
  @IsNotEmpty()
  correctedText!: string;
}
```

- [ ] **Step 2: Create CropsService**

```typescript
// src/apps/api/src/manifests/crops.service.ts
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManifestEntity } from '../entities/manifest.entity';
import { ExtractionHistoryEntity } from '../entities/extraction-history.entity';
import { TrainingSampleEntity } from '../entities/training-sample.entity';
import { OcrServiceClient } from '../text-extractor/ocr-service.client';
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
    @InjectRepository(TrainingSampleEntity)
    private readonly trainingRepo: Repository<TrainingSampleEntity>,
    private readonly ocrServiceClient: OcrServiceClient,
    private readonly updateManifestUseCase: UpdateManifestUseCase,
  ) {}

  async getPendingCrops(manifestId: number, threshold: number): Promise<{ items: PendingCropItemDto[]; total: number }> {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest) throw new NotFoundException('Manifest not found');

    // Get latest extraction history
    const latestExtraction = await this.historyRepo.findOne({
      where: { manifestId, reason: 'extraction' },
      order: { createdAt: 'DESC' },
    });
    if (!latestExtraction?.extractedData) return { items: [], total: 0 };

    const humanReview = (latestExtraction.extractedData as any)?._human_review ?? [];
    if (humanReview.length === 0) return { items: [], total: 0 };

    // Get already-verified fields
    const verifiedRecords = await this.historyRepo.find({
      where: { manifestId, reason: 'manual_crop_verification' },
    });
    const verifiedFields = new Set(
      verifiedRecords.map((r) => (r.changes as any)?.field),
    );

    // Filter by threshold and exclude verified
    const pending = humanReview.filter(
      (item: any) => item.confidence < threshold && !verifiedFields.has(item.field),
    );

    // Crop images and build response
    const items: PendingCropItemDto[] = [];
    for (const item of pending) {
      const pageImage = await this.getPageImage(manifest, item.page);
      if (!pageImage) continue;

      const cropBuffer = await this.ocrServiceClient.crop(
        pageImage,
        item.bbox as [number, number, number, number],
      );
      if (!cropBuffer) continue;

      items.push({
        field: item.field,
        page: item.page,
        cropImage: cropBuffer.toString('base64'),
        ocrText: item.ocr_text,
        confidence: item.confidence,
        reason: item.reason,
      });
    }

    return { items, total: items.length };
  }

  async verifyCrop(
    manifestId: number,
    field: string,
    page: number,
    correctedText: string,
    userId: number,
  ): Promise<void> {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest) throw new NotFoundException('Manifest not found');

    // Check if this field was already verified
    const verifiedRecords = await this.historyRepo.find({
      where: { manifestId, reason: 'manual_crop_verification' },
    });
    const alreadyVerified = verifiedRecords.some(
      (r) => (r.changes as any)?.field === field,
    );
    if (alreadyVerified) {
      throw new ConflictException(`Field "${field}" has already been verified`);
    }

    // Get original OCR text from latest extraction
    const latestExtraction = await this.historyRepo.findOne({
      where: { manifestId, reason: 'extraction' },
      order: { createdAt: 'DESC' },
    });
    const humanReview = (latestExtraction?.extractedData as any)?._human_review ?? [];
    const reviewItem = humanReview.find((r: any) => r.field === field);
    const originalText = reviewItem?.ocr_text ?? '';
    const confidence = reviewItem?.confidence ?? 0;

    // Write extraction_history
    await this.historyRepo.save({
      manifestId,
      reason: 'manual_crop_verification',
      changes: { field, page, originalText, correctedText },
      createdBy: userId,
    });

    // Update extracted_data via existing use case (handles validation + audit)
    const extractedData = { ...(manifest.extractedData as any || {}) };
    this.setNestedField(extractedData, field, correctedText);
    await this.updateManifestUseCase.execute(manifestId, {
      extractedData,
      humanVerified: false,
    });

    // Crop image for training sample
    const pageImage = await this.getPageImage(manifest, page);
    const cropBuffer = pageImage
      ? await this.ocrServiceClient.crop(pageImage, reviewItem?.bbox as [number, number, number, number])
      : null;

    // Insert training sample
    await this.trainingRepo.save({
      manifestId,
      field,
      page,
      ocrText: originalText,
      correctedText,
      confidence,
      cropImage: cropBuffer ? cropBuffer.toString('base64') : null,
      source: 'det_v4_rec_v8',
      exported: false,
    });
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

  private async getPageImage(manifest: ManifestEntity, pageNumber: number): Promise<Buffer | null> {
    // Returns page image by reading the original file and extracting the page
    // Uses existing file access logic from ManifestService
    // For simplicity, reads the original file from storage path
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(manifest.storagePath);
      return data;
    } catch {
      this.logger.warn(`Cannot read file at ${manifest.storagePath}`);
      return null;
    }
  }
}
```

- [ ] **Step 3: Add endpoints to manifests.controller.ts**

```typescript
// src/apps/api/src/manifests/manifests.controller.ts
import { CropsService } from './crops.service';
import { PendingCropsQueryDto, PendingCropsResponseDto } from './dto/pending-crops.dto';
import { VerifyCropDto } from './dto/verify-crop.dto';

// Inject:
constructor(
  ...,
  private readonly cropsService: CropsService,
) {}

// Add endpoints:

@Get('manifests/:id/pending-crops')
@UseGuards(JwtAuthGuard)
async getPendingCrops(
  @Param('id', ParseIntPipe) id: number,
  @Query() query: PendingCropsQueryDto,
): Promise<PendingCropsResponseDto> {
  return this.cropsService.getPendingCrops(id, query.threshold ?? 0.8);
}

@Post('manifests/:id/crops/verify')
@UseGuards(JwtAuthGuard)
async verifyCrop(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: VerifyCropDto,
  @CurrentUser() user: any,
): Promise<void> {
  await this.cropsService.verifyCrop(id, dto.field, dto.page, dto.correctedText, user.id);
}
```

- [ ] **Step 4: Register service and inject extraction_history repo in module**

```typescript
// src/apps/api/src/manifests/manifests.module.ts
import { CropsService } from './crops.service';
import { ExtractionHistoryEntity } from '../entities/extraction-history.entity';
import { TrainingSampleEntity } from '../entities/training-sample.entity';
import { UpdateManifestUseCase } from '../usecases/update-manifest.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([..., ExtractionHistoryEntity, TrainingSampleEntity]),
    ...,
  ],
  providers: [..., CropsService, UpdateManifestUseCase],
})
```

- [ ] **Step 5: Test the endpoints manually**

Run the app and test:

```bash
# Get pending crops
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/manifests/1/pending-crops?threshold=0.8"

# Verify a crop
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field":"invoice_no","page":1,"correctedText":"INV-67890"}' \
  "http://localhost:3000/manifests/1/crops/verify"
```

Expected: Pending crops return items with crop images; verify succeeds with 200

- [ ] **Step 6: Commit**

```bash
git add src/apps/api/src/manifests/
git commit -m "feat: add pending-crops and verify endpoints for human-in-loop"
```

---

### Task 6: Export Training Samples Script

**Files:**
- Create: `scripts/export-training-samples.ts`

**Interfaces:**
- Consumes: `TrainingSampleEntity` (query unexported rows)
- Produces: JSONL file for PaddleOCR fine-tuning, CSV file for prompt review

- [ ] **Step 1: Create the export script**

```typescript
// scripts/export-training-samples.ts
/**
 * Export training samples for PaddleOCR fine-tuning and prompt review.
 *
 * Usage:
 *   npx ts-node scripts/export-training-samples.ts --format jsonl --output ./data/
 *
 * Output:
 *   - training_data_<date>.jsonl  (PaddleOCR fine-tuning)
 *   - prompt_review_<date>.csv    (prompt optimization review)
 */

import { createConnection, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = process.env.OUTPUT_DIR || './data';
const DATE = new Date().toISOString().slice(0, 10);

async function main() {
  const connection = await createConnection();
  const repo = connection.getRepository('training_samples');

  const samples = await repo.find({
    where: { exported: false },
    order: { createdAt: 'ASC' },
  });

  if (samples.length === 0) {
    console.log('No unexported training samples found.');
    await connection.close();
    return;
  }

  // JSONL for PaddleOCR fine-tuning
  const jsonlPath = path.join(OUTPUT_DIR, `training_data_${DATE}.jsonl`);
  const jsonlStream = fs.createWriteStream(jsonlPath, { flags: 'a' });
  for (const s of samples) {
    jsonlStream.write(JSON.stringify({
      image: s.cropImage,
      text: s.correctedText,
    }) + '\n');
  }
  jsonlStream.end();

  // CSV for prompt review
  const csvPath = path.join(OUTPUT_DIR, `prompt_review_${DATE}.csv`);
  const csvStream = fs.createWriteStream(csvPath, { flags: 'a' });
  csvStream.write('field,ocr_text,corrected_text,confidence,source,page\n');
  for (const s of samples) {
    csvStream.write(
      `"${s.field}","${s.ocrText}","${s.correctedText}",${s.confidence},${s.source},${s.page}\n`,
    );
  }
  csvStream.end();

  // Mark as exported
  const now = new Date();
  await repo.update(
    { id: samples.map((s: any) => s.id) },
    { exported: true, exportedAt: now },
  );

  console.log(`Exported ${samples.length} training samples:`);
  console.log(`  JSONL: ${jsonlPath}`);
  console.log(`  CSV:   ${csvPath}`);

  await connection.close();
}

main().catch(console.error);
```

- [ ] **Step 2: Verify the script runs**

Run: `mkdir -p data && npx ts-node scripts/export-training-samples.ts`
Expected: Script creates `data/training_data_<date>.jsonl` and `data/prompt_review_<date>.csv`

- [ ] **Step 3: Commit**

```bash
git add scripts/export-training-samples.ts
git commit -m "feat: add training samples export script (JSONL + CSV)"
```
