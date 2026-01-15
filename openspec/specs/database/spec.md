# database Specification

## Purpose
TBD - created by archiving change setup-database-orm. Update Purpose after archive.
## Requirements
### Requirement: Database Schema
The system SHALL provide PostgreSQL database with TypeORM entities.

#### Scenario: Database connection
- **WHEN** application starts
- **THEN** PostgreSQL connection is established using configured credentials
- **AND** database migrations are applied via a Helm-managed migration Job before API pods start

#### Scenario: User entity persistence
- **WHEN** user creates account via registration API
- **THEN** User entity is saved to database
- **AND** password hash is stored (not plaintext)

#### Scenario: Project entity with relationships
- **WHEN** user creates a project with groups and manifests
- **THEN** Project, Group, and Manifest entities are saved
- **AND** foreign key relationships are established (project_id, group_id)

#### Scenario: Manifest entity with JSONB
- **WHEN** manifest extraction is saved
- **THEN** Manifest entity is stored with JSONB fields for extraction_data, ocr_issues
- **AND** PostgreSQL can query JSONB fields

#### Scenario: Database migrations
- **WHEN** database schema needs change
- **THEN** TypeORM migration file is created
- **AND** migration is applied to database without data loss

