# Change: Manifest Upload & Storage

## Why
Users need to upload PDF invoice manifests to the system for processing. Files must be stored in local filesystem organized by project and group.

## What Changes
- Create manifest CRUD APIs (create, list, read, update, delete)
- Implement file upload endpoint (single & batch upload)
- Store files in local filesystem organized by `projects/{projectId}/groups/{groupId}/manifests/`
- Save file metadata to database
- Create upload dialog/component in Next.js
- Implement PDF viewer endpoint

## Impact
- Affected specs: New manifest-upload capability
- Affected code: New manifests module, frontend upload components
