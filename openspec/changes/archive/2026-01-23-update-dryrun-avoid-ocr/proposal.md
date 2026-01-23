# Why
Today, opening the “Extract (Filtered/Selected)” modal can trigger OCR/text extraction even when the user never clicks **Extract**. This is surprising, expensive, and can “lock” a manifest to the wrong text extractor by persisting `manifests.text_extractor_id` and `manifests.ocr_result` as a side effect of cost estimation.

# What Changes
- Remove the **dry-run** mechanism from bulk/filtered extraction endpoints.
  - The system will no longer accept `dryRun=true` for extraction endpoints.
- Remove cost estimation endpoints and UI.
  - The system SHALL NOT expose `GET /manifests/cost-estimate`.
  - Extraction endpoints SHALL NOT return estimated cost fields.
- Keep OCR/text extraction only for explicit user actions (user clicks **Extract** which queues jobs).
- Remove manual OCR trigger endpoints.
  - The system SHALL NOT expose an API to run OCR independently of extraction.
  - OCR/text extraction occurs only during extraction job execution (after the user clicks **Extract**).
- Remove automatic extraction job creation on upload.
  - Uploading a manifest MUST NOT enqueue extraction jobs.
  - Users MUST explicitly click **Extract** to start extraction.

# Root Cause (Current Behavior)

**Current flow (problem):**
```
Open Extract modal (auto "dryRun" estimate)
  -> POST /groups/:groupId/manifests/extract-filtered { dryRun: true }
     -> server loops manifests
        -> if missing OCR: process OCR (calls text extractor) + persists OCR
```

**Expected flow:**
```
Open Extract modal
  -> no server-side extraction estimate request

Upload manifest
  -> manifest is created
  -> no extraction job enqueued

Click Extract (start jobs)
  -> jobs run in background
  -> OCR/text extraction runs as part of job execution
```

# Impact
- UX: Opening the extract dialog will never trigger OCR.
- API: Breaking change (removes `dryRun` from extraction endpoints).
- Cost estimation: Removed entirely.

# Rollout Notes
- If a server-side filtered estimate is needed later, add a dedicated non-mutating endpoint (not a `dryRun` flag on the extraction endpoint).
