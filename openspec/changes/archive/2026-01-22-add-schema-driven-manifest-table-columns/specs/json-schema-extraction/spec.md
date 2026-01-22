## ADDED Requirements

### Requirement: Persisted Manifest List Column Metadata

The system SHALL accept and preserve JSON Schema UI metadata for manifest list column selection via a root-level extension property named `x-table-columns`.

#### Scenario: Save and reload `x-table-columns`

- **GIVEN** a JSON Schema includes a root-level `x-table-columns` array (which MAY be empty) of dot-notation field paths
- **WHEN** the user saves the schema
- **THEN** the schema SHALL be accepted and stored without validation errors
- **AND** when retrieved, `x-table-columns` SHALL be present and unchanged
