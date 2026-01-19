# Change: AI-Assisted Schema-Based Extraction System

## Why

The current project creation wizard requires users to manually build JSON Schemas and configure extraction prompts, which is time-consuming and error-prone. Users need domain expertise in both JSON Schema syntax and prompt engineering to effectively set up extraction projects.

This change introduces AI-assisted schema and validation rule generation, simplifying the wizard by:
1. Removing extraction strategy selection (hardcodes to schema-based only)
2. Removing template support (templates will be AI-generated instead)
3. Moving model selection earlier in the flow (enables AI assistance for schema and rules)
4. Adding LLM-powered schema generation from natural language descriptions
5. Adding LLM-powered validation rule generation with domain-specific patterns
6. Adding dedicated rules step with visual rule editor

## What Changes

- **ADDED**: Schema rules entity with validation and restriction rule types
- **ADDED**: Schema generation service using LLM to create JSON Schema from descriptions
- **ADDED**: Rule generation service using LLM to create validation rules from descriptions
- **ADDED**: Prompt builder service to construct extraction prompts with schema and rules context
- **MODIFIED**: Schema entity to include rules relationship, system prompt template, and validation settings
- **MODIFIED**: Project entity to make llmModelId required (non-nullable), ocrModelId remains optional
- **MODIFIED**: Extraction service to remove config default fallbacks, require project llm model
- **MODIFIED**: Project wizard flow (5 steps: Basics → Models → Schema → Rules → Review)
- **REMOVED**: Extraction strategy selection (hardcoded to schema-based)
- **REMOVED**: Schema template support (templates concept removed)
- **REMOVED**: Schema reuse feature (schemas are project-scoped only, cannot select existing schemas)
- **REMOVED**: Rule reuse feature (rules are project-scoped only, cannot import from other schemas)
- **REMOVED**: Database field `schemas.is_template` (template library)
- **REMOVED**: Database field `projects.default_prompt_id` (prompt-based extraction)
- **REMOVED**: API endpoint `GET /schemas/templates` (template listing)
- **REMOVED**: Service method `SchemasService.findTemplates()` (template queries)
- **REMOVED**: Config default model fallbacks (projects must always have models configured)

## Impact

- **Affected specs**: json-schema-extraction, projects, web-app
- **Affected code**:
  - Backend: `src/apps/api/src/entities/schema.entity.ts` (add columns, remove isTemplate)
  - Backend: `src/apps/api/src/entities/schema-rule.entity.ts` (new)
  - Backend: `src/apps/api/src/entities/project.entity.ts` (make llmModelId required, remove defaultPromptId)
  - Backend: `src/apps/api/src/schemas/*` (new services and controllers, remove templates)
  - Backend: `src/apps/api/src/prompts/prompt-builder.service.ts` (new)
  - Backend: `src/apps/api/src/extraction/extraction.service.ts` (remove config fallbacks, require llm, ocr optional)
  - Backend: `src/apps/api/src/schemas/dto/create-schema.dto.ts` (remove isTemplate)
  - Backend: `src/apps/api/src/schemas/dto/schema-response.dto.ts` (remove isTemplate)
  - Backend: `src/apps/api/src/schemas/dto/update-schema.dto.ts` (remove isTemplate)
  - Backend: `src/apps/api/src/schemas/schemas.controller.ts` (remove /templates endpoint)
  - Backend: `src/apps/api/src/schemas/schemas.service.ts` (remove findTemplates method)
  - Backend: `src/apps/api/src/projects/dto/create-project.dto.ts` (make llmModelId required, remove defaultPromptId)
  - Backend: `src/apps/api/src/projects/dto/update-project.dto.ts` (make llmModelId required, remove defaultPromptId)
  - Backend: `src/apps/api/src/projects/dto/project-response.dto.ts` (remove defaultPromptId)
  - Backend: `src/apps/api/src/projects/projects.service.ts` (validate llm model is present)
  - Frontend: `src/apps/web/src/shared/components/ProjectWizard.tsx` (refactor, require llm selection, optional ocr)
  - Frontend: `src/apps/web/src/shared/components/RuleEditor.tsx` (new)
  - Frontend: `src/apps/web/src/shared/components/ExistingSchemaSelector.tsx` (remove)
  - Frontend: `src/apps/web/src/shared/components/RuleImportSelector.tsx` (remove, if exists)
  - Frontend: `src/apps/web/src/api/schemas.ts` (remove templates API method, add new methods)
  - Frontend: `src/apps/web/src/shared/schemas/schema.schema.ts` (remove isTemplate)
  - Frontend: `src/apps/web/src/shared/schemas/project.schema.ts` (make llmModelId required)
  - Shared: `src/shared/types/schemas.ts` (add types, remove isTemplate)

- **Database migration**:
  - Add `schema_rules` table
  - Add columns to `schemas` table (system_prompt_template, validation_settings)
  - Remove column `schemas.is_template`
  - Make `projects.llm_model_id` NOT NULL (required)
  - Remove column `projects.default_prompt_id`

- **Breaking changes**:
  - `GET /schemas/templates` endpoint removed
  - `schemas.is_template` field removed (all schemas treated as non-templates)
  - `projects.default_prompt_id` field removed (schema-based extraction only)
  - `projects.llm_model_id` now required (NOT NULL, must be set on project creation)
  - `projects.ocr_model_id` remains optional (NULL = vision-only extraction)
  - Config default model fallbacks removed (projects must have explicit LLM)
