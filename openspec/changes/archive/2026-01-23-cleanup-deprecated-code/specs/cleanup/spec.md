## ADDED Requirements

### Requirement: Deprecated Code Removal
The system SHALL remove all deprecated Python code and related artifacts after migration to TypeScript is complete.

#### Scenario: Remove Python source files
- **WHEN** TypeScript migration is complete
- **THEN** Python source under `src/` is deleted (`src/*.py` and `src/{commands,extraction,ocr,workflow}/`)
- **AND** no Python code remains in repository

#### Scenario: Remove YAML results directory
- **WHEN** TypeScript migration with database is complete
- **THEN** `results/` directory containing YAML files is deleted
- **AND** all data is in PostgreSQL database

#### Scenario: Remove CLI entry point
- **WHEN** TypeScript migration with NestJS API is complete
- **THEN** `main.py` CLI entry point is deleted
- **AND** no Python CLI functionality is available

#### Scenario: Remove old static files
- **WHEN** TypeScript migration with Next.js web UI is complete
- **THEN** `audit_page/` directory with HTML/JS files is deleted
- **AND** all functionality is in Next.js application

#### Scenario: Update README
- **WHEN** deprecated code is removed
- **THEN** README.md reflects new web-based architecture
- **AND** deprecation notice is added for users of old CLI

### Requirement: Virtual Environment Cleanup
The system SHALL remove Python virtual environment and related artifacts.

#### Scenario: Remove virtual environment
- **WHEN** Python code is removed
- **THEN** `.venv/` directory is deleted
- **AND** no Python runtime dependencies remain

#### Scenario: Remove log files
- **WHEN** old processing logs are no longer needed
- **THEN** `processing.log` and other log files are removed
- **AND** log functionality is in new web application

#### Scenario: Clean input directory
- **WHEN** migration is complete
- **THEN** `invoices/` input directory is reviewed
- **AND** old test files are removed (or archived to separate location if needed for reference)
