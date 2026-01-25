## 1. Spec deltas
- [x] 1.1 Update delta specs for `extraction`, `manifest-filtering`, and `database`
- [x] 1.2 Validate OpenSpec change (`openspec validate improve-job-cancel-and-manifest-projections --strict`)

## 2. Job cancellation semantics
- [x] 2.1 Define canonical job lifecycle states (including `canceled`)
- [x] 2.2 Ensure canceled jobs do not retry and are persisted clearly
- [x] 2.3 Reduce cancellation polling overhead (prefer Redis check over DB polling for active jobs)
- [x] 2.4 Ensure WS/job history surfaces “canceled” distinctly from “failed”

## 3. Manifest projections
- [x] 3.1 (Moved) Manifest filtering/projections refactor is tracked in `refactor-manifest-filters-schema-driven`

## 4. Compatibility
- [x] 4.1 Ensure older clients treat unknown job status as non-fatal (document expectation)
