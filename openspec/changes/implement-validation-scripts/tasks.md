## 1. Backend Implementation

- [ ] 1.1 Create ValidationScriptEntity (id, name, projectId, script, severity, enabled)
- [ ] 1.2 Add `validationResults` JSONB field to ManifestEntity
- [ ] 1.3 Create validation module (validation.module.ts, validation.service.ts, validation.controller.ts)
- [ ] 1.4 Implement script CRUD API endpoints
- [ ] 1.5 Implement script syntax validation endpoint
- [ ] 1.6 Implement validation execution endpoint (run on manifest)
- [ ] 1.7 Implement batch validation endpoint (run on multiple manifests)
- [ ] 1.8 Add validation results caching to ManifestsService
- [ ] 1.9 Create migration for validation tables
- [ ] 1.10 Add script execution security (VM isolation, timeout, memory limits)

## 2. Script Execution Engine

- [ ] 2.1 Add `vm2` or `isolated-vm` dependency
- [ ] 2.2 Implement ScriptExecutor class with isolated context
- [ ] 2.3 Add timeout enforcement (5 seconds default)
- [ ] 2.4 Add memory limit enforcement (10MB default)
- [ ] 2.5 Implement error handling for script crashes
- [ ] 2.6 Add script syntax validation (AST parsing)
- [ ] 2.7 Create script function wrapper (passes extractedData, returns issues)

## 3. Frontend Implementation

- [ ] 3.1 Create validation scripts list page (app/(dashboard)/validation-scripts/page.tsx)
- [ ] 3.2 Create script editor component with syntax highlighting
- [ ] 3.3 Build ValidationScriptForm component
- [ ] 3.4 Build ValidationResultsPanel component (shows issues)
- [ ] 3.5 Add "Run Validation" button to manifest detail page
- [ ] 3.6 Add validation status indicator to manifest list
- [ ] 3.7 Create useValidationScripts hook
- [ ] 3.8 Add API client functions (lib/api/validation.ts)
- [ ] 3.9 Implement batch validation UI (select manifests, run, show progress)

## 4. Script Templates

- [ ] 4.1 Create tax calculation template (configurable rate, tolerance)
- [ ] 4.2 Create invoice totals template (sum items vs. invoice total)
- [ ] 4.3 Create required fields template (check non-empty fields)
- [ ] 4.4 Create date range template (start_date ≤ end_date)
- [ ] 4.5 Add template selection in script creation flow
- [ ] 4.6 Implement admin template management (global templates)

## 5. UI Integration

- [ ] 5.1 Add validation results to manifest detail panel
- [ ] 5.2 Implement issue grouping by severity and field
- [ ] 5.3 Add click-to-highlight field functionality
- [ ] 5.4 Add "Re-run validation" button with stale cache detection
- [ ] 5.5 Show validation status in manifest list (checkmark/warning icon)
- [ ] 5.6 Add WebSocket progress updates for batch validation

## 6. Testing

- [ ] 6.1 Test script CRUD operations
- [ ] 6.2 Test script syntax validation (valid and invalid scripts)
- [ ] 6.3 Test script execution with valid data
- [ ] 6.4 Test script execution with invalid data (produces issues)
- [ ] 6.5 Test script timeout enforcement
- [ ] 6.6 Test script memory limits
- [ ] 6.7 Test malicious scripts (file system access attempts blocked)
- [ ] 6.8 Test batch validation with multiple manifests
- [ ] 6.9 Test validation results caching and invalidation
- [ ] 6.10 Test template instantiation and customization

## 7. Documentation

- [ ] 7.1 Document validation script API reference
- [ ] 7.2 Create validation script examples (tax, totals, dates)
- [ ] 7.3 Document security model and limitations
- [ ] 7.4 Add user guide for creating validation scripts
