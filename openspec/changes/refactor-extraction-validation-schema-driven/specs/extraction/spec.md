## MODIFIED Requirements

### Requirement: LLM Extraction
The system SHALL extract structured data according to the project’s active JSON Schema contract and MUST NOT inject invoice-only defaults (field names, required fields, or “items” rules) unless expressed by the schema/configuration.

#### Scenario: Non-invoice schema extraction does not inherit invoice defaults
- **GIVEN** a project schema that does not include invoice-shaped fields (no `invoice.*` fields)
- **WHEN** a user triggers extraction
- **THEN** the extraction prompt SHALL be built from the project schema contract
- **AND** the system SHALL NOT inject invoice-only required fields or “items” constraints

