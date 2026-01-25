## 1. Define the Use-Case Boundary
- [ ] 1.1 List “business workflows” (upload/extract/audit/re-extract/bulk)
- [ ] 1.2 Define ports for Repo/Queue/Storage/LLM/OCR/Clock/Id
- [ ] 1.3 Decide the use-case module location (inside `src/apps/api/src/`)

## 2. Create Test Harness (low typing)
- [ ] 2.1 Add `TestEnv` builder (actors + fixtures)
- [ ] 2.2 Add deterministic in-memory `JobQueue` runner (no BullMQ)
- [ ] 2.3 Add fixture-based stubs for `LlmClient` and `OcrClient`

## 3. Implement Use-Case Tests (business logic)
- [ ] 3.1 Upload: non-duplicate + duplicate detection invariants
- [ ] 3.2 Extract: enqueue job + progress events + completion
- [ ] 3.3 Extract failure: LLM/OCR failure maps to failed status + error payload
- [ ] 3.4 Cancel: cancel request stops work + marks canceled/failed consistently
- [ ] 3.5 Audit edit: patch extractedData + validation gating for humanVerified
- [ ] 3.6 Re-extract field: preview-only vs execute + OCR prerequisite
- [ ] 3.7 Bulk: extract filtered/selected + delete bulk + export triggers

## 4. Add Thin API Wiring Tests (minimal)
- [ ] 4.1 Controller → use-case mapping for key endpoints (manifests upload/extract/re-extract/audit)
- [ ] 4.2 Auth/role boundary checks (1 admin page/endpoint representative)
- [ ] 4.3 Error mapping: use-case error → API envelope

## 5. Add Web Journey Tests (RTL + MSW)
- [ ] 5.1 Create “scenario-based” MSW helpers (processing→completed state machine)
- [ ] 5.2 Add minimal “most journeys” suite (8–12 tests) covering the routes in proposal (see Section 7 list)
- [ ] 5.3 Keep WebSocket mocked; add 1–2 focused tests for websocket-driven updates

## 6. Docs + Quality Gates
- [ ] 6.1 Update `docs/TESTING.md` with new test layer names and guidance
- [ ] 6.2 Update `CLAUDE.md` if conventions change
- [ ] 6.3 Ensure CI runs `npm run test`, `npm run lint`, `npm run type-check`

## 7. User Journey Coverage Checklist
- [ ] 7.1 Auth gate → redirect to `/login?next_url=...` and return after login (web journey)
- [ ] 7.2 Browse to manifests: projects → group → manifests list loads (web journey)
- [ ] 7.3 Upload (new PDFs): creates manifests, refreshes list (use-case + optional web journey)
- [ ] 7.4 Upload (duplicate): marks duplicate, does not create new manifest (use-case + optional web journey)
- [ ] 7.5 Upload (mixed batch): new + duplicate + failure summary counts are correct (use-case)
- [ ] 7.6 Start extraction (single): status/progress/completion invariants (use-case)
- [ ] 7.7 Start extraction (bulk/filtered): selects the right manifests and enqueues jobs (use-case + web journey for wiring)
- [ ] 7.8 Cancel extraction mid-run: marks job canceled and matches chosen manifest semantics (use-case)
- [ ] 7.9 Extraction failure: failed status + error payload + retry allowed (use-case)
- [ ] 7.10 Audit edit: updates extractedData + validation/humanVerified gating (use-case + optional web journey)
- [ ] 7.11 Re-extract field: preview vs execute + OCR prerequisites (use-case)
- [ ] 7.12 Schema/rules impact: next extraction uses updated schema/rules/validation scripts (use-case)
- [ ] 7.13 Optional: export selected/filtered uses correct filters + columns (use-case)
