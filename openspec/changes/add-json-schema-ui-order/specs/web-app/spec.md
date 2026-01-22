## ADDED Requirements

### Requirement: Ordered Schema-Driven Audit Form Fields
The web application SHALL render schema-driven manifest audit form fields in a deterministic order derived from JSON Schema `x-ui-order` metadata.

#### Scenario: Root object ordering with partial metadata
- **GIVEN** the project's JSON Schema root object defines `properties` with `x-ui-order` on some properties
- **WHEN** a user opens the manifest audit page for a manifest in that project
- **THEN** properties with `x-ui-order` SHALL be rendered first in ascending numeric order
- **AND** properties without `x-ui-order` SHALL be rendered after, sorted by property name (A→Z)

#### Scenario: Nested object ordering
- **GIVEN** a property is an object schema with nested `properties`
- **WHEN** the audit form renders fields within that nested object
- **THEN** nested properties SHALL be ordered using the same `x-ui-order` rules

#### Scenario: Array items object ordering
- **GIVEN** a property is an array whose `items` is an object schema with `properties`
- **WHEN** the audit form renders editable rows for that array
- **THEN** row fields/columns SHALL be ordered using the same `x-ui-order` rules

### Requirement: Canonical Schema Preview Ordering
The web application SHALL present JSON Schema previews using canonical ordering based on `x-ui-order` metadata for readability.

#### Scenario: Preview uses canonical ordering
- **WHEN** a user views or formats a JSON Schema in the UI
- **THEN** the displayed JSON SHALL serialize `properties` in the canonical order derived from `x-ui-order`
