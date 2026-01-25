## 1. Spec + docs
- [x] 1.1 Update delta specs (`openspec/changes/refactor-extraction-runtime/specs/*`)
- [x] 1.2 Add/update docs describing runtime topology and trade-offs
- [x] 1.3 Validate OpenSpec change (`openspec validate refactor-extraction-runtime --strict`)

## 2. Phase A: Maintainability refactor (no behavior change)
- [x] 2.1 Define an explicit extraction stage contract (state in/out)
- [x] 2.2 Refactor extraction orchestration into named stages
- [x] 2.3 Centralize progress/status publishing into one component
- [x] 2.4 Ensure progress semantics: monotonic progress + idempotent events
- [x] 2.5 Refactor `main.ts` bootstrap into small “enableX” helpers

## 3. Phase A: Tests + validation
- [x] 3.1 Add regression tests for stage ordering and error attribution
- [x] 3.2 Add tests for progress publishing semantics (monotonic + final state)
- [x] 3.3 Run `npm run test`
- [x] 3.4 Run `npm run lint`
- [x] 3.5 Run `npm run type-check`

## 4. Phase B (optional): Scale readiness
- [x] 4.1 Decide WS strategy: dedicated gateway vs shared adapter
- [x] 4.2 Decide uploads strategy: RWX PVC vs object storage
- [x] 4.3 Implement chosen WS scaling strategy
- [x] 4.4 Implement chosen shared uploads strategy
- [x] 4.5 Split worker into separate process/deployment (if chosen)
- [x] 4.6 Update Helm chart values/templates for selected topology

## 5. Dependency gate
- [x] 5.1 If adding production deps (e.g., socket.io redis adapter), request explicit approval first
