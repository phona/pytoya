## 1. Backend
- [x] Add `jobs.kind` field (default `extraction`)
- [x] Add OCR refresh job enqueue endpoint for manifests
- [x] Add BullMQ job type/handler to run OCR refresh in background
- [x] Emit `job-update` with job kind for OCR jobs
- [x] Add/adjust tests for enqueue + worker behavior (unit/integration)

## 2. Web
- [x] Add API client + hook to enqueue OCR refresh job
- [x] Update Jobs store/model to support `kind = ocr`
- [x] Update Jobs panel UI to label OCR jobs distinctly
- [x] Update AuditPanel “Refresh OCR cache” to enqueue job (not sync)
- [x] Invalidate OCR query on `ocr-update`
- [x] Update/extend tests

## 3. Validation
- [x] Run `npm run test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`

## 4. Docs
- [x] Update `docs/WEB_APP.md` for OCR refresh job behavior
