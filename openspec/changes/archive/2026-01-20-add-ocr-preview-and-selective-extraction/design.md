# Design: OCR Result Preview and Selective Extraction

## Context

### Background
The current system automatically processes uploaded documents through OCR and LLM extraction. This has several problems:
1. **High cost**: Processing 100 documents costs $5-50 in LLM API calls
2. **Poor visibility**: Users can't see OCR results before committing to extraction
3. **Slow iteration**: Testing schema changes requires re-processing entire batches
4. **Wasted spend**: Bad schemas result in failed extractions that still cost money

### Stakeholders
- **Users**: Need cost-effective extraction with visibility into results
- **Developers**: Need maintainable architecture for OCR result storage
- **System**: Need efficient storage and retrieval of OCR data

### Constraints
- PaddleOCR-VL is external service with per-request cost
- LLM API costs scale with token count
- Database storage for OCR results (JSONB can be large)
- Existing manifests must remain accessible

## Goals / Non-Goals

### Goals
1. **Cache OCR results** - Store PaddleOCR-VL output for reuse
2. **Preview before extract** - Show users what OCR found before LLM costs
3. **Selective extraction** - Let users choose which documents to extract
4. **Field-level re-extraction** - Re-extract individual fields instead of entire docs
5. **Cost transparency** - Show estimated and actual costs
6. **Quality metrics** - Score OCR results to predict extraction success

### Non-Goals
- Modifying PaddleOCR-VL service behavior
- Storing raw PDF/image files in database
- Changing JSON schema validation logic
- Modifying BullMQ job processing architecture

## Decisions

### Decision 1: OCR Result Storage in ManifestEntity

**What**: Store OCR results directly in `manifests` table as JSONB column.

**Why**:
- Simpler than joining to separate table
- OCR data is 1:1 with manifest
- JSONB supports efficient querying of nested data
- Easier access for API responses

**Alternatives considered**:
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| JSONB in manifests table | Simple access, no joins | Table size, row churn | **CHOSEN** |
| Separate ocr_results table | Normalized, smaller rows | Extra join, complexity | Rejected |
| External storage (S3) | Unlimited size | Latency, cost, complexity | Rejected |

**Schema**:
```sql
ALTER TABLE manifests ADD COLUMN ocr_result JSONB;
ALTER TABLE manifests ADD COLUMN ocr_processed_at TIMESTAMP;
ALTER TABLE manifests ADD COLUMN ocr_quality_score INTEGER;
ALTER TABLE manifests ADD COLUMN extraction_cost DECIMAL(10,4);
```

### Decision 2: OCR Result Structure

**What**: Standardize PaddleOCR-VL output format for storage.

**Why**: Need predictable structure for UI rendering and querying.

**Structure**:
```typescript
interface OcrResult {
  document: {
    type: 'invoice' | 'receipt' | 'contract' | 'other';
    language: string[];
    pages: number;
  };
  pages: Array<{
    page_number: number;
    text: string;
    markdown: string;
    layout: {
      elements: Array<{
        type: 'header' | 'table' | 'key-value' | 'footer' | 'paragraph';
        confidence: number;
        position: { x: number; y: number; width: number; height: number };
        content?: string;
      }>;
      tables: Array<{
        rows: number;
        columns: number;
        headers: string[];
        data: string[][];
        confidence: number;
      }>;
    };
    confidence: number;
  }>;
  vision_analysis?: {
    caption: string;
    detected_fields: Array<{
      field: string;
      value: string;
      confidence: number;
    }>;
    quality_warnings: string[];
  };
  metadata: {
    processed_at: string;
    model_version: string;
    processing_time_ms: number;
  };
}
```

### Decision 3: Selective Extraction Workflow

**What**: Extraction is now manual, not automatic. Users select documents and click "Extract".

**Why**: Users need control over when costs are incurred.

**Workflow**:
```
Upload → OCR (automatic, cheap) → List View
                                        ↓
                              User selects rows
                                        ↓
                           User clicks "Extract Selected"
                                        ↓
                        Confirmation modal with cost estimate
                                        ↓
                                BullMQ jobs queued
                                        ↓
                            WebSocket progress updates
```

**Alternatives considered**:
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Manual extraction | Cost control, user choice | Extra click | **CHOSEN** |
| Auto-extract with delay | Simpler UX | Wasted cost on bad schemas | Rejected |
| Auto-extract N samples | Balanced | Still wastes some cost | Rejected |

### Decision 4: Quality Score Calculation

**What**: Compute OCR quality score (0-100) from multiple factors.

**Why**: Users need quick assessment of OCR quality before extraction.

**Formula**:
```typescript
qualityScore = (
  textCoverage * 0.3 +        // % of page with text
  avgTextConfidence * 0.4 +   // Average confidence score
  layoutDetection * 0.2 +     // Tables/elements found
  languageMatch * 0.1         // Expected language detected
)
```

