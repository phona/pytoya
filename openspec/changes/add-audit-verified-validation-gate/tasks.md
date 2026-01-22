## 1. Specs
- [x] 1.1 Add OpenSpec deltas for Human Verified validation gate + audit validation actions
- [x] 1.2 Run `openspec validate add-audit-verified-validation-gate --strict`

## 2. Web UI
- [x] 2.1 Fix React Query invalidation for validation runs (align with manifest query keys)
- [x] 2.2 Add header Save button (audit page)
- [x] 2.3 Track latest audit draft state needed for save (extractedData + humanVerified)
- [x] 2.4 Implement “validate first, confirm on errors, then save Human Verified”
- [x] 2.5 Update “Run validation” button: no forced tab switch; toast summary + optional “View”

## 3. Tests and Docs
- [x] 3.1 Add/update UI tests for Save→Validate→Confirm flow
- [x] 3.2 Add/update tests for validation invalidation refresh behavior
- [x] 3.3 Update user-facing docs in `docs/` if behavior changes are user-visible

## 4. Verification
- [x] 4.1 Run `npm run test`
- [x] 4.2 Run `npm run lint`
- [x] 4.3 Run `npm run type-check`
