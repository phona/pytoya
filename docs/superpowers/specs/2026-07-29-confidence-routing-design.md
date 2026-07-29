# Dual OCR + Confidence Routing + Human-in-Loop

Date: 2026-07-29
Status: Draft

## Problem

PaddleOCR fine-tuning to 99% accuracy is not achievable. Instead of chasing perfect OCR, accept OCR imperfection and route low-confidence fields to human reviewers for crop-level verification. Corrected data feeds back into both OCR model training and LLM extraction prompt optimization.

## Architecture

```
                    ┌──────────────────┐
                    │   Upload PDF     │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
   ┌────────────────────┐     ┌────────────────────────────┐
   │ PaddleOCR-VL       │     │ det_v4+rec_v8 Local       │
   │ (remote, external) │     │ (FastAPI, same host)       │
   │ → markdown         │     │ → [{text,confidence,bbox}] │
   └────────┬───────────┘     └───────────┬────────────────┘
            │                             │
            └──────────┬──────────────────┘
                       ▼
            ┌──────────────────────┐
            │ DeepSeek Extraction  │
            │ Input: Dual OCR     │
            │ Output:             │
            │  extracted_data     │
            │  _human_review[]    │ ← marks low-conf /
            │                       inconsistent fields
            └──────────┬───────────┘
                       │
              ┌────────┴──────────────┐
              │                       │
              ▼                       ▼
   ┌──────────────────┐   ┌─────────────────────┐
   │ extracted_data   │   │ _human_review[]     │
   │ → save to DB     │   │ → GET /pending-crops│
   │ (existing path)  │   │ → crop from bbox    │
   │                  │   │ → human reviews     │
   │                  │   │ → POST /verify      │
   │                  │   │ → updates data      │
   │                  │   │ → writes to         │
   │                  │   │   training_samples  │
   └──────────────────┘   └─────────────────────┘
```

## Components

### 1. OCR Plugin Interface

Located in `src/apps/api/src/text-extractor/`:

```typescript
interface OcrPluginResult {
  text: string;
  confidence: number;
  boxes?: Array<{
    text: string;
    confidence: number;
    bbox: [number, number, number, number]; // x, y, w, h
  }>;
  metadata?: Record<string, unknown>;
}

interface OcrPlugin {
  readonly name: string;
  extract(file: Buffer, options?: Record<string, unknown>): Promise<OcrPluginResult>;
}
```

All existing extractors (`PaddleOcrExtractor`, `VisionLlmExtractor`, `TesseractExtractor`) implement this interface.

`TextExtractorService.extract()` is modified to call all registered plugins in parallel. Each plugin's output is stored in `OcrResultDto.rawResponse[pluginName]`. Plugin failure is non-blocking.

### 2. Python OCR Service (det_v4 + rec_v8)

Independent FastAPI service deployed alongside pytoya.

| Detail | Value |
|--------|-------|
| Port | 8090 |
| Language | Python + PaddleOCR SDK |
| Models | `det_v4.best.pdparams`, `rec_v8.best.pdparams` (~24MB each) |
| Hardware | 2C2G CPU, shared host |
| Performance | 80-100 boxes/sec, ~3-5s per page |

**Endpoints:**

| Method | Path | Input | Output |
|--------|------|-------|--------|
| POST | `/infer` | base64 image | `[{text, confidence, bbox}]` |
| POST | `/crop` | base64 image + bbox | crop base64 image |

**Config** (`config.yaml`):
```yaml
ocrService:
  baseUrl: http://localhost:8090
```

### 3. Dual-Source DeepSeek Prompt

Extraction prompt modified to accept two OCR sources. System prompt stored in `prompts` database table as `dual_ocr_extraction` entry.

**System prompt additions:**
```
You will receive TWO OCR sources for the same document:
1. PaddleOCR-VL markdown — full page text as markdown
2. PaddleOCR boxes — individual text detections with confidence scores

Cross-reference rules:
- Text matches in both sources → high confidence, extract directly
- Text differs between sources → mark for human review, include both texts
- Box confidence < 0.8 → mark for human review

Output JSON:
{
  "extracted_data": { ... existing extraction fields ... },
  "_human_review": [
    {
      "field": "<json path>",
      "reason": "confidence_mismatch" | "low_confidence" | "source_mismatch",
      "ocr_text": "<source text from the OCR box>",
      "bbox": [x, y, w, h]
    }
  ]
}
```

**User message format:**
```
=== OCR Source 1 (PaddleOCR-VL markdown) ===
{markdown}

=== OCR Source 2 (det_v4+rec_v8 boxes) ===
text=...  conf=...  bbox=...
text=...  conf=...  bbox=...
```

### 4. API Endpoints

#### GET /manifests/:id/pending-crops?threshold=0.8

Reads latest `extraction_history` entry (reason=`extraction`), extracts `_human_review[]`. Filters out items already verified (check `extraction_history` with reason=`manual_crop_verification`). For each remaining item, calls Python OCR service `/crop` with the bbox coordinates.

**Response:**
```json
{
  "items": [
    {
      "id": "<fieldPath>",
      "fieldPath": "invoice_no",
      "cropImage": "base64...",
      "ocrText": "INV-12345",
      "confidence": 0.65,
      "reason": "low_confidence"
    }
  ]
}
```

#### POST /manifests/:id/crops/:fieldPath/verify

**Request:**
```json
{ "correctedText": "INV-67890" }
```

**Actions:**
1. Validate item hasn't been verified yet (idempotency check)
2. Write `extraction_history` record with `reason='manual_crop_verification'`
3. Update `manifest.extracted_data[fieldPath] = correctedText`
4. Insert into `training_samples` table

### 5. Database: training_samples

```sql
CREATE TABLE training_samples (
  id            SERIAL PRIMARY KEY,
  manifest_id   INTEGER NOT NULL REFERENCES manifests(id),
  field_path    VARCHAR(255) NOT NULL,
  ocr_text      TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  confidence    FLOAT NOT NULL,
  crop_image    TEXT,           -- base64 of crop, stored to avoid re-cropping on export
  source        VARCHAR(50) NOT NULL,  -- 'paddleocr_vl' | 'det_v4_rec_v8'
  exported      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

Export script: `SELECT * FROM training_samples WHERE exported = FALSE` → format for PaddleOCR fine-tuning → `UPDATE training_samples SET exported = TRUE`.

### 6. Feedback Loops

| Loop | Trigger | Target | Effect |
|------|---------|--------|--------|
| Immediate | POST /verify | `extracted_data` | Data corrected in DB, available immediately |
| OCR training | Weekly export | rec_v8 fine-tune | OCR recognition rate improves over time |
| Prompt optimization | Weekly export | Extraction prompt review | LLM extracts better from known failure patterns |
| Few-shot pool | Confidence threshold pass | Few-shot examples | Low-conf corrections feed back into LLM context |

## Non-Goals

- Changes to `ManifestStatus` enum or `humanVerified` logic
- New frontend (crop review UI is in pytoya-mobile)
- Real-time model training pipeline
- Modifications to existing extraction workflow phases

## Open Questions

1. Prompt management: store dual-OCR prompt as a new `prompts` entry (`dual_ocr_extraction`), referenced by promptId during extraction
2. Crop image storage: store base64 inline in `training_samples` vs store on filesystem and reference path. Prefer inline for simplicity at this scale.
3. Export format: specific format TBD based on rec_v8 fine-tuning requirements
