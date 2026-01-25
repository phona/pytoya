# Proposal: Refactor Manifest Filters to Be Schema-Driven (Remove Invoice-Centric “System Filters”)

## Why

The platform currently exposes invoice-centric “system filters” and denormalized columns (`poNo`, `department`, `invoiceDate`, etc.). This is business logic living in the platform layer and makes the codebase feel more complex than it needs to be.

### Root cause
Filtering UX and API parameters are partially hardcoded around invoice fields instead of using the existing **dynamic extracted-data filter** mechanism.

## What Changes
- Make filtering fully schema-driven:
  - Use dynamic filters (`filter[dot.path]=...`) for extracted data fields.
  - Deprecate invoice-centric filter params (e.g., `poNo`, `department`).
- Align web UI filters with schema configuration:
  - Prefer schema `x-table-columns` (and/or future `x-filter-fields`) to decide which fields are filterable in the UI.

## Goals
- One filtering mechanism for all document types.
- No invoice-specific filter parameters in core API/UI.
- Reduced backend complexity (less bespoke query logic).

## Non-Goals
- Implementing new advanced query language (OR groups, nested boolean logic).
- Adding new production dependencies without explicit confirmation.

## Risks
- UI behavior change for users relying on dedicated PO/department/date filters; mitigate via:
  - a deprecation window, and/or
  - auto-mapping old params to dynamic `filter[...]` for a limited time.

## Validation Plan
- Update/extend tests for:
  - dynamic filter-only behavior
  - legacy filter param mapping (if kept temporarily)
- Run:
  - `npm run test`
  - `npm run lint`
  - `npm run type-check`

