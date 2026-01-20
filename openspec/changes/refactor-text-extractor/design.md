# Design: Pluggable Text Extractor Architecture with Web UI

## Context

The current extraction system (`src/apps/api/src/extraction/extraction.service.ts`) implements four hardcoded strategies:
- `OCR_FIRST` - PaddleOCR → LLM
- `VISION_ONLY` - PDF → Images → Vision LLM
- `VISION_FIRST` - Vision LLM with OCR context
- `TWO_STAGE` - Both images and OCR sent to LLM

This creates complexity:
- Strategy selection logic mixed with orchestration
- Adding new extractors requires modifying service
- No way to configure extractors per project
- Hard to test extraction in isolation
- **No UI for users to configure extractors**

### Stakeholders
- **Developers**: Need to add new extractors without touching core logic
- **Operators**: Need to configure different extractors per project/client
- **Users**: Need UI to manage extractors and assign to projects
- **Admins**: Need visibility into available extractors and their usage

## Goals / Non-Goals

### Goals
- Create plugin architecture for text extractors
- **Extractors as global resources** (create once, use across projects)
- Enable per-project extractor selection via settings
- Support any OpenAI-compatible vision LLM
- Provide clear interface for adding new extractors
- **Build user-friendly UI following existing Models pattern**
- **Keep Models page LLM-only (no OCR config)**
- **Add Extractors to the sidebar without removing existing items**

### Non-Goals
- Replacing LLM structured data extraction (only text extraction is scoped)
- Implementing custom OCR engines (use existing services)
- Multi-language support (Chinese invoices remain primary focus)
- Real-time extraction optimization (batch processing only)
- **Category tabs on extractors page** (simple list/grid only)

## Decisions

### Decision 1: Extractors as Global Resources

**Choice**: Extractors are global entities (like Models), not per-project configurations.

**Rationale**:
- Create extractor once with API keys, endpoints, etc.
- Reuse across multiple projects
- Projects store only `textExtractorId` (selection only)
- Easier management (centralized configuration)
- Same pattern as existing Models page
- Avoids duplicating API keys and configurations

### Decision 2: Static Metadata over Decorators

**Choice**: Use class static properties for metadata instead of decorators.

**Rationale**:
- Simpler, no `reflect-metadata` dependency
- Single source of truth (no duplication)
- Better TypeScript type inference
- Matches user's Python mental model

### Decision 3: Manual Registry Registration

**Choice**: Extractors register themselves explicitly in `TextExtractorRegistry.onModuleInit()`.

**Rationale**:
- Explicit is better than implicit
- Easy to see what extractors are available
- No dependency on complex discovery mechanisms
- Works well with NestJS module system

### Decision 4: Generic VisionLLMExtractor

**Choice**: Single `VisionLLMExtractor` class that works with any OpenAI-compatible vision API.

**Rationale**:
- Many vision LLMs use the same API format
- Configuration (baseUrl, model, apiKey) is sufficient
- Avoids class explosion (GPT4Extractor, ClaudeExtractor, etc.)
- Preset configs provide convenience without classes

### Decision 5: Follow Models Page Pattern

**Choice**: Global Extractors page follows exact same pattern as Models page.

**Rationale**:
- Consistent UX across global resources
- Familiar to existing users
- Reuses existing components (Card, Dialog, Form)
- Edit-in-dialog pattern works well

### Decision 6: Sidebar Navigation Additions

**Choice**: Add Extractors to the sidebar without removing existing items.

**Rationale**:
- Keep current navigation stable
- Surface global extractor management
- Avoid scope creep in this change

### Decision 7: Cost Calculation in Extractors

**Choice**: Each extractor calculates and returns cost information per extraction.

**Rationale**:
- Enables cost comparison between extractors
- Helps optimize extraction strategy
- Vision LLMs have significant per-extraction cost
- OCR is free/local (infrastructure cost only)
- Users need visibility into spending

**Cost Models by Extractor Type**:
- **Vision LLM**: Token-based cost (input image tokens × price + output text tokens × price)
- **PaddleOCR**: Free (infrastructure cost only)
- **Tesseract**: Free (local processing)

## Architecture

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ExtractionService                            │
│  (Orchestrates: validate → extract → parse → save)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TextExtractorService                           │
│  - extract(extractorId, buffer): TextExtractionResult          │
│  - createInstance(config): ITextExtractor                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├──► TextExtractorRegistry
                              │    - discover() - Register extractors
                              │    - get(id) - Get extractor class
                              │    - list() - List metadata
                              │
                              └──► TextExtractorFactory
                                   - createInstance(config) - New/cached
                                   - getByExtractorId(extractorId, config)

