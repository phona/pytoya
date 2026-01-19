# Tasks: OCR Result Preview and Selective Extraction

## 1. Database & Backend Foundation

- [ ] 1.1 Create database migration for new ManifestEntity columns
  - Add `ocr_result` JSONB column
  - Add `ocr_processed_at` TIMESTAMP column
  - Add `ocr_quality_score` INTEGER column
  - Add `extraction_cost` DECIMAL column
  - Add indexes on `ocr_processed_at` and `ocr_quality_score`

- [ ] 1.2 Update ManifestEntity with new properties
  - Add `ocrResult` property
  - Add `ocrProcessedAt` property
  - Add `ocrQualityScore` property
  - Add `extractionCost` property

- [ ] 1.3 Update ManifestResponseDto to include new fields
  - Add OCR result fields to response DTO
  - Update DTO transformation in `fromEntity()`

- [ ] 1.4 Create OcrResultDto
  - Define TypeScript interfaces for OCR result structure
  - Include document metadata, pages, layout analysis, vision analysis

- [ ] 1.5 Create CostEstimateDto
  - Define cost estimation request/response interfaces

- [ ] 1.6 Create database migration for ModelEntity pricing columns
  - Add `pricing` JSONB column (ocr.pricePerPage or llm.inputPrice/outputPrice)
  - Add `pricing_history` JSONB array for tracking price changes
  - Set default pricing based on adapter_type

- [ ] 1.7 Update ModelEntity with pricing properties
  - Add `pricing` property with ocr/llm pricing structure
  - Add `pricingHistory` array
  - Update ModelResponseDto to include pricing

## 2. Model Pricing Implementation

- [ ] 2.1 Create ModelPricingService
  - Implement `calculateOcrCost(pages, pricing)` function
  - Implement `calculateLlmCost(inputTokens, outputTokens, pricing)` function
  - Implement `calculateTotalExtractionCost()` combining both

- [ ] 2.2 Seed default model pricing
  - Add PaddleOCR-VL pricing: $0.001 per page
  - Add GPT-4o-mini pricing: $0.15 input / $0.60 output per 1M tokens
  - Add GPT-4o pricing: $2.50 input / $10.00 output per 1M tokens
  - Add Claude 3.5 Sonnet pricing: $3.00 input / $15.00 output per 1M tokens
  - Add SiliconFlow Qwen pricing: $0.10 input / $0.10 output per 1M tokens
  - Add local model pricing: $0.00 (free)

- [ ] 2.3 Implement pricing update API
  - `PATCH /models/:id/pricing` endpoint for admins
  - Validate pricing structure
  - Archive old pricing to pricing_history
  - Set new effectiveDate

- [ ] 2.4 Implement cost estimation service
  - Calculate OCR cost from page count
  - Estimate LLM tokens from OCR result size
  - Return min-max cost range for selected documents

## 3. Backend API Implementation

- [ ] 3.1 Implement OCR result caching in extraction service
  - Modify OCR processing to store result in database
  - Calculate OCR quality score
  - Store processing timestamp

- [ ] 3.2 Implement `GET /manifests/:id/ocr` endpoint
  - Retrieve cached OCR result
  - Return 404 if not found
  - Include quality score in response

- [ ] 3.3 Implement `POST /manifests/:id/ocr` endpoint
  - Check for existing OCR result
  - Support `force` query parameter for re-processing
  - Trigger PaddleOCR-VL processing
  - Store new result

- [ ] 3.4 Implement OCR quality scoring logic
  - Calculate text coverage
  - Average confidence from PaddleOCR-VL
  - Layout detection success
  - Language matching
  - Combine into 0-100 score

- [ ] 3.5 Implement cost tracking in extraction service
  - Track input/output tokens used
  - Calculate cost from model pricing (OCR per page + LLM per token)
  - Store cost in `extraction_cost` column

- [ ] 3.6 Implement `POST /manifests/:id/extract` endpoint
  - Validate OCR result exists (or trigger it)
  - Calculate cost estimate using ModelPricingService
  - Queue BullMQ extraction job
  - Return job ID and cost estimate

- [ ] 3.7 Implement `POST /manifests/extract-bulk` endpoint
  - Accept array of manifest IDs
  - Validate all manifests have OCR results
  - Calculate aggregate cost estimate
  - Queue multiple BullMQ jobs
  - Return job ID and cost summary

- [ ] 3.8 Implement `GET /manifests/cost-estimate` endpoint
  - Accept manifest IDs and model selection
  - Calculate page count for OCR cost
  - Estimate LLM tokens from OCR result size
  - Return min-max cost range

