# Change: Improve Job Cancellation + Manifest Projections

## Why

Two operability issues make the system harder to run and reason about:

1) **Job cancellation semantics are ambiguous**
- Cancellation is implemented via polling a DB-backed flag during job execution.
- Canceled jobs are persisted as `FAILED`, which makes “user canceled” indistinguishable from “system error”.
- Status enums contain duplicated values (e.g., RUNNING/PROCESSING both map to `processing`).

2) **Manifest “index” columns are not guaranteed to reflect extracted data**
- The database includes denormalized columns like `purchaseOrder`, `invoiceDate`, and `department`.
- Server-side filters and sorts rely on these columns, but the extraction pipeline does not consistently populate them.

These problems don’t block basic functionality, but they create avoidable confusion in the UI, reduce filter correctness, and increase operational load.

## Root Cause
- Cancellation and projections are treated as ad-hoc implementation details rather than explicit runtime contracts.
- Denormalized “index” columns exist, but there is no defined projection step that keeps them in sync with `extractedData`.

## What Changes

### 1) Make cancellation a first-class outcome
- Add an explicit canceled status for jobs (and preserve compatibility where needed).
- Ensure cancellation avoids unnecessary retries and is visible in history/metrics.
- Reduce DB polling pressure by checking cancellation via the most appropriate shared store (Redis) and only persisting durable state transitions to Postgres.

### 2) Add a manifest projection step
- Define a single projection function that derives index columns from `extractedData` (and other fields):
  - `purchaseOrder` from `extractedData.invoice.po_no`
  - `invoiceDate` from `extractedData.invoice.invoice_date`
  - `department` from `extractedData.department.code` (or project rule)
- Apply the projection when:
  - extraction persists results
  - user edits extraction data (PATCH manifest)

## Goals
- Users can clearly see “canceled” vs “failed”.
- Cancellation is cooperative and efficient under load.
- Filters and sorts using manifest index columns behave predictably.

## Non-Goals
- Refactoring the entire extraction runtime (covered by `refactor-extraction-runtime`).
- Replacing JSONB filtering; this change focuses on denormalized “system filter” columns.

## Risks
- Introducing a new job status value can impact clients that assume a fixed set.
- Projection rules must be carefully defined to avoid writing incorrect values (especially dates).

## Validation Plan
- Unit tests for:
  - cancellation status transitions and retry behavior
  - projection mapping from extractedData → manifest columns
- Manual: run extraction, cancel mid-run, verify UI/history shows “canceled” and filters by PO/date/department work.

