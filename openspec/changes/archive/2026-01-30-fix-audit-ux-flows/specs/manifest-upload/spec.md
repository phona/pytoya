# manifest-upload Spec Delta (fix-audit-ux-flows)

## MODIFIED Requirements

### Requirement: Manifest CRUD
Updating a manifest to `humanVerified=true` SHALL be gated by validation results by default, and SHALL support an explicit override flag for the confirmed UX flow.

#### Scenario: Human verified is rejected when validation errors exist (default)
- **GIVEN** a manifest has `validationResults.errorCount > 0`
- **WHEN** the client attempts to persist `humanVerified=true` without an explicit override flag
- **THEN** the request MUST fail with a 4xx error indicating validation failed

#### Scenario: Human verified can be overridden after explicit confirmation
- **GIVEN** a manifest has `validationResults.errorCount > 0`
- **WHEN** the client persists `humanVerified=true` with an explicit override flag (confirmed by user)
- **THEN** the system SHALL persist `humanVerified=true`

