## 1. Implementation

- [x] Add `POST /projects/wizard` endpoint (transactional create)
- [x] Update web `GuidedSetupWizard` to use `/projects/wizard`
- [x] Add wizard failure UX: clear “nothing created” vs “partial” (if any legacy path remains)
- [x] Update `buildOcrContextPreview` to return bounded excerpt snippets (not full text)
- [x] Ensure extractor/model responses mask secret fields; updates preserve masked placeholders
- [x] Update secret inputs to disable copy when masked and promote “Test Connection”

## 2. Documentation

- [x] Update relevant docs in `docs/` for wizard + re-extract preview + secret recheck UX

## 3. Verification

- [x] Run `npm run test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`
