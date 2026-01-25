## 1. Specs and UX Decisions
- [x] 1.1 Confirm Jobs panel tab naming and mappings (Completed/Failed/In progress/All)
- [x] 1.2 Confirm sidebar hide behavior approach (aria-hidden + tabIndex=-1 when hidden)
- [x] 1.3 Confirm confidence cue approach (text badge cue)

## 2. Jobs Panel
- [x] 2.1 Update tab filtering semantics to match proposal
- [x] 2.2 Add/adjust tests in `src/apps/web/src/shared/components/JobsPanel.test.tsx`
- [x] 2.3 Ensure i18n strings match tab labels

## 3. Sidebar Navigation (A11y)
- [x] 3.1 Make hidden sidebar unfocusable (mobile closed + desktop collapsed)
- [x] 3.2 Add/adjust tests in `src/apps/web/src/shared/components/SidebarNav.test.tsx`

## 4. Guided Setup Wizard (i18n)
- [x] 4.1 Replace hardcoded wizard strings with `t(...)`
- [x] 4.2 Add `en` + `zh-CN` locale keys for wizard strings
- [x] 4.3 Add/adjust tests for language switching (if present)

## 5. Manifest List Confidence + Filters
- [x] 5.1 Add non-color confidence cue when using border highlighting
- [x] 5.2 Clarify schema column “available values” scope (“this page”)
- [x] 5.3 Add/adjust tests (ManifestTable integration/unit as appropriate)

## 6. Audit Header Hygiene
- [x] 6.1 Remove/replace `storagePath` display in Audit header
- [x] 6.2 Add/adjust tests in `src/apps/web/src/shared/components/manifests/AuditPanel.test.tsx`

## 7. Validation
- [x] 7.1 Run `npm run test`
- [x] 7.2 Run `npm run lint`
- [x] 7.3 Run `npm run type-check`
