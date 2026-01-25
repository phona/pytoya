# Change: Add Use-Case Testing Framework (Business-Logic-First Journeys)

## Why

We want confidence in the **business rules** (upload → extract → audit → re-extract) without:
- browser E2E (Playwright), and
- real Postgres + BullMQ in tests.

The fastest way to cover most user journeys with minimal “click/type” is to test **use-cases** (application workflows) directly with in-memory ports, and keep the API/web tests thin.

### Root cause

Today, “journey coverage” tends to drift toward UI-centric tests:

```
Business rule -> implemented across API + queue + UI
             -> tests become click-heavy or brittle
```

So we either:
- over-test UI wiring, or
- under-test core workflows.

## What Changes

### 1) Define a Use-Case layer for business workflows
Introduce a small set of use-cases that represent real user intent:
- Upload manifests (including duplicate handling)
- Start extraction / re-extract field (with preview-only support)
- Audit edits + validation gating (human verified)
- Bulk operations (extract filtered/selected, delete bulk, export)

Use-cases depend on **ports** (interfaces) so tests can run with in-memory adapters:
- `ManifestRepository`, `ProjectRepository`, `UserRepository`
- `JobQueue` (in-memory deterministic runner, no Redis)
- `Storage` (in-memory or temp-folder, no PVC assumptions)
- `LlmClient`, `OcrClient` (fixture-based stubs)
- `Clock`, `IdGenerator`

### 2) Add “Use-Case Tests” (business-logic-first journeys)
Create a suite of tests that covers most user journeys by calling use-cases directly.
These tests:
- assert invariants (state transitions, emitted events, validation results),
- avoid HTTP and UI, and
- avoid TypeORM and Postgres behaviors.

### 3) Keep API tests as thin wiring tests
API tests only prove:
- request DTO validation → use-case input mapping,
- auth/role checks at the boundary, and
- response shape + error mapping.

### 4) Keep Web tests as UX wiring tests (RTL + MSW)
Web tests cover “route-level UX flows” using MSW API stubs:
- ProtectedRoute / AdminRoute routing decisions
- Page state transitions (loading → success/error)
- Poll-based job progress rendering (simulate via stubbed endpoints)

WebSocket behavior is covered by 1–2 focused tests (hook/component), not every journey.

## Architecture

```mermaid
flowchart LR
  subgraph Core[Business Core]
    UC[Use-Cases] --> P[Ports]
  end

  subgraph API[Nest API]
    C[Controllers] --> UC
    A[Adapters: TypeORM/Queue/Storage/LLM/OCR] --> P
  end

  subgraph Tests[Test Suites]
    UCT[Use-Case Tests] --> UC
    AWT[API Wiring Tests] --> C
    WJT[Web Journey Tests (RTL+MSW)] --> WEB[React Router Pages]
    WEB --> MSW[MSW Handlers]
  end
```

## Pseudocode (target test ergonomics)

```text
env = makeTestEnv({ repo:mem, queue:mem, llm:stub, ocr:stub, storage:mem })
actor = env.givenUser('user').inProject().inGroup()

manifest = actor.upload(pdfFixture)
job = actor.startExtraction(manifest.id)
env.queue.runAll()

actor.auditPatch(manifest.id, { invoice: { po_no: "0000009" } })
actor.expectInvariants(manifest.id)
```

## Impact

- Affected specs: `testing`
- Affected code (expected): `src/apps/api/src/**` (use-cases + ports), `src/apps/web/src/e2e/**` (journey tests + MSW scenarios)
- Dependencies: no new production dependencies; test-only utilities MUST reuse existing Jest/Vitest/MSW patterns
- Breaking changes: none intended; this is a testing architecture change

## Target “Most Journeys” Coverage

This change targets a minimal journey set that covers most real app usage:
- Auth routing: `/` → `/login` or `/projects`; ProtectedRoute next_url
- Projects: list + create + navigate to detail
- Groups: create/edit/delete and navigate to manifests
- Manifests: upload (duplicate/non-duplicate), list filtering/sorting/pagination
- Extraction: start extraction, progress, completion/failure, cancel
- Audit: edit fields, run validation, human-verified gating
- Re-extract: preview-only vs execute, OCR prerequisite
- Bulk: extract filtered/selected, delete bulk, export CSV

## Non-Goals

- Replacing all existing tests at once.
- Full fidelity DB/query behavior tests (we explicitly avoid real Postgres in this strategy).
- Browser E2E coverage; optional smoke tests can exist later, but not required for this change.

