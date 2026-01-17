## ADDED Requirements

### Requirement: LLM Prompt Optimization
The extraction service SHALL provide an endpoint to optimize extraction prompts using the configured LLM.

#### Scenario: Optimize prompt from description
- **WHEN** a user provides extraction requirements description
- **THEN** the system SHALL send description to configured LLM
- **AND** the system SHALL request LLM to generate optimized extraction prompt
- **AND** the system SHALL include context about invoice processing requirements
- **AND** the system SHALL include context about Chinese language support
- **AND** the system SHALL return generated prompt to user

#### Scenario: Prompt optimization response format
- **WHEN** the LLM returns optimized prompt
- **THEN** the system SHALL return JSON with prompt content
- **AND** the system SHALL include metadata about generation
- **AND** the system SHALL handle LLM errors gracefully

#### Scenario: Context-aware optimization
- **WHEN** generating optimized prompt
- **THEN** the system SHALL include domain context (invoice processing)
- **AND** the system SHALL include field format requirements (PO number, units)
- **AND** the system SHALL include OCR correction patterns if relevant
- **AND** the system SHALL include language requirements (Chinese invoices)
