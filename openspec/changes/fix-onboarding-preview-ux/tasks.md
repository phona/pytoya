## 1. Implementation

- [ ] Add `POST /projects/wizard` endpoint (transactional create)
- [ ] Update web `GuidedSetupWizard` to use `/projects/wizard`
- [ ] Add wizard failure UX: clear “nothing created” vs “partial” (if any legacy path remains)
- [ ] Update `buildOcrContextPreview` to return bounded excerpt snippets (not full text)
- [ ] Ensure extractor/model responses mask secret fields; updates preserve masked placeholders
- [ ] Update secret inputs to disable copy when masked and promote “Test Connection”

## 2. Documentation

- [ ] Update relevant docs in `docs/` for wizard + re-extract preview + secret recheck UX

## 3. Verification

- [ ] Run `npm run test`
- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`

