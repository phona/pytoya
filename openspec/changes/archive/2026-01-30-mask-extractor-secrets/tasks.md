## 1. Implementation

- [x] Mask secret fields in `ExtractorResponseDto` for list/get responses
- [x] Update extractor update logic to preserve secrets on masked placeholders
- [x] Add API tests to ensure extractor secrets are never returned
- [x] Update web secret input UX: disable copy for masked values; guide to “Test Connection”

## 2. Verification

- [x] Run `npm run test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`
