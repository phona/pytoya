## 1. Audit page UX
- [x] 1.1 Align audit page layout to full-height split view (header/body/footer)
- [x] 1.2 Ensure single, predictable scroll container (avoid double-scroll)
- [x] 1.3 Preserve keyboard navigation shortcuts (Esc, arrows if supported)

## 2. Schema-driven field rendering
- [x] 2.1 Derive renderable “leaf” field paths from project `jsonSchema`
- [x] 2.2 Map schema types to input controls (string/number/integer/boolean + basic formats)
- [x] 2.3 Group fields by top-level section and keep stable ordering
- [x] 2.4 Render arrays-of-objects from schema (including `items`) without hardcoding field names
- [x] 2.5 Keep only `humanVerified` and `_extraction_info` as special UI blocks
- [x] 2.6 Preserve re-extract button + confidence border + `x-extraction-hint`

## 3. Data wiring
- [x] 3.1 Update form state to read/write nested values by field path
- [x] 3.2 Ensure save payload remains compatible with `UpdateManifestDto`
- [x] 3.3 Ensure unsaved/saving status remains accurate

## 4. Tests
- [x] 4.1 Update/extend unit tests for schema-driven fields and hints
- [x] 4.2 Add regression coverage for “schema adds new field → UI renders it”

## 5. Documentation
- [x] 5.1 Update `openspec/specs/web-app/spec.md` (delta in this change)

## 6. Validation
- [x] 6.1 Run `npm run test`
- [x] 6.2 Run `npm run lint`
- [x] 6.3 Run `npm run type-check`

## 7. Fixes (post-approval)
- [x] 7.1 Resolve local `$ref` / basic `allOf` in schema-driven renderer + hint map
- [x] 7.2 Remove audit-page fallback merge for `manifest_items` (avoid `/manifests/:id/items` spam)
- [x] 7.3 Remove per-field re-extract tuning modal (Hint button is sufficient)
- [x] 7.4 Store `fieldName` on extraction jobs and filter history per field
- [x] 7.5 Show full cached OCR text in re-extract preview (no truncated snippet)
- [x] 7.6 Remove custom PDF zoom toolbar (use native viewer)
- [x] 7.7 Omit target fields from `Previous result` for re-extract prompts (avoid copy/paste results)
- [x] 7.8 Skip throttling for `/manifests/:id/items` endpoint (prevent 429 during audit)
- [x] 7.9 Default `llmModelId` on created extraction jobs (improve history/debugging)
- [x] 7.10 Force streaming for OpenAI extraction calls (reduce LLM timeouts)
