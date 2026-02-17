## 1. Implementation

- [x] Replace AuditPanel auto-save timer state with a `useRef` timer handle
- [x] Set auto-save debounce delay to `3000ms`
- [x] Clear pending auto-save timer on unmount/navigation
- [x] Update `AuditPanel.test.tsx` to reproduce the loop pattern and assert only 1 PATCH occurs

## 2. Verification

- [x] Run `npm run test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`

