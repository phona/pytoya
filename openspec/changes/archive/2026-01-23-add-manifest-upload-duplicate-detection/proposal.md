# Change: Add Duplicate Detection for Manifest Uploads

## Why

Today users can upload the same PDF multiple times and the system will create multiple manifest records. This causes:

- Confusing UX (duplicate rows for the same document)
- Wasted storage (multiple copies of the same PDF)
- Wasted compute/cost (duplicate OCR/extraction runs)

## What Changes

- Detect duplicate uploads by file content hash within the same group.
- Make uploads idempotent:
  - If a user uploads a file that already exists (same content) in the group, the API returns the existing manifest instead of creating a new one.
  - Responses include a boolean flag indicating a duplicate upload.
- Update the web upload UI to warn users when duplicates were detected and provide quick navigation to the existing manifest(s).

## Impact

- Affected specs: `manifest-upload`, `web-app`
- Affected code (expected):
  - API: `src/apps/api/src/manifests/manifests.controller.ts`, `src/apps/api/src/manifests/manifests.service.ts`, `src/apps/api/src/entities/manifest.entity.ts`, `src/apps/api/src/database/migrations/*`
  - Web: manifest upload dialog/components and API client usage for upload responses
- Dependencies: none (use Node.js built-ins; no new production dependencies)
- Breaking changes: none intended (additive response fields only)

## Non-Goals (v1)

- Duplicate detection based on extracted fields (invoice number / PO / date)
- Cross-group or cross-project de-duplication
- Backfilling hashes for existing manifests (can be proposed separately if needed)

