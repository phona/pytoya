# provider-prompt-config Specification

## Purpose
TBD - created by archiving change implement-provider-prompt-management. Update Purpose after archive.
## Requirements
### Requirement: Provider Management
The system SHALL allow users to configure and manage LLM providers.

#### Scenario: Create provider
- **WHEN** authenticated user creates provider (PaddleX or OpenAI-compatible)
- **THEN** provider is saved to database
- **AND** provider appears in providers list

#### Scenario: Test provider connection
- **WHEN** user clicks "Test Connection" on provider form
- **THEN** API call to provider endpoint is made
- **AND** success or error message is displayed
- **AND** connection status is shown

#### Scenario: Update provider
- **WHEN** authenticated user edits provider configuration
- **THEN** provider is updated in database
- **AND** new configuration is used for subsequent extractions

#### Scenario: Delete provider
- **WHEN** authenticated user deletes provider
- **THEN** provider is removed from database
- **AND** projects using that provider show warning

#### Scenario: Set default provider
- **WHEN** authenticated user marks provider as default
- **THEN** provider.is_default is set to true
- **AND** other providers' is_default is set to false

### Requirement: Prompt Management
The system SHALL allow users to create and manage prompt templates.

#### Scenario: Create custom prompt
- **WHEN** authenticated user creates prompt (system or re_extract type)
- **THEN** prompt is saved with template_content
- **AND** prompt can be selected for provider

#### Scenario: Edit prompt
- **WHEN** authenticated user edits prompt template
- **THEN** changes are saved
- **AND** variable suggestions are shown ({{ocr_markdown}}, {{previous_result}})

#### Scenario: Use variable suggestions
- **WHEN** user types in prompt editor
- **THEN** available variables are suggested
- **AND** variable can be inserted with one click

### Requirement: Project-level Configuration
The system SHALL allow configuring default provider and prompts per project.

#### Scenario: Set project provider
- **WHEN** authenticated user selects provider for project
- **THEN** project.default_provider_id is saved
- **AND** provider is used for extractions in that project

#### Scenario: Set project prompts
- **WHEN** authenticated user configures prompts for project
- **THEN** project system_prompt_id and re_extract_prompt_id are saved
- **AND** prompts override defaults

### Requirement: Prompt Management (Preserved)

The system SHALL continue to allow users to create and manage prompt templates independently of models.

> **Note**: This requirement is preserved from the original spec. Prompts are separate from models and can be used with any LLM model.

#### Scenario: Create custom prompt
- **WHEN** authenticated user creates prompt (system or re_extract type)
- **THEN** prompt is saved with template_content
- **AND** prompt can be selected for any LLM model

#### Scenario: Edit prompt
- **WHEN** authenticated user edits prompt template
- **THEN** changes are saved
- **AND** variable suggestions are shown ({{ocr_markdown}}, {{previous_result}})

#### Scenario: Use variable suggestions
- **WHEN** user types in prompt editor
- **THEN** available variables are suggested
- **AND** variable can be inserted with one click

### Requirement: Project-level Prompt Configuration (Preserved)

The system SHALL allow configuring default prompts per project independently of models.

> **Note**: Prompts are configured separately from models. A project has both model references and prompt references.

#### Scenario: Set project prompts
- **WHEN** authenticated user configures prompts for project
- **THEN** project system_prompt_id and re_extract_prompt_id are saved
- **AND** prompts are used with the configured LLM model
- **AND** prompts can be changed independently of the model

