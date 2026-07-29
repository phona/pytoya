# Dual OCR + Confidence Routing + Human-in-Loop

Date: 2026-07-29
Status: Draft v2

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
              ▼                             ▼ (async)
   ┌────────────────────┐     ┌────────────────────────────┐
   │ PaddleOCR-VL       │     │ det_v4+rec_v8 Local       │
   │ (remote, external) │     │ (FastAPI, same host)       │
   │ → markdown         │     │ → [{text,confidence,bbox}] │
   └────────┬───────────┘     └───────────┬────────────────┘
            │                             │
            └──────────┬──────────────────┘
                       ▼
            ┌──────────────────────┐
            │ Merge: pages[].text  │
            │ with delimiter       │
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │ DeepSeek Extraction  │
            │ Input: Dual OCR text │
            │ (concatenated)       │
            │ Output:             │
            │  extracted_data     │
            │  _human_review[]    │
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

### 1. det_v4+rec_v8 Python OCR Service

Independent FastAPI service deployed alongside pytoya, called *asynchronously* after the main PaddleOCR-VL pipeline completes.

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

bbox format: `[x, y, w, h]` (pixel coordinates relative to original page image).

**Config** (`config.yaml`):
```yaml
ocrService:
  baseUrl: http://localhost:8090
```

### 2. Text Concatenation Strategy

det_v4+rec_v8 runs after the main PaddleOCR-VL extraction but before the LLM stage (inline within extraction, not a separate async job). Its output is concatenated into both `pages[].text` and `pages[].markdown` with a delimiter — the extraction pipeline reads from `markdown`, so both must be updated.

**Per-page text format:**
```
{existing PaddleOCR-VL markdown}

=== PaddleOCR boxes ===
text=INV-12345  conf=0.92  bbox=[100,50,200,30]
text=Date:       conf=0.95  bbox=[100,85,150,20]
text=2024-01-15  conf=0.88  bbox=[150,85,250,20]
```

The delimiter `=== PaddleOCR boxes ===` allows DeepSeek to parse both sources. Existing prompt builder's `ocrMarkdown` parameter receives this concatenated text without any signature change.

If the det_v4+rec_v8 service is unavailable, the text remains as-is (PaddleOCR-VL only) — degradation is graceful.

### 3. Dual-Source DeepSeek Prompt

System prompt stored in `prompts` database table as `dual_ocr_extraction` entry.

**Core additions:**
```
You will receive TWO OCR sources separated by "=== PaddleOCR boxes ===":
1. Before delimiter: full-page markdown from Qwen-VL
2. After delimiter: individual text boxes with confidence scores and positions

Cross-reference rules:
- Text matches in both sources → high confidence, extract directly
- Text differs → mark for human review, include both texts
- Box confidence < 0.8 → mark for human review

Output JSON:
{
  "extracted_data": { ... existing fields ... },
  "_human_review": [
    {
      "field": "<json path>",
      "reason": "confidence_mismatch" | "low_confidence" | "source_mismatch",
      "ocr_text": "<source text from box>",
      "page": <int>,
      "bbox": [x, y, w, h]
    }
  ]
}
```

Key change: `_human_review[]` now includes `page_number` (required for multi-page crop).

### 4. API Endpoints

#### GET /manifests/:id/pending-crops?threshold=0.8&page=1

Reads latest `extraction_history` entry (reason=`extraction`), extracts `_human_review[]`. Filters out items already verified (check `extraction_history` with reason=`manual_crop_verification`). For each remaining item, calls Python OCR service `/crop` with page image + bbox coordinates.

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
  "total": 5,
  "page": 1
}
```

Pagination: `_human_review` can be numerous on complex documents. Default page size 20.

#### POST /manifests/:id/crops/verify

Field is sent in request body (not URL path), so dots in field paths (e.g. `line_items.0.name`) are handled naturally.

**Request:**
```json
{
  "field": "invoice_no",
  "page": 1,
  "correctedText": "INV-67890"
}
```

Validated with `VerifyCropDto`.

**Actions:**
1. Validate item hasn't been verified yet (query `extraction_history` where reason=`manual_crop_verification` AND changes->>'field' = field)
2. Write `extraction_history` record with `reason='manual_crop_verification'`, `changes={field, page, originalText, correctedText}`
3. Update `manifest.extracted_data[field] = correctedText` via existing `updateManifestUseCase` (reuses validation and audit trail logic)
4. Insert into `training_samples` table

### 5. Database: training_samples

TypeORM entity + migration (not raw SQL).

```
training_samples
├── id: Serial PK
├── manifest_id: FK → manifests.id
├── field: varchar
├── page: integer
├── ocr_text: text
├── corrected_text: text
├── confidence: float
├── crop_image: text (base64, stored once to avoid re-cropping on export)
├── source: varchar ('paddleocr_vl' | 'det_v4_rec_v8')
├── exported: boolean default false
├── created_at: timestamp
└── exported_at: timestamp nullable
```

### 6. Export Script

Weekly cron job (or manual trigger):

**Script:** `scripts/export-training-samples.ts`

**For PaddleOCR fine-tuning (JSONL format):**
```jsonl
{"image": "<base64>", "text": "<corrected_text>"}
```
One JSONL line per row, consumed directly by PaddleOCR training pipeline (`tools/train.py`).

**For prompt review (CSV):**
```csv
field,ocr_text,corrected_text,confidence,source
invoice_no,INV-12345,INV-67890,0.65,det_v4_rec_v8
```

Export marks rows as `exported = true` after successful export.

### 7. Storage & Data Flow Summary

| Data | Storage | Notes |
|------|---------|-------|
| PaddleOCR-VL markdown | `manifest.ocr_result.pages[].text` | First part, before delimiter |
| det_v4+rec_v8 boxes | Same field, after delimiter | Concatenated with `=== PaddleOCR boxes ===` |
| DeepSeek extraction output | `extraction_history` (reason=`extraction`) | Full output including `_human_review` |
| Human verification | `extraction_history` (reason=`manual_crop_verification`) | Per-field correction record |
| Training samples | `training_samples` table | Clean, exportable format |

### 8. Feedback Loops

| Loop | Trigger | Target | Effect |
|------|---------|--------|--------|
| Immediate | POST /verify | `extracted_data` | Data corrected in DB immediately |
| OCR training | Weekly export script → JSONL | rec_v8 fine-tune | OCR recognition rate improves |
| Prompt optimization | Weekly export → CSV | Human reviews extraction prompt | LLM extracts better from known failures |
| Few-shot pool | Verified samples with confidence improvement | Few-shot examples for extraction | LLM learns from manual corrections |

## Non-Goals

- Changes to `ManifestStatus` enum or `humanVerified` boolean
- New frontend (crop review UI is in pytoya-mobile)
- Real-time model training pipeline
- Modifications to `extraction_history` schema (uses existing columns)
- Modifications to `OcrResultDto` (uses existing `pages[].text`)

## Open Questions

1. det_v4+rec_v8 async timing: run immediately after PaddleOCR-VL completes (within the same request lifecycle) or as a background job via BullMQ? Prefer background job to avoid blocking extraction.
2. Export schedule: weekly manual trigger or cron-based automation? Manual to start.
