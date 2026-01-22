## 1. Specs and Docs
- [ ] 1.1 Add OpenSpec deltas for `web-app` i18n behavior
- [ ] 1.2 Add OpenSpec deltas for `backend-standards` stable error codes + details
- [ ] 1.3 Add `docs/I18N.md` and update `CLAUDE.md` with i18n workflow + conventions

## 2. Web i18n Foundation
- [ ] 2.1 Add `I18nProvider` to `src/apps/web/src/app/providers.tsx`
- [ ] 2.2 Add locale resolution (localStorage → browser → `en`) and set `document.documentElement.lang`
- [ ] 2.3 Add `en` + `zh-CN` catalogs and a `t(key, vars)` helper
- [ ] 2.4 Add a language switch UI (Settings) and persist preference
- [ ] 2.5 Add tests for provider behavior (switching + fallback + missing keys)

## 3. Web: Localize UI + Error Handling
- [ ] 3.1 Replace global strings (ErrorBoundary, auth, nav, empty/loading) with translation keys
- [ ] 3.2 Update web API error parsing to read backend `{ error: { code, params, requestId } }`
- [ ] 3.3 Map backend `error.code` → translation keys with safe fallback
- [ ] 3.4 Add tests for error mapping and requestId display

## 4. API: Stable Error Codes + Structured Details
- [ ] 4.1 Define a stable error-code set (string union/consts) for core domains (auth, projects, manifests, uploads)
- [ ] 4.2 Extend the global exception filter to output `error.code`, `error.params`, and `error.details` (when applicable)
- [ ] 4.3 Update key exception sites to use stable codes (don’t rely on raw English strings)
- [ ] 4.4 Emit structured validation details (field path + rule) without leaking sensitive info
- [ ] 4.5 Add/adjust API tests to assert the new error contract

## 5. Verification
- [ ] 5.1 Run `npm run test`, `npm run lint`, `npm run type-check`
- [ ] 5.2 Run API tests (`npm run test --workspace=@pytoya/api`)
- [ ] 5.3 Add a manual QA checklist (language switch + error UX + fallback behavior)

