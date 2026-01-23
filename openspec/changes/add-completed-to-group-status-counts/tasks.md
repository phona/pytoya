## 1. Specs
- [ ] 1.1 Add OpenSpec deltas for completed group status count
- [ ] 1.2 Run `openspec validate add-completed-to-group-status-counts --strict`

## 2. Backend (API)
- [ ] 2.1 Add `completed` to group status count DTO/type
- [ ] 2.2 Aggregate completed manifests in `findByProjectWithCounts`
- [ ] 2.3 Add/adjust tests covering completed counts per group

## 3. Web UI
- [ ] 3.1 Display completed count badge on GroupCard
- [ ] 3.2 Add styling + i18n string for completed count
- [ ] 3.3 Add/adjust UI tests for completed count display

## 4. Verification
- [ ] 4.1 Run `npm run test`
- [ ] 4.2 Run `npm run lint`
- [ ] 4.3 Run `npm run type-check`

