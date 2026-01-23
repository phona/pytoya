## 1. Implementation
- [x] Add stage boundary logging helper in `src/apps/api/src/extraction/extraction.service.ts`
- [x] Emit start/end/fail logs around `VALIDATING`, `TEXT_EXTRACTING`, `EXTRACTING`, `SAVING`
- [x] Ensure failure logs include stack (when `error instanceof Error`)
- [x] Improve `src/apps/api/src/extraction/processors/manifest-extraction.processor.ts` job failure logs (include stack + attempts/progress)
- [x] Add/adjust Jest tests to assert stage failure logging without making tests noisy
- [x] Run `npm run test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`

## 2. Documentation
- [x] Document new log events and troubleshooting guidance in `docs/` or `CLAUDE.md` (no new config keys; mention `server.logLevel`)

