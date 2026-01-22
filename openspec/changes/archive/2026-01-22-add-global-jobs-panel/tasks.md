## 1. Specs
- [x] 1.1 Add OpenSpec deltas for `web-app` Jobs panel behavior
- [x] 1.2 Validate change with `openspec validate add-global-jobs-panel --strict`

## 2. Web: Jobs Store + Persistence
- [x] 2.1 Add a persisted Jobs store (queued/running/completed/failed)
- [x] 2.2 Clear Jobs state on logout/user change

## 3. Web: WebSocket Integration
- [x] 3.1 Refactor WebSocket client to be singleton/shared
- [x] 3.2 Feed Jobs store from `job-update` events

## 4. Web: Jobs Panel UI
- [x] 4.1 Add Jobs button + badge in dashboard chrome
- [x] 4.2 Add downloads-style panel UI with filters and actions (cancel, clear completed)
- [x] 4.3 Seed panel with `/jobs/history` (recent jobs)

## 5. Tests + Verification
- [x] 5.1 Add unit tests for Jobs store behavior
- [x] 5.2 Add basic UI test for Jobs panel rendering/badge count
- [x] 5.3 Run `npm run test`, `npm run lint`, `npm run type-check`
