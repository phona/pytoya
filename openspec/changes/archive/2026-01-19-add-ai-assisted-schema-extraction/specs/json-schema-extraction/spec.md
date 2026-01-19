## ADDED Requirements

### Requirement: Schema Rules Management
The system SHALL allow users to define validation and restriction rules for schema fields.

#### Scenario: Create validation rule
- **WHEN** an authenticated user creates a rule for a schema field
- **THEN** the system SHALL save the rule with field path, type (verification/restriction), operator, and config
- **AND** the system SHALL assign a priority (0-10) for rule ordering
- **AND** the system SHALL enable the rule by default

#### Scenario: Create pattern validation rule
- **GIVEN** a schema field requires regex pattern validation
- **WHEN** creating a rule with operator="pattern"
- **THEN** ruleConfig.pattern SHALL contain the regex pattern
- **AND** ruleConfig.description MAY contain pattern explanation
- **AND** errorMessage SHALL contain the validation failure message

#### Scenario: Create enum restriction rule
- **GIVEN** a schema field must be one of a set of values
- **WHEN** creating a rule with operator="enum"
- **THEN** ruleConfig.allowedValues SHALL be an array of permitted values
- **AND** ruleConfig.mapping MAY contain OCR correction mappings (e.g., "理弧焊" → "埋弧焊")

#### Scenario: Create OCR correction rule
- **GIVEN** a field commonly misread by OCR
- **WHEN** creating a rule with operator="ocr_correction"
- **THEN** ruleConfig.corrections SHALL map incorrect values to correct values
- **AND** corrections SHALL be applied before validation

#### Scenario: List schema rules
- **WHEN** an authenticated user requests rules for a schema
- **THEN** the system SHALL return all rules for that schema
- **AND** rules SHALL be sorted by priority (descending)
- **AND** only enabled rules SHALL be applied during extraction

#### Scenario: Update rule
- **WHEN** an authenticated user updates a rule
- **THEN** the system SHALL save the changes
- **AND** updatedAt timestamp SHALL be updated
- **AND** the system SHALL validate ruleConfig format

#### Scenario: Delete rule
- **WHEN** an authenticated user deletes a rule
- **THEN** the system SHALL remove the rule from database
- **AND** other rules SHALL remain unaffected

#### Scenario: Bulk create rules
- **WHEN** an authenticated user creates multiple rules via bulk endpoint
- **THEN** the system SHALL create all rules in a single transaction
- **AND** the system SHALL return all created rules
- **AND** the system SHALL rollback on any validation failure

### Requirement: AI Schema Generation
The system SHALL generate JSON Schema from natural language descriptions using LLM.

#### Scenario: Generate schema from description
- **GIVEN** an authenticated user and a selected LLM model
- **WHEN** user provides a description of desired extraction fields
- **THEN** the system SHALL send the description to the LLM
- **AND** the system SHALL request structured JSON output
- **AND** the system SHALL return a valid JSON Schema Draft 07
- **AND** the system SHALL suggest required fields (dot notation)
- **AND** the system SHALL suggest a schema name and description

#### Scenario: Generate schema with existing schema context
- **GIVEN** an authenticated user and an existing schema ID
- **WHEN** user requests schema generation with existing schema as reference
- **THEN** the system SHALL include the existing schema in the prompt context
- **AND** the system SHALL generate a modified schema based on the description

#### Scenario: Validate generated schema
- **WHEN** LLM returns a generated schema
- **THEN** the system SHALL validate the schema with ajv
- **AND** the system SHALL return validation errors if invalid
- **AND** the system SHALL not save invalid schemas

#### Scenario: Handle empty description
- **WHEN** user requests schema generation with empty description
- **THEN** the system SHALL reject the request with 400 error
- **AND** the system SHALL indicate that description is required

### Requirement: AI Rule Generation
The system SHALL generate validation rules from schema and natural language descriptions using LLM.

#### Scenario: Generate rules from description
- **GIVEN** an authenticated user, a schema, and a selected LLM model
- **WHEN** user provides validation requirements description
- **THEN** the system SHALL send schema and description to the LLM
- **AND** the system SHALL request structured JSON output with rule array
- **AND** the system SHALL return CreateSchemaRuleDto array
- **AND** each rule SHALL have valid fieldPath, ruleType, ruleOperator, and ruleConfig

#### Scenario: Generate PO number pattern rule
- **GIVEN** a schema with invoice.po_no field
- **WHEN** user describes "PO number must be 7 digits"
- **THEN** the system SHALL generate a pattern rule with regex "^\\d{7}$"
- **AND** errorMessage SHALL explain the format requirement
- **AND** priority SHALL be set high (8-10)

#### Scenario: Generate OCR correction rules
- **GIVEN** a schema with fields prone to OCR errors
- **WHEN** user describes common OCR mistakes
- **THEN** the system SHALL generate ocr_correction rules
- **AND** ruleConfig.corrections SHALL map incorrect to correct values

#### Scenario: Generate unit enum rule
- **GIVEN** a schema with items[].unit field
- **WHEN** user describes "units must be KG, EA, or M"
- **THEN** the system SHALL generate an enum rule
- **AND** ruleConfig.allowedValues SHALL be ["KG", "EA", "M"]
- **AND** ruleConfig.mapping MAY include OCR corrections

