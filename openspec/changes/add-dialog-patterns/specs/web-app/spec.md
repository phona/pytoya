## ADDED Requirements
### Requirement: Dialog-Based Create and Edit
The web application SHALL use a shared centered dialog component for Models and Manifests create/edit flows.

#### Scenario: Models create dialog
- **WHEN** a user creates a model
- **THEN** the system SHALL present a model type selection step inside a centered dialog
- **AND** after selecting a model type, the system SHALL present the model configuration form

#### Scenario: Models edit dialog
- **WHEN** a user edits a model
- **THEN** the system SHALL present the model form inside a centered dialog
- **AND** the model type SHALL NOT be editable during edit

#### Scenario: Manifests upload dialog
- **WHEN** a user uploads manifests
- **THEN** the system SHALL present the upload flow inside a centered dialog

#### Scenario: Manifests audit dialog
- **WHEN** a user audits or edits a manifest
- **THEN** the system SHALL present the audit panel inside a centered dialog
