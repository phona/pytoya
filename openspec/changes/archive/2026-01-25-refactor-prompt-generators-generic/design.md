# Design: Domain-Neutral Prompt Generators

## Principles

1) **Default prompts must be generic**
- Prompts must not assume invoice/receipt/contract field names or formats.

2) **Domain rules are configuration**
- If you need PO formats, units, or language requirements, encode them in:
  - schema rules / validation scripts
  - prompt rules markdown
  - schema-scoped prompt templates
  - user-provided descriptions

3) **Auditability**
- If prompt inputs affect extraction or validation outcomes, record the effective prompts in run history for audit/replay.

## Prompt Generator Patterns

### Prompt optimization (`optimizePrompt`)

- Input: user description (and optional context).
- Output: system prompt text for extraction.
- Behavior:
  - Provide a strong generic structure (contract-first extraction, null-over-guessing, no extra text).
  - Include domain constraints only if they appear in the user description/context.

### Validation script generation

- Input: user prompt + structured reference data (schema snapshot + example extracted data).
- Output: `{ name, description, severity, script }` JSON.
- Behavior:
  - Use document-neutral language.
  - Encourage scripts to reference dot-paths and tolerate nulls.

## What “domain-neutral” means (concrete)

- Avoid hardcoding:
  - “invoice” wording
  - fixed PO formats (e.g., “7 digits”)
  - fixed unit enums (KG/EA/M)
  - fixed language requirements (“Chinese invoices”)

- Allow:
  - examples that mention invoices/receipts/contracts (as examples only)
  - schema template library for common document types

## Quick diagram

```mermaid
flowchart LR
  D[User description/prompt] --> G[Prompt Generator (generic)]
  C[Project config: schema/rules/prompt rules] --> G
  G --> P[Effective prompt/script]
  P --> H[Job/History snapshot]
```