┌─────────────────────────────────────────────────────────────────┐
│              TextExtractor (Interface + Metadata)               │
│  - static readonly metadata: ExtractorMetadata                  │
│  - extract(buffer): TextExtractionResult                        │
│  - getMetadata(): ExtractorMetadata                             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ implements
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ OcrExtractor  │   │ VisionExtractor │   │ HybridExtractor │
│ PaddleOCR     │   │ Generic LLM     │   │ OCR + Vision    │
│ Tesseract     │   │ (OpenAI-cpt)    │   │                 │
└───────────────┘   └─────────────────┘   └─────────────────┘
```

### Database Schema

```
┌───────────────────────┐         ┌───────────────────────┐
│   ExtractorEntity     │         │    ProjectEntity      │
│ (Global Resource)     │         │                       │
├───────────────────────┤         ├───────────────────────┤
│ id: uuid              │◄────────┤ id: uuid              │
│ name: string          │  many   │ name: string          │
│ description: string   │   to    │ textExtractorId ◄────│
│ extractorType: enum   │  one   │ llmModelId           │
│ config: jsonb         │         │ schemaId             │
│ isActive: boolean     │         │ ...                   │
│ createdAt: timestamp  │         └───────────────────────┘
│ updatedAt: timestamp  │
└───────────────────────┘

ExtractorEntity.config example:
{
  "apiKey": "sk-...",
  "baseUrl": "https://api.openai.com/v1",
  "model": "gpt-4o",
  "temperature": 0,
  "maxTokens": 4096
}
```

### Frontend Architecture

```
Sidebar Navigation (existing items unchanged)
- Add: Extractors -> /extractors (NEW - Text extractors)

Project Settings (new)
- Extractors -> /projects/:id/settings/extractors
```

Models remain LLM-only; OCR/text extraction configuration is managed in Extractors.
Vision-capable models do not require OCR configuration fields.

Models UI cleanup scope (expected files):
- `src/apps/web/src/routes/dashboard/ModelsPage.tsx` (remove OCR tab)
- `src/apps/web/src/shared/components/models/ModelPricingConfig.tsx` (remove OCR pricing UI)
- `src/apps/web/src/shared/components/ProjectWizard.tsx` (step 4 selects text extractor + LLM)

### Page: Extractors (Global - Sidebar)

**Route**: `/extractors`

Following `ModelsPage` pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│  Extractors                                    [+ New Extractor]  │
│                                                                   │
│  Manage text extractors for converting documents to raw text.   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📦 Vision LLM - GPT-4o                      [•••] [Test]   ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━││
│  │                                                               ││
│  │ OpenAI GPT-4o vision model for direct text extraction        ││
│  │                                                               ││
│  │ Vision • Active • Used by 3 projects                         ││
│  │                                                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📦 PaddleOCR VL                            [•••] [Test]   ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━││
│  │                                                               ││
│  │ Layout-aware OCR optimized for Chinese documents             ││
│  │                                                               ││
│  │ OCR • Active • Used by 1 project                            ││
│  │                                                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📦 Tesseract                              [•••] [Test]   ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━││
│  │                                                               ││
│  │ Open-source OCR engine                                       ││
│  │                                                               ││
│  │ OCR • Inactive                                              ││
│  │                                                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Page: Project Settings Extractors

**Route**: `/projects/:id/settings/extractors`

Following `ProjectSettingsModelsPage` pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Project                                               │
│                                                                  │
│  Extractor Settings                                              │
│  Select the text extractor for this project.                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Current Extractor                        [Edit ✏️]         ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ││
│  │                                                               ││
│  │  📦 Vision LLM - GPT-4o                                      ││
│  │     OpenAI GPT-4o vision for text extraction                 ││
│  │                                                               ││
│  │  Type:  Vision                                               ││
│  │  Status: Active                                             ││
│  │                                                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [Edit] opens selection dialog:                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Select Extractor                                 [×]        ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ││
│  │                                                               ││
│  │  ◉ Vision LLM - GPT-4o                                      ││
│  │     OpenAI GPT-4o vision for direct text extraction         ││
│  │                                                               ││
│  │  ○ PaddleOCR VL                                             ││
│  │     Layout-aware OCR for Chinese documents                  ││
│  │                                                               ││
│  │  ○ Tesseract                                                ││
│  │     Open-source OCR engine                                   ││
│  │                                                               ││
│  │  [Cancel]                                    [Save]       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### ExtractorEntity (Global - Like ModelEntity)
```typescript
@Entity('extractors')
class ExtractorEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;                    // "Vision LLM - GPT-4o"

  @Column()
  description: string;

  @Column()
  extractorType: string;           // "vision-llm", "paddleocr", "tesseract"

  @Column('jsonb')
  config: Record<string, any>;      // { apiKey, baseUrl, model, ... }

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### ProjectEntity (Updated)
```typescript
@Entity('projects')
class ProjectEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Text extractor (NEW)
  @Column({ nullable: true })
  textExtractorId: string;          // References ExtractorEntity.id

  // LLM for structured data (existing)
  @Column({ nullable: true })
  llmModelId: string;               // References ModelEntity.id

  // Schema (existing)
  @Column({ nullable: true })
  schemaId: string;
}
```

