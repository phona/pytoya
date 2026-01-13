# Change: JSON Schema Extraction with Dynamic Schemas

## Why
Current implementation uses hardcoded YAML schema for invoice extraction. To support user-defined document types, we need:
1. Dynamic schema definition per project
2. Industry-standard schema format (JSON Schema)
3. Native LLM structured output support
4. Proper validation without custom parsing logic

## What Changes

### Remove
- Hardcoded `ExtractedData` interface (`prompts/types/prompts.types.ts`)
- YAML schema constant (`prompts/constants/invoice-schema.constant.ts`)
- YAML parsing (`js-yaml` dependency)
- Custom YAML validation logic

### Add
- **SchemaEntity** - Store JSON Schema definitions per project
- **Schema CRUD APIs** - Create, read, update, delete schemas
- **Visual schema builder UI** - User-friendly schema creation
- **JSON Schema validator** - Use `ajv` for strict validation
- **JSON extraction prompts** - Replace YAML instructions with JSON Schema
- **Project schema association** - `ProjectEntity.defaultSchemaId`

### Modify
- `ExtractionService` - Use JSON parsing + ajv validation
- `PromptsService` - Build prompts with JSON Schema instead of YAML
- `LlmService` - Support structured output API (when available)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Workflow                            │
├─────────────────────────────────────────────────────────────────┤
│  1. User creates Schema (visual builder or JSON editor)         │
│  2. Schema saved to SchemaEntity (JSON Schema format)          │
│  3. Project linked to defaultSchemaId                           │
│  4. Extraction uses project's schema + provider + prompt        │
│  5. LLM returns JSON matching schema                            │
│  6. ajv validates against JSON Schema                           │
│  7. Validated data saved to ManifestEntity.extractedData        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SchemaEntity Design                          │
├─────────────────────────────────────────────────────────────────┤
│  id: number                                                     │
│  name: string                                                   │
│  projectId: number                                              │
│  jsonSchema: object          # JSON Schema draft 2020-12        │
│  requiredFields: string[]    # Dot-notation for validation      │
│  createdAt / updatedAt                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              JSON Schema Example (Invoice)                      │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    "$schema": "https://json-schema.org/draft/2020-12/schema",   │
│    "type": "object",                                            │
│    "properties": {                                              │
│      "department": {                                            │
│        "type": "object",                                        │
│        "properties": {                                          │
│          "code": { "type": "string" },                          │
│          "name": { "type": "string" }                           │
│        }                                                        │
│      },                                                          │
│      "invoice": { ... },                                        │
│      "items": {                                                 │
│        "type": "array",                                         │
│        "items": { ... }                                         │
│      },                                                          │
│      "_extraction_info": { ... }                                │
│    },                                                            │
│    "required": ["department", "invoice", "items"]               │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Impact
- **Breaking change:** Existing YAML extraction code removed
- **Affected code:** `extraction/`, `prompts/`, `llm/` modules
- **Migration needed:** None (greenfield, no production data)
- **New dependencies:** `ajv` (JSON Schema validator)
- **Remove dependencies:** `js-yaml`
