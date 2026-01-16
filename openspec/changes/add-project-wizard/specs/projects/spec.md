## MODIFIED Requirements

### Requirement: Project Creation
The system SHALL allow users to create projects with associated models, extraction strategy, and validation configuration through a multi-step wizard interface.

#### Scenario: Create project with schema-based extraction
- **WHEN** a user creates a project with schema-based extraction
- **THEN** the system SHALL create a new project entity
- **AND** the system SHALL associate selected schema with project
- **AND** the system SHALL associate selected OCR and LLM models with project
- **AND** the system SHALL set extraction strategy to "schema"

#### Scenario: Create project with prompt-based extraction
- **WHEN** a user creates a project with prompt-based extraction
- **THEN** the system SHALL create a new project entity
- **AND** the system SHALL store optimized prompt with project
- **AND** the system SHALL associate selected OCR and LLM models with project
- **AND** the system SHALL set extraction strategy to "prompt"

## ADDED Requirements

### Requirement: Per-Project Validation Scripts
The system SHALL allow validation scripts to be configured at the project level rather than globally.

#### Scenario: Add validation script to project
- **WHEN** a user adds a validation script to a project
- **THEN** the system SHALL store validation script with project entity
- **AND** the system SHALL apply validation rules during extraction for that project
- **AND** the system SHALL NOT apply validation rules to other projects

#### Scenario: Remove validation script from project
- **WHEN** a user removes a validation script from a project
- **THEN** the system SHALL delete validation script from project
- **AND** the system SHALL stop applying validation during extraction