### ExtractorMetadata (Backend)
```typescript
interface ExtractorMetadata {
  id: string;                    // e.g., 'vision-llm', 'paddleocr'
  name: string;                  // Display name
  description: string;           // Human-readable description
  version: string;               // e.g., '1.0.0'
  category: 'ocr' | 'vision' | 'hybrid';
  paramsSchema: ExtractorParamSchema[];
  supportedFormats: ('pdf' | 'image')[];
}
```

## API Endpoints

### Extractor Management (CRUD)

```
GET    /api/extractors                    # List all extractors
POST   /api/extractors                    # Create new extractor
GET    /api/extractors/:id                 # Get extractor details
PUT    /api/extractors/:id                 # Update extractor
DELETE /api/extractors/:id                 # Delete extractor
POST   /api/extractors/:id/test            # Test extractor connection
GET    /api/extractors/types              # Get available types (with schemas)
GET    /api/extractors/presets            # List preset configurations
```

### Project Configuration

```
PUT    /api/projects/:id/extractor         # Set project's extractor
```

### Cost Analytics Endpoints

```
GET    /api/extractors/:id/cost-summary           # Get cost summary for extractor
GET    /api/projects/:id/cost-summary            # Get project extraction costs
GET    /api/projects/:id/cost-by-date-range      # Cost over time with date filtering
```

## Cost Calculation Feature

### Overview

Each text extraction calculates and tracks cost based on the extractor's pricing model:
- **Vision LLM extractors**: Cost based on token usage (input image tokens + output text tokens)
- **OCR extractors** (PaddleOCR, Tesseract): Free (infrastructure cost only)
- Costs are stored as numeric amounts on jobs/manifests and displayed throughout the UI
- Text extraction cost is exposed as `textCost` (actual usage) regardless of pricing mode

### Cost Data Types

```typescript
// Cost metadata returned by a text extractor
interface TextExtractionCostMeta {
  textCost: number;              // Actual text extractor usage cost
  currency?: string;             // From extractor pricing config
  inputTokens?: number;          // For vision LLM text extraction
  outputTokens?: number;         // For vision LLM text extraction
  pagesProcessed?: number;       // Number of pages/documents
}

// Aggregated cost breakdown (used in UI + WebSocket events)
interface CostBreakdown {
  text: number;
  llm: number;
  total: number;
}

// Cost summary for an extractor (aggregate data)
interface ExtractorCostSummary {
  extractorId: string;
  extractorName: string;
  totalExtractions: number;
  totalCost: number;
  averageCostPerExtraction: number;
  currency?: string; // Derived from extractor pricing config
  costBreakdown: {
    byDate: { date: string; count: number; cost: number }[];
    byProject: { projectId: string; projectName: string; count: number; cost: number }[];
  };
}

// Project cost summary
interface ProjectCostSummary {
  projectId: string;
  totalExtractionCost: number;
  costByExtractor: {
    extractorId: string;
    extractorName: string;
    totalCost: number;
    extractionCount: number;
    averageCost: number;
  }[];
  costOverTime: {
    date: string;
    extractionCost: number;
  }[];
  dateRange?: {
    from: string;
    to: string;
  };
}
```

### Pricing Configuration

