## ADDED Requirements

### Requirement: Currency-Aware Cost Dashboard Metrics API
The system SHALL provide a cost dashboard metrics endpoint that aggregates usage and costs without mixing currencies.

#### Scenario: Retrieve cost dashboard metrics grouped by currency
- **GIVEN** jobs and manifests exist with costs in one or more currencies
- **WHEN** a client calls `GET /api/metrics/cost-dashboard`
- **THEN** the system SHALL return totals grouped by currency
- **AND** the system SHALL include LLM token usage totals (input/output) in the response
- **AND** the system SHALL include text extraction usage totals (pages processed) in the response

#### Scenario: Filter dashboard metrics by date range
- **GIVEN** cost data exists over multiple days
- **WHEN** a client calls `GET /api/metrics/cost-dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`
- **THEN** the system SHALL aggregate results only within the requested date range

#### Scenario: Do not sum costs across different currencies
- **GIVEN** jobs exist in multiple currencies
- **WHEN** a client calls `GET /api/metrics/cost-dashboard`
- **THEN** the system SHALL NOT return a single total that sums across currencies
- **AND** each returned total SHALL be associated with an explicit currency code (or `unknown`)

### Requirement: LLM Token Metrics Use Stored Usage Fields
The system SHALL calculate dashboard token metrics using stored per-job token usage fields.

#### Scenario: Group token metrics by LLM model id
- **GIVEN** jobs include `llm_input_tokens` and `llm_output_tokens`
- **WHEN** the system aggregates token metrics for the dashboard
- **THEN** metrics SHALL be grouped by the job `llm_model_id` value
