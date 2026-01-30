# Change: Improve Jobs panel performance (reduce background fetch + N+1)

## Why
The Jobs panel is rendered globally (always mounted). Today it eagerly fetches job history and then the UI may fire additional per-manifest fetches to render job labels (filename). This can add noticeable background load and slow initial dashboard navigation, especially when there are many in-progress jobs.

## Root Cause
- `JobsPanel` calls `useJobHistory(undefined, 100)` unconditionally on mount (even when panel is closed).
- Each in-progress job row calls `useManifest(job.manifestId)` to resolve filenames, creating an N+1 request pattern.
- Job history DTOs do not include manifest display fields, so the UI has to query manifests.

## What Changes
- Lazy-load heavy job history data:
  - keep lightweight badge (counts) using existing `GET /jobs/stats`
  - fetch full job history only when panel is opened (or when first needed)
- Add manifest display fields to job history response (e.g., `manifestFilename`) via a join on the job table
- Update UI to use `manifestFilename` from history instead of calling `useManifest` per job row

## UX Flow (ASCII)

### Current
```
App load
 -> JobsPanel mounts
 -> fetch /jobs/history?limit=100 (always)
 -> for each in-progress job: fetch /manifests/:id (N+1)
```

### Proposed
```
App load
 -> fetch /jobs/stats (small) for badge only
User opens Jobs panel
 -> fetch /jobs/history?limit=... (includes filename)
 -> render rows without per-manifest queries
```

## Architecture Sketch (Mermaid)
```mermaid
flowchart LR
  W[Web App] -->|GET /jobs/stats| A[API]
  W -->|GET /jobs/history (on open)| A
  A -->|DB join jobs+manifests| DB[(Postgres)]
```

## Implementation Sketch (pseudocode)
Client:
```
const stats = useJobsStats()
const history = useJobHistory(undefined, 100, { enabled: isOpen })
renderBadge(stats.inProgress)
renderRows(history.items) // uses manifestFilename if present
```

Server:
```
SELECT job.*, manifest.originalFilename, manifest.filename
FROM job
LEFT JOIN manifest ON manifest.id = job.manifestId
ORDER BY job.createdAt DESC
LIMIT :take
```

## Impact
- Affected specs: `web-app`
- Affected code:
  - `src/apps/web/src/shared/components/JobsPanel.tsx`
  - `src/apps/api/src/queue/queue.service.ts`
  - `src/apps/api/src/queue/dto/job-history.dto.ts`

