## 1. Audit page UX
- [ ] 1.1 Align audit page layout to full-height split view (header/body/footer)
- [ ] 1.2 Ensure single, predictable scroll container (avoid double-scroll)
- [ ] 1.3 Preserve keyboard navigation shortcuts (Esc, arrows if supported)

## 2. Schema-driven field rendering
- [ ] 2.1 Derive renderable “leaf” field paths from project `jsonSchema`
- [ ] 2.2 Map schema types to input controls (string/number/integer/boolean + basic formats)
- [ ] 2.3 Group fields by top-level section and keep stable ordering
- [ ] 2.4 Render arrays-of-objects from schema (including `items`) without hardcoding field names
- [ ] 2.5 Keep only `humanVerified` and `_extraction_info` as special UI blocks
- [ ] 2.6 Preserve re-extract button + confidence border + `x-extraction-hint`

## 3. Data wiring
- [ ] 3.1 Update form state to read/write nested values by field path
- [ ] 3.2 Ensure save payload remains compatible with `UpdateManifestDto`
- [ ] 3.3 Ensure unsaved/saving status remains accurate

## 4. Tests
- [ ] 4.1 Update/extend unit tests for schema-driven fields and hints
- [ ] 4.2 Add regression coverage for “schema adds new field → UI renders it”

## 5. Documentation
- [ ] 5.1 Update `openspec/specs/web-app/spec.md` (delta in this change)

## 6. Validation
- [ ] 6.1 Run `npm run test`
- [ ] 6.2 Run `npm run lint`
- [ ] 6.3 Run `npm run type-check`
