# Extraction Runtime (Phase A/Phase B)

PyToYa runs extraction jobs via BullMQ. This doc explains the current runtime topology and the “scale readiness” options that are intentionally staged.

## Current (Phase A / default)

ASCII:
```
Web UI -> API (REST + WS + Worker)
                 |-> Redis (BullMQ)
                 |-> Postgres
                 |-> uploads/ (local disk or PVC)
                 |-> OCR + LLM
```

Notes:
- Extraction is modeled as a sequence of named stages inside `ExtractionService.runExtraction()` with stage-boundary logs.
- Job/manifest realtime updates are published through a single publisher (`ProgressPublisherService`), keeping job progress monotonic.

## Scale readiness options (Phase B)

These options are deployment-driven and may require additional infrastructure:

### WebSocket strategy
- **Sticky routing / single replica gateway**: simplest, but limits horizontal scaling of WS.
- **Shared adapter/event bus**: enables multi-replica WS, but adds operational complexity.

### Upload storage strategy
- **RWX PVC**: simplest shared storage for multiple pods.
- **Object storage (S3 compatible)**: more scalable, but requires signed URL strategy and additional integration.

### Worker topology
- **In-process worker** (default): simplest for single-node.
- **Separate worker deployment**: scales workers independently from HTTP, but realtime updates must still reach clients (via a documented WS strategy).

#### Helm notes
The Helm chart supports enabling a separate worker deployment:
- `worker.enabled=true` creates a `Deployment` that runs `node dist/worker.js`
- When `worker.enabled=true`, API pods set `PYTOYA_WORKER_ENABLED=false` to avoid double-processing

For separate worker pods, uploads storage SHOULD be shared (RWX PVC or equivalent); a single-node/RWO setup may not support multiple pods mounting the same volume.

For Helm, configure RWX by setting `api.persistence.accessModes` (example: `[\"ReadWriteMany\"]`) when your storage class supports it.
