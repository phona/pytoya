# Implementation Tasks

## 1. Backend - Core Infrastructure
- [x] 1.1 Create `TextExtractor` interface and types (`text-extractor/types/`)
- [x] 1.2 Create `BaseTextExtractor` abstract class with common validation logic
- [x] 1.3 Create `TextExtractorRegistry` service for extractor discovery
- [x] 1.4 Create `TextExtractorFactory` service for dynamic instantiation
- [x] 1.5 Create `TextExtractorModule` with all providers

## 2. Backend - Extractor Entity & Repository
- [x] 2.1 Create `ExtractorEntity` (id, name, description, extractorType, config, isActive)
- [x] 2.2 Create `ExtractorRepository`
- [x] 2.3 Create TypeORM migration for extractors table
- [x] 2.4 Add migration to populate default extractors (GPT-4o, PaddleOCR)

## 3. Backend - Extractor Implementations
- [x] 3.1 Implement `PaddleOcrExtractor` (with cost calculation - free)
- [x] 3.2 Implement `VisionLLMExtractor` (with token-based cost calculation)
- [x] 3.3 Implement `TesseractExtractor` (free/zero cost)
- [x] 3.4 Add preset configurations for common vision models (GPT-4o, Claude, Qwen)
- [x] 3.5 Add pricing configuration to extractor parameter schemas

## 4. Backend - Cost Calculation
- [x] 4.1 Expose cost breakdown as `textCost`, `llmCost`, and `total`
- [x] 4.2 Map extractor textCost to job `ocrActualCost` (legacy storage)
- [x] 4.3 Implement cost calculation in `VisionLLMExtractor` (token-based)
- [x] 4.4 Implement cost calculation in `PaddleOcrExtractor` (free/fixed)
- [x] 4.5 Implement cost calculation in `TesseractExtractor` (free)
- [x] 4.6 Add cost metadata to `TextExtractionResult` (textCost, currency, tokens, pages)
- [x] 4.7 Update manifest total cost aggregation (text + llm)

## 5. Backend - Project Entity Update
- [x] 5.1 Add `textExtractorId` column to `ProjectEntity`
- [x] 5.2 Create migration for new column
- [x] 5.3 Update `ProjectsService` to handle extractor selection
- [x] 5.4 Add migration to set default extractor for existing projects

## 6. Backend - API Layer
- [x] 6.1 Create `ExtractorsController` with endpoints:
  - `GET /api/extractors` - List all extractors
  - `POST /api/extractors` - Create new extractor
  - `GET /api/extractors/:id` - Get extractor details
  - `PUT /api/extractors/:id` - Update extractor
  - `DELETE /api/extractors/:id` - Delete extractor
  - `POST /api/extractors/:id/test` - Test extractor connection
  - `GET /api/extractors/:id/cost-summary` - Get cost summary for extractor
- [x] 6.2 Create DTOs for extractor CRUD operations
- [x] 6.3 Create `ExtractorTypesController`:
  - `GET /api/extractors/types` - List available extractor types (with schemas)
  - `GET /api/extractors/presets` - List preset configurations

## 7. Backend - Projects & Cost API
- [x] 7.1 Update `ProjectsService` to include `textExtractorId` in responses
- [x] 7.2 Add `PUT /api/projects/:id/extractor` - Set project's extractor
- [x] 7.3 Update project DTOs to include `textExtractorId`
- [x] 7.4 Add `GET /api/projects/:id/cost-summary` - Get extraction cost summary
- [x] 7.5 Add `GET /api/projects/:id/cost-by-date-range` - Cost analytics endpoint

## 8. Backend - Extraction Service Rewrite
- [x] 8.1 Rewrite `ExtractionService` to use `TextExtractorService`
- [x] 8.2 Remove old strategy enum and selection logic
- [x] 8.3 Remove direct `OcrService` calls (moved to PaddleOcrExtractor)
- [x] 8.4 Remove `LlmService` vision methods (moved to VisionLLMExtractor)
- [x] 8.5 Remove unused extraction strategy types and constants
- [x] 8.6 Update progress reporting for new extraction flow
- [x] 8.7 Update WebSocket events for extractor metadata and cost
- [x] 8.8 Add extractor info and cost to extraction results

