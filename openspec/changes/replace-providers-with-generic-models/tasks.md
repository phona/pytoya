# Tasks: Replace Providers with Generic Adapter-Based Model System

## Task Overview

This document outlines the implementation tasks for replacing the rigid provider-based architecture with a flexible, adapter-based model system.

---

## Phase 1: Database & Backend Entities

### 1.1 Create ModelEntity
- [ ] Create `src/apps/api/src/entities/model.entity.ts`
- [ ] Define id (UUID), name, adapterType, parameters (JSONB), description, isActive
- [ ] Add TypeORM decorators and indexes
- [ ] Write entity unit tests

### 1.2 Create Database Migration
- [ ] Create migration file for `models` table
- [ ] Add `models` table with UUID primary key, JSONB parameters column
- [ ] Add indexes for adapterType and isActive
- [ ] Update `projects` table: drop `default_provider_id`, add `ocr_model_id` and `llm_model_id`
- [ ] Add foreign key constraints from projects to models
- [ ] Drop old `providers` and `llm_providers` tables
- [ ] Drop old enum types
- [ ] Test migration up/down

---

## Phase 2: Adapter System

### 2.1 Create Adapter Interfaces
- [ ] Create `src/apps/api/src/models/adapters/adapter.interface.ts`
- [ ] Define `AdapterSchema` interface
- [ ] Define `ParameterDefinition` interface
- [ ] Define `AdapterCapabilities` type

### 2.2 Create Adapter Schemas
- [ ] Create `src/apps/api/src/models/adapters/paddlex.adapter.ts`
  - [ ] Define schema with baseUrl, apiKey, timeout, maxRetries
  - [ ] Set category to 'ocr'
  - [ ] Add capability ['ocr']
- [ ] Create `src/apps/api/src/models/adapters/openai.adapter.ts`
  - [ ] Define schema with baseUrl, apiKey, modelName, temperature, maxTokens, supportsVision, supportsStructuredOutput
  - [ ] Set category to 'llm'
  - [ ] Add capabilities ['llm', 'vision']

### 2.3 Create Adapter Registry
- [ ] Create `src/apps/api/src/models/adapters/adapter-registry.ts`
- [ ] Implement `getSchema(adapterType)` method
- [ ] Implement `validateParameters(adapterType, parameters)` method
- [ ] Implement `listAdapters()` method
- [ ] Implement `getAdaptersByCategory(category)` method
- [ ] Register PaddleX and OpenAI adapters
- [ ] Write unit tests for registry

---

## Phase 3: Backend Services

### 3.1 Create Models Module Structure
- [ ] Create `src/apps/api/src/models/` directory
- [ ] Create `models.module.ts`
- [ ] Create `dto/` subdirectory

### 3.2 Create DTOs
- [ ] Create `dto/create-model.dto.ts`
  - [ ] Add name, adapterType, parameters, description fields
  - [ ] Add custom validator for adapter type enum
  - [ ] Add custom validator for parameters against schema
- [ ] Create `dto/update-model.dto.ts`
  - [ ] Make all fields optional
  - [ ] Reuse validation from create DTO
- [ ] Create `dto/model-response.dto.ts`
  - [ ] Define response shape with masked secrets
- [ ] Create `dto/test-model.dto.ts`
  - [ ] Define test request/response types
- [ ] Write DTO validation tests

### 3.3 Create Models Service
- [ ] Create `src/apps/api/src/models/models.service.ts`
  - [ ] Implement `create()` with schema validation
  - [ ] Implement `findAll()` with filtering by category/adapterType
  - [ ] Implement `findOne()` by UUID
  - [ ] Implement `update()` with schema validation
  - [ ] Implement `remove()` with cascade handling
  - [ ] Implement `testConnection()` for model validation
- [ ] Write service unit tests with mocked adapter registry

### 3.4 Create Models Controller
- [ ] Create `src/apps/api/src/models/models.controller.ts`
  - [ ] GET `/models` - List all models
  - [ ] POST `/models` - Create model
  - [ ] GET `/models/:id` - Get model details
  - [ ] PATCH `/models/:id` - Update model
  - [ ] DELETE `/models/:id` - Delete model
  - [ ] GET `/models/adapters` - List adapter schemas
  - [ ] POST `/models/:id/test` - Test connection
