## 1. Specification
- [x] 1.1 Add spec delta for manifests list response envelope
- [x] 1.2 Add spec delta for subpath-safe `next_url` and links
- [x] 1.3 Add spec delta for OCR error normalization

## 2. Implementation
- [x] 2.1 API: always return `{ data, meta }` for `GET /groups/:groupId/manifests`
- [x] 2.2 Web: remove array-vs-envelope branching in `manifestsApi.listManifests`
- [x] 2.3 Web: make hard redirects and home link basePath-safe
- [x] 2.4 Web: use configured API base for prompt-rules streaming fetch
- [x] 2.5 API: add OCR error codes and throw typed OCR exceptions from Paddle OCR extractor
- [x] 2.6 Add/update tests for changed behavior

## 3. Validation
- [x] 3.1 Run `npm run test`
- [x] 3.2 Run `npm run lint`
- [x] 3.3 Run `npm run type-check`
