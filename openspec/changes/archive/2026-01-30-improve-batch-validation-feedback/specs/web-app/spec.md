## ADDED Requirements

### Requirement: Batch Validation Summary Includes Failures
The web application SHALL present batch validation outcomes in a way that makes partial failures visible and actionable.

#### Scenario: Batch validation summary shows failures
- **GIVEN** a user runs batch validation from the manifests list
- **WHEN** the batch validation response contains failures
- **THEN** the UI SHALL show a summary including counts for errors, warnings, and failed manifests
- **AND** the UI SHALL allow the user to view a list of failed manifest ids and messages