- [ ] 3.9 Implement `POST /manifests/:id/re-extract-field` endpoint
  - Validate field name (dot notation)
  - Extract relevant OCR context
  - Calculate cost for field-level extraction
  - Return OCR preview and cost estimate
  - Queue targeted extraction job

- [ ] 3.10 Add background job for existing manifests
  - Query manifests with extraction data but no OCR
  - Backfill OCR results asynchronously
  - Handle errors gracefully

- [ ] 3.11 Update extraction job to record cost
  - Modify job completion handler
  - Track pages processed (OCR cost)
  - Track input/output tokens used (LLM cost)
  - Calculate actual cost using ModelPricingService
  - Update manifest record

## 4. Frontend Components - Core

- [ ] 4.1 Create OcrPreviewModal component
  - Modal with tabs (PDF, Text, Layout, Vision)
  - Loading states
  - Error handling
  - Accessibility (keyboard navigation, ARIA labels)

- [ ] 4.2 Implement PDF preview tab
  - Scaled PDF rendering
  - Page navigation
  - OCR quality badge display
  - Extract button

- [ ] 4.3 Implement raw text tab
  - Text display with line numbers
  - Search functionality
  - Copy to clipboard
  - Download button
  - Confidence highlighting toggle

- [ ] 4.4 Implement layout tab
  - Document type display
  - Layout elements list
  - Table preview component
  - Position information

- [ ] 4.5 Implement vision analysis tab
  - LLM caption display
  - Detected fields table
  - Quality warnings
  - Copy to schema button

- [ ] 4.6 Create QuickOcrPeek component
  - Hover-triggered popup
  - 500ms delay before showing
  - Key fields display
  - View full link
  - Dismiss on mouse out/Escape

- [ ] 4.7 Update ManifestTable component
  - Add OCR Quality column
  - Add [Extract→] / [⟳ Re-extract] buttons
  - Add [👁️ Preview OCR] button
  - Update status indicators
  - Add row color coding (green/yellow/red borders)

- [ ] 4.8 Create ExtractConfirmationModal component
  - Show manifest count and page count
  - Display cost estimate (OCR per page + LLM per token)
  - Model selection dropdown with pricing display
  - Prompt template selection
  - Budget warning if applicable
  - Confirm/Cancel buttons

- [ ] 4.9 Create ExtractionProgressView component
  - Progress bar
  - Current document display
  - Speed and ETA
  - Live queue visualization
  - Accumulated cost (OCR + LLM)
  - Pause/Stop controls

- [ ] 4.10 Create ExtractionCostTracker component
  - Budget progress bar
  - Monthly cost display
  - Average cost per doc
  - Cost breakdown (OCR vs LLM)
  - Detailed log link

- [ ] 4.11 Create CostLogModal component
  - Chronological extraction list
  - Cost per entry with breakdown
  - Total aggregation
  - Export CSV button
  - Budget alert setup

## 5. Frontend Components - Advanced

- [ ] 5.1 Create FieldReExtractDialog component
  - Current value display
  - OCR context preview (JSON snippet)
  - Custom prompt textarea
  - Model selection with pricing
  - Estimated cost breakdown
  - Submit/Cancel buttons

- [ ] 5.2 Create SchemaTestMode component
  - Test mode toggle
  - Document selection
  - Extract selected button
  - Results summary panel
  - Field performance breakdown
  - Round comparison view
  - Recommendations display
  - Cost per test round

- [ ] 5.3 Update Manifest detail page
  - Add [👁️ OCR Raw] tab
  - Add re-extract buttons to fields
  - Update status display
  - Add extraction history tab with costs

- [ ] 5.4 Create ExtractionHistoryPanel component
  - Timeline of extractions
  - Cost per attempt (OCR + LLM breakdown)
  - Success/failure indicators
  - Compare runs button

- [ ] 5.5 Create ModelPricingConfig component (admin)
  - Pricing form for OCR models (per page)
  - Pricing form for LLM models (per 1M tokens input/output)
  - Currency selection
  - Minimum charge option
  - Price history table
  - Save/Cancel buttons

## 6. Frontend State Management

- [ ] 6.1 Create extraction Zustand store
  - OCR results cache
  - Extraction queue
  - Cost tracking (OCR + LLM breakdown)
  - Schema test mode state
  - Test results cache

