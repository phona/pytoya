# Proposal: Refactor Prompt Generators to Be Domain-Neutral

## Why

PyToYa is evolving toward a **generic extraction + audit** platform supporting multiple document types (invoice, receipt, contract, etc.).

Today, some prompt-generation code paths embed invoice-specific rules/wording (e.g., “invoice extraction”, PO number format, allowed units). This creates hidden coupling: new document types inherit business logic that should be expressed via **project configuration** (schema/rules/scripts), not via runtime defaults.

### Root cause

Some LLM prompt generators are written as if the platform is invoice-only:
- Prompt optimization includes fixed invoice constraints.
- Validation script generation is explicitly “invoice validation scripts”.

This conflicts with a schema-driven platform where domain constraints come from:
- JSON Schema (+ supported `x-*` extensions)
- schema rules + validation scripts
- project prompt rules (Markdown)
- schema-scoped prompt templates

## What Changes

This change refactors prompt-generation behavior to be **domain-neutral by default**:
- Prompt optimization (`optimizePrompt`) becomes “document extraction prompt optimization”.
- Validation script generation becomes “extracted-data validation script generation”.
- Domain constraints (PO formats, units, language, OCR corrections) are included only when provided by:
  - user description / prompt input, and/or
  - schema/rules/settings/prompt rules markdown for the project.

## Goals
- Make prompt generators safe defaults for any document type.
- Reduce hidden business logic in runtime code.
- Keep behavior predictable: domain rules live in configuration, not hardcoded strings.

## Non-Goals
- Removing invoice/receipt/contract schema templates (template library remains allowed).
- Changing extraction orchestration, queue behavior, or APIs beyond prompt content.
- Introducing new production dependencies without explicit approval.

## Architecture (Prompt Layering)

```text
Base system prompt (generic)
  + Schema.systemPromptTemplate (optional, project-config)
  + PromptRulesMarkdown (optional, project-config)
  + Contract blocks (schema/rules/settings)
  + CustomPrompt (optional, per-run)
```

## Validation Plan
- Update/add unit tests for prompt generator outputs (ensure no invoice-only assumptions).
- Run:
  - `npm run test`
  - `npm run lint`
  - `npm run type-check`

## Open Questions
- Should the prompt optimizer accept optional structured input (schema JSON) to improve quality without hardcoding domain rules?
- Should prompt optimization explicitly warn if the description is too vague (to avoid generating brittle prompts)?

