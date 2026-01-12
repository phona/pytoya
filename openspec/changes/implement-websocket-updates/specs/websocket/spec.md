## ADDED Requirements

### Requirement: WebSocket Connection
The system SHALL allow clients to subscribe to real-time updates for manifest jobs.

#### Scenario: Subscribe to manifest updates
- **WHEN** client opens audit panel for a manifest
- **THEN** WebSocket connection is established
- **AND** client subscribes to `manifest:{manifestId}` channel

#### Scenario: Receive job progress
- **WHEN** extraction job updates progress
- **THEN** job-update event is sent to subscribed clients
- **AND** progress bar is updated in UI
- **AND** status text is updated

#### Scenario: Receive job completion
- **WHEN** extraction job completes
- **THEN** job-update event with status=completed is sent
- **AND** UI shows completion notification
- **AND** manifest data is refreshed

#### Scenario: Receive job failure
- **WHEN** extraction job fails
- **THEN** job-update event with status=failed is sent
- **AND** error message is displayed
- **AND** UI shows failure state

#### Scenario: Unsubscribe from updates
- **WHEN** client navigates away or closes audit panel
- **THEN** client unsubscribes from manifest channel
- **AND** WebSocket connection is properly closed
