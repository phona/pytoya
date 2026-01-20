# Text Extractor Development Guide

This guide explains how to add a new text extractor to the backend and expose it in the UI.

## When to add a new extractor

- You need a new OCR provider or a different vision LLM endpoint.
- You want a new pricing model (token, page, fixed).
- You need extractor-specific metadata (quality score, OCR layout, etc.).

## Backend steps

1) Create an extractor class
- Location: `src/apps/api/src/text-extractor/extractors/`
- Extend `BaseTextExtractor`
- Provide static `metadata` with params + pricing schemas

Example:
```ts
import { BaseTextExtractor } from '../base-text-extractor';
import type { ExtractorMetadata, TextExtractionInput, TextExtractionResult } from '../types/extractor.types';
import { PRICING_SCHEMA } from '../types/pricing-schema';

export class MyExtractor extends BaseTextExtractor {
  static metadata: ExtractorMetadata = {
    id: 'my-extractor',
    name: 'My Extractor',
    description: 'Custom OCR service',
    version: '1.0.0',
    category: 'ocr',
    supportedFormats: ['pdf', 'image'],
    paramsSchema: {
      baseUrl: { type: 'string', required: true, label: 'Base URL' },
      apiKey: { type: 'string', required: false, label: 'API Key', secret: true },
    },
    pricingSchema: PRICING_SCHEMA,
  };

  async extract(input: TextExtractionInput): Promise<TextExtractionResult> {
    const start = Date.now();
    // Call provider here...
    return {
      text: '...',
      markdown: '...',
      metadata: {
        extractorId: MyExtractor.metadata.id,
        processingTimeMs: Date.now() - start,
        textCost: 0,
        currency: this.getPricing().currency,
        pagesProcessed: 1,
      },
    };
  }
}
```

2) Register the extractor
- Location: `src/apps/api/src/text-extractor/text-extractor.registry.ts`
- Add `this.register(MyExtractor);` in `onModuleInit()`.

3) Add presets (optional)
- Location: `src/apps/api/src/extractors/extractor-presets.ts`
- Use presets to ship recommended configurations.

4) Update extractors module (if needed)
- Ensure new class is imported anywhere required (usually the registry is enough).

## Pricing config

Use `config.pricing` to describe how costs are calculated.

Supported modes:
- `token` (input/output price per 1M tokens)
- `page` (price per page)
- `fixed` (flat cost per extraction)
- `none` (free)

Always include `currency` and return cost in `TextExtractionResult.metadata.textCost`.

## Frontend integration

The UI reads `paramsSchema` and `pricingSchema` dynamically:
- No new React code is required for most extractors.
- Ensure schema fields are accurate (labels, defaults, required).

If the extractor introduces new config fields that need custom UI behavior:
- Update `ExtractorConfigForm` or `PricingConfigForm` accordingly.
- Add tests for the new fields.

## Testing checklist

- Add unit tests for cost calculation and metadata fields.
- Add tests for extractor registry registration and validation.
- Add/adjust MSW handlers for frontend tests if new API fields appear.

## Troubleshooting

- If validation fails, check the schema in `metadata.paramsSchema`.
- If UI fields do not render, confirm `paramsSchema` keys match config keys.
- If costs show as zero, confirm `pricing.mode` and cost calculation logic.
