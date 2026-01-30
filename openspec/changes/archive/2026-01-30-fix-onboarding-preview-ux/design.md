# Design: fix-onboarding-preview-ux

## 1) Guided Setup Wizard: atomic server-side create

Goal: eliminate partial state and ambiguous failure outcomes.

ASCII:
```
UI: single call
  POST /projects/wizard
API: transaction
  create project + schema + rules + scripts
=> succeed or fail as one unit
```

Minimal API shape:
```
POST /api/projects/wizard
{
  project: { name, description?, textExtractorId, llmModelId },
  schema: { jsonSchema },
  rules: [...],
  validationScripts: [...]
}
-> { projectId, schemaId }
```

## 2) Re-extract OCR preview: excerpt selection

Goal: preview must be readable and fast.

Algorithm (simple, deterministic):
1) For each page: find best match index for any candidate token.
2) Pick the first page with a match (or the first page overall).
3) Extract an excerpt window (bounded).

Pseudocode:
```
function buildSnippet(text, index, before, after, maxLen):
  start = max(0, index - before)
  end = min(len(text), index + after)
  snippet = text[start:end]
  if len(snippet) > maxLen: snippet = snippet[0:maxLen]
  return (start>0 ? "..." : "") + snippet + (end < len(text) ? "..." : "")
```

Notes:
- Prefer `page.markdown` when present (better structure).
- Do not return “fullText” as `snippet`.

## 3) Secrets: user recheck == test connection

Rule:
- UI may reveal what the user typed locally.
- UI MUST NOT pretend masked placeholder is a real secret.
- Backend MUST NOT return plaintext secrets in API DTOs.

UX constraints:
```
Input value == "********" ?
  - disable Copy
  - Show toggles only changes input type (still masked)
  - CTA: Test Connection
```

