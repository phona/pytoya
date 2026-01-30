## MODIFIED Requirements

### Requirement: Wizard Creation Feedback
The web app SHALL provide clear, actionable feedback for wizard-based project creation outcomes.

#### Scenario: Wizard failure outcome is clear
- **GIVEN** a user is creating a project via the wizard
- **WHEN** creation fails
- **THEN** the UI SHALL clearly indicate whether anything was created
- **AND** if recovery is possible, the UI SHALL offer an “Open project” and/or “Retry setup” action

### Requirement: Masked Secret UX
The web app SHALL treat masked secret placeholders as non-revealable and non-copyable values.

#### Scenario: Masked secrets are not treated as real secrets
- **GIVEN** a settings form shows a masked secret placeholder (e.g., `********`)
- **WHEN** the user tries to copy the secret value
- **THEN** the UI SHALL prevent copying the masked placeholder as if it were the real secret
- **AND** the UI SHOULD guide the user to “Test Connection” to verify configuration
