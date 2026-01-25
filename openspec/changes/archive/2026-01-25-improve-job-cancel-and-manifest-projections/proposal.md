# Change: Improve Job Cancellation (Split: Projections moved to schema-driven filtering change)

## Why

Two operability issues make the system harder to run and reason about:

1) **Job cancellation semantics are ambiguous**
- Cancellation is implemented via polling a DB-backed flag during job execution.
- Canceled jobs are persisted as `FAILED`, which makes “user canceled” indistinguishable from “system error”.
- Status enums contain duplicated values (e.g., RUNNING/PROCESSING both map to `processing`).

These problems don’t block basic functionality, but they create avoidable confusion in UI/history and increase operational load.

## Root Cause
- Cancellation is treated as an ad-hoc implementation detail rather than an explicit runtime contract.

## What Changes

### 1) Make cancellation a first-class outcome
- Add an explicit canceled status for jobs (and preserve compatibility where needed).
- Ensure cancellation avoids unnecessary retries and is visible in history/metrics.
- Reduce DB polling pressure by checking cancellation via the most appropriate shared store (Redis) and only persisting durable state transitions to Postgres.

### 2) Split: schema-driven filtering/projections
Manifest “system filters” and any projection/indexing work is moved to a dedicated change:
- `refactor-manifest-filters-schema-driven`

## Goals
- Users can clearly see “canceled” vs “failed”.
- Cancellation is cooperative and efficient under load.
- Cancellation outcome is visible and queryable.

## Non-Goals
- Refactoring the entire extraction runtime (covered by `refactor-extraction-runtime`).
- Schema-driven filtering refactors (handled by `refactor-manifest-filters-schema-driven`).

## Risks
- Introducing a new job status value can impact clients that assume a fixed set.
- None beyond cancellation semantics.

## Validation Plan
- Unit tests for cancellation status transitions and retry behavior.
- Manual: run extraction, cancel mid-run, verify UI/history shows “canceled”.
