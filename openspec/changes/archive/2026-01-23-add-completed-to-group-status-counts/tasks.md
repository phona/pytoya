## 1. Specs
- [x] 1.1 Add OpenSpec deltas for completed group status count
- [x] 1.2 Run `openspec validate add-completed-to-group-status-counts --strict`

## 2. Backend (API)
- [x] 2.1 Add `completed` to group status count DTO/type
- [x] 2.2 Aggregate completed manifests in `findByProjectWithCounts`
- [x] 2.3 Add/adjust tests covering completed counts per group

## 3. Web UI
- [x] 3.1 Display completed count badge on GroupCard
- [x] 3.2 Add styling + i18n string for completed count
- [x] 3.3 Add/adjust UI tests for completed count display

## 4. Verification
- [x] 4.1 Run `npm run test`
- [x] 4.2 Run `npm run lint`
- [x] 4.3 Run `npm run type-check`

