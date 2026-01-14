## 1. Backend Implementation

- [x] 1.1 Create ValidationScriptEntity (id, name, projectId, script, severity, enabled)
- [x] 1.2 Add `validationResults` JSONB field to ManifestEntity
- [x] 1.3 Create validation module (validation.module.ts, validation.service.ts, validation.controller.ts)
- [x] 1.4 Implement script CRUD API endpoints
- [x] 1.5 Implement script syntax validation endpoint
- [x] 1.6 Implement validation execution endpoint (run on manifest)
- [x] 1.7 Implement batch validation endpoint (run on multiple manifests)
- [x] 1.8 Add validation results caching to ManifestsService
- [x] 1.9 Create migration for validation tables
- [x] 1.10 Add script execution security (VM isolation, timeout, memory limits)

## 2. Script Execution Engine

- [x] 2.1 Add `vm2` or `isolated-vm` dependency (used built-in vm module instead)
- [x] 2.2 Implement ScriptExecutor class with isolated context
- [x] 2.3 Add timeout enforcement (5 seconds default)
- [x] 2.4 Add memory limit enforcement (10MB default)
- [x] 2.5 Implement error handling for script crashes
- [x] 2.6 Add script syntax validation (AST parsing)
- [x] 2.7 Create script function wrapper (passes extractedData, returns issues)

## 3. Frontend Implementation

- [x] 3.1 Create validation scripts list page (app/(dashboard)/validation-scripts/page.tsx)
- [x] 3.2 Create script editor component with syntax highlighting
- [x] 3.3 Build ValidationScriptForm component
- [x] 3.4 Build ValidationResultsPanel component (shows issues)
- [x] 3.5 Add "Run Validation" button to manifest detail page
- [x] 3.6 Add validation status indicator to manifest list
- [x] 3.7 Create useValidationScripts hook
- [x] 3.8 Add API client functions (lib/api/validation.ts)
- [x] 3.9 Implement batch validation UI (select manifests, run, show progress)

## 4. Script Templates

- [x] 4.1 Create tax calculation template (configurable rate, tolerance)
- [x] 4.2 Create invoice totals template (sum items vs. invoice total)
- [x] 4.3 Create required fields template (check non-empty fields)
- [x] 4.4 Create date range template (start_date ≤ end_date)
- [x] 4.5 Add template selection in script creation flow
- [x] 4.6 Implement admin template management (global templates)

## 5. UI Integration

- [x] 5.1 Add validation results to manifest detail panel
- [x] 5.2 Implement issue grouping by severity and field
- [x] 5.3 Add click-to-highlight field functionality
- [x] 5.4 Add "Re-run validation" button with stale cache detection
- [x] 5.5 Show validation status in manifest list (checkmark/warning icon)
- [x] 5.6 Add WebSocket progress updates for batch validation (existing infrastructure handles this via query invalidation and WebSocket events)

## 6. Testing

- [x] 6.1 Test script CRUD operations
- [x] 6.2 Test script syntax validation (valid and invalid scripts)
- [x] 6.3 Test script execution with valid data
- [x] 6.4 Test script execution with invalid data (produces issues)
- [x] 6.5 Test script timeout enforcement
- [x] 6.6 Test script memory limits
- [x] 6.7 Test malicious scripts (file system access attempts blocked)
- [x] 6.8 Test batch validation with multiple manifests
- [x] 6.9 Test validation results caching and invalidation
- [x] 6.10 Test template instantiation and customization

## 7. Documentation

- [x] 7.1 Document validation script API reference
- [x] 7.2 Create validation script examples (tax, totals, dates)
- [x] 7.3 Document security model and limitations
- [x] 7.4 Add user guide for creating validation scripts
