## 1. Specs and Docs
- [x] 1.1 Add OpenSpec deltas for `web-app` i18n behavior
- [x] 1.2 Add OpenSpec deltas for `backend-standards` stable error codes + details
- [x] 1.3 Add `docs/I18N.md` and update `CLAUDE.md` with i18n workflow + conventions

## 2. Web i18n Foundation
- [x] 2.1 Add `I18nProvider` to `src/apps/web/src/app/providers.tsx`
- [x] 2.2 Add locale resolution (localStorage → browser → `en`) and set `document.documentElement.lang`
- [x] 2.3 Add `en` + `zh-CN` catalogs and a `t(key, vars)` helper
- [x] 2.4 Add a language switch UI (Settings) and persist preference
- [x] 2.5 Add tests for provider behavior (switching + fallback + missing keys)

## 3. Web: Localize UI + Error Handling
- [x] 3.1 Replace global strings (ErrorBoundary, auth, nav, empty/loading) with translation keys
- [x] 3.2 Update web API error parsing to read backend `{ error: { code, params, requestId } }`
- [x] 3.3 Map backend `error.code` → translation keys with safe fallback
- [x] 3.4 Add tests for error mapping and requestId display
- [x] 3.5 Localize Project / Manifests / Audit screens (core user flows)

## 4. API: Stable Error Codes + Structured Details
- [x] 4.1 Define a stable error-code set (string union/consts) for core domains (auth, projects, manifests, uploads)
- [x] 4.2 Extend the global exception filter to output `error.code`, `error.params`, and `error.details` (when applicable)
- [x] 4.3 Update key exception sites to use stable codes (don’t rely on raw English strings)
- [x] 4.4 Emit structured validation details (field path + rule) without leaking sensitive info
- [x] 4.5 Add/adjust API tests to assert the new error contract

## 5. Verification
- [x] 5.1 Run `npm run test`, `npm run lint`, `npm run type-check`
- [x] 5.2 Run API tests (`npm run test --workspace=@pytoya/api`)
- [x] 5.3 Add a manual QA checklist (language switch + error UX + fallback behavior)
