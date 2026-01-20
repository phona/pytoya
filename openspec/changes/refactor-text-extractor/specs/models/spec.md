## MODIFIED Requirements
### Requirement: Model Selection for Projects
The system SHALL allow projects to select default models for LLM operations.

#### Scenario: Project selects LLM model
- **GIVEN** a project and at least one LLM model (category='llm')
- **WHEN** setting project.llmModelId
- **THEN** only models with 'llm' capability can be selected
- **AND** the reference is stored as a UUID
- **AND** extraction operations use this model by default

#### Scenario: Model deletion affects projects
- **GIVEN** a project with a default LLM model configured
- **WHEN** that model is deleted
- **THEN** the project's default model reference is set to null
- **AND** the system falls back to a global default or config.yaml
- **AND** a warning is shown to users
