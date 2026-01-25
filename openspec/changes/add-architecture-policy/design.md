# Design: Architecture Policy (Schema-Driven, Generic, Audit-Safe)

## Intent

Define platform-level rules that keep PyToYa generic:
- Code implements **execution** and **audit**.
- Document semantics live in **project configuration** (schema/rules/scripts).

This is not an implementation design; it is a “rulebook” that future changes must align with.

## Definitions

- **Schema Contract (per project)**: The logical schema that defines document shape and UI metadata for a project.
- **Schema Version**: An immutable snapshot of the project schema contract at a point in time.
- **Run Provenance**: The set of inputs that explain an extraction/validation result (schema version, prompts, model config).

## Policy 1: Domain rules must not be hardcoded in runtime defaults

Domain constraints (field names, requiredness, formats, allowed values) MUST be expressed via:
- JSON Schema (and supported `x-*` extensions)
- schema rules
- validation scripts
- schema-scoped prompt templates

Allowed in code:
- generic platform invariants (e.g., “schema must be valid JSON Schema”)
- safety constraints (timeouts, max payload sizes, authz)

Not allowed as platform defaults:
- invoice-only field names
- invoice-specific “required fields” fallback
- invoice-specific sort semantics (e.g., “PO is numeric” because it’s PO)

## Policy 2: Required fields are optional

Requiredness is driven only by the schema:
- If the schema defines required paths (derived from JSON Schema `required` arrays), the system checks missing/empty required fields.
- If the schema defines no required paths, the system skips missing-field checks.

```text
if requiredPaths.length == 0:
  skipMissingFieldChecks()
else:
  checkMissing(requiredPaths)
```

## Policy 3: Schema contract is singular per project, but versioned internally

Product model:
- A project has one schema contract at a time (one “active” version).
- Editing the schema creates a new schema version (immutability for audit).

Audit model:
- Every extraction and validation run records the schema version (and effective prompt template) used.

```mermaid
flowchart LR
  P[Project] --> SV1[SchemaVersion v1]
  P --> SV2[SchemaVersion v2 (active)]
  R1[Run #1] --> SV1
  R2[Run #2] --> SV2
  R1 --> H[History]
  R2 --> H
```

## Policy 4: Schema-driven filtering/sorting is type-driven

Filtering/sorting behavior must not depend on field names (no hidden business rules).

Recommended default semantics:
- `type=string` → case-insensitive partial match (ILIKE); lexicographic sort
- `type=number|integer` → numeric comparisons; numeric sort
- `format=date|date-time` → date comparisons; chronological sort

If schema type is ambiguous, use:
- explicit schema metadata (future: optional `x-filter-type` / `x-sort-type`)
- or fall back to text behavior safely (documented)

## Policy 5: Validation results are versioned

Validation is part of audit:
- Validation results SHOULD record which schema version and which validation script version produced them.
- Cached results MUST be invalidated when:
  - extracted data changes
  - schema version changes
  - validation scripts change (content or enabled set)

## Related notes (non-binding guidance)

- `x-table-columns` is the explicit UI contract for schema-driven list columns.
  - absent → safe fallback selection for display only
  - empty → explicit opt-out
  - non-empty → exact configured order
- For performance at scale, prefer a generic projection layer keyed by `(schemaVersionId, manifestId, fieldPath)` for filter/sort paths.