**Thresholds**:
- 90-100: Excellent (green) - Ready for extraction
- 70-89: Good (yellow) - May need review
- <70: Poor (red) - May fail extraction

### Decision 5: Cost Tracking

**What**: Track extraction cost per document and accumulated totals.

**Why**: Transparency and budget management.

**Tracking**:
- Store per-document cost in `extraction_cost` column
- Calculate from: `(input_tokens / 1M) * input_price + (output_tokens / 1M) * output_price`
- Aggregate by project/group for budget views

**Pricing**: Model-specific pricing stored in ModelEntity pricing columns.

### Decision 6: Model Pricing Structure

**What**: Store pricing per model for accurate cost estimation and tracking.

**Why**:
- Different model types have different pricing models (OCR per page, LLM per token)
- Pricing can change over time, needs to be updatable
- Accurate cost estimation requires current pricing data

**Pricing Structure by Model Type**:

```typescript
interface ModelPricing {
  // OCR model pricing (per page)
  ocr?: {
    pricePerPage: number;
    currency: string;
    minimumCharge?: number;
  };

  // LLM model pricing (per 1M tokens)
  llm?: {
    inputPrice: number;    // per 1M input tokens
    outputPrice: number;   // per 1M output tokens
    currency: string;
    minimumCharge?: number;
  };

  // When pricing was last updated
  effectiveDate: Date;
}
```

**Sample Pricing Data** (2024):
```typescript
const MODEL_PRICING_EXAMPLES = [
  // OCR Models
  {
    modelName: 'PaddleOCR-VL',
    adapterType: 'ocr',
    pricing: {
      ocr: {
        pricePerPage: 0.001,   // $0.001 per page
        currency: 'USD'
      }
    }
  },
  {
    modelName: 'Tesseract OCR',
    adapterType: 'ocr',
    pricing: {
      ocr: {
        pricePerPage: 0.000,   // Free (local)
        currency: 'USD'
      }
    }
  },

  // LLM Models
  {
    modelName: 'GPT-4o',
    adapterType: 'llm',
    pricing: {
      llm: {
        inputPrice: 2.50,      // $2.50 per 1M input tokens
        outputPrice: 10.00,    // $10.00 per 1M output tokens
        currency: 'USD'
      }
    }
  },
  {
    modelName: 'GPT-4o-mini',
    adapterType: 'llm',
    pricing: {
      llm: {
        inputPrice: 0.15,      // $0.15 per 1M input tokens
        outputPrice: 0.60,     // $0.60 per 1M output tokens
        currency: 'USD'
      }
    }
  },
  {
    modelName: 'Claude 3.5 Sonnet',
    adapterType: 'llm',
    pricing: {
      llm: {
        inputPrice: 3.00,      // $3.00 per 1M input tokens
        outputPrice: 15.00,    // $15.00 per 1M output tokens
        currency: 'USD'
      }
    }
  },
  {
    modelName: 'Local LLaMA 3.1',
    adapterType: 'llm',
    pricing: {
      llm: {
        inputPrice: 0.00,      // Free (self-hosted)
        outputPrice: 0.00,
        currency: 'USD'
      }
    }
  },
  {
    modelName: 'SiliconFlow Qwen',
    adapterType: 'llm',
    pricing: {
      llm: {
        inputPrice: 0.10,      // $0.10 per 1M input tokens
        outputPrice: 0.10,     // $0.10 per 1M output tokens
        currency: 'USD'
      }
    }
  }
];
```

**Cost Calculation Formulas**:

```typescript
// OCR Cost (per page)
function calculateOcrCost(pages: number, pricing: ModelPricing): number {
  if (!pricing.ocr) return 0;
  const cost = pages * pricing.ocr.pricePerPage;
  return pricing.ocr.minimumCharge
    ? Math.max(cost, pricing.ocr.minimumCharge)
    : cost;
}

// LLM Extraction Cost (per 1M tokens)
function calculateLlmCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing
): number {
  if (!pricing.llm) return 0;
  const inputCost = (inputTokens / 1_000_000) * pricing.llm.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * pricing.llm.outputPrice;
  const totalCost = inputCost + outputCost;

  return pricing.llm.minimumCharge
    ? Math.max(totalCost, pricing.llm.minimumCharge)
    : totalCost;
}

// Total Extraction Cost
function calculateTotalExtractionCost(
  pages: number,
  inputTokens: number,
  outputTokens: number,
  ocrPricing: ModelPricing,
  llmPricing: ModelPricing
): number {
  return calculateOcrCost(pages, ocrPricing) +
         calculateLlmCost(inputTokens, outputTokens, llmPricing);
}
```

