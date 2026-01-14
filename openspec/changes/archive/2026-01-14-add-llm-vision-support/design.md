## Context

### Current Extraction Pipeline
The extraction pipeline currently uses a two-step process:
1. PDF → PaddleOCR-VL → Markdown text
2. Markdown text + Schema → LLM → Structured JSON

This proposal adds vision capabilities as an alternative path:
1. PDF/Images → Vision LLM → Raw/Structured data
2. Optional: Raw data + Schema → Second LLM → Refined structured JSON

### Critical Constraint: Vision APIs Do NOT Support PDF

**All major vision-enabled LLM providers only accept image formats.** This is a fundamental limitation of the vision API ecosystem.

| Provider | Model | PDF Support | Image Support |
|----------|-------|-------------|---------------|
| **OpenAI** | GPT-4o, GPT-4V | ❌ No | ✅ PNG, JPEG, WebP, GIF |
| **Anthropic** | Claude 3.5 Sonnet | ❌ No | ✅ PNG, JPEG, WebP, GIF |
| **Baidu** | Qianfan MultiPicOCR | ❌ No | ✅ PNG, JPEG |
| **Azure** | OpenAI Vision | ❌ No | ✅ PNG, JPEG, WebP, GIF |
| **Google** | Gemini Pro Vision | ❌ No | ✅ PNG, JPEG, WebP, GIF |

**Why PDFs Are Not Supported:**
- Vision models are trained on image datasets, not document rendering
- PDFs contain complex structures (fonts, embeddings, layouts) that require rendering
- Converting PDF to image is non-trivial and provider-specific
- Keeping vision APIs image-only simplifies their implementation

**The Implication:**
To use vision LLMs with PDFs, we **must** convert PDF pages to images first. This is not optional - it's a hard requirement.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Vision API Requirement:                                             │
│                                                                     │
│   User uploads PDF ──► System converts ──► Images ──► Vision API   │
│                              ↑                                      │
│                         THIS conversion is REQUIRED                 │
│                         No vision API accepts PDF directly          │
└─────────────────────────────────────────────────────────────────────┘
```

### Stakeholders
- Users: Want faster, cheaper extraction with better accuracy
- Ops: Want to reduce infrastructure dependencies (PaddleOCR-VL)
- Developers: Want flexible provider support (OpenAI, Baidu Qianfan, etc.)

### Constraints
- Must maintain backward compatibility with OCR-first workflow
- Must support providers with different capability combinations (vision only, structured only, both)
- PDF-to-image conversion requires native dependencies (pdf-poppler, pdf2pic)

## Goals / Non-Goals

### Goals
- Enable direct vision-based extraction from images and PDFs
- Support two-stage extraction: vision extraction + structured refinement
- Allow per-provider configuration of capabilities
- Maintain OCR-first as default for backward compatibility

### Non-Goals
- Replacing PaddleOCR-VL entirely (remains as fallback/option)
- Automatic provider selection based on content type
- Vision-based layout detection (use LLM-native understanding)

## Decisions

### Decision 1: Message Content Type Structure
**What**: Extend `LlmChatMessageContent` to support vision content using OpenAI's format

```typescript
type LlmChatMessageContent =
  | string  // existing: text-only
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }  // NEW
  | Array<{ type: 'text' | 'image_url'; ... }>  // NEW: multimodal
