# validation-scripts Specification

## Purpose
TBD - created by archiving change implement-validation-scripts. Update Purpose after archive.
## Requirements
### Requirement: Validation Script Management
The system SHALL allow users to create and manage validation scripts per project.

#### Scenario: Create validation script
- **WHEN** authenticated user creates validation script via UI
- **THEN** script is saved to ValidationScriptEntity
- **AND** script syntax is validated before saving
- **AND** script appears in project's validation scripts list

#### Scenario: Edit validation script
- **WHEN** authenticated user edits existing script
- **THEN** changes are saved with updatedAt timestamp
- **AND** cached validation results are invalidated

#### Scenario: Enable/disable script
- **WHEN** user toggles script enabled status
- **THEN** script is included/excluded from validation runs
- **AND** disabled scripts remain saved but not executed

#### Scenario: Delete validation script
- **WHEN** authenticated user deletes script
- **THEN** script is removed from database
- **AND** validationResults referencing it are cleared

### Requirement: Validation Execution
The system SHALL execute validation scripts on extracted data.

#### Scenario: Run validation on single manifest
- **WHEN** authenticated user triggers validation on completed manifest
- **THEN** all enabled scripts for project's schema are executed
- **AND** each script receives manifest.extractedData as input
- **AND** validation issues are collected from all scripts
- **AND** results are cached in ManifestEntity.validationResults
- **AND** results are returned to UI for display

#### Scenario: Run validation on batch of manifests
- **WHEN** user triggers batch validation on multiple manifests
- **THEN** validation runs for each manifest in parallel
- **AND** progress is reported via WebSocket
- **AND** results are aggregated by manifest

#### Scenario: Invalid script handling
- **WHEN** validation script throws error during execution
- **THEN** error is logged with script name and manifest ID
- **AND** error is returned as validation issue with severity 'error'
- **AND** other scripts continue to execute
- **AND** manifest is not marked as failed

### Requirement: Validation Results Display
The system SHALL display validation results in human review UI.

#### Scenario: Display validation issues
- **WHEN** validation completes with issues
- **THEN** issues are grouped by severity (error, warning)
- **AND** issues are grouped by field path
- **AND** each issue shows: field path, message, actual vs expected values
- **AND** user can click issue to highlight field in extracted data

#### Scenario: No issues found
- **WHEN** validation completes with no issues
- **THEN** success message is displayed
- **AND** manifest shows validation checkmark

#### Scenario: Cached results
- **WHEN** user views manifest with cached validation results
- **THEN** cached results are displayed immediately
- **AND** "Re-run validation" button is available
- **AND** cache is invalidated when extractedData changes

### Requirement: Validation Script Templates
The system SHALL provide pre-built validation script templates.

#### Scenario: Use tax validation template
- **WHEN** user creates script from "Tax Calculation" template
- **THEN** tax rate is configurable (default 13%)
- **AND** script checks unit_price_ex_tax × (1 + rate) ≈ unit_price_inc_tax
- **AND** user can customize threshold tolerance

#### Scenario: Use totals validation template
- **WHEN** user creates script from "Invoice Totals" template
- **THEN** script sums items.total_amount_inc_tax
- **AND** compares to invoice.total_amount_inc_tax
- **AND** tolerance is configurable

#### Scenario: Admin creates custom template
- **WHEN** admin creates global validation template
- **THEN** template appears in all projects' template library
- **AND** users can instantiate templates with their own settings

### Requirement: Script Security
The system SHALL execute validation scripts securely.

#### Scenario: Isolated execution context
- **WHEN** validation script is executed
- **THEN** script runs in isolated VM context
- **AND** script has NO access to: file system, network, process env
- **AND** script has NO access to: require(), import, eval
- **AND** only standard JavaScript built-ins are available

#### Scenario: Execution timeout
- **WHEN** script execution exceeds timeout (default 5 seconds)
- **THEN** script is terminated
- **AND** error is logged: "Script timeout: {scriptName}"
- **AND** timeout error is returned as validation issue

#### Scenario: Memory limits
- **WHEN** script exceeds memory limit (default 10MB)
- **THEN** script is terminated
- **AND** memory error is logged
- **AND** error is returned as validation issue

#### Scenario: Script syntax validation
- **WHEN** user saves validation script
- **THEN** script syntax is validated
- **AND** syntax errors are displayed before saving
- **AND** invalid scripts cannot be saved

### Requirement: Validation Actions
The system SHALL provide actions for addressing validation issues.

#### Scenario: Re-extract from validation
- **WHEN** user clicks "Re-extract" on manifest with validation issues
- **THEN** extraction workflow is re-triggered
- **AND** validation results are cleared
- **AND** new extraction is performed

#### Scenario: Edit extracted data
- **WHEN** user manually edits extracted data field
- **THEN** edit is saved to manifest.extractedData
- **AND** validation results are cleared (marked stale)
- **AND** user is prompted to re-run validation

