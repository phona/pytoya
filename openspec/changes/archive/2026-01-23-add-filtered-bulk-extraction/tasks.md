## 1. Specs
- [x] 1.1 Add OpenSpec deltas for filtered bulk extraction + audit/list “Extract…” UX
- [x] 1.2 Run `openspec validate add-filtered-bulk-extraction --strict`

## 2. Backend (API)
- [x] 2.1 Add DTO for filtered bulk extraction request/response
- [x] 2.2 Implement `POST /groups/:groupId/manifests/extract-filtered` with `dryRun`
- [x] 2.3 Apply safety caps (max count) and return actionable error
- [x] 2.4 Ensure selection respects auth + group ownership

## 3. Web UI (Vite)
- [x] 3.1 Add “Extract…” modal (scope + behavior + notice + estimate)
- [x] 3.2 Wire list page action: selected vs current filtered
- [x] 3.3 Add audit header “Extract…” (current manifest)
- [x] 3.4 Seed Jobs panel entries for batch jobIds
- [x] 3.5 Add i18n strings for modal + notices

## 4. Tests + Docs
- [x] 4.1 Backend tests for filtered extraction endpoint
- [x] 4.2 Frontend tests for modal decisions and API calls
- [x] 4.3 Update `docs/` user-facing behavior notes (if needed)

## 5. Verification
- [x] 5.1 Run `npm run test`
- [x] 5.2 Run `npm run lint`
- [x] 5.3 Run `npm run type-check`

