## 1. Spec + docs
- [ ] 1.1 Update delta specs (`openspec/changes/refactor-extraction-runtime/specs/*`)
- [ ] 1.2 Add/update docs describing runtime topology and trade-offs
- [ ] 1.3 Validate OpenSpec change (`openspec validate refactor-extraction-runtime --strict`)

## 2. Phase A: Maintainability refactor (no behavior change)
- [ ] 2.1 Define an explicit extraction stage contract (state in/out)
- [ ] 2.2 Refactor extraction orchestration into named stages
- [ ] 2.3 Centralize progress/status publishing into one component
- [ ] 2.4 Ensure progress semantics: monotonic progress + idempotent events
- [ ] 2.5 Refactor `main.ts` bootstrap into small “enableX” helpers

## 3. Phase A: Tests + validation
- [ ] 3.1 Add regression tests for stage ordering and error attribution
- [ ] 3.2 Add tests for progress publishing semantics (monotonic + final state)
- [ ] 3.3 Run `npm run test`
- [ ] 3.4 Run `npm run lint`
- [ ] 3.5 Run `npm run type-check`

## 4. Phase B (optional): Scale readiness
- [ ] 4.1 Decide WS strategy: dedicated gateway vs shared adapter
- [ ] 4.2 Decide uploads strategy: RWX PVC vs object storage
- [ ] 4.3 Implement chosen WS scaling strategy
- [ ] 4.4 Implement chosen shared uploads strategy
- [ ] 4.5 Split worker into separate process/deployment (if chosen)
- [ ] 4.6 Update Helm chart values/templates for selected topology

## 5. Dependency gate
- [ ] 5.1 If adding production deps (e.g., socket.io redis adapter), request explicit approval first
