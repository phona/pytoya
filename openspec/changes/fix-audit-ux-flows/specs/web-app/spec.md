# web-app Spec Delta (fix-audit-ux-flows)

## MODIFIED Requirements

### Requirement: Human Verified Requires Validation Gate
The web application SHALL allow persisting `manifest.humanVerified=true` even when validation returns errors **only after explicit user confirmation**, by using an explicit API override flag.

#### Scenario: Save as Human Verified with validation errors requires confirmation and persists on confirm
- **GIVEN** a manifest has extracted data and validation can run
- **AND** the user has marked the manifest as Human Verified (intent to save `humanVerified=true`)
- **WHEN** validation returns one or more errors
- **THEN** the system SHALL prompt the user for confirmation before persisting `humanVerified=true`
- **AND** **IF** the user confirms, the system SHALL persist `manifest.humanVerified=true` using an explicit override flag in the save request

### Requirement: Manifests List Updates Progress
The manifests list SHALL show in-progress status and progress updates without requiring manual reload for the currently visible page of manifests.

#### Scenario: List page subscribes to visible manifests
- **WHEN** the user is viewing a manifests list page
- **THEN** the system SHALL subscribe to progress updates for manifests visible on that page
- **AND** progress bars/status badges SHALL update when websocket events arrive

### Requirement: OCR Preview Highlighting Is Truthful
The OCR preview UI SHALL NOT label heuristic highlighting as “confidence-based”.

#### Scenario: Confidence signal not available
- **WHEN** per-line confidence data is not available for the raw text view
- **THEN** the UI SHALL hide the “low confidence” toggle or SHALL label it as a heuristic

