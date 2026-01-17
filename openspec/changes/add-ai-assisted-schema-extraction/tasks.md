# Implementation Tasks

## 1. Database Layer

- [ ] 1.1 Create SchemaRuleEntity in `src/apps/api/src/entities/schema-rule.entity.ts`
- [ ] 1.2 Extend SchemaEntity with new columns (rules relationship, systemPromptTemplate, validationSettings)
- [ ] 1.3 Remove `isTemplate` field from SchemaEntity
- [ ] 1.4 Make `llmModelId` required (non-nullable) in ProjectEntity
- [ ] 1.5 Remove `defaultPromptId` field from ProjectEntity
- [ ] 1.6 Generate TypeORM migration (add schema_rules table, add schema columns, remove is_template, make llm_model_id NOT NULL, remove default_prompt_id)
- [ ] 1.7 Run migration and verify database schema

## 2. Backend Cleanup - Remove Deprecated Code

- [ ] 2.1 Remove `isTemplate` from CreateSchemaDto
- [ ] 2.2 Remove `isTemplate` from UpdateSchemaDto
- [ ] 2.3 Remove `isTemplate` from SchemaResponseDto
- [ ] 2.4 Remove `findTemplates()` method from SchemasService
- [ ] 2.5 Remove `GET /schemas/templates` endpoint from SchemasController
- [ ] 2.6 Remove `defaultPromptId` from CreateProjectDto
- [ ] 2.7 Remove `defaultPromptId` from UpdateProjectDto
- [ ] 2.8 Remove `defaultPromptId` from ProjectResponseDto
- [ ] 2.9 Make `llmModelId` required in CreateProjectDto
- [ ] 2.10 Make `llmModelId` required in UpdateProjectDto
- [ ] 2.11 Update tests to remove references to removed fields

## 3. Backend Services - Remove Config Fallbacks

- [ ] 3.1 Remove config default model fallback from ExtractionService
- [ ] 3.2 Add validation that project has llmModelId before extraction
- [ ] 3.3 Throw error if project llm model is not configured (no fallback to config)
- [ ] 3.4 Handle optional ocrModelId (NULL = vision-only extraction)
- [ ] 3.5 Update tests to verify error thrown when llm model missing

## 4. Backend Services - Schema Rules

- [ ] 4.1 Create CreateSchemaRuleDto in `src/apps/api/src/schemas/dto/create-schema-rule.dto.ts`
- [ ] 4.2 Create UpdateSchemaRuleDto in `src/apps/api/src/schemas/dto/update-schema-rule.dto.ts`
- [ ] 4.3 Create SchemaRulesService in `src/apps/api/src/schemas/schema-rules.service.ts`
- [ ] 4.4 Create SchemaRulesController in `src/apps/api/src/schemas/schema-rules.controller.ts`
- [ ] 4.5 Update SchemasModule to import SchemaRulesService and export SchemaRulesController

## 5. Backend Services - AI Generation

- [ ] 5.1 Create SchemaGeneratorService in `src/apps/api/src/schemas/schema-generator.service.ts`
- [ ] 5.2 Create RuleGeneratorService in `src/apps/api/src/schemas/rule-generator.service.ts`
- [ ] 5.3 Create GenerateSchemaDto in `src/apps/api/src/schemas/dto/generate-schema.dto.ts`
- [ ] 5.4 Create GenerateRulesDto in `src/apps/api/src/schemas/dto/generate-rules.dto.ts`
- [ ] 5.5 Update SchemasController with `/generate` and `/:id/generate-rules` endpoints

## 6. Backend Services - Prompt Builder

- [ ] 6.1 Create PromptBuilderService in `src/apps/api/src/prompts/prompt-builder.service.ts`
- [ ] 6.2 Create PromptsModule in `src/apps/api/src/prompts/prompts.module.ts`
- [ ] 6.3 Register PromptsModule as global module in AppModule

## 7. Backend Services - Schema Import

- [ ] 7.1 Create ValidateSchemaDto in `src/apps/api/src/schemas/dto/validate-schema.dto.ts`
- [ ] 7.2 Add `POST /schemas/validate` endpoint to SchemasController
- [ ] 7.3 Implement schema validation logic using ajv
- [ ] 7.4 Return detailed validation errors for line and position
- [ ] 7.5 Create ImportSchemaDto in `src/apps/api/src/schemas/dto/import-schema.dto.ts`
- [ ] 7.6 Add `POST /schemas/import` endpoint to SchemasController
- [ ] 7.7 Implement file parsing and JSON Schema extraction
- [ ] 7.8 Validate imported schema before saving to database

## 8. Backend Integration

- [ ] 8.1 Update ExtractionService to use PromptBuilderService for constructing prompts
- [ ] 8.2 Update ExtractionService to load and apply schema rules during extraction

## 9. Frontend Types and API

