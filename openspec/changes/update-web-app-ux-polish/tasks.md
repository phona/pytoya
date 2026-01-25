## 1. Specs and UX Decisions
- [ ] 1.1 Confirm Jobs panel tab naming and mappings
- [ ] 1.2 Confirm sidebar hide behavior approach (conditional render vs `inert`)
- [ ] 1.3 Confirm confidence cue approach (badge vs tooltip vs text)

## 2. Jobs Panel
- [ ] 2.1 Update tab filtering semantics to match proposal
- [ ] 2.2 Add/adjust tests in `src/apps/web/src/shared/components/JobsPanel.test.tsx`
- [ ] 2.3 Ensure i18n strings match tab labels

## 3. Sidebar Navigation (A11y)
- [ ] 3.1 Make hidden sidebar unfocusable (mobile closed + desktop collapsed)
- [ ] 3.2 Add/adjust tests in `src/apps/web/src/shared/components/SidebarNav.test.tsx`

## 4. Guided Setup Wizard (i18n)
- [ ] 4.1 Replace hardcoded wizard strings with `t(...)`
- [ ] 4.2 Add `en` + `zh-CN` locale keys for wizard strings
- [ ] 4.3 Add/adjust tests for language switching (if present)

## 5. Manifest List Confidence + Filters
- [ ] 5.1 Add non-color confidence cue when using border highlighting
- [ ] 5.2 Clarify schema column “available values” scope (“this page”)
- [ ] 5.3 Add/adjust tests (ManifestTable integration/unit as appropriate)

## 6. Audit Header Hygiene
- [ ] 6.1 Remove/replace `storagePath` display in Audit header
- [ ] 6.2 Add/adjust tests in `src/apps/web/src/shared/components/manifests/AuditPanel.test.tsx`

## 7. Validation
- [ ] 7.1 Run `npm run test`
- [ ] 7.2 Run `npm run lint`
- [ ] 7.3 Run `npm run type-check`

