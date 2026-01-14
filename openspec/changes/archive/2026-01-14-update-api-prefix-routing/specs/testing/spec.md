## ADDED Requirements
### Requirement: Non-interactive Linting
The system SHALL run linting in non-interactive mode for CI and automation.

#### Scenario: Lint runs without prompts
- **WHEN** developer runs `npm run lint`
- **THEN** lint completes without interactive prompts
- **AND** lint exits non-zero on violations

