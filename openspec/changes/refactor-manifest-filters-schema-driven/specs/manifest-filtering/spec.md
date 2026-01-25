## MODIFIED Requirements

### Requirement: Dynamic Field Filtering
The system SHALL support filtering manifests by extracted data fields using dot-notation paths and SHALL NOT require invoice-centric “system filter” parameters for core functionality.

#### Scenario: Filter using dynamic extracted-data filters
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[invoice.po_no]=0000009`
- **THEN** only manifests with matching extracted data are returned
- **AND** the system SHALL NOT require `poNo=...` as a special-case parameter

