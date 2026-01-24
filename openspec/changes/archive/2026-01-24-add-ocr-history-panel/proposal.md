# Proposal: Add OCR History Panel (Separate From Extraction History)

## Summary
Users can queue OCR refresh jobs. They want to review those OCR refresh runs without mixing them into extraction history (which contains model/prompt/field details).

This change adds a separate **OCR History** section in the manifest Audit page History tab.

## Goals
- Keep existing **Extraction History** UI unchanged (pure extraction context).
- Show OCR refresh job runs (status + timestamps + duration + error).

## Non-goals
- No per-run prompt/model details for OCR history.
- No new job types beyond existing `jobs.kind = 'ocr'`.

## UX
History tab layout:
- Extraction History (existing)
- OCR History (new)

## Approval
Approved by user choice “B” in chat (separate section).

