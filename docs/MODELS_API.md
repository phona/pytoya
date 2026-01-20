# Models API

This document describes the API surface for the adapter-based models system.

## Endpoints

### List Models

```http
GET /api/models?category=llm&adapterType=openai&isActive=true
```

Response:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "OpenAI GPT-4o",
    "adapterType": "openai",
    "description": null,
    "category": "llm",
    "parameters": {
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "********",
      "modelName": "gpt-4o",
      "supportsVision": true,
      "supportsStructuredOutput": true
    },
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

### List Adapter Schemas

```http
GET /api/models/adapters
```

Response:
```json
[
  {
    "type": "openai",
    "name": "OpenAI-Compatible",
    "description": "OpenAI-compatible LLM adapter",
    "category": "llm",
    "parameters": {
      "baseUrl": { "type": "string", "required": true, "label": "Base URL" },
      "apiKey": { "type": "string", "required": true, "label": "API Key", "secret": true },
      "modelName": { "type": "string", "required": true, "label": "Model Name" }
    },
    "capabilities": ["llm"]
  }
]
```

### Create Model

```http
POST /api/models
Content-Type: application/json

{
  "name": "OpenAI GPT-4o",
  "adapterType": "openai",
  "parameters": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "modelName": "gpt-4o"
  },
  "description": "OpenAI GPT-4o",
  "isActive": true
}
```

### Update Model

```http
PATCH /api/models/:id
Content-Type: application/json

{
  "parameters": {
    "supportsVision": true
  }
}
```

### Delete Model

```http
DELETE /api/models/:id
```

### Test Model Connection

```http
POST /api/models/:id/test
```

Response:
```json
{
  "ok": true,
  "message": "LLM connection ok",
  "model": "gpt-4o",
  "latencyMs": 128
}
```

## Notes

- Secret parameters (like API keys) are masked in list responses.
- `category` is derived from the adapter type.
- Projects use `llmModelId` for structured extraction and `textExtractorId` for text extraction (managed via the Extractors API).
