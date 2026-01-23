## Why

Vision-capable LLM text extraction currently sends all PDF pages as images in a single request. This is fragile for multi-page PDFs (context/image limits, timeouts) and makes it hard to guarantee stable page ordering in the output.

We want a reliable “whole PDF → Markdown” flow by processing pages one at a time and stitching results together.

## What Changes

- Change the `vision-llm` text extractor to ALWAYS process PDFs page-by-page:
  - Convert the PDF to page images
  - Call the vision LLM once per page
  - Join per-page markdown with stable separators
- Aggregate and return metadata:
  - `pagesProcessed`
  - `inputTokens` / `outputTokens` (sum)
  - `textCost` (sum)
  - `processingTimeMs` (end-to-end)
- Improve UX: update extracted text on the page without manual reload by emitting incremental “text extraction markdown so far” updates as pages complete.

## Impact

- Reliability: improves for multi-page PDFs (fewer request-size failures).
- Performance: increases number of LLM requests (N pages => N calls).
- Cost: similar total tokens in many cases, but may increase slightly due to per-call overhead.
- Compatibility: behavior changes for `vision-llm` PDF extraction (no longer single-shot).

## Non-Goals (for this change)

- Streaming PDF-to-image conversion (avoid holding all pages in memory).
- Parallel page extraction with concurrency controls (rate-limits/backoff).
- Extra heuristics like auto-cropping, header/footer de-duplication.
- Sending an entire PDF’s page images in a single vision request.
