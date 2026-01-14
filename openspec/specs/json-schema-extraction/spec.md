# json-schema-extraction Specification

## Purpose
TBD - created by archiving change implement-json-schema-extraction. Update Purpose after archive.
## Requirements
### Requirement: Schema Management
The system SHALL allow users to define JSON Schema for extraction validation.

#### Scenario: Create schema
- **WHEN** authenticated user creates schema via visual builder or JSON editor
- **THEN** schema is saved to SchemaEntity with JSON Schema draft 2020-12 format
- **AND** schema is validated as valid JSON Schema before saving
- **AND** schema appears in schemas list

#### Scenario: Validate schema
- **WHEN** user saves or edits schema
- **THEN** system validates JSON Schema syntax
- **AND** returns validation errors if invalid
- **AND** prevents saving invalid schemas

#### Scenario: Delete schema
- **WHEN** authenticated user deletes schema
- **THEN** schema is removed from database
- **AND** projects using schema show warning

### Requirement: Project Schema Association
The system SHALL allow projects to have default extraction schemas.

#### Scenario: Set project schema
- **WHEN** authenticated user selects schema for project
- **THEN** project.default_schema_id is saved
- **AND** schema is used for extractions in that project

#### Scenario: Fallback to default
- **WHEN** extraction is triggered and project has no schema
- **THEN** system uses configurable default schema
- **OR** returns error if no default schema exists

### Requirement: JSON Extraction
The system SHALL extract structured data using JSON Schema validation.

#### Scenario: Initial extraction with schema
- **WHEN** OCR results are available and schema is configured
- **THEN** LLM is called with system prompt including JSON Schema
- **AND** LLM returns JSON matching schema structure
- **AND** ajv validates JSON against schema
- **AND** validation errors trigger re-extraction

#### Scenario: Schema-based validation
- **WHEN** LLM returns extracted data
- **THEN** ajv validates JSON against project's JSON Schema
- **AND** required fields are checked
- **AND** field types are validated
- **AND** validation failures return specific field paths

#### Scenario: Re-extraction with validation feedback
- **WHEN** previous extraction failed JSON Schema validation
- **THEN** re-extraction prompt includes validation errors and field paths
- **AND** LLM provides corrected JSON
- **AND** retry is attempted

### Requirement: Visual Schema Builder
The system SHALL provide UI for building JSON Schemas without writing JSON.

#### Scenario: Add field to schema
- **WHEN** user adds field via visual builder
- **THEN** user selects field name, type, and required status
- **AND** nested objects and arrays are supported
- **AND** JSON Schema is generated automatically

#### Scenario: Edit field properties
- **WHEN** user edits existing field
- **THEN** field properties are updated in JSON Schema
- **AND** validation rules are applied

#### Scenario: Import/Export JSON Schema
- **WHEN** user imports existing JSON Schema
- **THEN** schema is parsed and visual builder is populated
- **WHEN** user exports schema
- **THEN** JSON Schema file is downloaded

### Requirement: LLM Structured Output Support
The system SHALL use native structured output when available.

#### Scenario: OpenAI structured output
- **WHEN** provider supports native structured output (OpenAI, Anthropic)
- **THEN** `response_format: { type: "json_schema", json_schema }` is used
- **AND** schema is passed directly to LLM API
- **AND** LLM guarantees JSON matching schema

#### Scenario: Fallback to prompt-based
- **WHEN** provider doesn't support structured output
- **THEN** JSON Schema is included in system prompt
- **AND** LLM is instructed to return JSON matching schema
- **AND** ajv validates response after generation

### Requirement: Schema Template Library
The system SHALL provide pre-built schema templates for common document types.

#### Scenario: Use invoice template
- **WHEN** user creates new schema from invoice template
- **THEN** invoice JSON Schema is pre-populated
- **AND** user can customize fields
- **AND** schema is saved as new schema

#### Scenario: Create custom template
- **WHEN** admin creates schema template
- **THEN** template appears in template library
- **AND** users can create schemas from templates

