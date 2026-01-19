# Change: Add OCR Result Preview and Selective Extraction

## Why

The current extraction workflow processes all documents immediately after upload, which wastes LLM API costs when the extraction schema is not properly configured. Users need visibility into OCR results before committing to expensive LLM extraction, and the ability to iteratively test and debug extraction schemas on a small sample before processing bulk documents. Additionally, users cannot currently view the raw OCR/vision LLM results that inform extraction decisions.

## What Changes

### Backend Changes
- Add OCR result caching to `ManifestEntity` (store PaddleOCR-VL output)
- Add OCR quality scoring and metadata tracking
- Store extraction cost per document
- Add API endpoints for:
  - Getting cached OCR results
  - Triggering manual OCR (if not already cached)
  - Selective extraction (user chooses which documents to extract)
  - Field-level re-extraction with OCR context preview
  - Cost estimation before extraction
- Modify extraction flow to be on-demand rather than automatic

### Frontend Changes
- Add OCR Preview modal with tabs:
  - Original PDF preview
  - Raw text view with line numbers
  - Layout analysis (tables, key-value pairs)
  - Vision LLM analysis (detected fields, quality warnings)
- Update ManifestTable to show:
  - OCR quality score
  - Extraction status (not extracted, extracting, extracted, partial)
  - Per-row "Extract" button
  - Quick OCR peek on hover
- Add Schema Test Mode:
  - Compare extraction results across multiple test documents
  - Field-by-field success rate visualization
  - Round-to-round comparison after schema tweaks
- Add extraction cost tracking and estimation UI
- Add field-level re-extraction dialog with OCR context preview
- Update extraction progress to show real-time cost accumulation

### Database Changes
- Add columns to `manifests` table:
  - `ocr_result` (JSONB) - cached OCR output
  - `ocr_processed_at` (TIMESTAMP) - when OCR was run
  - `ocr_quality_score` (INTEGER) - 0-100 quality metric
  - `extraction_cost` (DECIMAL) - cost of LLM extraction for this doc

## Impact

### Affected Specs
- `specs/extraction/spec.md` - OCR result caching, selective extraction, field-level re-extraction
- `specs/web-app/spec.md` - OCR preview UI, extraction workflow changes

### Affected Code
- Backend:
  - `src/apps/api/src/entities/manifest.entity.ts`
  - `src/apps/api/src/extraction/extraction.service.ts`
  - `src/apps/api/src/manifests/manifests.controller.ts`
  - `src/apps/api/src/manifests/dto/manifest-response.dto.ts`
  - New: `src/apps/api/src/manifests/dto/ocr-result.dto.ts`
  - Database migration required

- Frontend:
  - `src/apps/web/src/shared/components/manifests/ManifestTable.tsx`
  - `src/apps/web/src/shared/components/manifests/ManifestCard.tsx`
  - `src/apps/web/src/shared/components/manifests/OcrPreviewModal.tsx` (new)
  - `src/apps/web/src/shared/components/manifests/FieldReExtractDialog.tsx` (new)
  - `src/apps/web/src/shared/components/manifests/SchemaTestMode.tsx` (new)
  - `src/apps/web/src/api/manifests.ts`

### Benefits
- **Cost savings**: Users can test schemas on 3-5 documents (~$0.15) before committing to bulk extraction (~$5-50)
- **Faster iteration**: Schema debug cycle reduced from 30+ minutes to 2 minutes
- **Better visibility**: Users can see what the OCR/LLM sees before extraction
- **Targeted fixes**: Re-extract individual fields instead of entire documents
- **Confidence in results**: Quality scores and warnings before extraction costs are incurred

### Breaking Changes
- Extraction is no longer automatic after upload - users must manually trigger it
- Old manifests won't have cached OCR results (will need re-OCR)

### Migration Path
- Existing manifests: Run background job to populate OCR results for documents that have extraction data
- API changes: Add new endpoints, keep existing ones for backward compatibility
- Frontend: Update ManifestTable to show new status, add option buttons
