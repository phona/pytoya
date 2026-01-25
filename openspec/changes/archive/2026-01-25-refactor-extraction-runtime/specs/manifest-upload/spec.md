## MODIFIED Requirements

### Requirement: File Upload
The system SHALL store uploaded files in a way that remains accessible to background extraction workers under the configured deployment topology.

#### Scenario: Worker can access stored files
- **GIVEN** a manifest has been uploaded and stored
- **WHEN** an extraction job runs in a separate worker process/pod
- **THEN** the worker SHALL be able to read the manifest file by the stored reference (e.g., storagePath)
- **AND** the uploads backend (local disk vs shared storage) SHALL be configurable by deployment