**Example Calculation**:
```
Document: invoice_001.pdf (3 pages)
OCR Model: PaddleOCR-VL
LLM Model: GPT-4o-mini

OCR Cost = 3 pages × $0.001/page = $0.003
LLM Input = (2,400 / 1,000,000) × $0.15 = $0.00036
LLM Output = (480 / 1,000,000) × $0.60 = $0.000288

Total = $0.003 + $0.00036 + $0.000288 = $0.00365 ≈ $0.004
```

**Price Update Workflow**:
1. Admin updates model pricing via UI or API
2. System validates pricing structure
3. New pricing gets `effectiveDate` timestamp
4. Old pricing is archived in `pricing_history` table
5. Future extractions use new pricing
6. Existing cost records are not recalculated

## Data Model Changes

### ModelEntity Additions

```typescript
// src/apps/api/src/entities/model.entity.ts

@Entity({ name: 'models' })
export class ModelEntity {
  // ... existing fields

  @Column({ type: 'jsonb', name: 'pricing' })
  pricing: {
    ocr?: {
      pricePerPage: number;
      currency: string;
      minimumCharge?: number;
    };
    llm?: {
      inputPrice: number;
      outputPrice: number;
      currency: string;
      minimumCharge?: number;
    };
    effectiveDate: Date;
  };

  @Column({ type: 'jsonb', name: 'pricing_history', nullable: true, default: [] })
  pricingHistory: Array<{
    ocr?: {
      pricePerPage: number;
      currency: string;
      minimumCharge?: number;
    };
    llm?: {
      inputPrice: number;
      outputPrice: number;
      currency: string;
      minimumCharge?: number;
    };
    effectiveDate: Date;
    endDate?: Date;
  }>;
}
```

**Migration**:
```sql
-- Add pricing columns to models table
ALTER TABLE models ADD COLUMN pricing JSONB NOT NULL DEFAULT '{}';
ALTER TABLE models ADD COLUMN pricing_history JSONB DEFAULT '[]';

-- Set default pricing for existing models based on adapter_type
UPDATE models
SET pricing = jsonb_build_object(
  'effectiveDate', NOW(),
  'ocr', jsonb_build_object('pricePerPage', 0.0, 'currency', 'USD')
)
WHERE adapter_type = 'ocr' AND pricing = '{}';

UPDATE models
SET pricing = jsonb_build_object(
  'effectiveDate', NOW(),
  'llm', jsonb_build_object('inputPrice', 0.0, 'outputPrice', 0.0, 'currency', 'USD')
)
WHERE adapter_type = 'llm' AND pricing = '{}';
```

### ManifestEntity Additions

```typescript
// src/apps/api/src/entities/manifest.entity.ts

@Entity('manifests')
export class ManifestEntity {
  // ... existing fields

  @Column({ type: 'jsonb', nullable: true })
  ocrResult: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true, name: 'ocr_processed_at' })
  ocrProcessedAt: Date;

  @Column({ type: 'integer', nullable: true })
  ocrQualityScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, name: 'extraction_cost' })
  extractionCost: number;
}
```

### New DTOs

```typescript
// src/apps/api/src/manifests/dto/ocr-result.dto.ts

export class OcrResultDto {
  document!: {
    type: string;
    language: string[];
    pages: number;
  };
  pages!: OcrPageResult[];
  vision_analysis?: {
    caption: string;
    detected_fields: DetectedField[];
    quality_warnings: string[];
  };
  metadata!: {
    processed_at: Date;
    model_version: string;
    processing_time_ms: number;
  };
}

export class CostEstimateDto {
  manifestCount!: number;
  estimatedTokensMin!: number;
  estimatedTokensMax!: number;
  estimatedCostMin!: number;
  estimatedCostMax!: number;
  currency!: string;
}
```

## API Design

### New Endpoints

```
GET    /manifests/:id/ocr
       Get cached OCR result for a manifest

POST   /manifests/:id/ocr
       Trigger OCR processing (if not cached)

POST   /manifests/:id/extract
       Trigger extraction for single manifest

POST   /manifests/extract-bulk
       Trigger extraction for multiple manifests

POST   /manifests/:id/re-extract-field
       Re-extract specific field with OCR context preview

GET    /manifests/cost-estimate
       Get cost estimate for extraction

GET    /groups/:groupId/manifests
       Existing - add ocr_quality_score to response
```

### Request/Response Examples

