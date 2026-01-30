# validation-scripts Spec Delta (add-casl-access-control)

## MODIFIED Requirements

### Requirement: Validation Script Management
Validation scripts MUST be project-scoped and access MUST be enforced by project ownership (or admin).

#### Scenario: List scripts is scoped
- **WHEN** a non-admin user lists validation scripts
- **THEN** only scripts belonging to projects the user owns are returned
- **AND** scripts for other users/projects are not returned

