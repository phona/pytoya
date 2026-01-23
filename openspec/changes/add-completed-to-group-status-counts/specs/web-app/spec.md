## MODIFIED Requirements

### Requirement: Group Status Indicators
The system SHALL display manifest status counts on each GroupCard, including a count for manifests with status "completed".

#### Scenario: Show status breakdown includes completed
- **WHEN** a GroupCard is rendered for a group
- **THEN** the system SHALL display counts for pending, error (failed), completed, and verified manifests in that group
- **AND** the completed count SHALL include manifests with `status="completed"`
- **AND** the verified count SHALL include manifests with `humanVerified=true`