```typescript
// POST /manifests/extract-bulk
interface BulkExtractRequest {
  manifestIds: number[];
  llmModelId?: string;
  promptId?: number;
  dryRun?: boolean;  // Return estimate without processing
}

interface BulkExtractResponse {
  jobId: string;
  manifestCount: number;
  estimatedCost: { min: number; max: number };
  queuePosition?: number;
}

// GET /manifests/:id/ocr
interface OcrResponse {
  manifestId: number;
  ocrResult: OcrResultDto | null;
  hasOcr: boolean;
  ocrProcessedAt?: Date;
  qualityScore?: number;
}

// POST /manifests/:id/re-extract-field
interface ReExtractFieldRequest {
  fieldName: string;  // dot-notation path
  llmModelId?: string;
  promptId?: number;
  customPrompt?: string;
  includeOcrContext?: boolean;  // default true
}

interface ReExtractFieldResponse {
  jobId: string;
  fieldName: string;
  ocrPreview?: OcrContextPreview;  // Shows what will be sent to LLM
  estimatedCost: number;
}
```

## Frontend Architecture

### Component Structure

```
src/apps/web/src/shared/components/manifests/
├── ManifestTable.tsx              [MODIFIED]
├── OcrPreviewModal.tsx            [NEW]
├── FieldReExtractDialog.tsx       [NEW]
├── SchemaTestMode.tsx             [NEW]
├── ExtractionCostTracker.tsx      [NEW]
└── QuickOcrPeek.tsx               [NEW]
```

### State Management

```typescript
// New Zustand store
interface ExtractionStore {
  // OCR results cache
  ocrResults: Map<number, OcrResultDto>;
  fetchOcrResult: (manifestId: number) => Promise<void>;

  // Extraction queue
  extractionQueue: number[];
  setExtractionQueue: (ids: number[]) => void;

  // Cost tracking
  totalExtractionCost: number;
  addExtractionCost: (cost: number) => void;

  // Schema test mode
  schemaTestMode: boolean;
  setSchemaTestMode: (enabled: boolean) => void;
  testResults: Map<number, ExtractionResult>;
}
```

### Modal Routing

```
ManifestTable
    │
    ├── [👁️ Preview OCR] → OcrPreviewModal
    │                               ├── [📄 Original PDF]
    │                               ├── [📝 Raw Text]
    │                               ├── [🏗️ Layout]
    │                               └── [🔍 Vision Analysis]
    │
    ├── [Extract→] → Confirmation Modal → BullMQ Job
    │
    ├── [Row click] → Manifest Detail
    │                                       ├── [👁️ OCR Raw] tab
    │                                       └── [✏️ Field] → FieldReExtractDialog
    │
    └── [🧪 Test Mode] → SchemaTestMode
```

## UI Prototypes

