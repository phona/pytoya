## ADDED Requirements

### Requirement: Validation Results Are Versioned for Audit
Validation results SHALL record the schema version and validation script version(s) used so that audit history remains explainable as schemas and scripts evolve.
Cached validation results MUST be invalidated when the schema version or validation scripts change.

#### Scenario: Cached validation invalidates on schema change
- **GIVEN** a manifest has cached validation results
- **WHEN** the project schema changes to a new version
- **THEN** cached validation results SHALL be treated as stale
- **AND** the UI SHALL prompt the user to re-run validation
