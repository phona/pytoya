## 1. Implementation

- [ ] Replace AuditPanel auto-save timer state with a `useRef` timer handle
- [ ] Set auto-save debounce delay to `3000ms`
- [ ] Clear pending auto-save timer on unmount/navigation
- [ ] Update `AuditPanel.test.tsx` to reproduce the loop pattern and assert only 1 PATCH occurs

## 2. Verification

- [ ] Run `npm run test`
- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`