### 1. Manifest List View - Initial State (OCR Complete)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  PyToya                      [🔔] [⚙️]                      [User ▼]           │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Dashboard  /  Projects  /  Supplier A Invoices  /  Manifests                   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  👥 Group: Supplier A Invoices      Schema: Invoice v2.1  [Edit Schema]│   │
│  │                                                                         │   │
│  │  [📊 47 docs]  [✅ OCR Complete]  [⚪ 0 Extracted]  [💰 $0.00 spent]   │   │
│  │                                                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  🔍 Search manifests...                 [+ New Filter]  [⚙️]    │   │   │
│  │  ├─────────────────────────────────────────────────────────────────┤   │   │
│  │  │ ☑  Filename          Status   OCR     Actions                    │   │   │
│  │  ├─────────────────────────────────────────────────────────────────┤   │   │
│  │  │ ☑  invoice_001.pdf   ⚪ Ready  95% 🟢  [Extract→] [👁️ Preview]  │   │   │
│  │  │ ☑  invoice_002.pdf   ⚪ Ready  92% 🟢  [Extract→] [👁️ Preview]  │   │   │
│  │  │ ☑  invoice_003.pdf   ⚪ Ready  88% 🟡  [Extract→] [👁️ Preview]  │   │   │
│  │  │ ☐  invoice_004.pdf   ⚪ Ready  97% 🟢  [Extract→] [👁️ Preview]  │   │   │
│  │  │ ☐  invoice_005.pdf   ⚪ Ready  91% 🟢  [Extract→] [👁️ Preview]  │   │   │
│  │  │ ...                                                                   │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  ☑ Select all 47    [Extract Selected (47)] 💰 $2.35 - $4.70            │   │
│  │                                                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  💰 Cost Tracker                               [View Details →]│   │   │
│  │  │  Budget: $50.00 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ $0.00 spent      │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2. OCR Preview Modal - Original PDF Tab

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  👁️ OCR Result: invoice_002.pdf                                    [× Close]   │
│                                                                               │
│  [📄 Original PDF]  [📝 Raw Text]  [🏗️ Layout]  [🔍 Vision Analysis]         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                               │
│  ┌──────────────────────────────────────────┐  ┌──────────────────────────┐   │
│  │                                          │  │  📊 OCR Quality Score    │   │
│  │  [Page 1 Thumbnail]                      │  │                         │   │
│  │                                          │  │   Overall: 92% 🟢       │   │
│  │  ┌──────────────────────┐                │  │                         │   │
│  │  │                    ││                │  │   Breakdown:            │   │
│  │  │   INVOICE           ││                │  │   • Text: 95%           │   │
│  │  │                    ││                │  │   • Layout: 89%         │   │
│  │  │   PO: 0000010      ││  ← Scaled      │  │   • Tables: 91%         │   │
│  │  │   Date: 2024-01-15 ││    preview     │  │                         │   │
│  │  │                    ││                │  │   Pages: 3              │   │
│  │  │   ┌─────────────┐  ││                │  │   Tokens: ~2,400        │   │
│  │  │   │ Item  │ Qty │  ││                │  │                         │   │
│  │  │   ├─────────────┤  ││                │  │   Extracted: 2 min ago   │   │
│  │  │   │ A     │ 10  │  ││                │  │   Model: PaddleOCR-VL   │   │
│  │  │   │ B     │ 5   │  ││                │  └──────────────────────────┘   │
│  │  │   └─────────────┘  ││                │                                 │   │
│  │  │                    ││                │  ┌──────────────────────────┐   │
│  │  │   Total: $1,200.00 ││                │  │  💰 Extraction Cost      │   │   │
│  │  │                    ││                │  │                         │   │   │
│  │  └──────────────────────┘                │  │   Est. with GPT-4o:     │   │   │
│  │                                          │  │   $0.05 - $0.10         │   │   │
│  │  [← Page 1] [2] [3 →]                    │  │                         │   │   │
│  │                                          │  │   [Extract Now →]      │   │   │
│  └──────────────────────────────────────────┘  └──────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📄 Document Info                                                       │   │
│  │  • File: invoice_002.pdf  |  Size: 1.2 MB  |  Pages: 3  |  Uploaded: 5 min ago│   │
│  │  • OCR processed in: 3.2 seconds                                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3. OCR Preview Modal - Vision Analysis Tab

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  👁️ OCR Result: invoice_002.pdf                                    [× Close]   │
│                                                                               │
│  [📄 Original PDF]  [📝 Raw Text]  [🏗️ Layout]  [🔍 Vision Analysis]         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🔍 Vision LLM Analysis                                                │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  |                                                                 │   │   │
│  │  |  📸 Image Caption                                               │   │   │
│  │  |  ┌─────────────────────────────────────────────────────────┐   │   │   │
│  │  |  │ This is a bilingual Chinese-English invoice document.  │   │   │   │
│  │  |  │ It contains a header with company information, a table  │   │   │   │
│  │  |  │ with 12 line items showing bearings and bolts, and       │   │   │   │
│  │  |  │ footer with banking details.                              │   │   │   │
│  │  |  └─────────────────────────────────────────────────────────┘   │   │   │
│  |  |                                                                 │   │   │
│  |  |  🎯 Key Fields Detected                                          │   │   │
│  |  |  ┌─────────────────────────────────────────────────────────┐   │   │   │
│  |  │  │ Field            │ Value            │ Confidence  │ Use │   │   │   │
│  |  │  ├─────────────────────────────────────────────────────────┤   │   │   │
│  |  │  │ Document Type   │ Invoice         │ 98%         │ ☑   │   │   │   │
│  |  │  │ PO Number       │ 0000010         │ 95%         │ ☑   │   │   │   │
│  |  │  │ Invoice Date    │ 2024-01-15      │ 92%         │ ☑   │   │   │   │
│  |  │  │ Department      │ 销售部           │ 89%         │ ☑   │   │   │   │
│  |  │  │ Vendor          │ ABC Company     │ 87%         │ ☑   │   │   │   │
│  |  │  │ Total Amount    │ $1,200.00       │ 94%         │ ☑   │   │   │   │
│  │  │  └─────────────────────────────────────────────────────────┘   │   │   │
│  │  |                                                                 │   │   │
│  │  |  [Copy to Schema]  [Export Analysis]                             │   │   │
│  │  |                                                                 │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  ⚠️ Quality Warnings                                            │   │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐   │   │   │
│  │  |  • Table cell (2,3) has low confidence (72%) - possible OCR  │   │   │
│  │  |    error: "5S" may be "5"                                    │   │   │
│  │  |  • Department field uses Chinese characters - consider       │   │   │
│  │  |    translation mapping                                      │   │   │
│  │  |                                                                 │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4. Extraction Confirmation Modal

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⚡ Extract Selected Documents                                    [× Close]     │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  You are about to extract 3 documents                                  │   │
│  │                                                                         │   │
│  │  Documents to extract:                                                  │   │
│  │  ☑ invoice_001.pdf  (OCR: 95%)                                        │   │
│  │  ☑ invoice_002.pdf  (OCR: 92%)                                        │   │
│  │  ☑ invoice_003.pdf  (OCR: 88%)                                        │   │
│  │                                                                         │   │
│  │  ─────────────────────────────────────────────────────────────────────  │   │
│  │                                                                         │   │
│  │  Extraction Settings:                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Model:        [GPT-4o ▼]         Cost: ~$0.05-0.10/doc         │   │   │
│  │  │  Prompt:       [Invoice Standard ▼]                           │   │   │
│  │  │  Schema:       [Invoice v2.1]                                  │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  💰 Cost Estimate                                               │   │   │
│  │  │                                                                 │   │   │
│  │  │  Documents:           3                                         │   │   │
│  │  │  Estimated tokens:   7,200 - 10,500                            │   │   │
│  │  │  Estimated cost:     $0.15 - $0.30                              │   │   │
│  │  │                                                                 │   │   │
│  │  │  Budget remaining:    $49.70 of $50.00                          │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  ⚠️ Once extraction starts, costs will be incurred regardless of results.│  │
│  │                                                                         │   │
│  │                        [Cancel]  [Start Extraction]                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 5. Extraction Progress View

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🚀 Bulk Extraction in Progress                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                         │   │
│  │  ┌───────────────────────────────────────────────────────────────────┐ │   │
│  │  │  Progress: ████████████░░░░░░░░░  23/47 documents                │ │   │
│  │  └───────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                         │   │
│  │  ┌─────────────────────┐   ┌─────────────────────────────────────────┐ │   │
│  │  │ Speed: 4.5 docs/min │   │ Current: invoice_023.pdf                 │ │   │
│  │  │ ETA: 5 min 20 sec   │   │ Status: Extracting...                    │ │   │
│  │  └─────────────────────┘   └─────────────────────────────────────────┘ │   │
│  │                                                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Cost Tracker                                      Spent so far  │   │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐   │   │   │
│  │  │  │  Budget: $50.00  ━━━━━━━━━━━━━━━━━━━━━━━━━ $2.85       │   │   │   │
│  │  │  │  Remaining: $47.15                                      │   │   │   │
│  │  │  │                                                        │   │   │   │
│  │  │  │  Projected total: $5.50 - $8.50                        │   │   │   │
│  │  │  └─────────────────────────────────────────────────────────┘   │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  Live Queue:                                                            │   │
│  │  ✅ invoice_020.pdf  ✅ invoice_021.pdf  ✅ invoice_022.pdf              │   │
│  │  ⏳ invoice_023.pdf  ⏸ invoice_024.pdf  ⏸ invoice_025.pdf              │   │
│  │                                                                         │   │
│  │                                    [Pause]  [Stop]  [Run in Background] │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 6. Field Re-Extract Dialog

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⟳ Re-extract Field: PO No                                                [×]  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Current Value:                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │ 0000010                                                  [×]    │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │  Confidence: 95%  |  Extracted: 2 min ago                              │   │
│  │  [⟳ Re-extract this field]  [✏️ Edit manually]                         │   │
│  │                                                                          │   │
│  │  ─────────────────────────────────────────────────────────────────────  │   │
│  │                                                                          │   │
│  │  👁️ What the OCR/LLM saw:                                               │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │ {                                                                │   │   │
│  │  │   "page_1": {                                                   │   │   │
│  │  │     "header": {                                                 │   │   │
│  │  │       "po_number": {                                            │   │   │
│  │  │         "raw": "PO号码: 0000010",                               │   │   │
│  │  │         "raw_en": "PO Number: 0000010",                         │   │   │
│  │  │         "value": "0000010",                                     │   │   │
│  │  │         "confidence": 0.95                                      │   │   │
│  │  │       }                                                         │   │   │
│  │  │     }                                                           │   │   │
│  │  │   }                                                             │   │   │
│  │  │ }                                                               │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │  [View Full OCR Result]  [Copy JSON]                                 │   │
│  │                                                                          │   │
│  │  ─────────────────────────────────────────────────────────────────────  │   │
│  │                                                                          │   │
│  │  Extraction Settings:                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Model:        [GPT-4o ▼]         Cost: ~$0.01                  │   │   │
│  │  │  Custom Prompt: [Enter custom instructions...               ]   │   │   │
│  │  │                 "Extract the PO number from the header...    "   │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  │  💡 Adding specific instructions can improve accuracy for this field.    │   │
│  │                                                                          │   │
│  │                      [Cancel]                              [Re-extract]   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 7. Schema Test Mode - After First Extraction

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  👥 Group: Supplier A Invoices          Schema: Invoice v2.1  [Edit Schema]     │
│                                                                               │
│  [📊 47 docs]  [✅ OCR Complete]  [✅ 3/3 Extracted]  [💰 $0.21 spent]         │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🧪 Schema Test Mode                                   [Exit Test Mode] │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ ☑  Filename         Status    PO No      Dept      Fields    Actions     │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ ☑  invoice_001.pdf  ✅ Done   0000009    Sales     10/10     [👁️][✏️]   │   │
│  │    └─ 🟢 All fields matched                                              │   │
│  │ ☑  invoice_002.pdf  ⚠️ Partial 0000010    ???       7/10      [👁️][✏️]   │   │
│  │    └─ 🔴 Missing: department, vendor, terms                              │   │
│  │ ☑  invoice_003.pdf  ✅ Done   0000011    Mfg       10/10     [👁️][✏️]   │   │
│  │    └─ 🟢 All fields matched                                              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📊 Test Results (3 documents)                                          │   │
│  │                                                                         │   │
│  │   Overall Success: 67%  (2/3 fully extracted)                          │   │
│  │                                                                         │   │
│  │   Fields by Performance:                                                │   │
│  │   🟢 PO No: 100%  |  🟢 Invoice Date: 100%  |  🟡 Department: 33%      │   │
│  │   🔴 Vendor: 0%    |  🟡 Total Amount: 67%                            │   │
│  │                                                                         │   │
│  │   💡 Recommendations:                                                   │   │
│  │   • Department field needs prompt adjustment - only found in 1/3 docs  │   │
│  │   • Vendor field not found - consider checking schema field names       │   │
│  │   • Total Amount has mixed success - check for format variations        │   │
│  │                                                                         │   │
│  │   [Edit Schema Prompt]  [Re-extract Failed]  [Extract More Samples]     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 8. Quick OCR Peek (Hover Popup)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  invoice_002.pdf  ⚪ Ready  92%  [Extract→] [👁️ Preview OCR]                     │
│                                        ↑ Hover 500ms → Quick Peek              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🔍 Quick OCR Peek                              [View Full →]           │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │ PO Number  │ 0000010  │ 95% ✅                                    │   │   │
│  │  │ Date       │ 2024-01-15│ 92% ✅                                    │   │   │
│  │  │ Department │ 销售部      │ 89% ⚠️                                   │   │   │
│  │  │ Total      │ $1,200.00 │ 94% ✅                                    │   │   │
│  │  │ Items      │ 12 rows   │ 91% ✅                                    │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  │  ⚠️ Low confidence: Table cell (2,3) - possible OCR error               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 9. Manifest Table - After Extraction

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  👥 Group: Supplier A Invoices          Schema: Invoice v2.2 🆕               │
│                                                                               │
│  [📊 47 docs]  [✅ All Extracted]  [💰 $6.12 total]  [Export CSV]              │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Status: [All ▼]  Verified: [All ▼]  OCR Quality: [All ▼]  Search...    │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │  Filename         Status     PO No      Dept      Conf    Verified      │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │  invoice_001.pdf  ✅ Done    0000009    Sales     95%     ☑            │   │
│  │  invoice_002.pdf  ✅ Done    0000010    Sales     89%     ☑            │   │
│  │  invoice_003.pdf  ✅ Done    0000011    Mfg       91%     ☐            │   │
│  │  invoice_004.pdf  ⚠️ Check   0000012    ???       45%     ☐            │   │
│  │  invoice_005.pdf  ✅ Done    0000013    Admin     93%     ☑            │   │
│  │  ...                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📊 Extraction Summary                                                   │   │
│  │  Total Cost: $6.12  |  Avg per doc: $0.13  |  Budget remaining: $43.88  │   │
│  │  Quality: 45/47 (96%) fully extracted  |  2 need review                 │   │
│  │  [Filter: Needs Review]  [Export All]  [Start New Batch]                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 10. Cost Log Modal

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  💰 Extraction Cost Log                                              [× Close]   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  This Month: January 2024                                              │   │
│  │                                                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Total Spent: $6.12    Budget: $50.00    Remaining: $43.88      │   │   │
│  │  │  Budget Progress: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 12%      │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  Recent Activity:                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │ Time        │ Document          │ Model   │ Cost    │ Status     │   │   │
│  │  ├─────────────────────────────────────────────────────────────────┤   │   │
│  │  │ 2 min ago   │ invoice_001.pdf  │ GPT-4o  │ $0.07   │ ✅ Done    │   │   │
│  │  │ 3 min ago   │ invoice_002.pdf  │ GPT-4o  │ $0.05   │ ✅ Done    │   │   │
│  │  │ 4 min ago   │ invoice_003.pdf  │ GPT-4o  │ $0.09   │ ✅ Done    │   │   │
│  │  │ 5 min ago   │ Bulk (45 docs)    │ GPT-4o  │ $2.35   │ ✅ Done    │   │   │
│  │  │ 1 hr ago    │ Bulk (12 docs)    │ GPT-4o  │ $0.96   │ ✅ Done    │   │   │
│  │  │ 2 hr ago    │ invoice_050.pdf  │ GPT-4o  │ $0.08   │ ⚠️ Partial │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  Statistics:                                                             │   │
│  │  • Total extractions: 47 documents                                      │   │
│  │  • Average cost per document: $0.13                                     │   │
│  │  • Most expensive: $0.15 (invoice_015.pdf)                              │   │
│  │  • Cheapest: $0.03 (invoice_033.pdf)                                    │   │
│  │                                                                         │   │
│  │  [Export CSV]  [Set Budget Alert]  [View Full History]                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  Upload Files   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Manifest List View - OCR Complete                                             │
│  • Shows OCR quality scores                                                    │
│  • [Extract→] buttons available                                                │
│  • [👁️ Preview OCR] buttons                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ├──────────────────────────────────────────────────────────────────┐
         │                                                                  │
         ▼                                                                  ▼
