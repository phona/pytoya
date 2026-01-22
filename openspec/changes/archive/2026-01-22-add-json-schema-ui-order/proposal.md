# Change: Add JSON Schema UI Field Ordering

## Why
- Postgres `jsonb` does not preserve object key order, so JSON Schema `properties` order cannot round-trip reliably.
- Users need an intentional, stable field order for:
  - Manifest audit form rendering
  - Schema JSON preview readability and stable diffs
  - Prompt/rules generation schema stringification (human-facing)

## What Changes
- Introduce custom ordering metadata: `x-ui-order` (number) on property schemas.
- Web application:
  - Render schema-driven audit form fields using `x-ui-order` ordering (root + nested + array `items` object).
  - Display schema previews using canonical property ordering derived from `x-ui-order`.
  - Visual schema builder supports reordering properties and persists `x-ui-order`.
- API:
  - When serializing schemas into prompts/rules content, use canonical ordering derived from `x-ui-order` (does not change validation semantics).
  - Optional hardening: strip `x-ui-order` from `response_format.json_schema.schema` if a provider rejects unknown keywords.

## Impact
- Affected specs: `web-app`, `json-schema-extraction`
- Affected code: web schema utils + schema builder components, API schema stringification in prompt/rules generation
- Backwards compatible: schemas without `x-ui-order` fall back to deterministic property-name ordering
- No database migration: stored in existing `schemas.json_schema` (`jsonb`)
