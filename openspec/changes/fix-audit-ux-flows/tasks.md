## 1. Implementation

- [x] Add `allowValidationErrors?: boolean` to update-manifest DTO (shared + API)
- [x] Update API update-manifest logic to permit override only when flag is set
- [x] Update audit save UX to send the override flag after user confirmation
- [x] Add regression tests for: confirm override succeeds; no-flag still fails
- [x] Subscribe manifests list to visible manifest rooms for websocket progress updates
- [x] Make OCR preview highlighting truthful (hide toggle or rename + helper text)

## 2. Documentation

- [x] Update `docs/WEB_APP.md` and `docs/OCR_PREVIEW_USER_GUIDE.md` to match the chosen OCR highlight behavior

## 3. Verification

- [x] Run `npm run test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`