┌──────────────────────┐                                          ┌─────────────────┐
│ Click [Preview OCR]  │                                          │ Click [Extract] │
└──────────┬───────────┘                                          └────────┬────────┘
           │                                                                 │
           ▼                                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  OCR Preview Modal                                                            │
│  • 4 tabs: PDF, Text, Layout, Vision                                         │
│  • Quality score display                                                     │
│  • [Extract Now] button                                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Extraction Confirmation Modal                                                │
│  • Cost estimate                                                              │
│  • Model/prompt selection                                                     │
│  • [Confirm] button                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Extraction Progress View                                                     │
│  • Real-time progress                                                          │
│  • Cost accumulation                                                           │
│  • Queue status                                                                │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Manifest List View - Extracted                                                │
│  • Shows extraction results                                                   │
│  • [⟳ Re-extract] buttons                                                     │
│  • Row click → Detail view                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Manifest Detail View                                                         │
│  • Extracted data display                                                     │
│  • Per-field [⟳ Re-extract] buttons                                          │
│  • [👁️ OCR Raw] tab                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Field Re-Extract Dialog                                                       │
│  • Current value                                                              │
│  • OCR context preview                                                        │
│  • Custom prompt input                                                        │
│  • [Re-extract] button                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Risks / Trade-offs

### Risk 1: Database Storage Growth

