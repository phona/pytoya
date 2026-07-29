# Multi-OCR + Confidence Routing + Human-in-Loop

Date: 2026-07-29
Status: Final

## Problem

PaddleOCR fine-tuning to 99% accuracy is not achievable. Accept OCR imperfection and route low-confidence fields to human reviewers for crop-level verification. Multi-OCR cross-validation (multiple parallel extractors feeding into a single LLM pass) catches inconsistencies and signals where human review is needed.

## Architecture

```
extract([extractor_paddleocr_vl, extractor_inference_ocr], file)
  │
  ├─ Promise.allSettled([
  │    PaddleOCR-VL → markdown
  │    det_v4+rec_v8 → [{text, confidence, bbox}]
  │  ])
  │
  └─ merge: 所有成功结果拼进 pages[].markdown
     "=== Extractor: PaddleOCR-VL ===\n...\n
      === Extractor: inference-ocr ===\n
      text=INV-12345  conf=0.92  bbox=[...]\n..."
         ↓
  DeepSeek（交叉验证 + 提取）
    ├─ extracted_data
    └─ _human_review[]
         ↓
    GET /pending-crops → sharp 本地裁图 → crop base64
    POST /verify       → extraction_history + update extracted_data
```

## Components

### 1. inference-ocr extractor

New `TextExtractor` implementation, type `inference-ocr`.

| Detail | Value |
|--------|-------|
| Extractor type | `inference-ocr` |
| Backend | HTTP POST to pytoya-ocr service (`/infer`) |
| Failure behavior | Return empty result, non-blocking |

**pytoya-ocr 侧接口契约：**

```
POST /infer
  Request:  { "image": "<base64 of full page>" }
  Response: { "results": [{ "text": "...", "confidence": 0.92, "bbox": [x, y, w, h] }] }
```

bbox format: `[x, y, w, h]` (pixel coordinates relative to original page image).

**Config** (`config.yaml`):
```yaml
ocrService:
  baseUrl: http://localhost:8090
```

### 2. Multi-OCR Execution Engine

`TextExtractorService.extract()` modified to:

- Accept `extractorIds: string[]` (not single string)
- Run all extractors in parallel via `Promise.allSettled`
- Merge all successful results into `pages[].markdown` with `=== Extractor: <name> ===` delimiter
- Graceful degradation: failures silently skipped, at least one success required

**Merge format:**
```
=== Extractor: PaddleOCR-VL ===
{markdown from paddleocr-vl}

=== Extractor: inference-ocr ===
text=INV-12345  conf=0.92  bbox=[100,50,200,30]
text=Date:       conf=0.95  bbox=[100,85,150,20]
```

### 3. Multi-Source DeepSeek Prompt

System prompt stored in `prompts` database table as `multi_ocr_extraction` entry.

**Core logic:**
```
You will receive OCR results from multiple extractors,
separated by "=== Extractor: <name> ===" markers.

Cross-reference rules:
- Text matches across extractors → high confidence, extract directly
- Text differs → mark for human review
- Box confidence < 0.8 → mark for human review

Output JSON:
{
  "extracted_data": { ... normal extraction fields ... },
  "_human_review": [
    {
      "field": "<json path>",
      "reason": "confidence_mismatch" | "low_confidence" | "source_mismatch",
      "ocr_text": "<source text>",
      "page": <int>,
      "bbox": [x, y, w, h]
    }
  ]
}
```

If all fields have high confidence, `_human_review` is empty array.

### 4. API Endpoints

#### GET /manifests/:id/pending-crops?threshold=0.8

Reads latest `extraction_history` entry, extracts `_human_review[]`. Filters out already-verified items (query `extraction_history` where reason=`manual_crop_verification`). Crops images using **sharp** (locally, no external service call).

**Response:**
```json
{
  "items": [
    {
      "field": "invoice_no",
      "page": 1,
      "cropImage": "base64...",
      "ocrText": "INV-12345",
      "confidence": 0.65,
      "reason": "low_confidence"
    }
  ],
  "total": 5
}
```

#### POST /manifests/:id/crops/verify

**Request:**
```json
{
  "field": "invoice_no",
  "page": 1,
  "correctedText": "INV-67890"
}
```

**Actions:**
1. Verify field not already verified (idempotency check)
2. Write `extraction_history` with reason=`manual_crop_verification`, `changes={field, page, originalText, correctedText}`
3. Update `manifest.extracted_data[field] = correctedText` via `updateManifestUseCase`

No training_samples table. No export script. Training data collection is pytoya-ocr's responsibility.

### 5. Storage & Data Flow

| Data | Storage | Notes |
|------|---------|-------|
| Multi-extractor results | `manifest.ocr_result.pages[].markdown` | All extractors' output concatenated with delimiters |
| DeepSeek output | `extraction_history` (reason=`extraction`) | Full output including `_human_review` |
| Human verification | `extraction_history` (reason=`manual_crop_verification`) | Per-field correction record |

## Non-Goals

- Changes to `ManifestStatus` enum or `humanVerified` boolean
- New frontend (crop review UI is in pytoya-mobile)
- Training data storage or export (pytoya-ocr's concern)
- Modifications to `OcrResultDto`

## Open Questions

1. **extractor IDs 来源**：每次 `POST /manifests/:id/extract` API 上传，还是 schema 上配一个默认 extractor 列表？
2. **sharp 依赖**：需要加到 `package.json`（目前没有），v1 可以 fallback 到不裁图、返回空 cropImage
