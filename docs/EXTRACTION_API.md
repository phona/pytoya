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

## Troubleshooting: Extraction Stage Logs

The backend (NestJS API + BullMQ worker) emits lightweight stage boundary logs for extraction runs. These are intended to answer:
- where it failed (`stage=...`)
- which manifest/job (`manifestId=...`, `jobId=...`)
- how long it took (`durationMs=...`)

Common log lines:
- `event=start stage=VALIDATING manifestId=123 jobId=456`
- `event=end stage=TEXT_EXTRACTING manifestId=123 jobId=456 durationMs=842`
- `event=fail stage=EXTRACTING manifestId=123 jobId=456 durationMs=12034 extractionRetryCount=2 missingFieldsCount=3 error="..."`

Notes:
- Logs intentionally avoid OCR text, prompts, and secrets.
- Verbosity is controlled by existing `server.logLevel` (stage boundary logs are `info` / `Logger.log()`).
- BullMQ worker failures include `attemptsMade` and `lastProgress` plus stack traces when available.
