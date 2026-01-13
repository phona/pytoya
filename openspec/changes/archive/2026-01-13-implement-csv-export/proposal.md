# Change: CSV Export

## Why
Users need to export manifest data to CSV format for external reporting, similar to existing CLI csv command functionality.

## What Changes
- Create CSV export API endpoint
- Support advanced filters (same as list page)
- Generate CSV from database (not YAML files)
- Add export button to manifests page
- Support bulk export of selected manifests
- Port existing CSV aggregation logic from Python to NestJS

## Impact
- Affected specs: New csv-export capability
- Affected code: New CSV export service, frontend export button