- [ ] Add Swagger/OpenAPI decorators
- [ ] Write controller e2e tests

### 3.5 Update Projects Module
- [ ] Update `src/apps/api/src/entities/project.entity.ts`
  - [ ] Remove `defaultProviderId` field
  - [ ] Add `ocrModelId` field (UUID, nullable)
  - [ ] Add `llmModelId` field (UUID, nullable)
  - [ ] Add relations to ModelEntity
- [ ] Update `src/apps/api/src/projects/dto/create-project.dto.ts`
  - [ ] Remove `defaultProviderId`
  - [ ] Add `ocrModelId`
  - [ ] Add `llmModelId`
- [ ] Update `src/apps/api/src/projects/dto/update-project.dto.ts`
  - [ ] Remove `defaultProviderId`
  - [ ] Add `ocrModelId`
  - [ ] Add `llmModelId`
- [ ] Update `src/apps/api/src/projects/dto/project-response.dto.ts`
  - [ ] Remove `defaultProviderId`
  - [ ] Add `ocrModelId`
  - [ ] Add `llmModelId`
- [ ] Update `src/apps/api/src/projects/projects.service.ts`
  - [ ] Update `ensureDefaultsExist()` to validate model IDs
  - [ ] Update `ensureProviderExists()` → `ensureModelExists()`
  - [ ] Add validation for model capability (ocr/llm)
- [ ] Write project model validation tests

### 3.6 Update Extraction Service
- [ ] Update `src/apps/api/src/extraction/extraction.service.ts`
  - [ ] Replace provider loading with model loading
  - [ ] Update `getProviderFromId()` → `getOcrModelFromId()`
  - [ ] Update `getLlmProviderFromId()` → `getLlmModelFromId()`
  - [ ] Add fallback to config.yaml when no model configured
  - [ ] Update LLM service calls to use model parameters
- [ ] Update `src/apps/api/src/extraction/extraction.module.ts`
  - [ ] Import `ModelsModule`
  - [ ] Inject `ModelsService`
- [ ] Update extraction tests to use models instead of providers

### 3.7 Remove Old Providers Module
- [ ] Delete `src/apps/api/src/providers/` directory
- [ ] Update `src/apps/api/src/app.module.ts`
  - [ ] Remove `ProvidersModule` import
  - [ ] Add `ModelsModule` import
- [ ] Update `src/apps/api/src/entities/index.ts`
  - [ ] Remove `ProviderEntity` and `LlmProviderEntity` exports
  - [ ] Add `ModelEntity` export

---

## Phase 4: Frontend API Client

### 4.1 Create Models API Client
- [ ] Create `src/apps/web/src/api/models.ts`
  - [ ] Define `Model`, `CreateModelDto`, `UpdateModelDto`, `AdapterSchema` types
  - [ ] Implement `modelsApi.listModels()`
  - [ ] Implement `modelsApi.getAdapters()`
  - [ ] Implement `modelsApi.createModel()`
  - [ ] Implement `modelsApi.updateModel()`
  - [ ] Implement `modelsApi.deleteModel()`
  - [ ] Implement `modelsApi.testConnection()`
- [ ] Write API client tests with MSW mocks

### 4.2 Update Projects API Client
- [ ] Update `src/apps/web/src/api/projects.ts`
  - [ ] Remove `defaultProviderId` from `Project` interface
  - [ ] Add `ocrModelId` to `Project` interface
  - [ ] Add `llmModelId` to `Project` interface
  - [ ] Update `CreateProjectDto` and `UpdateProjectDto`

---

## Phase 5: Frontend UI Components

### 5.1 Create Dynamic ModelForm Component
- [ ] Create `src/apps/web/src/shared/components/ModelForm.tsx`
  - [ ] Accept adapter schema as prop
  - [ ] Render input fields based on parameter type
  - [ ] Handle string parameters (text input)
  - [ ] Handle number parameters (number input with min/max)
  - [ ] Handle boolean parameters (checkbox)
  - [ ] Handle secret parameters (password field with show/hide)
  - [ ] Display parameter labels and help text
  - [ ] Validate required fields
  - [ ] Support create and update modes
