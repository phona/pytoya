## 1. Specs
- [ ] 1.1 Add OpenSpec deltas for duplicate detection (API + UX)
- [ ] 1.2 Run `openspec validate add-manifest-upload-duplicate-detection --strict`

## 2. Backend (API + DB)
- [ ] 2.1 Add `contentSha256` (or equivalent) column to manifests (nullable)
- [ ] 2.2 Add DB uniqueness constraint/index for `(group_id, content_sha256)` (avoid races)
- [ ] 2.3 Compute SHA-256 for uploaded file content during upload
- [ ] 2.4 Implement idempotent create: return existing manifest when duplicate
- [ ] 2.5 Add additive response field(s) (e.g. `isDuplicate`) for single + batch uploads
- [ ] 2.6 Add/adjust tests covering duplicate uploads (single + batch + race behavior)

## 3. Web UI
- [ ] 3.1 Display upload summary warning when duplicates occur
- [ ] 3.2 Provide per-file duplicate detail (filename + open existing)
- [ ] 3.3 Add/adjust UI tests for duplicate warning behavior (if test harness exists)

## 4. Verification
- [ ] 4.1 Run `npm run test`
- [ ] 4.2 Run `npm run lint`
- [ ] 4.3 Run `npm run type-check`

