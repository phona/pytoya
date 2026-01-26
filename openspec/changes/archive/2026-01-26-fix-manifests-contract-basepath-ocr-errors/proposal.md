# Change: Fix manifests list contract, subpath navigation, and OCR error normalization

## Why

We currently have a few cross-cutting issues that make the system harder to maintain and easier to mis-use:

1) **Unstable API contract**: `GET /groups/:groupId/manifests` sometimes returns an array, and sometimes returns `{ data, meta }`.
   This forces all clients to implement a union type and guess response shape based on query params.

2) **Subpath navigation bugs**: when deployed under a base path (e.g. `/pytoya`), hard redirects can embed the base path into `next_url`,
   and then the router’s basename prepends the base path again, producing URLs like `/pytoya/pytoya/...`.

3) **OCR/text extraction errors are not normalized**: OCR failures often bubble up as generic `Error`s, which prevents consistent error codes
   and makes failures harder to interpret (both in HTTP responses and in job error messages).

## What Changes

- **BREAKING**: `GET /groups/:groupId/manifests` SHALL always return an envelope:
  - `{ data: Manifest[], meta: { total, page, pageSize, totalPages } }`
  - This applies to both filtered and unfiltered requests.

- Web app subpath correctness:
  - `next_url` handling becomes basename-safe for hard redirects.
  - All “home”/absolute navigation respects `VITE_BASE_PATH`.
  - The prompt-rules streaming fetch uses configured API base (`VITE_API_URL`) instead of hard-coded `/api/...`.

- OCR error normalization:
  - OCR-related exceptions include stable error codes and messages.
  - OCR failures are mapped to consistent Nest exceptions instead of raw `Error`.

## Impact

- Affected specs:
  - `manifest-upload`, `manifest-filtering`, `web-app`, `extraction`
- Affected code (expected):
  - API: manifests list controller, OCR/text extractor error handling
  - Web: auth redirects, error boundary home link, prompt-rules streaming fetch, manifests API client typing

