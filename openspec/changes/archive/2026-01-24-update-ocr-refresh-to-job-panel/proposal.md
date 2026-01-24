# Proposal: Move OCR Refresh To Jobs Panel

## Summary
Refreshing OCR results from the Audit panel currently runs as a synchronous HTTP request. In practice, OCR rebuild can be slow (file IO + external extractor latency), which makes the UI feel stuck.

This change moves **Refresh OCR cache** to a background job so users can monitor progress in the global Jobs panel and optionally cancel.

## User value
- No “stuck” buttons: action returns immediately with a queued job.
- Progress visibility: shows up in Jobs panel with status/progress.
- Safer workflow: long OCR work can be canceled.

## Non-goals
- No new OCR provider/extractor integrations.
- No bulk OCR refresh from list (single-manifest only for now).

## Proposed UX
When a user triggers **Refresh OCR cache**:
- The system enqueues an OCR refresh job and returns `jobId` immediately.
- The Audit panel shows a toast (“Queued… see Jobs panel”) and opens the Jobs panel.
- The Jobs panel shows an `OCR refresh` job row with progress and status.
- On completion, the OCR tab data is refreshed via `ocr-update` event invalidation.

## Approval
User approval received in chat: “go”.

