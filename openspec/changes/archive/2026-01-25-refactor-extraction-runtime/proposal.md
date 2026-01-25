# Proposal: Refactor Extraction Runtime (Maintainability + Scale Readiness)

## Why

The extraction runtime currently concentrates multiple concerns in a small set of places:
- Extraction orchestration (OCR → prompt building → LLM → validation → persistence → costing) is hard to reason about and test as one unit.
- Job/manifest progress updates are emitted from multiple sources (queue events + worker), increasing edge cases and “state drift”.
- Runtime wiring (security, global middleware, uploads auth) is centralized, making changes risky and reviews noisy.

This is acceptable for a single-node deployment, but it becomes fragile as we scale replicas (WebSocket subscriptions are in-memory per process, and uploads are stored on local disk by default).

### Root cause
The runtime mixes **execution**, **coordination**, and **delivery** in one process boundary:
- HTTP API (REST)
- WebSocket gateway (realtime)
- BullMQ worker (background processing)
- Local filesystem uploads (storage)

That coupling amplifies complexity whenever we touch extraction, progress reporting, or deployment topology.

## What Changes

This change is a refactor proposal. It is intentionally staged to keep behavior stable.

### Phase A (required): Maintainability refactor (no behavior change)
- Model the extraction workflow as explicit named stages with a shared state object (pipeline style).
- Consolidate job/manifest progress emission into a single “event publisher” path with clear semantics (monotonic progress, idempotent events).
- Move cross-cutting bootstrap wiring out of `main.ts` into small, testable “enableX(app, config)” helpers.

### Phase B (optional): Scale readiness (deployment-driven)
- Support multi-replica realtime updates (either dedicated WebSocket gateway or a shared adapter/event-bus).
- Support shared uploads storage so any worker can read any manifest file (RWX PVC or object storage).
- Support running the BullMQ worker as a separate process/deployment (scale independently from HTTP).

## Goals
- Improve testability and readability of the extraction runtime without changing the external API.
- Reduce “event source ambiguity” by making one component responsible for emitting progress/status.
- Make future topology changes (separate worker, multi replicas) a configuration/deployment choice.

## Non-Goals
- Changing REST endpoints, WebSocket event schemas, or database schemas as part of Phase A.
- Adding new production dependencies without explicit confirmation.
- Reworking OCR/LLM provider logic (keep the current extractors and adapter model).

## Architecture

### Current (conceptual)
```
Web UI -> API (REST + WS + Worker)
                 |-> Redis (BullMQ)
                 |-> Postgres
                 |-> uploads/ (local disk)
                 |-> OCR + LLM
```

### Proposed (target when Phase B is enabled)
```mermaid
flowchart LR
  UI[Web UI] --> API[REST API]
  UI <--> WS[WebSocket Gateway]
  API --> Q[Queue (Redis)]
  Q --> W[Worker]
  W --> PG[(Postgres)]
  W --> OCR[Text Extractor]
  W --> LLM[LLM]
  W --> EVT[(Redis PubSub/Streams)]
  WS --> EVT
```

## Compatibility / Migration
- Phase A: no external contract changes; refactor is internal-only.
- Phase B: introduces deployment options; defaults remain compatible with existing single-node behavior.

## Risks
- Refactor risk: stage boundaries could accidentally change ordering/side-effects; mitigate with regression tests and stage-by-stage validation.
- Eventing risk: consolidating emissions could temporarily change timing; mitigate by making events idempotent and clients tolerant to duplicates/out-of-order.
- Scale readiness changes (Phase B) can introduce new infrastructure (e.g., Redis adapter for socket.io, shared storage).

## Validation Plan
- Maintainability refactor (Phase A) MUST keep existing tests passing.
- Add/adjust targeted tests around:
  - extraction stage ordering and error reporting
  - progress emission semantics (monotonic, final state)
- Run:
  - `npm run test`
  - `npm run lint`
  - `npm run type-check`

## Open Questions
- Deployment target: single server vs Kubernetes multi-replica?
- Storage backend preference for Phase B: RWX PVC vs object storage?
- WebSocket strategy for Phase B: single WS gateway vs socket.io adapter?
