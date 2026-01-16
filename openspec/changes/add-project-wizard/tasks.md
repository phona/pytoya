## 1. Backend Implementation

- [ ] 1.1 Add prompt optimization endpoint to extraction service
  - Create `POST /extraction/optimize-prompt` endpoint
  - Implement prompt generation using configured LLM
  - Add domain context (invoice processing, Chinese language, field formats)
  - Handle errors gracefully
  - Write tests for prompt optimization
- [ ] 1.2 Update project DTOs
  - Add `prompt` field for storing optimized prompts (prompt-based projects)
  - Ensure schema association works correctly
- [ ] 1.3 Update validation script entities
  - Add support for per-project validation scripts
  - Migration if needed

## 2. Frontend Implementation

### 2.1 Dialog Pattern Setup
- [ ] 2.1.1 Create reusable dialog component
  - Create `Dialog.tsx` with overlay, header, body, footer
  - Support close on escape key and backdrop click
  - Handle focus trap for accessibility
  - Animation for open/close transitions
- [ ] 2.1.2 Update existing forms to use dialog pattern
  - Convert `ModelForm` to dialog-based
  - Remove inline form display from `ModelsPage`
  - Update `ProjectForm` to be dialog-ready

### 2.2 Project Wizard Dialog
- [ ] 2.2.1 Create multi-step wizard component
  - Create `ProjectWizard.tsx` component with step navigation
  - Implement progress indicator
  - Add step validation logic
  - Implement data persistence across steps
- [ ] 2.2 Implement Step 1 - Basic info
  - Form fields for name and description
  - Validation
- [ ] 2.3 Implement Step 2 - Strategy selection
  - Radio/buttons for schema-based vs prompt-based
  - Branch logic for next step
- [ ] 2.4 Implement Step 3a - Schema builder
  - Embed or reuse `SchemaVisualBuilder` component
  - Allow creating new schema
  - Allow selecting existing schema
  - Preview schema structure
- [ ] 2.5 Implement Step 3b - Prompt optimization
  - Text area for user to describe requirements
  - Call to prompt optimization endpoint
  - Display generated prompt in editor
  - Allow manual editing
  - Regenerate button
- [ ] 2.6 Implement Step 4 - Model selection
  - Display available OCR models
  - Display available LLM models
  - Selection interface
  - Show test status if available
- [ ] 2.7 Implement Step 5 - Review and create
  - Display summary of all selections
  - Back navigation to previous steps
  - Create project API call
  - Redirect to project detail on success
- [ ] 2.8 Update sidebar navigation
  - Remove Schemas, Prompts, Validation Scripts links
  - Keep Projects, Models, Settings
  - Update `SidebarNav.tsx`
- [ ] 2.9 Handle existing pages
  - Remove or make admin-only: SchemasPage, PromptsPage, ValidationScriptsPage
  - Update router configuration
- [ ] 2.10 Add project detail enhancements
  - Add validation scripts section to project detail page
  - Allow inline management of validation rules

## 3. Testing

- [ ] 3.1 Write unit tests for ProjectWizard component
- [ ] 3.2 Write unit tests for each wizard step
- [ ] 3.3 Write integration tests for prompt optimization
- [ ] 3.4 Write E2E tests for complete project creation flow
- [ ] 3.5 Test navigation and state persistence across wizard steps

## 4. Documentation

- [ ] 4.1 Update `docs/WEB_APP.md` with wizard flow
- [ ] 4.2 Add project creation guide
- [ ] 4.3 Update API documentation for prompt optimization endpoint
