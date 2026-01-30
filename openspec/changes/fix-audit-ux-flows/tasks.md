## 1. Implementation

- [ ] Add `allowValidationErrors?: boolean` to update-manifest DTO (shared + API)
- [ ] Update API update-manifest logic to permit override only when flag is set
- [ ] Update audit save UX to send the override flag after user confirmation
- [ ] Add regression tests for: confirm override succeeds; no-flag still fails
- [ ] Subscribe manifests list to visible manifest rooms for websocket progress updates
- [ ] Make OCR preview highlighting truthful (hide toggle or rename + helper text)

## 2. Documentation

- [ ] Update `docs/WEB_APP.md` and `docs/OCR_PREVIEW_USER_GUIDE.md` to match the chosen OCR highlight behavior

## 3. Verification

- [ ] Run `npm run test`
- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`