- [ ] 6.2 Add API client methods
  - `getOcrResult(manifestId)`
  - `triggerOcr(manifestId, force?)`
  - `extractManifest(manifestId, options)`
  - `extractBulk(manifestIds, options)`
  - `reExtractField(manifestId, fieldName, options)`
  - `getCostEstimate(manifestIds, modelId)` - returns OCR + LLM cost breakdown
  - `updateModelPricing(modelId, pricing)` - admin only

- [ ] 6.3 Update WebSocket integration
  - Handle extraction progress events
  - Handle OCR completion events
  - Update cost tracker in real-time (OCR + LLM)

## 7. Filtering & Sorting Updates

- [ ] 7.1 Add OCR quality filter to ManifestFilters
  - Filter options (Excellent, Good, Poor, Not Processed)

- [ ] 7.2 Add extraction status filter to ManifestFilters
  - Filter options (Not Extracted, Extracting, Complete, Partial, Failed)

- [ ] 7.3 Add cost range filter to ManifestFilters
  - Min/max inputs
  - Range slider

- [ ] 7.4 Update API query params for new filters
  - Add `ocrQualityMin`, `ocrQualityMax`
  - Add `extractionStatus`
  - Add `costMin`, `costMax`

## 8. Tests

- [ ] 8.1 Backend unit tests
  - OCR quality scoring logic
  - Cost calculation logic (OCR per page + LLM per token)
  - ModelPricingService functions
  - OCR result DTO transformation

- [ ] 8.2 Backend integration tests
  - `GET /manifests/:id/ocr` endpoint
  - `POST /manifests/:id/ocr` endpoint
  - `PATCH /models/:id/pricing` endpoint
  - Bulk extraction endpoint
  - Field re-extract endpoint

- [ ] 8.3 Frontend component tests
  - OcrPreviewModal
  - QuickOcrPeek
  - ExtractConfirmationModal with cost breakdown
  - FieldReExtractDialog
  - SchemaTestMode
  - ModelPricingConfig (admin)

- [ ] 8.4 Frontend integration tests
  - ManifestTable with new columns
  - Extraction flow end-to-end with cost tracking
  - Cost tracker updates (OCR + LLM)

- [ ] 8.5 E2E tests
  - Upload → OCR → Preview flow
  - Select → Extract → Verify with cost tracking
  - Field re-extract flow
  - Schema test mode flow
  - Model pricing update flow (admin)

## 9. Documentation

- [ ] 9.1 Update API documentation
  - Document new endpoints
  - Add request/response examples
  - Update authentication notes
  - Document pricing structure

- [ ] 9.2 Update user guide
  - How to preview OCR results
  - How to use selective extraction
  - How to re-extract fields
  - How to use schema test mode
  - Cost tracking features
  - Understanding OCR vs LLM costs

- [ ] 9.3 Update admin guide
  - How to configure model pricing
  - How to update pricing when providers change rates
  - How to view pricing history

- [ ] 9.4 Update CLAUDE.md
  - Document new OCR caching behavior
  - Add cost tracking notes (OCR per page, LLM per token)
  - Update extraction workflow description
  - Document ModelPricingService

## 10. Deployment & Migration

- [ ] 10.1 Run database migration
  - Apply migration on dev environment
  - Test rollback procedure
  - Verify data integrity

- [ ] 10.2 Backfill OCR results for existing manifests
  - Run background job
  - Monitor progress
  - Handle failures

- [ ] 10.3 Seed default model pricing
  - Run pricing seed script
  - Verify all models have pricing set
  - Test cost calculation with sample data

- [ ] 10.4 Feature flag for new extraction flow
  - Add config option for auto vs manual extraction
  - Allow gradual rollout

- [ ] 10.5 Production deployment
  - Deploy backend changes
  - Deploy frontend changes
  - Run migration
  - Seed pricing data
  - Monitor metrics

## 11. Monitoring & Optimization

- [ ] 11.1 Add monitoring for OCR result storage
  - Database size metrics
  - Query performance
  - Compression ratio

- [ ] 11.2 Add cost tracking metrics
  - Actual vs estimated cost accuracy
  - Cost per document trends (OCR vs LLM breakdown)
  - Budget alerting
  - OCR cost per page trends
  - LLM cost per token trends

- [ ] 11.3 Performance optimization
  - Add database indexes if needed
  - Optimize large JSONB queries
  - Add caching for frequently accessed OCR results

- [ ] 11.4 User feedback collection
  - Add feedback prompts after extraction
  - Track schema test mode usage
  - Monitor field re-extract patterns
  - Track model selection patterns

