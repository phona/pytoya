# Change: Add i18n Foundation (Web + API Error Codes)

## Why

PyToYa’s web UI currently hard-codes user-facing strings. This makes it hard to:
- Ship a Chinese UI (`zh-CN`) alongside English (`en`)
- Keep terminology consistent across pages
- Show predictable, user-friendly error messages

On the backend, the error envelope is consistent, but the `error.code` is often just an exception class name and `error.message` is mostly English. That makes client-side localization difficult and brittle.

## What Changes

- Web: Add an i18n foundation to localize UI text and allow runtime language switching.
  - Provide `en` + `zh-CN` catalogs
  - Persist the user’s language preference (fallback to browser language, then `en`)
  - Replace user-facing strings incrementally, starting with “global” UI (auth, nav, errors, empty states)

- API: Standardize error payloads for localization by returning stable error codes and structured details.
  - Keep the current error envelope shape: `{ error: { ... } }`
  - Add stable, app-level `error.code` values (domain-oriented, machine-readable)
  - Add optional `error.params` for interpolation and optional `error.details` for validation errors
  - Keep `error.message` as a developer-friendly fallback (but clients SHOULD use `error.code`)

## Impact

- Affected specs: `web-app`, `backend-standards`
- Affected code (future implementation): `src/apps/web`, `src/apps/api`
- Dependencies: no new production dependencies (minimal in-house i18n layer)
- Breaking changes: none intended (API adds fields and stabilizes codes; existing envelope remains)

## Non-Goals (v1)

- Full backend server-side translation (e.g. translating `error.message` via `Accept-Language`)
- Translating logs or internal developer-only strings
- Translating the legacy Python CLI

## Current State

- Web: strings are hard-coded across components
- Web: API error display uses ad-hoc parsing and cannot reliably localize backend errors
- API: error responses include `code` + `message`, but `code` is not a stable domain error code

## Target State

- Web: a single i18n layer provides `t(key, vars)` and a language switch
- Web: user-facing strings are sourced from translation catalogs (starting with global chrome and auth)
- API: error envelope includes stable `error.code`, optional `error.params`, and structured validation `error.details`
- Web: API errors are displayed via translated keys with a safe fallback + requestId for support
