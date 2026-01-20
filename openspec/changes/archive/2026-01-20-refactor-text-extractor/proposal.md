# Change: Refactor Text Extraction with Pluggable Extractors

## Why

The current extraction system tightly couples OCR and vision LLM logic within `ExtractionService`, making it difficult to:
- Add new text extraction methods (Tesseract, Azure Vision, etc.)
- Test extraction logic independently from orchestration
- Configure different extractors per project by selecting a global extractor (no per-project params)
- Maintain clear separation between text extraction and structured data extraction
- Allow users to configure extractors through the web UI

This refactoring introduces **text extractors as global resources** (similar to Models), enabling:
- Reusable extractor configurations created once and shared across projects
- Dynamic extractor registration and instantiation
- Project-specific extractor selection (select only)
- Easy addition of new extractors without modifying core code
- Better testability through interface abstraction
- User-friendly extractor management

## What Changes

### Backend Changes
- **NEW**: `ExtractorEntity` for global extractor configurations (like `ModelEntity`)
- **NEW**: `TextExtractor` interface with static metadata declaration
- **NEW**: `TextExtractorRegistry` for extractor discovery and management
- **NEW**: `TextExtractorFactory` for dynamic instantiation with config caching
- **NEW**: Concrete extractor implementations:
  - `PaddleOcrExtractor` (PaddleOCR-VL integration)
  - `VisionLLMExtractor` (generic OpenAI-compatible vision LLM)
  - `TesseractExtractor` (open-source OCR)
- **NEW**: API endpoints for extractor CRUD operations
- **NEW**: `ExtractionService` rewritten to use `TextExtractorService` abstraction
- **MODIFIED**: `ProjectEntity` adds `textExtractorId` field (references `ExtractorEntity`)
- **REMOVED**: Old extraction strategy enum (`OCR_FIRST`, `VISION_ONLY`, etc.)
- **REMOVED**: Direct `OcrService` and `LlmService` vision logic from `ExtractionService`

### Frontend Changes
- **NEW**: Global Extractors page at `/extractors` (sidebar link)
  - List all extractors with card grid
  - Create, edit, delete extractors
  - Test extractor connections
  - **Show cost per extraction and total spend**
- **NEW**: Extractor card component (following `ModelCard` pattern)
  - Display cost information
- **NEW**: Extractor form dialog for creating/editing
  - Include pricing configuration for cost calculation
- **NEW**: Project Settings → Extractors page for wiring extractor to project
  - Selection only (pick from existing global extractors)
- **NEW**: Project cost summary page showing extraction costs
- **NEW**: Manifest detail shows extraction cost breakdown
- **MODIFIED**: Sidebar navigation (add Extractors link; keep existing items)
- **MODIFIED**: Models page removes OCR configuration (LLM-only)
  - Vision-capable models do not require OCR config
  - Text extraction is configured in Extractors
- **NEW**: Manifests list shows extractor used and cost columns

### Breaking Changes

This is a **complete rewrite** of the extraction layer:
- `ExtractionService.runExtraction()` completely rewritten
- Old extraction strategy enum removed
- `OcrService` and `LlmService` vision methods moved to extractors
- Projects MUST have extractor configured (no fallback to old behavior)
- Project selection stores only `textExtractorId` (extractor config remains global)

## Impact

- **Affected specs**: extraction, web-app
- **Affected code**:
  - `src/apps/api/src/entities/extractor.entity.ts` (NEW)
  - `src/apps/api/src/extraction/extraction.service.ts` (complete rewrite)
  - `src/apps/api/src/ocr/ocr.service.ts` (code moved to PaddleOcrExtractor)
  - `src/apps/api/src/llm/llm.service.ts` (vision logic moved to VisionLLMExtractor)
  - `src/apps/api/src/text-extractor/` (new module)
  - `src/apps/web/src/routes/extractors/` (new page - sidebar)
  - `src/apps/web/src/routes/dashboard/projects/settings/extractors/` (new page)
  - `src/apps/web/src/shared/components/ExtractorCard.tsx` (new component)
  - `src/apps/web/src/shared/components/SettingsDropdown.tsx` (update)
  - `src/apps/web/src/routes/dashboard/ModelsPage.tsx` (remove OCR tab)
  - `src/apps/web/src/shared/components/models/ModelPricingConfig.tsx` (remove OCR pricing UI)
  - `src/apps/web/src/shared/components/ProjectWizard.tsx` (update step 4 to select extractor + LLM)

## Implementation Approach

1. Create `ExtractorEntity` for global extractor configurations
2. Create `TextExtractorModule` with extractors
3. Create global Extractors page (`/extractors`)
4. Create project settings Extractors page (`/projects/:id/settings/extractors`)
5. Rewrite `ExtractionService` to use new abstraction
6. Update sidebar navigation (add Extractors link)
7. Remove old `OcrService`, `LlmService` vision methods, and strategy enum

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Extensibility | Modify service to add extractors | Implement interface, register |
| Configuration | Hardcoded strategies | Global extractors, select per project |
| Reusability | N/A | Create once, use across projects |
| Testability | Mock multiple services | Mock single TextExtractor interface |
| Vision LLM Support | GPT-4 hardcoded | Any OpenAI-compatible model |
| Code Organization | Mixed concerns | Clear separation: extract → parse → save |
| User Experience | No extractor control | Full management via UI |
| **Cost Visibility** | No cost tracking | **Per-extraction and aggregate costs** |
| **Cost Comparison** | Can't compare extractors | **See cost per page to optimize** |

## Cost Calculation Feature

### Overview
Each text extraction will calculate and track cost based on the extractor's pricing model:
- **Vision LLM extractors**: Cost based on token usage (input image tokens, output text tokens)
- **OCR extractors** (PaddleOCR, Tesseract): Free or fixed infrastructure cost
- Costs are stored as numeric amounts (project currency) and displayed in UI

### Cost Data Flow
```
Extraction → Extractor.extract() → TextExtractionResult
  ├── text, markdown
  └── metadata
      ├── extractorId
      ├── processingTimeMs
      └── textCost (number, actual usage) + token usage (when available)

ExtractionService aggregates:
- job.ocrActualCost (internal storage for textCost)
- job.llmActualCost (structured extraction cost)
- manifest.extractionCost = text + llm (numeric total)
- WebSocket costBreakdown { text, llm, total }
```

### Pricing Configuration
Extractors include pricing in their configuration:
- **Vision LLM**: Input token price, output token price per 1M tokens
- **OCR**: Fixed cost per page or free
- Prices stored in `ExtractorEntity.config.pricing` (currency implied by pricing config)

### UI Cost Display
- **Extractor cards**: Show average cost per extraction
- **Manifest list**: Cost column for each extraction
- **Manifest detail**: Cost breakdown panel
- **Project cost summary**: Total extraction costs, cost per extractor
