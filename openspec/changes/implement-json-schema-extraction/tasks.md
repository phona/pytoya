## 1. Backend Implementation

- [ ] 1.1 Create SchemaEntity (id, name, projectId, jsonSchema, requiredFields)
- [ ] 1.2 Add `ajv` dependency for JSON Schema validation
- [ ] 1.3 Create schemas module (schemas.module.ts, schemas.service.ts, schemas.controller.ts)
- [ ] 1.4 Implement schema CRUD API endpoints
- [ ] 1.5 Add schema validation endpoint (validate JSON Schema syntax)
- [ ] 1.6 Add defaultSchemaId to ProjectEntity
- [ ] 1.7 Create migration for schema tables
- [ ] 1.8 Remove js-yaml dependency
- [ ] 1.9 Remove hardcoded ExtractedData interface
- [ ] 1.10 Remove YAML schema constants

## 2. Extraction Service Refactor

- [ ] 2.1 Update ExtractionService to use JSON parsing instead of YAML
- [ ] 2.2 Implement ajv validation in executeExtraction()
- [ ] 2.3 Update buildProviderConfig to pass JSON Schema to LLM
- [ ] 2.4 Support native structured output API (OpenAI format)
- [ ] 2.5 Update prompt building to include JSON Schema instructions
- [ ] 2.6 Update validation error messages for JSON Schema paths
- [ ] 2.7 Update re-extraction prompt with JSON Schema validation feedback

## 3. Prompts Service Refactor

- [ ] 3.1 Remove YAML schema constant
- [ ] 3.2 Update buildExtractionPrompt to include JSON Schema
- [ ] 3.3 Update buildReExtractPrompt to reference JSON Schema paths
- [ ] 3.4 Remove formatResultAsYaml method
- [ ] 3.5 Add JSON Schema validation context to prompts

## 4. LLM Service Enhancement

- [ ] 4.1 Add structured output support (response_format with json_schema)
- [ ] 4.2 Add provider capability detection (structured output support)
- [ ] 4.3 Fallback to prompt-based JSON for unsupported providers

## 5. Frontend Implementation

- [ ] 5.1 Create schemas list page (app/(dashboard)/schemas/page.tsx)
- [ ] 5.2 Create schema detail/edit page (app/(dashboard)/schemas/[id]/page.tsx)
- [ ] 5.3 Build SchemaForm component
- [ ] 5.4 Build SchemaVisualBuilder component (drag-drop fields)
- [ ] 5.5 Build JSONSchemaEditor component (code editor for raw JSON)
- [ ] 5.6 Build SchemaPreview component (render schema tree)
- [ ] 5.7 Add schema selector to project settings
- [ ] 5.8 Create useSchemas hook
- [ ] 5.9 Add API client functions (lib/api/schemas.ts)

## 6. Schema Templates

- [ ] 6.1 Create invoice template JSON Schema
- [ ] 6.2 Create receipt template JSON Schema
- [ ] 6.3 Create contract template JSON Schema
- [ ] 6.4 Add template selection in schema creation flow

## 7. Testing

- [ ] 7.1 Test schema CRUD operations
- [ ] 7.2 Test JSON Schema validation (valid and invalid schemas)
- [ ] 7.3 Test extraction with JSON Schema (valid and invalid LLM responses)
- [ ] 7.4 Test re-extraction with validation feedback
- [ ] 7.5 Test native structured output vs fallback
- [ ] 7.6 Test visual schema builder UI