## 9. Backend - Cleanup
- [x] 9.1 Remove `OcrService` if no longer used elsewhere
- [x] 9.2 Remove `LlmService` vision methods (keep text-only methods)
- [x] 9.3 Remove extraction strategy enum
- [x] 9.4 Update all imports and references

## 10. Frontend - API Client & Types
- [x] 10.1 Create `src/apps/web/src/api/extractors.ts` API client
- [x] 10.2 Create `src/apps/web/src/api/types/extractors.ts` TypeScript types
- [x] 10.3 Update projects API types to include `textExtractorId` and cost summaries
- [x] 10.4 Add cost summary types aligned to `text`, `llm`, and total cost fields

## 11. Frontend - Hooks
- [x] 11.1 Create `src/apps/web/src/shared/hooks/use-extractors.ts` (CRUD operations)
- [x] 11.2 Create `src/apps/web/src/shared/hooks/use-extractor-costs.ts` (cost analytics)
- [x] 11.3 Add extractor methods to `src/apps/web/src/shared/hooks/use-projects.ts`

## 12. Frontend - Extractor Card Component
- [x] 12.1 Create `ExtractorCard` component (following `ModelCard` pattern)
  - Display extractor name, description, type badge
  - Show config summary (base URL, model, etc.)
  - **Show cost information (avg cost per page, total spend)**
  - Actions dropdown (Test, Edit, Delete)
  - Show "Used by X projects" indicator

## 13. Frontend - Extractor Form Components
- [x] 13.1 Create `ExtractorForm` component (create/edit dialog)
  - Extractor type selector (dropdown)
  - Name and description inputs
  - **Pricing configuration section** (input/output token prices, currency)
  - Dynamic configuration fields based on extractor type
  - React Hook Form + Zod validation
- [x] 13.2 Create `ExtractorConfigForm` component (dynamic form from schema)
- [x] 13.3 Create `SecureApiKeyInput` component (visibility toggle, copy button)
- [x] 13.4 Create `PricingConfigForm` component for extractor pricing
- [x] 13.5 Add extractor validation schema to `shared/schemas/`

## 14. Frontend - Global Extractors Page
- [x] 14.1 Create `ExtractorsPage.tsx` at `/extractors` (sidebar link)
  - Page header with title and [+ New Extractor] button
  - Grid layout of extractor cards (3 columns)
  - Filter/search by name
  - **Cost summary card showing total extraction costs**
  - Empty state when no extractors
- [x] 14.2 Add loading state (spinner)
- [x] 14.3 Add error handling

## 15. Frontend - Extractor Create/Edit Dialog
- [x] 15.1 Create `ExtractorFormDialog` component
  - Dialog with form for creating/editing extractor
  - Extractor type selection
  - **Pricing configuration section** (token prices, currency)
  - Dynamic config fields based on type
  - Test connection button
  - Save/Cancel with loading state

## 16. Frontend - Project Settings Extractors Page
- [x] 16.1 Create `ProjectSettingsExtractorsPage.tsx` (following `ProjectSettingsModelsPage` pattern)
  - Route: `/projects/:id/settings/extractors`
  - Display current extractor in Card
  - Selection only (no config fields)
  - Simple dropdown/list to select from available extractors
  - **Show current extractor's cost information**
- [x] 16.2 Add loading state (spinner)
- [x] 16.3 Add error state (not found with back button)
- [x] 16.4 Handle save with `updateProject` API call

## 17. Frontend - Extractor Selection Dialog
- [x] 17.1 Create `ExtractorSelectDialog` component
  - List all available extractors
  - Show extractor details (name, type, description)
  - **Show cost information per extractor**
  - Radio button for selection
  - Filter by type (optional)
  - Confirm selection

