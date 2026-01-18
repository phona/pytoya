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
