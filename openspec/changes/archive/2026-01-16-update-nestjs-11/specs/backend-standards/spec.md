## ADDED Requirements
### Requirement: Supported NestJS Major Version
The backend SHALL target NestJS major version 11 for runtime and tooling packages (all @nestjs/* dependencies).

#### Scenario: Adding or upgrading NestJS packages
- **WHEN** adding or updating a NestJS dependency
- **THEN** the package MUST be on major version 11
- **AND** the NestJS package set MUST NOT mix major versions