### Requirement: Prompt Builder Service
The system SHALL construct extraction prompts incorporating schema and rules context.

#### Scenario: Build prompt with rules
- **GIVEN** a schema with associated rules
- **WHEN** building an extraction prompt
- **THEN** the system SHALL include a rules section in the prompt
- **AND** rules SHALL be grouped by field path
- **AND** rules SHALL be ordered by priority
- **AND** each rule SHALL be formatted with rule type, operator, and description

#### Scenario: Format pattern rule in prompt
- **GIVEN** a rule with operator="pattern"
- **WHEN** formatting for the prompt
- **THEN** the system SHALL include the pattern in markdown code format
- **AND** the system SHALL include description if available
- **AND** the system SHALL include errorMessage if available

#### Scenario: Format enum rule in prompt
- **GIVEN** a rule with operator="enum"
- **WHEN** formatting for the prompt
- **THEN** the system SHALL list all allowed values
- **AND** the system SHALL include OCR correction mappings if available

#### Scenario: Format OCR correction rule in prompt
- **GIVEN** a rule with operator="ocr_correction"
- **WHEN** formatting for the prompt
- **THEN** the system SHALL list all correction mappings (incorrect → correct)
- **AND** the system SHALL instruct LLM to apply these corrections

#### Scenario: Use custom system prompt template
- **GIVEN** a schema with systemPromptTemplate set
- **WHEN** building the system prompt
- **THEN** the system SHALL use the custom template
- **AND** the system SHALL not use the default template

#### Scenario: Apply validation settings to prompt
- **GIVEN** a schema with validationSettings
- **WHEN** building the system prompt
- **THEN** if strictMode=true, the system SHALL add strict mode instructions
- **AND** if ocrCorrectionLevel is set, the system SHALL add OCR correction instructions
- **AND** if crossValidation=true, the system SHALL add cross-validation instructions

### Requirement: Schema Validation Settings
The system SHALL allow configuration of validation behavior per schema.

#### Scenario: Configure strict mode
- **GIVEN** a schema with strictMode enabled
- **WHEN** extraction occurs
- **THEN** the system SHALL instruct LLM to return null for uncertain fields
- **AND** validation failures SHALL trigger re-extraction

#### Scenario: Configure OCR correction level
- **GIVEN** a schema with ocrCorrectionLevel set
- **WHEN** building extraction prompt
- **THEN** if level="strict", the system SHALL include all known OCR corrections
- **AND** if level="moderate", the system SHALL include common corrections
- **AND** if level="minimal", the system SHALL include only critical corrections

#### Scenario: Configure cross validation
- **GIVEN** a schema with crossValidation enabled
- **WHEN** extraction occurs
- **THEN** the system SHALL perform cross-field validation
- **AND** the system SHALL flag inconsistencies (e.g., quantity × price ≠ total)

### Requirement: Rule Priority and Ordering
The system SHALL order rules by priority when building extraction prompts.

#### Scenario: Higher priority rules appear first
- **GIVEN** multiple rules for the same field with different priorities
- **WHEN** building the extraction prompt
- **THEN** rules SHALL appear in priority order (descending)
- **AND** priority 10 rules SHALL appear before priority 1 rules

#### Scenario: Rules with same priority maintain insertion order
- **GIVEN** multiple rules with identical priority
- **WHEN** building the extraction prompt
- **THEN** rules SHALL maintain their creation order

#### Scenario: Disabled rules are excluded
- **GIVEN** a mix of enabled and disabled rules
- **WHEN** building the extraction prompt
- **THEN** only enabled rules SHALL be included
- **AND** disabled rules SHALL be stored but not used

## MODIFIED Requirements

### Requirement: Schema Management
The system SHALL allow users to define JSON Schema for extraction validation with optional rules and validation settings.

#### Scenario: Create schema with rules
- **WHEN** authenticated user creates schema via visual builder or JSON editor
- **THEN** schema is saved to SchemaEntity with JSON Schema draft 2020-12 format
- **AND** schema is validated as valid JSON Schema before saving
- **AND** optional rules can be associated with the schema
- **AND** optional validation settings can be configured
- **AND** schema appears in schemas list

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
- **AND** associated rules are cascade deleted
- **AND** projects using schema show warning

### Requirement: JSON Extraction
The system SHALL extract structured data using JSON Schema validation with optional rules context.

#### Scenario: Initial extraction with schema and rules
- **WHEN** OCR results are available and schema is configured with rules
- **THEN** LLM is called with system prompt including JSON Schema and rules
- **AND** LLM returns JSON matching schema structure
- **AND** ajv validates JSON against schema
- **AND** validation errors trigger re-extraction

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

## REMOVED Requirements

### Requirement: Schema Template Library
**Reason**: Replaced by AI-assisted schema generation. Users can describe requirements and have the LLM generate schemas instead of selecting from templates.

#### Scenario: Use invoice template
- **WHEN** user creates new schema from invoice template
- **THEN** invoice JSON Schema is pre-populated
- **AND** user can customize fields
- **AND** schema is saved as new schema

#### Scenario: Create custom template
- **WHEN** admin creates schema template
- **THEN** template appears in template library
- **AND** users can create schemas from templates
