# Tasks: Replace Providers with Generic Adapter-Based Model System

## Task Overview

This document outlines the implementation tasks for replacing the rigid provider-based architecture with a flexible, adapter-based model system.

---

## Phase 1: Database & Backend Entities

### 1.1 Create ModelEntity
- [x] Create `src/apps/api/src/entities/model.entity.ts`
- [x] Define id (UUID), name, adapterType, parameters (JSONB), description, isActive
- [x] Add TypeORM decorators and indexes
- [x] Write entity unit tests

### 1.2 Create Database Migration
- [x] Create migration file for `models` table
- [x] Add `models` table with UUID primary key, JSONB parameters column
- [x] Add indexes for adapterType and isActive
- [x] Update `projects` table: drop `default_provider_id`, add `ocr_model_id` and `llm_model_id`
- [x] Add foreign key constraints from projects to models
- [x] Drop old `providers` and `llm_providers` tables
- [x] Drop old enum types
- [x] Test migration up/down

---

## Phase 2: Adapter System

### 2.1 Create Adapter Interfaces
- [x] Create `src/apps/api/src/models/adapters/adapter.interface.ts`
- [x] Define `AdapterSchema` interface
- [x] Define `ParameterDefinition` interface
- [x] Define `AdapterCapabilities` type

### 2.2 Create Adapter Schemas
- [x] Create `src/apps/api/src/models/adapters/paddlex.adapter.ts`
  - [x] Define schema with baseUrl, apiKey, timeout, maxRetries
  - [x] Set category to 'ocr'
  - [x] Add capability ['ocr']
- [x] Create `src/apps/api/src/models/adapters/openai.adapter.ts`
  - [x] Define schema with baseUrl, apiKey, modelName, temperature, maxTokens, supportsVision, supportsStructuredOutput
  - [x] Set category to 'llm'
  - [x] Add capabilities ['llm', 'vision']

### 2.3 Create Adapter Registry
- [x] Create `src/apps/api/src/models/adapters/adapter-registry.ts`
- [x] Implement `getSchema(adapterType)` method
- [x] Implement `validateParameters(adapterType, parameters)` method
- [x] Implement `listAdapters()` method
- [x] Implement `getAdaptersByCategory(category)` method
- [x] Register PaddleX and OpenAI adapters
- [x] Write unit tests for registry

---

## Phase 3: Backend Services

### 3.1 Create Models Module Structure
- [x] Create `src/apps/api/src/models/` directory
- [x] Create `models.module.ts`
- [x] Create `dto/` subdirectory

### 3.2 Create DTOs
- [x] Create `dto/create-model.dto.ts`
  - [x] Add name, adapterType, parameters, description fields
  - [x] Add custom validator for adapter type enum
  - [x] Add custom validator for parameters against schema
- [x] Create `dto/update-model.dto.ts`
  - [x] Make all fields optional
  - [x] Reuse validation from create DTO
- [x] Create `dto/model-response.dto.ts`
  - [x] Define response shape with masked secrets
- [x] Create `dto/test-model.dto.ts`
  - [x] Define test request/response types
- [x] Write DTO validation tests

### 3.3 Create Models Service
- [x] Create `src/apps/api/src/models/models.service.ts`
  - [x] Implement `create()` with schema validation
  - [x] Implement `findAll()` with filtering by category/adapterType
  - [x] Implement `findOne()` by UUID
  - [x] Implement `update()` with schema validation
  - [x] Implement `remove()` with cascade handling
  - [x] Implement `testConnection()` for model validation
- [x] Write service unit tests with mocked adapter registry

### 3.4 Create Models Controller
- [x] Create `src/apps/api/src/models/models.controller.ts`
  - [x] GET `/models` - List all models
  - [x] POST `/models` - Create model
  - [x] GET `/models/:id` - Get model details
  - [x] PATCH `/models/:id` - Update model
  - [x] DELETE `/models/:id` - Delete model
  - [x] GET `/models/adapters` - List adapter schemas
  - [x] POST `/models/:id/test` - Test connection
- [x] Add Swagger/OpenAPI decorators
- [x] Write controller e2e tests

### 3.5 Update Projects Module
- [x] Update `src/apps/api/src/entities/project.entity.ts`
  - [x] Remove `defaultProviderId` field
  - [x] Add `ocrModelId` field (UUID, nullable)
  - [x] Add `llmModelId` field (UUID, nullable)
  - [x] Add relations to ModelEntity
- [x] Update `src/apps/api/src/projects/dto/create-project.dto.ts`
  - [x] Remove `defaultProviderId`
  - [x] Add `ocrModelId`
  - [x] Add `llmModelId`
- [x] Update `src/apps/api/src/projects/dto/update-project.dto.ts`
  - [x] Remove `defaultProviderId`
  - [x] Add `ocrModelId`
  - [x] Add `llmModelId`
- [x] Update `src/apps/api/src/projects/dto/project-response.dto.ts`
  - [x] Remove `defaultProviderId`
  - [x] Add `ocrModelId`
  - [x] Add `llmModelId`
- [x] Update `src/apps/api/src/projects/projects.service.ts`
  - [x] Update `ensureDefaultsExist()` to validate model IDs
  - [x] Update `ensureProviderExists()` → `ensureModelExists()`
  - [x] Add validation for model capability (ocr/llm)
