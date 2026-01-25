# Proposal: Refactor Extraction Validation to Be Schema-Driven (No Domain Defaults)

## Why

PyToYa is moving toward a **schema-driven extraction + audit platform**. Today, parts of the extraction runtime still carry legacy invoice assumptions (e.g., default required fields / “items”), which makes non-invoice schemas feel “broken” and increases code complexity.

### Root cause
Some extraction behaviors are defined by runtime defaults instead of the **project’s active JSON Schema contract**.

## What Changes
- Remove invoice-shaped runtime defaults (e.g., `DEFAULT_REQUIRED_FIELDS`) from extraction behavior.
- Make “required field” expectations come only from:
  - JSON Schema `required` semantics, and/or
  - schema-derived `requiredFields` (if present), but **never** from invoice defaults.
- Remove any special-case “items must exist” validation from core extraction (array presence is validated by JSON Schema if desired via `required` / `minItems`).

## Goals
- Any document type works by configuration (schema/rules/scripts), not by code defaults.
- If a schema has **no required fields**, the runtime does **not** fail due to missing-field checks.
- Extraction runtime is simpler to test and reason about.

## Non-Goals
- Changing user-facing APIs in this change (unless required to remove domain defaults).
- Adding new production dependencies without explicit confirmation.

## Architecture (Before → After)

```text
BEFORE (implicit defaults)
  schema (maybe empty required)
    + runtime invoice defaults (required fields / items)
        -> prompt + validation behavior

AFTER (schema-only contract)
  schema contract (required/minItems/etc)
        -> prompt + validation behavior
```

```mermaid
flowchart TD
  OCR[OCR/Text Extract] --> PB[Prompt Builder]
  S[Project Schema] --> PB
  R[Schema Rules/Settings] --> PB
  PB --> LLM[LLM]
  LLM --> AJV[AJV Validate (schema)]
  AJV --> AUDIT[Audit + Issues]
  AUDIT --> DB[(Persist)]
```

## Risks
- Behavior change for projects that accidentally relied on invoice defaults (mitigate with clear migration note + tests).

## Validation Plan
- Add/adjust tests to ensure:
  - schema with no required fields does not trigger “missing fields” failures
  - non-invoice schemas do not receive invoice-only prompt/validation constraints
- Run:
  - `npm run test`
  - `npm run lint`
  - `npm run type-check`

## Open Questions
- If “required fields” exist but are missing, should that be:
  - a hard failure (trigger re-extract), or
  - a soft audit issue (allow completion)?

