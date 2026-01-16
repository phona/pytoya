# Models API

This document describes the API surface for the adapter-based models system.

## Endpoints

### List Models

```http
GET /api/models?category=ocr&adapterType=openai&isActive=true
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
    "type": "paddlex",
    "name": "PaddleX OCR",
    "description": "PaddleOCR-VL adapter",
    "category": "ocr",
    "parameters": {
      "baseUrl": { "type": "string", "required": true, "label": "Base URL" }
    },
    "capabilities": ["ocr"]
  }
]
```

### Create Model

```http
POST /api/models
Content-Type: application/json

{
  "name": "PaddleX OCR",
  "adapterType": "paddlex",
  "parameters": {
    "baseUrl": "http://localhost:8080",
    "timeout": 60000,
    "maxRetries": 3
  },
  "description": "Local OCR server",
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
- Set `ocrModelId` and `llmModelId` on projects to choose default models.
