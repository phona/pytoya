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

The system SHALL execute validation scripts on extracted data, and SHALL support using validation results to gate user actions in the audit flow (e.g., saving a manifest as Human Verified).

#### Scenario: Validation is used to gate Human Verified

- **WHEN** the user attempts to save a manifest as Human Verified
- **THEN** the system SHALL run validation for that manifest
- **AND** validation results SHALL be returned to the UI so the user can decide whether to proceed when errors exist

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

### Requirement: Validation Script Test Panel
The system SHALL provide a debug/test panel for validation scripts that allows users to run the current script against provided input data and see logs and errors.

#### Scenario: Test script with input JSON
- **GIVEN** the user is editing a validation script
- **WHEN** the user provides extracted data as JSON and runs a test
- **THEN** the system SHALL execute the script in the same restricted sandbox used for real validation
- **AND** the system SHALL return validation issues and counts to the UI

#### Scenario: View console logs while testing
- **GIVEN** a script calls `console.log()` (or `console.warn()` / `console.error()`)
- **WHEN** the user runs a test
- **THEN** the system SHALL return captured console output to the UI test panel
- **AND** the UI SHALL display logs in a dedicated Logs view

#### Scenario: View runtime errors with stack snippet
- **GIVEN** a script throws during execution
- **WHEN** the user runs a test
- **THEN** the system SHALL return a user-visible runtime error message
- **AND** the system SHOULD return a sanitized stack snippet that references the script filename and line numbers

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

### Requirement: Validation Results Are Versioned for Audit
Validation results SHALL record the schema version and validation script version(s) used so that audit history remains explainable as schemas and scripts evolve.
Cached validation results MUST be invalidated when the schema version or validation scripts change.

#### Scenario: Cached validation invalidates on schema change
- **GIVEN** a manifest has cached validation results
- **WHEN** the project schema changes to a new version
- **THEN** cached validation results SHALL be treated as stale
- **AND** the UI SHALL prompt the user to re-run validation

### Requirement: LLM-Generated Validation Script Templates Are Domain-Neutral
The system SHALL support generating validation script templates using the configured LLM.
The generation prompt MUST be domain-neutral by default and MUST NOT assume invoice-only rules unless provided by user input or project configuration.

#### Scenario: Generate validation script template for any schema
- **GIVEN** a project has a JSON Schema for extracted data
- **WHEN** a user requests a generated validation script template
- **THEN** the system SHALL provide schema/context to the LLM
- **AND** the system SHALL return `{ name, description, severity, script }` as JSON
- **AND** the system SHALL NOT hardcode invoice-only wording or constraints in the generator prompt

