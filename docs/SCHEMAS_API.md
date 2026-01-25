# Schemas API

Endpoints for schema management, validation, AI generation, and schema rules.

## List Schemas
```http
GET /api/schemas
```

## Get Schema
```http
GET /api/schemas/:id
```

## List Schemas by Project
```http
GET /api/schemas/project/:projectId
```

## Create Schema
```http
POST /api/schemas
Content-Type: application/json

{
  "projectId": 1,
  "jsonSchema": {
    "type": "object",
    "required": ["invoice"],
    "properties": { "invoice": { "type": "object" } }
  }
}
```
Notes:
- Schema `name` and `description` are derived from JSON Schema `title` and `description`.
- `requiredFields` are derived from JSON Schema `required` arrays (including nested objects).
- Do not send `name`, `description`, or `requiredFields` in the request payload.

## Update Schema
```http
PATCH /api/schemas/:id
Content-Type: application/json

{
  "jsonSchema": { "type": "object", "properties": {} }
}
```
Notes:
- Updating a schema creates a new schema version (new `id`) and returns the newly created schema.
- Existing schema rules are copied to the new version.
- If the updated schema was the project's active schema, the project’s `defaultSchemaId` is updated to the new schema version.
- Changing the active schema invalidates cached manifest validation results for the project (stored `validationResults` are cleared).

## Schema Versioning
Schema responses include:
- `schemaVersion`: a content hash of the schema contract used for audit/provenance.

## Field Ordering (UI)
Postgres `jsonb` does not preserve JSON object key order. To control how schema-driven fields render in the UI, add `x-ui-order` (number) to property schemas.

Rules:
- Lower `x-ui-order` renders earlier.
- Properties without `x-ui-order` render after ordered properties, sorted by name (A→Z).
- Applies recursively for nested objects and array `items` object schemas.

Example:
```json
{
  "type": "object",
  "properties": {
    "department": { "type": "object", "x-ui-order": 0, "properties": {} },
    "invoice": { "type": "object", "x-ui-order": 1, "properties": {} }
  }
}
```

## Delete Schema
```http
DELETE /api/schemas/:id
```

## Validate Schema Definition
```http
POST /api/schemas/validate
Content-Type: application/json

{
  "jsonSchema": { "type": "object", "properties": {} }
}
```

## Validate Data with Required Fields
```http
POST /api/schemas/validate-with-required
Content-Type: application/json

{
  "jsonSchema": {
    "type": "object",
    "required": ["invoice"],
    "properties": { "invoice": { "type": "object" } }
  },
  "data": { "invoice": { "po_no": "0000001" } }
}
```

## Import Schema (JSON file)
```http
POST /api/schemas/import
Content-Type: multipart/form-data

file=<schema.json>
```

## Generate Schema (LLM)
```http
POST /api/schemas/generate
Content-Type: application/json

{
  "description": "Invoice with PO number and line items",
  "modelId": "llm-1",
  "includeExtractionHints": true
}
```

## Generate Rules from Schema Payload (LLM)
```http
POST /api/schemas/generate-rules
Content-Type: application/json

{
  "description": "PO number must be 7 digits",
  "modelId": "llm-1",
  "jsonSchema": { "type": "object", "properties": {} }
}
```

## Generate Rules from Saved Schema (LLM)
```http
POST /api/schemas/:id/generate-rules
Content-Type: application/json

{
  "description": "Units must be KG, EA, or M",
  "modelId": "llm-1"
}
```

## Schema Rules CRUD
```http
GET    /api/schemas/:schemaId/rules
POST   /api/schemas/:schemaId/rules
PATCH  /api/schemas/:schemaId/rules/:ruleId
DELETE /api/schemas/:schemaId/rules/:ruleId
```

Rule payloads include:
- `fieldPath` (dot notation)
- `ruleType` (`verification` or `restriction`)
- `ruleOperator` (`pattern`, `enum`, `range_min`, `range_max`, `length_min`, `length_max`, `ocr_correction`)
- `ruleConfig` (operator-specific config)
