## 1. Implementation

- [ ] Mask secret fields in `ExtractorResponseDto` for list/get responses
- [ ] Update extractor update logic to preserve secrets on masked placeholders
- [ ] Add API tests to ensure extractor secrets are never returned
- [ ] Update web secret input UX: disable copy for masked values; guide to “Test Connection”

## 2. Verification

- [ ] Run `npm run test`
- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`

