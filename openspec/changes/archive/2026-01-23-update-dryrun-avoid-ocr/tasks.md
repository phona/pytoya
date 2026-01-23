## 1. Implementation
- [x] 1.1 Identify all endpoints used for dry-run extraction estimates
- [x] 1.2 Remove `dryRun` from DTOs and APIs
- [x] 1.3 Ensure “start extraction” continues to work via background jobs
- [x] 1.4 Update API docs to remove `dryRun`
- [x] 1.5 Remove auto extraction on upload endpoints
- [x] 1.6 Remove manual OCR trigger endpoints and UI hooks
- [x] 1.7 Update/adjust tests for new behavior
- [x] 1.8 Run `npm run test`, `npm run lint`, `npm run type-check`
- [x] 1.9 Remove cost estimation endpoints and UI

## 2. Verification
- [x] 2.1 Open Extract modal with manifests lacking OCR → DB unchanged
- [x] 2.2 Click Extract → jobs run and OCR persists during execution
- [x] 2.3 OCR Preview shows cached OCR only (no manual trigger)
- [x] 2.4 Upload manifest → no job created
