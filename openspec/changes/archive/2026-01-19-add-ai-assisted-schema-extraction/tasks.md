# Implementation Tasks

## 1. Database Layer

- [x] 1.1 Create SchemaRuleEntity in `src/apps/api/src/entities/schema-rule.entity.ts`
- [x] 1.2 Extend SchemaEntity with new columns (rules relationship, systemPromptTemplate, validationSettings)
- [x] 1.3 Remove `isTemplate` field from SchemaEntity
- [x] 1.4 Make `llmModelId` required (non-nullable) in ProjectEntity
- [x] 1.5 Remove `defaultPromptId` field from ProjectEntity
- [x] 1.6 Generate TypeORM migration (add schema_rules table, add schema columns, remove is_template, make llm_model_id NOT NULL, remove default_prompt_id)
- [x] 1.7 Run migration and verify database schema

## 2. Backend Cleanup - Remove Deprecated Code

- [x] 2.1 Remove `isTemplate` from CreateSchemaDto
- [x] 2.2 Remove `isTemplate` from UpdateSchemaDto
- [x] 2.3 Remove `isTemplate` from SchemaResponseDto
- [x] 2.4 Remove `findTemplates()` method from SchemasService
- [x] 2.5 Remove `GET /schemas/templates` endpoint from SchemasController
- [x] 2.6 Remove `defaultPromptId` from CreateProjectDto
- [x] 2.7 Remove `defaultPromptId` from UpdateProjectDto
- [x] 2.8 Remove `defaultPromptId` from ProjectResponseDto
- [x] 2.9 Make `llmModelId` required in CreateProjectDto
- [x] 2.10 Make `llmModelId` required in UpdateProjectDto
- [x] 2.11 Update tests to remove references to removed fields

## 3. Backend Services - Remove Config Fallbacks

- [x] 3.1 Remove config default model fallback from ExtractionService
- [x] 3.2 Add validation that project has llmModelId before extraction
- [x] 3.3 Throw error if project llm model is not configured (no fallback to config)
- [x] 3.4 Handle optional ocrModelId (NULL = vision-only extraction)
- [x] 3.5 Update tests to verify error thrown when llm model missing

## 4. Backend Services - Schema Rules

- [x] 4.1 Create CreateSchemaRuleDto in `src/apps/api/src/schemas/dto/create-schema-rule.dto.ts`
- [x] 4.2 Create UpdateSchemaRuleDto in `src/apps/api/src/schemas/dto/update-schema-rule.dto.ts`
- [x] 4.3 Create SchemaRulesService in `src/apps/api/src/schemas/schema-rules.service.ts`
- [x] 4.4 Create SchemaRulesController in `src/apps/api/src/schemas/schema-rules.controller.ts`
- [x] 4.5 Update SchemasModule to import SchemaRulesService and export SchemaRulesController

## 5. Backend Services - AI Generation

- [x] 5.1 Create SchemaGeneratorService in `src/apps/api/src/schemas/schema-generator.service.ts`
- [x] 5.2 Create RuleGeneratorService in `src/apps/api/src/schemas/rule-generator.service.ts`
- [x] 5.3 Create GenerateSchemaDto in `src/apps/api/src/schemas/dto/generate-schema.dto.ts`
- [x] 5.4 Create GenerateRulesDto in `src/apps/api/src/schemas/dto/generate-rules.dto.ts`
- [x] 5.5 Update SchemasController with `/generate` and `/:id/generate-rules` endpoints

## 6. Backend Services - Prompt Builder

- [x] 6.1 Create PromptBuilderService in `src/apps/api/src/prompts/prompt-builder.service.ts`
- [x] 6.2 Create PromptsModule in `src/apps/api/src/prompts/prompts.module.ts`
- [x] 6.3 Register PromptsModule as global module in AppModule

## 7. Backend Services - Schema Import

- [x] 7.1 Create ValidateSchemaDto in `src/apps/api/src/schemas/dto/validate-schema.dto.ts`
- [x] 7.2 Add `POST /schemas/validate` endpoint to SchemasController
- [x] 7.3 Implement schema validation logic using ajv
- [x] 7.4 Return detailed validation errors for line and position
- [x] 7.5 Create ImportSchemaDto in `src/apps/api/src/schemas/dto/import-schema.dto.ts`
- [x] 7.6 Add `POST /schemas/import` endpoint to SchemasController
- [x] 7.7 Implement file parsing and JSON Schema extraction
- [x] 7.8 Validate imported schema before saving to database

## 8. Backend Integration

- [x] 8.1 Update ExtractionService to use PromptBuilderService for constructing prompts
- [x] 8.2 Update ExtractionService to load and apply schema rules during extraction

