## ADDED Requirements

### Requirement: Backend DI smoke tests
The system SHALL include fast backend “DI smoke tests” that compile critical NestJS modules and fail when dependency injection wiring is incomplete.

#### Scenario: Missing repository registration fails fast
- **GIVEN** a service injects `@InjectRepository(SchemaEntity)`
- **WHEN** the module omits `TypeOrmModule.forFeature([SchemaEntity])`
- **THEN** the DI smoke test SHALL fail with a dependency resolution error

#### Scenario: Smoke tests are DB-less
- **WHEN** DI smoke tests run
- **THEN** they SHALL NOT connect to Postgres
- **AND** repository providers SHALL be satisfied by a stubbed TypeORM `DataSource`

#### Scenario: Adding new smoke tests is cheap
- **WHEN** a new backend module is added that injects repositories or cross-module providers
- **THEN** developers SHOULD add a DI smoke test for that module using the shared helper

