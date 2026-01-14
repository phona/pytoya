# LLM Vision Support - Extraction Strategies

This document describes the extraction strategies available for processing PDF and image files using vision-enabled LLM providers.

## Overview

The system supports multiple extraction strategies to handle different document types and LLM capabilities. Each strategy has different trade-offs in terms of accuracy, cost, and processing speed.

## Extraction Strategies

### 1. OCR_FIRST (Default)

**Description**: Traditional OCR-based extraction using PaddleOCR-VL. This is the default strategy for backward compatibility.

**Process Flow**:
1. Upload PDF/image
2. Process with PaddleOCR-VL to extract text and layout
3. Send OCR text to LLM for structured data extraction
4. Validate and retry if needed

**Use Cases**:
- Documents with clear, machine-printed text
- Low-cost extraction (vision APIs are more expensive)
- Providers without vision capabilities

**Provider Requirements**:
- Any LLM provider (no special requirements)

**Pros**:
- Lowest cost (text-only API calls)
- Works with any LLM provider
- Fast processing (no image conversion)
- Proven reliability

**Cons**:
- OCR errors can affect extraction quality
- May miss visual elements (logos, signatures, tables)
- Limited by OCR accuracy

### 2. VISION_ONLY

**Description**: Direct image extraction without OCR. Images are sent directly to the vision-enabled LLM.

**Process Flow**:
1. Upload PDF/image
2. For PDFs: Convert pages to PNG images (144 DPI)
3. For images: Use directly
4. Send images to vision LLM for extraction
5. Validate and retry if needed

**Use Cases**:
- Documents with complex layouts, tables, or visual elements
- Handwritten or scanned documents
- Documents where OCR accuracy is poor
- High-accuracy requirements

**Provider Requirements**:
- Provider must support vision (`supportsVision: true`)
- Examples: OpenAI GPT-4o, GPT-4o-mini, Claude 3.5+ Sonnet

**Pros**:
- Best accuracy for complex layouts
- Preserves visual information
- Can interpret handwriting, signatures, logos
- No OCR errors introduced

**Cons**:
- Higher cost (vision APIs are more expensive)
- Slower processing (PDF-to-image conversion)
- Requires vision-capable provider
- Larger token usage (images as base64)

### 3. VISION_FIRST

**Description**: Vision extraction with OCR as fallback context. Uses both visual and textual information.

**Process Flow**:
1. Upload PDF/image
2. Convert PDFs to images
3. Process with PaddleOCR-VL to get text
4. Send BOTH images and OCR text to LLM
5. OCR text provides context/fallback for vision model

**Use Cases**:
- Documents where vision might miss some text
- Need maximum accuracy with redundancy
- Complex documents with mixed content types

**Provider Requirements**:
- Provider must support vision (`supportsVision: true`)

**Pros**:
- OCR provides fallback for unclear text
- Best of both worlds (visual + text)
- Higher confidence extraction
- Can validate vision results against OCR

**Cons**:
- Highest cost (vision + OCR)
- Slowest processing (both conversions)
- Redundant processing
- Largest token usage

### 4. TWO_STAGE

**Description**: Combined vision and OCR extraction in two stages for refinement.

**Process Flow**:
1. Upload PDF/image
2. Convert PDFs to images
3. Stage 1: Vision extraction from images
4. Stage 2: OCR extraction for refinement
5. Merge results with OCR as fallback for missing fields

**Use Cases**:
- Documents requiring very high accuracy
- Need verification from multiple sources
- Critical documents where errors are unacceptable

**Provider Requirements**:
- Provider must support vision (`supportsVision: true`)

**Pros**:
- Highest accuracy (multiple extraction passes)
- Cross-verification between methods
- OCR fills in missing vision data
- Best for edge cases

**Cons**:
- Highest cost (multiple LLM calls)
- Longest processing time
- Most complex workflow
- Overkill for many documents

## Strategy Selection

### Automatic Selection

When no strategy is specified in the schema, the system auto-selects based on:

1. **Image files** → `VISION_ONLY` (if provider supports vision)
2. **PDF files** → `OCR_FIRST` (default)

### Manual Selection

Set the strategy in your Schema:

```typescript
// Via API
PUT /api/schemas/:id
{
  "extractionStrategy": "vision-only"
}

// Via Database
UPDATE schema
SET extraction_strategy = 'vision-only'
WHERE id = :id;
```

### Strategy Compatibility Matrix

| Strategy | PDF Files | Image Files | Vision Required | OCR Used |
|----------|-----------|-------------|-----------------|----------|
| OCR_FIRST | ✅ | ❌ | ❌ | ✅ |
| VISION_ONLY | ✅ | ✅ | ✅ | ❌ |
| VISION_FIRST | ✅ | ❌ | ✅ | ✅ |
| TWO_STAGE | ✅ | ❌ | ✅ | ✅ |

## Configuration

### Schema Configuration

```typescript
interface SchemaEntity {
  extractionStrategy: ExtractionStrategy;
  // ... other fields
}

enum ExtractionStrategy {
  OCR_FIRST = 'ocr-first',
  VISION_FIRST = 'vision-first',
  VISION_ONLY = 'vision-only',
  TWO_STAGE = 'two-stage',
}
```

### Provider Configuration

Providers must have `supportsVision: true` for vision-based strategies:

```typescript
interface ProviderEntity {
  supportsVision: boolean;
  modelName: string;  // e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022'
}
```

## Cost Comparison

Approximate costs per 10-page document (USD):

