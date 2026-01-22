# Design: i18n Foundation (Web + API Error Codes)

## Summary

Recommended approach:
- Web localizes the UI using a single `t(key, vars)` source of truth.
- API returns stable `error.code` + optional `params`/`details`.
- The web app translates backend errors by mapping `error.code` → translation keys.

This avoids server-side translation complexity while keeping the API usable for multiple clients.

## Root Cause (current problems)

1) Web strings are scattered:
```
Component A: "Save"
Component B: "Save changes"
Toast:       "Something went wrong"
```
There is no catalog or key system, so translation is manual and inconsistent.

2) API errors are not localization-friendly:
- `error.code` is often an exception name (too generic)
- `error.message` is English and sometimes an array (validation)

## Web Architecture

ASCII:
```
localStorage / browser locale
          |
          v
     I18nProvider
          |
          +--> loadCatalog(locale)
          |
          +--> t(key, vars)
          |
          v
       Components
```

Mermaid:
```mermaid
flowchart LR
  A[App start] --> B[Resolve locale]
  B --> C[Load catalog\n(en, zh-CN)]
  C --> D[I18nProvider]
  D --> E[useI18n / t()]
  E --> F[UI renders translated strings]
```

### Locale resolution

Order:
1) `localStorage` (explicit user choice)
2) `navigator.language` (browser)
3) fallback `en`

### Catalog strategy

- Store translation catalogs in the repo (not remote-fetched).
- Lazy-load catalogs to keep initial bundle small.
- Missing key behavior:
  - Dev/test: show a visible placeholder (to catch missing keys)
  - Prod: fallback to `en` and then to a generic string

## API Error Contract (recommended)

Keep the existing envelope and add fields:
```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found",
    "params": { "projectId": "123" },
    "details": [
      { "path": "username", "rule": "isString" }
    ],
    "requestId": "req-123",
    "timestamp": "2026-01-22T00:00:00.000Z",
    "path": "/api/projects/123"
  }
}
```

Notes:
- Clients SHOULD rely on `code` (+ `params`) and not on `message`.
- `message` stays for debugging and non-i18n clients.

Mermaid:
```mermaid
flowchart LR
  A[Request] --> B[Controller/Service]
  B -->|throws| C[Global Exception Filter]
  C --> D[Normalize to error envelope\n(code, params, details, requestId)]
  D --> E[HTTP JSON response]
  E --> F[Web maps code -> i18n key]
  F --> G[User sees localized message]
```

## Implementation Pseudocode

Web:
```text
resolveLocale():
  return localStorage.locale ?? navigator.language ?? 'en'

setLocale(locale):
  localStorage.locale = locale
  catalog = await loadCatalog(locale)
  html.lang = locale

t(key, vars):
  msg = catalog[key] ?? fallbackCatalog[key] ?? '__MISSING__'
  return interpolate(msg, vars)
```

API:
```text
normalizeException(e):
  code = e.appCode ?? e.name ?? 'INTERNAL_SERVER_ERROR'
  params = e.params ?? {}
  details = validationDetails(e) ?? undefined
  message = safeMessage(e)
  return { code, params, details, message, requestId, timestamp, path }
```

## Key Conventions (web)

- Use stable keys, not English-as-key.
  - Good: `nav.projects`, `auth.login.title`, `errors.PROJECT_NOT_FOUND`
  - Avoid: `Project not found`

## Rollout Strategy

1) Add foundations (provider + catalogs + language switch).
2) Translate global UI and auth first (highest value, lowest risk).
3) Add backend stable codes incrementally (start with auth/projects/uploads).
4) Expand translation coverage page-by-page.