**Risk**: OCR results stored as JSONB will significantly increase database size.

**Impact**: 1000 documents × ~500KB OCR = 500MB additional storage.

**Mitigation**:
- Compress JSONB if needed (PostgreSQL has TOAST compression)
- Consider partitioning by date
- Add cleanup job for old manifests
- Monitor storage metrics

### Risk 2: OCR Result staleness

**Risk**: PaddleOCR-VL updates may change output format, breaking stored results.

**Mitigation**:
- Version OCR results in metadata
- Add migration path for format changes
- Store raw response + parsed structure

### Risk 3: Backward compatibility

**Risk**: Existing manifests lack OCR results.

**Mitigation**:
- Background job to populate OCR for extracted manifests
- Graceful degradation (show "OCR not available")
- API returns null for missing OCR

### Risk 4: Cost estimation accuracy

**Risk**: Actual costs may differ from estimates.

**Mitigation**:
- Show range (min-max) not exact amount
- Track actual vs estimated for calibration
- Update estimates based on historical data

## Migration Plan

### Phase 1: Database & Backend (1-2 days)
1. Run migration to add columns
2. Update Entity and DTOs
3. Implement OCR result storage in extraction service
4. Add new API endpoints
5. Add background job for existing manifests

### Phase 2: Frontend Core (2-3 days)
1. Create OcrPreviewModal component
2. Update ManifestTable with new columns
3. Add Extract buttons and cost estimation
4. Create extraction queue management