- [ ] 8.1 Add SchemaRule and DTO types to `src/shared/types/schemas.ts`, remove isTemplate
- [ ] 8.2 Update `src/apps/web/src/api/schemas.ts` (remove templates, add new methods)
- [ ] 8.3 Remove `isTemplate` from `src/apps/web/src/shared/schemas/schema.schema.ts`
- [ ] 8.4 Make `llmModelId` required in `src/apps/web/src/shared/schemas/project.schema.ts`
- [ ] 8.5 Add `ImportSchemaDto` type with file field
- [ ] 8.6 Add React Query hooks for schema rules (optional, if using React Query)

## 9. Frontend Components - Rule Editor


- [ ] 9.1 Create RuleEditor component in `src/apps/web/src/shared/components/RuleEditor.tsx`
- [ ] 9.2 Create PatternConfigEditor component (for regex pattern rules)
- [ ] 9.3 Create EnumConfigEditor component (for enum value rules)
- [ ] 9.4 Create OcrCorrectionConfigEditor component (for OCR correction rules)
- [ ] 9.5 Add unit tests for RuleEditor

## 10. Frontend Components - Schema Creation (JSON Editor)

- [ ] 10.1 Create SchemaJsonEditor component (code editor with syntax highlighting)
- [ ] 10.2 Create GenerateSchemaModal component (LLM generation dialog)
- [ ] 10.3 Create ImportSchemaModal component (file upload with drag-and-drop)
- [ ] 10.4 Add toolbar actions: Format, Copy, Validate
- [ ] 10.5 Add schema validation endpoint to backend schemas controller
- [ ] 10.6 Create SchemaImportDto with file field and content parsing
- [ ] 10.7 Validate imported JSON schemas with ajv before saving
- [ ] 10.8 Support x-extraction-hint custom field in JSON Schema
- [ ] 10.9 Add unit tests for schema editor, generation, and import

## 11. Frontend Components - Project Wizard Refactor

- [ ] 11.1 Update ProjectWizard step labels (Basics → Models → Schema → Rules → Review)
- [ ] 11.2 Remove extraction strategy selection (hardcode to schema-based)
- [ ] 11.3 Remove existing schema selector component (if exists)
- [ ] 11.4 Remove rule import selector component (if exists)
- [ ] 11.5 Remove "Select existing schema" option from wizard
- [ ] 11.6 Remove "Import rules from schema" option from wizard
- [ ] 11.7 Move model selection to Step 2 (LLM required, OCR optional)
- [ ] 11.8 Update Step 3 (Schema) with JSON Editor, Generate by LLM, and Import File buttons
- [ ] 11.9 Add Step 4 (Rules) with AI generation UI and rule list (no import option)
- [ ] 11.10 Update wizard state management for new flow
- [ ] 11.11 Add unit tests for updated wizard

## 12. Testing

- [ ] 12.1 Create unit tests for SchemaRulesService
- [ ] 12.2 Create unit tests for SchemaGeneratorService
- [ ] 12.3 Create unit tests for RuleGeneratorService
- [ ] 12.4 Create unit tests for PromptBuilderService
- [ ] 12.5 Create integration tests for schema rules CRUD endpoints
- [ ] 12.6 Create integration tests for schema generation endpoint
- [ ] 12.7 Create integration tests for rule generation endpoint
- [ ] 12.8 Update ProjectWizard tests for new flow
- [ ] 12.9 Update tests to remove references to isTemplate and defaultPromptId
- [ ] 12.10 Add tests for validation error when project models are missing
- [ ] 12.11 Add tests for x-extraction-hint field support

## 13. Documentation and Verification

- [ ] 13.1 Update API documentation (if applicable)
- [ ] 13.2 Verify database migration runs successfully
- [ ] 13.3 Verify all CRUD operations work for schema rules
- [ ] 13.4 Verify AI schema generation produces valid JSON Schema
- [ ] 13.5 Verify AI rule generation produces valid rules
- [ ] 13.6 Verify wizard flow works end-to-end
- [ ] 13.7 Verify extraction uses rules in prompts
- [ ] 13.8 Verify extraction uses x-extraction-hint fields in prompts
- [ ] 13.9 Verify /schemas/templates endpoint returns 404
- [ ] 13.10 Verify schemas are project-scoped (no cross-project reuse)
- [ ] 13.11 Verify rules are schema-scoped (no cross-schema import)
- [ ] 13.12 Verify wizard has no "select existing schema" option
- [ ] 13.13 Verify wizard has no "import rules" option
- [ ] 13.14 Verify project creation requires llmModelId (OCR optional)
- [ ] 13.15 Verify extraction fails when project models are not set
- [ ] 13.16 Verify JSON Schema validation with ajv works correctly
- [ ] 13.17 Verify Format/Copy/Validate toolbar actions work