## 9. Frontend Types and API

- [x] 8.1 Add SchemaRule and DTO types to `src/shared/types/schemas.ts`, remove isTemplate
- [x] 8.2 Update `src/apps/web/src/api/schemas.ts` (remove templates, add new methods)
- [x] 8.3 Remove `isTemplate` from `src/apps/web/src/shared/schemas/schema.schema.ts`
- [x] 8.4 Make `llmModelId` required in `src/apps/web/src/shared/schemas/project.schema.ts`
- [x] 8.5 Add `ImportSchemaDto` type with file field
- [x] 8.6 Add React Query hooks for schema rules (optional, if using React Query)

## 9. Frontend Components - Rule Editor


- [x] 9.1 Create RuleEditor component in `src/apps/web/src/shared/components/RuleEditor.tsx`
- [x] 9.2 Create PatternConfigEditor component (for regex pattern rules)
- [x] 9.3 Create EnumConfigEditor component (for enum value rules)
- [x] 9.4 Create OcrCorrectionConfigEditor component (for OCR correction rules)
- [x] 9.5 Add unit tests for RuleEditor

## 10. Frontend Components - Schema Creation (JSON Editor)

- [x] 10.1 Create SchemaJsonEditor component (code editor with syntax highlighting)
- [x] 10.2 Create GenerateSchemaModal component (LLM generation dialog)
- [x] 10.3 Create ImportSchemaModal component (file upload with drag-and-drop)
- [x] 10.4 Add toolbar actions: Format, Copy, Validate
- [x] 10.5 Add schema validation endpoint to backend schemas controller
- [x] 10.6 Create SchemaImportDto with file field and content parsing
- [x] 10.7 Validate imported JSON schemas with ajv before saving
- [x] 10.8 Support x-extraction-hint custom field in JSON Schema
- [x] 10.9 Add unit tests for schema editor, generation, and import

## 11. Frontend Components - Project Wizard Refactor

- [x] 11.1 Update ProjectWizard step labels (Basics → Models → Schema → Rules → Review)
- [x] 11.2 Remove extraction strategy selection (hardcode to schema-based)
- [x] 11.3 Remove existing schema selector component (if exists)
- [x] 11.4 Remove rule import selector component (if exists)
- [x] 11.5 Remove "Select existing schema" option from wizard
- [x] 11.6 Remove "Import rules from schema" option from wizard
- [x] 11.7 Move model selection to Step 2 (LLM required, OCR optional)
- [x] 11.8 Update Step 3 (Schema) with JSON Editor, Generate by LLM, and Import File buttons
- [x] 11.9 Add Step 4 (Rules) with AI generation UI and rule list (no import option)
- [x] 11.10 Update wizard state management for new flow
- [x] 11.11 Add unit tests for updated wizard

## 12. Testing

- [x] 12.1 Create unit tests for SchemaRulesService
- [x] 12.2 Create unit tests for SchemaGeneratorService
- [x] 12.3 Create unit tests for RuleGeneratorService
- [x] 12.4 Create unit tests for PromptBuilderService
- [x] 12.5 Create integration tests for schema rules CRUD endpoints
- [x] 12.6 Create integration tests for schema generation endpoint
- [x] 12.7 Create integration tests for rule generation endpoint
- [x] 12.8 Update ProjectWizard tests for new flow
- [x] 12.9 Update tests to remove references to isTemplate and defaultPromptId
- [x] 12.10 Add tests for validation error when project models are missing
- [x] 12.11 Add tests for x-extraction-hint field support

## 13. Documentation and Verification

- [x] 13.1 Update API documentation (if applicable)
- [x] 13.2 Verify database migration runs successfully
- [x] 13.3 Verify all CRUD operations work for schema rules
- [x] 13.4 Verify AI schema generation produces valid JSON Schema
- [x] 13.5 Verify AI rule generation produces valid rules
- [x] 13.6 Verify wizard flow works end-to-end
- [x] 13.7 Verify extraction uses rules in prompts
- [x] 13.8 Verify extraction uses x-extraction-hint fields in prompts
- [x] 13.9 Verify /schemas/templates endpoint returns 404
- [x] 13.10 Verify schemas are project-scoped (no cross-project reuse)
- [x] 13.11 Verify rules are schema-scoped (no cross-schema import)
- [x] 13.12 Verify wizard has no "select existing schema" option
- [x] 13.13 Verify wizard has no "import rules" option
- [x] 13.14 Verify project creation requires llmModelId (OCR optional)
- [x] 13.15 Verify extraction fails when project models are not set
- [x] 13.16 Verify JSON Schema validation with ajv works correctly
- [x] 13.17 Verify Format/Copy/Validate toolbar actions work