- [x] Write project model validation tests

### 3.6 Update Extraction Service
- [x] Update `src/apps/api/src/extraction/extraction.service.ts`
  - [x] Replace provider loading with model loading
  - [x] Update `getProviderFromId()` → `getOcrModelFromId()`
  - [x] Update `getLlmProviderFromId()` → `getLlmModelFromId()`
  - [x] Add fallback to config.yaml when no model configured
  - [x] Update LLM service calls to use model parameters
- [x] Update `src/apps/api/src/extraction/extraction.module.ts`
  - [x] Import `ModelsModule`
  - [x] Inject `ModelsService`
- [x] Update extraction tests to use models instead of providers

### 3.7 Remove Old Providers Module
- [x] Delete `src/apps/api/src/providers/` directory
- [x] Update `src/apps/api/src/app.module.ts`
  - [x] Remove `ProvidersModule` import
  - [x] Add `ModelsModule` import
- [x] Update `src/apps/api/src/entities/index.ts`
  - [x] Remove `ProviderEntity` and `LlmProviderEntity` exports
  - [x] Add `ModelEntity` export

---

## Phase 4: Frontend API Client

### 4.1 Create Models API Client
- [x] Create `src/apps/web/src/api/models.ts`
  - [x] Define `Model`, `CreateModelDto`, `UpdateModelDto`, `AdapterSchema` types
  - [x] Implement `modelsApi.listModels()`
  - [x] Implement `modelsApi.getAdapters()`
  - [x] Implement `modelsApi.createModel()`
  - [x] Implement `modelsApi.updateModel()`
  - [x] Implement `modelsApi.deleteModel()`
  - [x] Implement `modelsApi.testConnection()`
- [x] Write API client tests with MSW mocks

### 4.2 Update Projects API Client
- [x] Update `src/apps/web/src/api/projects.ts`
  - [x] Remove `defaultProviderId` from `Project` interface
  - [x] Add `ocrModelId` to `Project` interface
  - [x] Add `llmModelId` to `Project` interface
  - [x] Update `CreateProjectDto` and `UpdateProjectDto`

---

## Phase 5: Frontend UI Components

### 5.1 Create Dynamic ModelForm Component
- [x] Create `src/apps/web/src/shared/components/ModelForm.tsx`
  - [x] Accept adapter schema as prop
  - [x] Render input fields based on parameter type
  - [x] Handle string parameters (text input)
  - [x] Handle number parameters (number input with min/max)
  - [x] Handle boolean parameters (checkbox)
  - [x] Handle secret parameters (password field with show/hide)
  - [x] Display parameter labels and help text
  - [x] Validate required fields
  - [x] Support create and update modes
- [x] Write ModelForm component tests

### 5.2 Create ModelCard Component
- [x] Create `src/apps/web/src/shared/components/ModelCard.tsx`
  - [x] Display model name and adapter type
  - [x] Show model category badge (OCR/LLM)
  - [x] Show active/inactive status
  - [x] Show parameter summary (with masked secrets)
  - [x] Add edit button
  - [x] Add delete button
  - [x] Add test connection button
- [x] Write ModelCard component tests

### 5.3 Create Models Page
- [x] Create `src/apps/web/src/routes/dashboard/ModelsPage.tsx`
  - [x] Implement tabbed interface (OCR Models | LLM Models)
  - [x] Fetch models on mount
  - [x] Display models in grid/list
  - [x] Add "New Model" button
  - [x] Add model creation modal/form
  - [x] Handle model editing
  - [x] Handle model deletion with confirmation
  - [x] Handle test connection
  - [x] Show loading and error states
- [x] Write ModelsPage component tests

### 5.4 Update ProjectForm Component
- [x] Update `src/apps/web/src/shared/components/ProjectForm.tsx`
  - [x] Fetch available models (filtered by category)
  - [x] Add OCR model dropdown selector
  - [x] Add LLM model dropdown selector
  - [x] Show current model selections
  - [x] Handle model selection changes
  - [x] Validate model references on submit
- [x] Update ProjectForm tests

### 5.5 Update ProjectCard Component
- [x] Update `src/apps/web/src/shared/components/ProjectCard.tsx`
  - [x] Display configured OCR model (if any)
  - [x] Display configured LLM model (if any)
  - [x] Show warning if no models configured

### 5.6 Update Navigation
- [x] Add "Models" link to dashboard navigation
- [x] Update routing if needed

---

## Phase 6: Integration & Testing

### 6.1 Backend Integration Tests
- [x] Test full model CRUD flow
- [x] Test model validation against schemas
- [x] Test model connection testing
- [x] Test project-model relationships
- [x] Test extraction with models
- [x] Test fallback to config.yaml

### 6.2 Frontend E2E Tests
- [x] Test creating a model via UI
- [x] Test editing a model via UI
- [x] Test deleting a model via UI
- [x] Test testing model connection
- [x] Test configuring project models
- [x] Test extraction with configured models

### 6.3 Migration Testing
- [x] Test migration up on fresh database
- [x] Test migration down and restore
- [x] Test migration with existing data (if preserving data)
- [x] Verify foreign key constraints work

### 6.4 Documentation Updates
- [x] Update `CLAUDE.md` with new architecture
- [x] Update `docs/` if applicable
- [x] Update API documentation

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
