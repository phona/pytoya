## MODIFIED Requirements

### Requirement: LLM Prompt Optimization
The extraction service SHALL provide an endpoint to optimize extraction prompts using the configured LLM.
The optimizer MUST be domain-neutral by default and MUST NOT inject invoice-only business rules unless provided by the user’s description/context.

#### Scenario: Optimize prompt from description (domain-neutral)
- **WHEN** a user provides extraction requirements description for an arbitrary document type
- **THEN** the system SHALL send the description to the configured LLM
- **AND** the system SHALL request the LLM to generate an optimized extraction system prompt
- **AND** the system SHALL return the generated prompt to the user
- **AND** the generated prompt SHALL avoid invoice-only assumptions (field names, formats, or units) unless explicitly requested

#### Scenario: Prompt optimization response format
- **WHEN** the LLM returns an optimized prompt
- **THEN** the system SHALL return JSON with the prompt content
- **AND** the system SHALL handle LLM errors gracefully

