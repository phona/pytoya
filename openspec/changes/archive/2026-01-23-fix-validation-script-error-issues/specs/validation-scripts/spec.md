## MODIFIED Requirements

### Requirement: Invalid script handling
When a validation script fails during execution, the system SHALL return the failure as a validation issue so users can identify a script implementation problem.

#### Scenario: Script throws during execution
- **WHEN** a validation script throws an exception during a validation run
- **THEN** the system SHALL log the error with script identification
- **AND** the system SHALL append a validation issue with:
  - `field="__script__"`
  - `severity="error"`
  - a message indicating it is a script implementation error
- **AND** the system SHALL continue executing remaining scripts

#### Scenario: Script returns invalid result shape
- **WHEN** a validation script returns a non-array result (invalid contract)
- **THEN** the system SHALL treat this as a script implementation error
- **AND** the system SHALL return an error validation issue as described above
- **AND** the system SHALL continue executing remaining scripts

