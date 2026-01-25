## ADDED Requirements

### Requirement: Cancellation Outcome Is Visible
The system SHALL expose user-initiated cancellation as a distinct outcome in user-facing history (not indistinguishable from failures).

#### Scenario: UI shows canceled vs failed
- **GIVEN** a job was canceled by the user
- **WHEN** the job is displayed in UI/history
- **THEN** it SHALL be labeled as canceled (not failed)
