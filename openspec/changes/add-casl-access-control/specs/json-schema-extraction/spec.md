# json-schema-extraction Spec Delta (add-casl-access-control)

## MODIFIED Requirements

### Requirement: Schema Management
Schema management endpoints (create/update/delete) MUST be restricted to admins.

#### Scenario: Non-admin cannot create schema
- **GIVEN** an authenticated non-admin user
- **WHEN** the user attempts to create a schema
- **THEN** the request MUST fail with 403 Forbidden

#### Scenario: Admin can manage schemas
- **GIVEN** an authenticated admin user
- **WHEN** the admin creates/updates/deletes a schema
- **THEN** the request is permitted

