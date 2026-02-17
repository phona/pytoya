# Proposal: Send Full OCR Text to LLM for Re-extract (No Fallback)

## Why

Field-level re-extract previously could send only a small OCR snippet to the LLM, which caused missing fields when the relevant content was outside the snippet.

### Root cause

A UI-oriented OCR preview snippet (`ocrPreview.snippet`) was incorrectly passed as an extraction context override (`textContextSnippet`). The prompt builder treats an override as authoritative, so the LLM only saw the snippet instead of the full cached OCR Markdown.

## What Changes

- The field re-extract flow uses `POST /api/manifests/:id/re-extract` only.
- The queued extraction job MUST use the full cached OCR Markdown (all pages) as the LLM text context.
- There is NO fallback: if the LLM provider rejects the request due to context length, the extraction job fails with a stable, human-readable error and the UI shows an error tip (toast/modal).

## Oversized context behavior (decision-complete)

### Definition

- The backend does NOT pre-check OCR size.
- The backend sends the full cached OCR Markdown to the LLM.
- If the LLM provider/model rejects the request due to context length, the backend normalizes that provider error into a stable job error message.
- The job MUST be discarded (no BullMQ retries) for this condition.

### Job error contract

- Message (human readable): `OCR context too large for extraction; choose a larger-context model or reduce pages.`

### Provider error detection (backend)

The backend treats these as oversized-context errors:
- Error codes like `context_length_exceeded` (when present)
- Error messages containing phrases like `maximum context length` / `context length` / `too many tokens` / `prompt is too long` (case-insensitive)

## UI behavior

- When the re-extract job fails with the oversized-context message, the UI shows a destructive toast (or modal inline error) with that message.
- The UI MUST NOT silently retry with snippet-only OCR context.

## Scope

In scope:
- `POST /api/manifests/:id/re-extract` for field-level re-extraction
- Removal of the preview/snippet endpoint and any snippet-based override wiring
- Backend normalization of LLM context-length failures into a stable job error (and discard/no-retry)
- Frontend toast/modal error handling for oversized-context failures

Out of scope:
- Automatic fallback behavior (snippet/chunking)
- Any new API flags (e.g. `contextMode`)

## Architecture

```mermaid
flowchart LR
  UI[Web Audit Panel] --> API[POST /manifests/:id/re-extract]
  API --> QUEUE[enqueueExtractionJob()]
  QUEUE --> WORKER[Extraction worker]
  WORKER --> EXTRACT[Build LLM prompt]
  EXTRACT --> LLM[LLM extraction]

  LLM -.->|IF context too large => stable job error + toast| UI
```

## Pseudocode

```text
# API
enqueueExtractionJob({ manifestId, fieldName, llmModelId?, promptId? })

# Worker
try:
  call LLM with state.textResult.markdown  # full cached OCR Markdown
catch providerError where isContextLengthExceeded(providerError):
  throw OcrContextTooLargeError("OCR context too large...")
```

## Acceptance Criteria

- Re-extract queues an extraction job that uses full OCR Markdown as LLM input (no snippet override).
- If the LLM rejects the request due to context length, the job fails with the stable message and the UI shows an error tip.
- No fallback behavior is attempted.

## Risks / Side Effects

- LLM input tokens/cost/latency may increase for field re-extract because it uses full OCR.
- Some long documents may fail due to model context limits.