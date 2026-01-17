# Extraction API

## Optimize Prompt

Generate an extraction prompt from a project description.

**Request**
```http
POST /api/extraction/optimize-prompt
Content-Type: application/json

{
  "description": "Describe the invoice fields and constraints..."
}
```

**Response**
```json
{
  "prompt": "System prompt text..."
}
```

**Errors**
- `500` if the LLM provider fails or returns an unexpected result.