### Phase 3: Advanced Features (2-3 days)
1. Field-level re-extraction dialog
2. Schema Test Mode UI
3. Cost tracking dashboard
4. Quick OCR peek on hover

### Phase 4: Testing & Polish (1-2 days)
1. E2E tests for new flows
2. Performance testing with large OCR results
3. Accessibility audit
4. Documentation updates

### Rollback Plan
- Database migration is reversible (drop columns)
- New API endpoints are additive (no breaking changes)
- Frontend changes behind feature flag
- Can revert to auto-extraction behavior via config

## Open Questions

1. **OCR result retention**: Should we delete OCR results after N days?
2. **Re-OCR policy**: If PaddleOCR-VL updates, should we re-process old docs?
3. **Concurrent extraction limits**: Should we limit concurrent extractions per user?
4. **Cost budget alerts**: Should we notify when approaching budget limits?
5. **OCR quality threshold**: Should we block extraction below quality score?

## Performance Considerations

### Database Queries
- Index on `ocr_processed_at` for finding unprocessed manifests
- Index on `ocr_quality_score` for filtering
- JSONB queries on `ocr_result` may need GIN index for complex queries

### API Response Sizes
- OCR results can be 100KB-1MB per document
- Consider pagination for large OCR results
- Add compression for API responses

### Frontend Rendering
- Lazy load OCR modal content
- Virtualize large tables in preview
- Debounce hover interactions
