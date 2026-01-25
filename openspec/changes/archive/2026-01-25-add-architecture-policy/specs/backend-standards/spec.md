## ADDED Requirements

### Requirement: Domain Rules Live in Project Configuration
The backend SHALL NOT hardcode document-type-specific business rules in production runtime defaults (e.g., invoice-only field names, required fields, or value formats).
Domain constraints MUST be expressed via project configuration (JSON Schema + supported `x-*` extensions, schema rules, validation scripts, and schema-scoped prompt templates).

#### Scenario: New document type is configuration-first
- **GIVEN** a new project needs extraction for a new document type
- **WHEN** an admin defines a JSON Schema (and optional rules/scripts/templates) for that project
- **THEN** the system SHALL be able to extract and audit that document type without introducing new domain-specific code paths

