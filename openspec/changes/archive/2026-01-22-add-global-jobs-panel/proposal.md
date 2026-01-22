# Change: Add Global Jobs Panel (Downloads-style)

## Why

Today, job progress is only visible in the specific pages that mount WebSocket listeners (e.g. manifests list / audit).
That means:
- Users can’t reliably see “what’s running” while navigating elsewhere in the app.
- Refreshing the page loses the local UI state of in-flight jobs.
- Adding a global listener naïvely would double-count job completion side effects (e.g. cost accumulation) if multiple WebSockets are created.

A global “downloads-style” Jobs panel solves this by giving one always-available place to see queued/running jobs, progress, failures, and cancellation.

## What Changes

- Web: Add a global Jobs panel accessible from the dashboard UI (like a browser downloads panel).
  - Shows queued/running/completed/failed jobs with progress.
  - Includes a badge count for “in progress” jobs.
  - Allows canceling cancellable queue jobs.
  - Persists job list locally so refresh doesn’t wipe the panel.
  - Seeds recent jobs from the backend job history endpoint.

- Web: Ensure WebSocket usage is singleton/shared so the app maintains a single connection and avoids duplicated side effects.

## Impact

- Affected specs: `web-app`
- Affected code: `src/apps/web`
- Dependencies: no new production dependencies
- Backend changes: none intended (uses existing `/jobs/history` + `/jobs/:id/cancel` and existing `job-update` events)
- Breaking changes: none intended

## Non-Goals (v1)

- A dedicated “Jobs” route/page with advanced filtering
- Full log streaming per job
- Managing non-extraction jobs unless already emitted by the backend

## Current State

- Job progress events exist (`job-update` via Socket.IO) but are only consumed by specific pages/components.
- Job history exists (`GET /jobs/history`) but is not surfaced globally.
- Cancellation exists (`POST /jobs/:id/cancel`) but is only exposed in context-specific UI.

## Target State

- A Jobs panel is available globally in the dashboard UI.
- Users can navigate away and still monitor progress.
- Refresh restores recent jobs (local persistence + server history seeding).
- WebSocket connection is shared/singleton to prevent duplicate event handling.

