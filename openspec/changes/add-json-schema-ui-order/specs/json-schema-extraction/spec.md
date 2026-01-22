## ADDED Requirements

### Requirement: Persisted UI Ordering Metadata
The system SHALL allow JSON Schemas to include `x-ui-order` metadata on property schemas and SHALL preserve the metadata when saving and loading schemas.

#### Scenario: Save and reload ordering metadata
- **GIVEN** a JSON Schema includes `x-ui-order` on one or more properties (including nested objects and array item objects)
- **WHEN** the user saves the schema
- **THEN** the schema SHALL be accepted and stored without validation errors
- **AND** when retrieved, `x-ui-order` values SHALL be present and unchanged

### Requirement: Visual Builder Property Reordering
The visual schema builder SHALL allow users to reorder properties and persist ordering using `x-ui-order`.

#### Scenario: Reorder property and persist
- **WHEN** a user changes the order of properties in the visual builder
- **THEN** the generated JSON Schema SHALL include updated `x-ui-order` values reflecting that order

### Requirement: Deterministic Schema Stringification for Prompts
When the backend serializes JSON Schema into human-facing prompts/rules/markdown, it SHALL use canonical ordering derived from `x-ui-order` metadata.

#### Scenario: Prompt/rules schema stringification is canonical
- **WHEN** the backend generates prompt/rules content that embeds a JSON Schema
- **THEN** the embedded schema JSON SHALL list `properties` in canonical `x-ui-order` order