| Strategy | OpenAI GPT-4o | OCR Cost | Total |
|----------|---------------|----------|-------|
| OCR_FIRST | $0.02 | $0.01 | $0.03 |
| VISION_ONLY | $0.30 | $0.00 | $0.30 |
| VISION_FIRST | $0.35 | $0.01 | $0.36 |
| TWO_STAGE | $0.60 | $0.01 | $0.61 |

*Prices are estimates and will vary based on document complexity and token usage.*

## Performance Comparison

Approximate processing time per 10-page document:

| Strategy | PDF Conversion | OCR | LLM Call | Total |
|----------|----------------|-----|----------|-------|
| OCR_FIRST | - | 10s | 5s | ~15s |
| VISION_ONLY | 5s | - | 15s | ~20s |
| VISION_FIRST | 5s | 10s | 20s | ~35s |
| TWO_STAGE | 5s | 10s | 30s | ~45s |

## Recommendations

### When to Use Each Strategy

**Use OCR_FIRST when**:
- Processing simple invoices/receipts
- Cost is a primary concern
- Using non-vision providers
- High-volume processing

**Use VISION_ONLY when**:
- Processing complex layouts (tables, forms, charts)
- Document has handwriting or poor print quality
- Accuracy is more important than cost
- Using vision-capable provider

**Use VISION_FIRST when**:
- Document has mixed text/visual content
- Need OCR fallback for unclear regions
- Want validation between OCR and vision

**Use TWO_STAGE when**:
- Processing critical documents (contracts, legal)
- Maximum accuracy required
- Can tolerate longer processing time
- Need cross-verification

### Provider Recommendations

| Provider | Vision Support | Recommended For |
|----------|----------------|----------------|
| OpenAI GPT-4o | ✅ Excellent | All vision strategies |
| OpenAI GPT-4o-mini | ✅ Good | VISION_ONLY (cost-effective) |
| Claude 3.5 Sonnet | ✅ Excellent | VISION_FIRST, TWO_STAGE |
| Claude 3 Haiku | ✅ Good | VISION_ONLY (fast) |
| SiliconFlow Qwen | ✅ Good | VISION_ONLY (Chinese) |
| Local LLaVA | ✅ Good | On-premise, no API costs |

## Error Handling

### Automatic Fallback

If a vision strategy is selected but the provider doesn't support vision, the system automatically falls back to `OCR_FIRST`:

```typescript
// System behavior
if (strategy === VISION_ONLY && !provider.supportsVision) {
  logger.warn('Provider does not support vision, falling back to OCR_FIRST');
  return ExtractionStrategy.OCR_FIRST;
}
```

### Common Errors

**"VISION_ONLY strategy requires converted pages"**
- Cause: Image file processed but no pages available
- Solution: Ensure image file is valid and readable

**"Provider does not support vision"**
- Cause: Provider's `supportsVision` field is false
- Solution: Use `OCR_FIRST` or switch to vision-capable provider

**"PDF conversion failed"**
- Cause: PDF is corrupted, password-protected, or invalid
- Solution: Verify PDF file is valid

## Migration Guide

### Migrating from OCR_FIRST to VISION_ONLY

1. **Verify Provider Support**:
   ```bash
   curl -X GET http://localhost:3000/api/providers
   # Check supportsVision field
   ```

2. **Update Schema Strategy**:
   ```bash
   curl -X PATCH http://localhost:3000/api/schemas/:id \
     -H "Content-Type: application/json" \
     -d '{"extractionStrategy": "vision-only"}'
   ```

3. **Test with Sample Document**:
   ```bash
   curl -X POST http://localhost:3000/api/manifests \
     -F "file=@test-invoice.pdf" \
     -F "groupId=1"
   ```

### Rollback Plan

If vision extraction causes issues:
```bash
# Revert to OCR_FIRST
curl -X PATCH http://localhost:3000/api/schemas/:id \
  -H "Content-Type: application/json" \
  -d '{"extractionStrategy": "ocr-first"}'
```

## Troubleshooting

### Vision Extraction Issues

**Problem**: Vision extraction returns poor results

**Solutions**:
1. Increase PDF conversion DPI (default is 144 DPI / scale 2)
2. Try different provider (GPT-4o vs Claude)
3. Switch to VISION_FIRST for OCR fallback
4. Use TWO_STAGE for highest accuracy

**Problem**: PDF conversion is slow

**Solutions**:
1. Reduce DPI scale (e.g., scale 1 for 72 DPI)
2. Process specific pages only
3. Use OCR_FIRST if vision isn't critical

### Cost Issues

**Problem**: Vision extraction is too expensive

**Solutions**:
1. Use GPT-4o-mini instead of GPT-4o (50% cheaper)
2. Switch to OCR_FIRST for simple documents
3. Limit VISION_ONLY to complex documents only
4. Use auto-selection with smart defaults

## API Reference

### Update Schema Strategy

```http
PATCH /api/schemas/:id HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "extractionStrategy": "vision-only"
}
```

### Get Provider Capabilities

```http
GET /api/providers HTTP/1.1
Host: localhost:3000

Response:
{
  "id": 1,
  "name": "OpenAI GPT-4o",
  "supportsVision": true,
  "supportsStructuredOutput": true,
  ...
}
```

### Run Extraction with Strategy

```http
POST /api/manifests/:manifestId/extract HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "providerId": 1,
  "schemaId": 1
}
```

The system will use the schema's configured `extractionStrategy` automatically.
