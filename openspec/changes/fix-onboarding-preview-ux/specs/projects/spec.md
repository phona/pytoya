## MODIFIED Requirements

### Requirement: Project Management
The system SHALL allow users to create, read, update, and delete projects, including a multi-step wizard for creating projects with associated models, extraction strategy, and validation configuration.

#### Scenario: Wizard create is atomic
- **GIVEN** an authenticated user uses the project creation wizard
- **WHEN** the user clicks “Create”
- **THEN** the system SHALL create the project and its initial configuration (schema, rules, validation scripts) atomically
- **AND** if the operation fails, the system SHALL NOT leave partial wizard-created state behind
- **AND** the user SHALL receive an actionable error message