```typescript
// Part of ExtractorEntity.config
interface PricingConfig {
  mode: 'token' | 'page' | 'fixed' | 'none';
  currency: string;              // "USD", "EUR", etc.
  inputPricePerMillionTokens?: number;  // For vision LLMs only
  outputPricePerMillionTokens?: number; // For vision LLMs only
  pricePerPage?: number;          // For page-based OCR
  fixedCost?: number;             // For fixed-cost extractors
}

// Example: VisionLLMExtractor config
{
  "apiKey": "sk-...",
  "baseUrl": "https://api.openai.com/v1",
  "model": "gpt-4o",
  "temperature": 0,
  "pricing": {
    "currency": "USD",
    "inputPricePerMillionTokens": 2.50,   // $2.50 per 1M input tokens
    "outputPricePerMillionTokens": 10.00, // $10.00 per 1M output tokens
  }
}

// Example: PaddleOcrExtractor config
{
  "baseUrl": "http://localhost:8080",
  "timeout": 120,
  "pricing": {
    "currency": "USD",
    "fixedCostPerPage": 0,  // Free (infrastructure cost only)
  }
}
```

### Cost Calculation Logic

```typescript
// In VisionLLMExtractor.extract()
async extract(buffer: Buffer): Promise<TextExtractionResult> {
  const startTime = Date.now();

  // Call vision API
  const response = await this.client.chat.completions.create({
    model: this.config.model,
    messages: [...],
  });

  // Calculate cost (token pricing mode)
  const usage = response.usage;  // { prompt_tokens, completion_tokens, total_tokens }
  const inputCost = (usage.prompt_tokens / 1_000_000) * this.config.pricing.inputPricePerMillionTokens;
  const outputCost = (usage.completion_tokens / 1_000_000) * this.config.pricing.outputPricePerMillionTokens;
  const totalCost = inputCost + outputCost;

  return {
    text: response.choices[0]?.message?.content ?? '',
    markdown: response.choices[0]?.message?.content ?? '',
    metadata: {
      extractorId: VisionLLMExtractor.metadata.id,
      processingTimeMs: Date.now() - startTime,
      textCost: totalCost,
      currency: this.config.pricing.currency,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      pagesProcessed: 1,
    },
  };
}

// In PaddleOcrExtractor.extract()
async extract(buffer: Buffer): Promise<TextExtractionResult> {
  const startTime = Date.now();

  const response = await this.httpClient.post('/layout-parsing', { ... });

  // Cost is zero (pricing mode: none)
  return {
    text: response.data.raw_text,
    markdown: response.data.markdown,
    metadata: {
      extractorId: PaddleOcrExtractor.metadata.id,
      processingTimeMs: Date.now() - startTime,
      textCost: 0,
      currency: this.config.pricing.currency,
      pagesProcessed: response.data.layout?.num_pages ?? 1,
    },
  };
}
```

### Database Storage

```typescript
// ManifestEntity stores extraction cost
@Entity('manifests')
class ManifestEntity {
  // ... existing fields

  @Column({ type: 'decimal', nullable: true })
  extractionCost: number;  // Numeric total (text + llm)

  @Column()
  textExtractorId: string;       // Which extractor was used
}
```

Text extraction cost is stored in job-level fields (`ocrActualCost`) and rolled up into `manifest.extractionCost` along with LLM cost.
The public API uses `textCost` naming and maps it to legacy storage fields.

## UI: Cost Display

### Extractor Card (with cost)

```
┌─────────────────────────────────────────────────────────────────────┐
│  📦 Vision LLM - GPT-4o                      [•••] [Test] [✏️] [🗑]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                       │
│  OpenAI GPT-4o vision for direct text extraction                     │
│                                                                       │
│  Vision • Active • Used by 3 projects                                │
│                                                                       │
│  💰 Cost: $0.015 per page (avg) • Total: $45.23 (3,015 extractions)    │
│                                                                       │
│  Config: gpt-4o • $2.50/M input • $10.00/M output                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Manifests List (with cost column)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ File        │ Status  │ Extractor      │ PO No   │ Date      │ Cost     │
├─────────────┼─────────┼────────────────┼─────────┼──────────┼──────────┤
│ inv001.pdf   │ Done    │ GPT-4o 🔵    │ 0000123 │ Today    │ $0.015   │
│ inv002.pdf   │ Done    │ GPT-4o 🔵    │ 0000124 │ Today    │ $0.015   │
│ inv003.pdf   │ Done    │ PaddleOCR 🟢   │ 0000125 │ Today    │ Free     │
│ invoice.pdf │ Pending│ GPT-4o 🔵    │ -       │ -        │ -        │
└─────────────┴─────────┴────────────────┴─────────┴──────────┴──────────┘
```

