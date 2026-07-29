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

    // Schema-level config merged with static config (creation-time)
    const extractorConfig = input.extractorConfig ?? {};
    const serviceUrl = (extractorConfig.serviceUrl as string)
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