- [ ] Write ModelForm component tests

### 5.2 Create ModelCard Component
- [ ] Create `src/apps/web/src/shared/components/ModelCard.tsx`
  - [ ] Display model name and adapter type
  - [ ] Show model category badge (OCR/LLM)
  - [ ] Show active/inactive status
  - [ ] Show parameter summary (with masked secrets)
  - [ ] Add edit button
  - [ ] Add delete button
  - [ ] Add test connection button
- [ ] Write ModelCard component tests

### 5.3 Create Models Page
- [ ] Create `src/apps/web/src/routes/dashboard/ModelsPage.tsx`
  - [ ] Implement tabbed interface (OCR Models | LLM Models)
  - [ ] Fetch models on mount
  - [ ] Display models in grid/list
  - [ ] Add "New Model" button
  - [ ] Add model creation modal/form
  - [ ] Handle model editing
  - [ ] Handle model deletion with confirmation
  - [ ] Handle test connection
  - [ ] Show loading and error states
- [ ] Write ModelsPage component tests

### 5.4 Update ProjectForm Component
- [ ] Update `src/apps/web/src/shared/components/ProjectForm.tsx`
  - [ ] Fetch available models (filtered by category)
  - [ ] Add OCR model dropdown selector
  - [ ] Add LLM model dropdown selector
  - [ ] Show current model selections
  - [ ] Handle model selection changes
  - [ ] Validate model references on submit
- [ ] Update ProjectForm tests

### 5.5 Update ProjectCard Component
- [ ] Update `src/apps/web/src/shared/components/ProjectCard.tsx`
  - [ ] Display configured OCR model (if any)
  - [ ] Display configured LLM model (if any)
  - [ ] Show warning if no models configured

### 5.6 Update Navigation
- [ ] Add "Models" link to dashboard navigation
- [ ] Update routing if needed

---

## Phase 6: Integration & Testing

### 6.1 Backend Integration Tests
- [ ] Test full model CRUD flow
- [ ] Test model validation against schemas
- [ ] Test model connection testing
- [ ] Test project-model relationships
- [ ] Test extraction with models
- [ ] Test fallback to config.yaml

### 6.2 Frontend E2E Tests
- [ ] Test creating a model via UI
- [ ] Test editing a model via UI
- [ ] Test deleting a model via UI
- [ ] Test testing model connection
- [ ] Test configuring project models
- [ ] Test extraction with configured models

### 6.3 Migration Testing
- [ ] Test migration up on fresh database
- [ ] Test migration down and restore
- [ ] Test migration with existing data (if preserving data)
- [ ] Verify foreign key constraints work

### 6.4 Documentation Updates
- [ ] Update `CLAUDE.md` with new architecture
- [ ] Update `docs/` if applicable
- [ ] Update API documentation

---

## Task Dependencies

```
Phase 1 (Database & Entities)
  └─ Phase 2 (Adapter System)
      └─ Phase 3 (Backend Services)
          ├─ Phase 4 (Frontend API)
          │   └─ Phase 5 (Frontend UI)
          └─ Phase 6 (Testing)
```

**Parallelizable work:**
- Adapter schemas (2.2) can be developed in parallel with ModelEntity (1.1)
- Frontend components (Phase 5) can be developed alongside backend services (Phase 3) using mocked API responses
- Documentation updates (6.4) can happen at any time

## Validation Criteria

Each task is considered complete when:
1. Code is written and follows project conventions
2. Tests are written and passing
3. Code is reviewed and approved
4. Documentation is updated if needed

## Notes

- **Security**: Consider encrypting API keys in the database (future enhancement)
- **Performance**: Add caching for adapter schemas if needed
- **Extensibility**: Document how to add new adapter types for future developers
- **Migration**: If existing provider configurations need to be preserved, add a data migration task before Phase 1.2