## 18. Frontend - Cost Display Components
- [x] 18.1 Create `CostBadge` component (display cost with formatting)
- [x] 18.2 Create `CostBreakdownPanel` component (for manifest detail)
  - Show extraction cost
  - Show structured data LLM cost
  - Total cost summary
- [x] 18.3 Create `ProjectCostSummary` component
  - Total extraction costs
  - Cost per extractor
  - Cost over time chart
- [x] 18.4 Create `ExtractorCostSummary` component
  - Total spend for this extractor
  - Average cost per extraction
  - Number of extractions

## 19. Frontend - Sidebar Update
- [x] 19.1 Add "Extractors" to sidebar navigation (keep existing items)

## 20. Frontend - Router Update
- [x] 20.1 Add route for `/extractors` (lazy loaded)
- [x] 20.2 Add route for `/projects/:id/settings/extractors`

## 21. Frontend - Update Manifests List
- [x] 21.1 Add extractor column to manifests table
- [x] 21.2 Add cost column to manifests table
- [x] 21.3 Add extractor badge to manifest row
- [x] 21.4 Update filter options to include extractor type
- [x] 21.5 Update filter options to include cost range
- [x] 21.6 Update manifest detail panel to show extractor metadata and cost

## 22. Frontend - Manifest Detail Updates
- [x] 22.1 Add extractor info section to manifest detail
- [x] 22.2 Display extractor used, processing time, and metadata
- [x] 22.3 Add extraction quality metrics from extractor
- [x] 22.4 Add cost breakdown panel (extraction cost + LLM cost)
- [x] 22.5 Add cost comparison (this vs average)

## 23. Frontend - Project Cost Summary Page
- [x] 23.1 Create `ProjectCostSummaryPage.tsx` at `/projects/:id/costs`
  - Total extraction costs over time
  - Cost per extractor breakdown
  - Cost per page trend chart
  - Date range filtering
- [x] 23.2 Add to project navigation or settings

## 24. Testing - Backend
- [x] 24.1 Unit tests for cost calculation in each extractor
- [x] 24.2 Unit tests for `TextExtractorRegistry`
- [x] 24.3 Unit tests for `TextExtractorFactory`
- [x] 24.4 Unit tests for each extractor implementation
- [x] 24.5 Integration tests for rewritten `ExtractionService`
- [x] 24.6 Test preset configurations
- [x] 24.7 API tests for extractor CRUD
- [x] 24.8 API tests for cost summary endpoints

## 25. Testing - Frontend
- [x] 25.1 Unit tests for `ExtractorCard` component (with cost display)
- [x] 25.2 Unit tests for `ExtractorForm` component (with pricing)
- [x] 25.3 Unit tests for `CostBadge` component
- [x] 25.4 Unit tests for `useExtractors` hook
- [x] 25.5 Unit tests for `useExtractorCosts` hook
- [x] 25.6 Integration tests for extractors page (with cost summary)
- [x] 25.7 Integration tests for project settings extractors page
- [x] 25.8 Integration tests for project cost summary page
- [x] 25.9 Test form validation with MSW

## 26. Documentation
- [x] 26.1 Update CLAUDE.md with text extractor architecture
- [x] 26.2 Add extractor development guide
- [x] 26.3 Update project context with new patterns
- [x] 26.4 Document cost calculation feature

## 27. Frontend - Models Page Cleanup
- [x] 27.1 Remove OCR model configuration UI from the Models page (Models are for structured LLM only)
- [x] 27.2 When a model is vision-capable, do not require OCR configuration fields
- [x] 27.3 Update helper text to direct OCR/text extraction setup to the Extractors page

## 28. Backend - Model Validation Cleanup
- [x] 28.1 Remove OCR model config requirements from model DTO validation (if any)
- [x] 28.2 Ensure vision-capable models do not require OCR-related fields
