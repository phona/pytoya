## 1. Implementation

- [x] 1.1 Remove preview/snippet re-extract endpoint and shared/web usage
- [x] 1.2 Ensure re-extract queues jobs without snippet overrides (full cached OCR Markdown only)
- [x] 1.3 Normalize LLM context-length failures into a stable job error message and discard (no retry)
- [x] 1.4 Update web UI to show toast/modal error tip on oversized-context failures (no fallback)
- [x] 1.5 Run checks: `npm run test`, `npm run lint`, `npm run type-check`

## 2. Verification

- [x] 2.1 Manual: Audit → Re-extract field queues job and uses full OCR
- [x] 2.2 Manual: Force a context-length error and confirm UI displays error tip