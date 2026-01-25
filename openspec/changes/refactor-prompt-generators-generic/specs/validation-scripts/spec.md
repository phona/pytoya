## ADDED Requirements

### Requirement: LLM-Generated Validation Script Templates Are Domain-Neutral
The system SHALL support generating validation script templates using the configured LLM.
The generation prompt MUST be domain-neutral by default and MUST NOT assume invoice-only rules unless provided by user input or project configuration.

#### Scenario: Generate validation script template for any schema
- **GIVEN** a project has a JSON Schema for extracted data
- **WHEN** a user requests a generated validation script template
- **THEN** the system SHALL provide schema/context to the LLM
- **AND** the system SHALL return `{ name, description, severity, script }` as JSON
- **AND** the system SHALL NOT hardcode invoice-only wording or constraints in the generator prompt