```

**Why**:
- OpenAI-compatible format is de facto standard
- Most vision providers (OpenAI, Azure, Baidu Qianfan) use this format
- Allows text and images in same message

**Alternatives considered**:
- Custom vision content type → Rejected: Non-standard, harder to implement
- Separate vision endpoint → Rejected: Duplicates logic, harder to share code

### Decision 2: Extraction Strategy Configuration
**What**: Add `extractionStrategy` enum to schema/prompt configuration with values:
- `ocr-first` (default) - Current behavior: PDF → OCR → LLM
- `vision-first` - PDF/Image → Vision LLM → Raw/Structured
- `vision-only` - Skip structured output, raw text only
- `two-stage` - Vision LLM extraction → Second LLM refinement

**Why**:
- Preserves backward compatibility
- Allows gradual migration
- Supports different use cases (speed vs accuracy)

**Alternatives considered**:
- Automatic strategy selection → Rejected: Unpredictable for users
- Provider-level strategy only → Rejected: Less flexible per-schema

### Decision 3: PDF Processing Options
**What**: Support three PDF processing modes:
1. **OCR mode** (current): Send PDF to PaddleOCR-VL, get markdown
2. **Vision mode** (new): Convert PDF pages to images, send to vision LLM
3. **Hybrid mode** (new): Try vision first, fallback to OCR on failure

**Why**:
- Different providers excel at different tasks
- Fallback ensures reliability
- User control over cost/quality tradeoff

**Alternatives considered**:
- Always use vision → Rejected: Some providers don't support vision
- Always use OCR → Rejected: Misses out on vision capabilities

### Decision 4: Two-Stage Extraction Architecture
**What**: Support optional second LLM pass for data refinement:
- Stage 1 (Vision LLM): Extract raw data from image/PDF
- Stage 2 (Structured LLM): Convert raw data to final JSON schema format

**Why**:
- Some vision models excel at extraction but not structured output
- Separation allows using best model for each stage
- Can reuse cheaper models for refinement

**Alternatives considered**:
- Single-pass only → Rejected: Limits model choices
- Always two-stage → Rejected: Adds unnecessary cost/latency

### Decision 5: Provider Capability Flags
**What**: Add boolean fields to `ProviderEntity`:
- `supportsVision: boolean` - Can process image_url content
- `supportsStructuredOutput: boolean` - Can output JSON Schema

**Why**:
- Runtime capability detection without API calls
- UI can show appropriate options per provider
- Validation before attempting extraction

**Alternatives considered**:
- Dynamic capability detection via API → Rejected: Adds latency, complexity
- Hardcoded per provider type → Rejected: Inflexible for new providers

## Architecture Diagram

```
                     ┌─────────────────┐
                     │  PDF/Image      │
                     │  Upload         │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  File Type      │
                     │  Detection      │
                     └────────┬────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
         ┌─────────────┐            ┌─────────────┐
         │  Image      │            │  PDF        │
         │  (PNG/JPEG) │            │             │
         └──────┬──────┘            └──────┬──────┘
                │                          │
                │                   ┌──────┴──────┐
                │                   │             │
                │                   ▼             ▼
                │            ┌──────────┐  ┌─────────────┐
                │            │ PDF →    │  │  PaddleOCR  │
                │            │ Images   │  │  (fallback) │
                │            └────┬─────┘  └──────┬──────┘
                │                 │               │
                │                 └───────┬───────┘
                │                         │
                └─────────────┬───────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  Extraction     │
                     │  Strategy       │
                     └────────┬────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ OCR-First    │  │ Vision-First │  │ Two-Stage    │
    │              │  │              │  │              │
    │ PDF → OCR    │  │ Image →      │  │ Image →      │
    │ → LLM        │  │ Vision LLM   │  │ Vision LLM   │
    │              │  │              │  │ → Structured │
    └──────────────┘  └──────────────┘  │  LLM         │
                                      └──────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  Structured     │
                     │  JSON Output    │
                     └─────────────────┘
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF-to-image conversion failures | High | Keep OCR as fallback, log errors |
| Vision API costs higher than OCR | Medium | Make vision opt-in, cost tracking |
| Some providers don't support structured output | Medium | Two-stage mode separates concerns |
| Large PDFs = many images = token cost | High | Add page limit, compression |
| Image quality affects extraction | Medium | Configurable DPI/quality settings |

## Migration Plan

### Phase 1: Foundation
1. Add vision content types to LLM types
2. Add `supportsVision` and `supportsStructuredOutput` to ProviderEntity
3. Add image file upload support

### Phase 2: Vision Extraction
1. Implement PDF-to-image conversion
2. Add vision-first extraction strategy
3. Update LLM service to send image_url content

### Phase 3: Two-Stage Extraction
1. Add two-stage strategy configuration
2. Implement raw extraction prompt templates
3. Add refinement pass with second LLM

### Phase 4: Polish
1. Add UI for strategy selection
2. Add cost/quality metrics
3. Documentation and examples

### Rollback
- OCR-first remains default throughout
- Each phase is independently reversible
- No breaking changes to existing workflows

## Open Questions

1. **PDF-to-image library choice**: `pdf-poppler` (native, fast) vs `pdf2pic` (wrapper, simpler)?
2. **Image format for vision**: PNG (quality) vs JPEG (size) vs WebP (balance)?
3. **Default page limit** for vision-based PDF processing?
4. **Two-stage provider selection**: Should users pick both providers, or auto-select from same provider group?
