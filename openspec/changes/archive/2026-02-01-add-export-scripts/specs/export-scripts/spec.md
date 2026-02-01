## ADDED Requirements

### Requirement: Export Script Management
The system SHALL allow users to create and manage export scripts per project.

#### Scenario: Create export script
- **WHEN** an authenticated user creates an export script via UI
- **THEN** the script is saved to an ExportScriptEntity associated to the project
- **AND** script syntax is validated before saving
- **AND** the script appears in the project's export scripts list

#### Scenario: Enable/disable script
- **WHEN** a user toggles export script enabled status
- **THEN** the script is included/excluded from CSV/XLSX export runs
- **AND** disabled scripts remain saved but are not executed

#### Scenario: Deterministic script order
- **GIVEN** a project has multiple enabled export scripts
- **WHEN** an export is generated
- **THEN** scripts are executed in deterministic order: `priority DESC`, then `id ASC`

### Requirement: Export Script Contract (`exportRows`)
Export scripts MUST define `function exportRows(extractedData, ctx)` and return an array of row objects.

#### Scenario: Contract enforcement
- **WHEN** a user saves an export script
- **THEN** the system SHALL reject scripts that do not contain a function named `exportRows`
- **AND** the system SHALL reject scripts with JavaScript syntax errors

#### Scenario: Return shape enforcement
- **WHEN** an export script is executed
- **THEN** the system SHALL reject results that are not an array
- **AND** the system SHALL reject array entries that are not plain objects

### Requirement: Export Script Context (`ctx`)
The system SHALL provide a context object to export scripts so scripts can behave consistently across CSV/XLSX.

#### Scenario: Context includes export format and columns
- **WHEN** `exportRows()` is executed
- **THEN** `ctx.format` is provided as `'csv'` or `'xlsx'`
- **AND** `ctx.schemaColumns` is provided as the configured `x-table-columns` list (may be empty)
- **AND** `ctx.manifest.manifest_id` (or equivalent) is provided for joining/grouping

### Requirement: Export Script Test Panel
The system SHALL provide a test panel for export scripts that allows users to run the current script against input JSON and preview rows.

#### Scenario: Test script with input JSON
- **GIVEN** the user is editing an export script
- **WHEN** the user provides extracted data as JSON and runs a test
- **THEN** the system SHALL execute the script in the same restricted sandbox used for real exports
- **AND** the system SHALL return a rows preview (first N rows) to the UI

#### Scenario: View console logs and runtime errors
- **GIVEN** the script calls `console.log()` or throws during execution
- **WHEN** the user runs a test
- **THEN** the system SHALL return captured logs
- **AND** the system SHALL return a user-visible runtime error message (with sanitized stack snippet when available)

### Requirement: Export Script Security
The system SHALL execute export scripts securely.

#### Scenario: Isolated execution context
- **WHEN** an export script is executed
- **THEN** it runs in an isolated VM context
- **AND** it has NO access to: file system, network, process env
- **AND** it has NO access to: `require()`, `import`, `eval`
- **AND** only standard JavaScript built-ins are available

### Requirement: Export Script Failure Aborts Export
If any enabled export script fails, the export MUST fail.

#### Scenario: Script failure aborts CSV/XLSX export
- **GIVEN** a project has an enabled export script
- **AND** the export script throws during execution
- **WHEN** the user exports CSV or XLSX
- **THEN** the system SHALL abort export generation
- **AND** the UI SHALL receive an error message that identifies the failing script

