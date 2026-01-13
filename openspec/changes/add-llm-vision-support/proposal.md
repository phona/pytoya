# Change: Add LLM Vision Support for Direct PDF/Image Parsing

## Why

### Current Limitation
All major vision-enabled LLMs (OpenAI GPT-4o, Claude 3.5, Baidu Qianfan, Azure OpenAI, Google Gemini) **only support image formats (PNG, JPEG, WebP, GIF)**. They do **not** accept PDF files directly.

Current PDF extraction requires PaddleOCR-VL as an intermediate step before LLM processing. This creates:
- **Dependency overhead** - Requires maintaining a separate OCR service
- **Latency** - Two-step process adds processing time
- **Cost** - OCR service infrastructure costs
- **Limited accuracy** - OCR errors propagate to LLM extraction

### The Gap
```
┌─────────────────────────────────────────────────────────────┐
│ Current:   PDF ──► PaddleOCR ──► Text ──► LLM ──► JSON     │
│            ↑                                                 │
│         Users have PDFs, but vision LLMs need images        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
| Needed:   PDF ──► Convert ──► Images ──► Vision LLM ──► JSON │
│                         ↑                                   │
│              Missing: PDF-to-image conversion              │
└─────────────────────────────────────────────────────────────┘
```

### The Solution
Vision-enabled LLMs can process images directly. By adding PDF-to-image conversion, we can:
- Send PDF pages directly to vision LLMs (bypass OCR)
- Support direct image uploads (PNG, JPEG from users)
- Potentially improve accuracy by eliminating OCR error propagation

## What Changes

- **Add vision content support** to LLM service for image_url content type
- **Add image file upload** support (PNG, JPEG, WebP) alongside PDF
- **Add PDF-to-image conversion** for direct vision processing
- **Add two-stage extraction option**: Vision LLM for raw extraction → Second LLM for structured output
- **Add provider capability flags** for `supportsVision` and `supportsStructuredOutput`
- **Add configurable extraction strategy**: OCR-first vs Vision-first vs Hybrid

## Impact

- Affected specs: `extraction`, `provider-prompt-config`
- Affected code:
  - `src/apps/api/src/llm/` - LLM service and types
  - `src/apps/api/src/extraction/` - Extraction service workflow
  - `src/apps/api/src/manifests/` - File upload interceptor
  - `src/apps/api/src/entities/` - Provider entity
  - `src/apps/api/src/prompts/` - Prompt templates for vision

## Breaking Changes

None. New capabilities are additive; existing OCR-first workflow remains default.
