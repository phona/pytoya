# Multi-OCR + Confidence Routing + Human-in-Loop

Date: 2026-07-29
Status: Final

## Problem

PaddleOCR fine-tuning to 99% accuracy is not achievable. Accept OCR imperfection and route low-confidence fields to human reviewers for crop-level verification. Multi-OCR cross-validation (multiple parallel extractors feeding into a single LLM pass) catches inconsistencies and signals where human review is needed.

Review UI 遵循**一鱼两吃**原则：前端展示原图 + bbox 框，用户可以拖拽调框、输入校正文本。后端保存精确框位 + 校正文本，pytoya-ocr 直接取作微调训练数据。

## Architecture

```
extract(pipeline: [{ type, config }], file)
  │
  ├─ Promise.allSettled([
  │    PaddleOCR-VL     → markdown
  │    inference-ocr    → [{text, confidence, bbox}]
  │  ])
  │
  └─ merge → pages[].markdown
     "=== Extractor: PaddleOCR-VL ===\n...
      === Extractor: inference-ocr ===\n..."
         ↓
  DeepSeek（交叉验证 + 提取）
    ├─ extracted_data
    └─ _human_review[]
         ↓
    GET /pending-crops    → bbox + 预览 cropImage
    GET /pages/:page/image → 原图（前端渲染 bbox 框，可拖拽调整）
    POST /verify          → correctedText + adjustedBbox → extraction_history
         ↓
    pytoya-ocr 读 extraction_history → { 原图, 精确框位, 校正文本 } → 微调
```

## Components

### 1. TextExtractor 接口扩展

每个 extractor class 声明自己的配置 schema 和 prompt 贡献：

```typescript
// text-extractor/types/extractor.types.ts
export interface ExtractorMetadata {
  type: string;
  supportedFormats: string[];
  configSchema: JsonSchema;         // 声明 pipeline 级配置项
  promptContribution: string;       // 告诉 LLM 这个 extractor 输出什么
}

export interface TextExtractor {
  extract(input: TextExtractionInput): Promise<TextExtractionResult>;
}
```

**configSchema 示例（inference-ocr）**：
```json
{
  "type": "object",
  "properties": {
    "confidenceThreshold": {
      "type": "number",
      "title": "置信度阈值",
      "default": 0.8,
      "minimum": 0,
      "maximum": 1
    },
    "serviceUrl": {
      "type": "string",
      "title": "推理服务地址",
      "default": "http://localhost:8090"
    }
  },
  "required": ["serviceUrl"]
}
```

前端通过 `GET /extractors` 获取所有可用类型 + schema，动态渲染配置表单。

### 2. inference-ocr Extractor

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

### 3. Multi-OCR Execution Engine

`TextExtractorService.extract()` receives a **pipeline** — an array of `{ type, config }` steps:

```typescript
interface PipelineStep {
  type: string;                          // extractor type identifier
  config: Record<string, unknown>;       // pipeline 级参数
}
```

Execution:
1. 遍历 pipeline，按 type 从 registry 找 extractor class
2. 合并 **基础设施配置**（创建时存入 DB 的静态配置）和 **pipeline 配置**（调用方传入的调参）
3. 并行执行所有 extractor via `Promise.allSettled`
4. 成功结果按 `=== Extractor: <name> ===` 分隔符拼进 `pages[].markdown`
5. 收集所有 extractor 的 `promptContribution` → 追加到 system prompt

### 4. GET /extractors

Returns all registered extractor types for frontend UI rendering.

```json
[
  {
    "type": "paddle-ocr-vl",
    "name": "PaddleOCR-VL",
    "configSchema": { ... },
    "promptContribution": "I provide full-page markdown with layout structure."
  },
  {
    "type": "inference-ocr",
    "name": "Inference OCR (det_v4+rec_v8)",
    "configSchema": { ... },
    "promptContribution": "I provide individual text boxes with confidence scores and positions."
  }
]
```

### 5. Project / Schema 集成

`schema` / `project` 上加一个配置字段 `ocrExtractors`，作为 workflow 的默认 OCR 配置：

```json
{
  "ocrExtractors": [
    { "type": "paddle-ocr-vl", "config": { "timeout": 30000 } },
    { "type": "inference-ocr", "config": { "confidenceThreshold": 0.8 } }
  ]
}
```

`POST /extract` 支持通过 API 覆盖：传 `pipeline` 则优先使用，不传则走 schema 的 `ocrExtractors`。

### 6. Multi-Source DeepSeek Prompt

System prompt stored in `prompts` database table as `multi_ocr_extraction` entry.

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
      "reason": "source_mismatch" | "low_confidence",
      "ocr_text": "<source text>",
      "page": <int>,
      "bbox": [x, y, w, h]
    }
  ]
}
```

各 extractor 的 `promptContribution` 自动添加到 system prompt 中。

### 7. API Endpoints

#### GET /extractors

Returns all registered extractor types + their `configSchema` and `promptContribution`.

#### GET /manifests/:id/pending-crops?threshold=0.8

Reads latest `extraction_history` entry, extracts `_human_review[]`. Filters out already-verified items. Returns bbox + pre-cropped preview.

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
      "reason": "low_confidence",
      "bbox": [100, 50, 200, 30]
    }
  ],
  "total": 5
}
```

#### GET /manifests/:id/pages/:page/image

Returns the original page image. Image manifests: serve directly. PDF manifests: extract page (v1 returns full file, frontend handles PDF).

#### POST /manifests/:id/crops/verify

```json
{
  "field": "invoice_no",
  "page": 1,
  "correctedText": "INV-67890",
  "adjustedBbox": [98, 48, 204, 32]
}
```

Actions:
1. Idempotency check
2. Write `extraction_history` with `reason='manual_crop_verification'`, `changes={field, page, originalText, correctedText, adjustedBbox, originalBbox}`
3. Update `manifest.extracted_data[field] = correctedText`

pytoya-ocr 侧读 `adjustedBbox ?? originalBbox` 做精确裁图。

### 8. Storage & Data Flow

| Data | Storage | Notes |
|------|---------|-------|
| Pipeline config | `schema.ocrExtractors` | schema 级默认 OCR 配置 |
| Multi-extractor results | `manifest.ocr_result.pages[].markdown` | Concatenated with delimiters |
| DeepSeek output | `extraction_history` (reason=`extraction`) | Full output + `_human_review` |
| Human verification | `extraction_history` (reason=`manual_crop_verification`) | `{field, page, correctedText, adjustedBbox?, originalBbox}` |

## Non-Goals

- Changes to `ManifestStatus` enum or `humanVerified` boolean
- New frontend (crop review UI is in pytoya-mobile)
- Training data storage or export (pytoya-ocr reads extraction_history)
- Modifications to `OcrResultDto`
- Generic workflow engine (pipeline is extraction-scope only)

## Open Questions

1. **PDF 页面图片端点**：v1 是否支持 PDF 翻页，还是只支持单图片？
2. **schema.ocrExtractors**：存在 JSONB 字段中还是单独关联表？推荐 JSONB（配合现有 schema 的 validationSettings 模式）