### Manifest Detail (cost breakdown panel)

```
┌─────────────────────────────────────────────────────────────────┐
│  Extraction Info                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━││
│  Extractor     Vision LLM (GPT-4o)                               │
│  Category      Vision                                               │
│  Processed    2.3s                                                 │
│                                                                       │
│  💰 Cost Breakdown                                              │
│  ┌───────────────────────────────────────────────────────────────┐│
│  │ Text Extraction (Vision LLM)                                ││
│  │   Input tokens:  1,245 × $2.50/M = $0.0031                ││
│  │   Output tokens: 345 × $10.00/M = $0.0035                   ││
│ │   Subtotal: $0.0066                                           ││
│  │                                                              ││
│  │ Structured Data (LLM)                                        ││
│  │   Input tokens: 890 × $2.50/M = $0.0022                     ││
│  │   Output tokens: 234 × $10.00/M = $0.0023                    ││
│ │   Subtotal: $0.0045                                           ││
│  │                                                              ││
│  │ Total: $0.0111 (50% savings vs average)                     ││
│  └───────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Project Cost Summary Page

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Project                                               │
│                                                                  │
│  Cost Summary                                                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Total Extraction Costs: $127.45                               ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━││
│  │                                                             ││
│  │  Cost by Extractor                                        ││
│  │  ┌───────────────────────────────────────────────────────┐││
│  │  │ Vision LLM - GPT-4o          $125.70 (98.6%)       │││
│  │  │   8,455 extractions × $0.015 avg                    │││
│  │  │                                                      │││
│  │  │ PaddleOCR VL                  $1.75 (1.4%)          │││
│  │  │   175 extractions × $0.01 avg                         │││
│  │  └───────────────────────────────────────────────────────┘││
│  │                                                             ││
│  │  Cost Over Time (30 days)                                 ││
│  │  ┌───────────────────────────────────────────────────────┐││
│  │  │ $46.23 ████                                              ││
│  │  │ $35.12 ████                                              ││
│  │  │ $28.45 ████                                              ││
│  │  │ $17.89 ████                                              ││
│  │  └───────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [Date Range: Last 30 days ▼] [Export CSV]                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Extractor Form (with pricing configuration)

```
┌─────────────────────────────────────────────────────────────────┐
│  New Text Extractor                                    [×]       │
│                                                                  │
│  Extractor Type *                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Vision LLM (Generic OpenAI-compatible)    ▼          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Vision LLM (Generic OpenAI-compatible)               │   │
│  │ PaddleOCR VL                                           │   │
│  │ Tesseract                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Name *                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Vision LLM - GPT-4o                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Description                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ OpenAI GPT-4o for direct text extraction from images    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━││
│  Pricing Configuration                                          ││
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━││
│  Currency *                                                     ││
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ USD                                       ▼          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ USD                                                     │   │
│  │ EUR                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Input Price (per 1M tokens) *                                 ││
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2.50                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Output Price (per 1M tokens) *                                ││
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 10.00                                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Test]              [Cancel]                        [Create]  │
└─────────────────────────────────────────────────────────────────┘
```

## Cost Calculation Benefits

| Use Case | Before | After |
|---------|--------|-------|
| **Cost Visibility** | No idea what extraction costs | See exact cost per extraction |
| **Extractor Comparison** | Can't compare options | See $/page for each extractor |
| **Budget Planning** | No way to estimate costs | Project cost summary with forecasting |
| **Optimization** | Guesswork | Choose cheapest extractor per document type |
| **Billing** | Manual spreadsheet | Automatic tracking in system |

## UI Flow: Creating Extractor with Pricing

```
1. User creates extractor
   → Fills in pricing section (mode, currency, price inputs)
   → System validates pricing > 0
   → Save

2. User runs extraction
   → Extractor calculates textCost from API usage or config
   → Cost stored with manifest

3. User views manifest
   → See textCost + llmCost breakdown
   → Compare to average
   → See total project costs

4. User views project costs
   → See total spend
   → See cost per extractor
   → See trends over time
```

## Risk: Cost Calculation Accuracy

**Issue**: Token counting may not be exact for all vision APIs

**Mitigation**:
- Use official API response usage when available
- Estimate based on image size when not provided
- Mark estimated costs in UI (e.g., "~$0.015")
- Document estimation methodology in extractor metadata
