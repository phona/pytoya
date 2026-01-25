# Proposal: Make OCR Document Metadata Domain-Neutral

## Why

OCR results currently default `document.type` to `"invoice"` even when the platform is used for arbitrary schemas. This leaks invoice business meaning into stored artifacts and increases accidental coupling (UI, exports, downstream assumptions).

### Root cause
OCR “document metadata” is populated with an invoice-specific default instead of a neutral value.

## What Changes
- Change OCR result builders (including fallback OCR result generation) to set `document.type` to a neutral value (e.g., `"unknown"` or `null`) by default.
- Keep `document.type` as metadata only; runtime behavior MUST NOT branch on it.
- (Optional) Allow schema/project configuration to provide a display-only doc type label if the UI needs it.

## Goals
- Stored OCR artifacts are domain-neutral by default.
- Avoid “invoice” bleed-through into generic projects.

## Non-Goals
- Automatic document classification (invoice vs receipt vs contract).
- Adding new production dependencies without explicit confirmation.

## Validation Plan
- Update/extend tests around OCR result building and fallback OCR result generation.
- Run:
  - `npm run test`
  - `npm run lint`
  - `npm run type-check`

