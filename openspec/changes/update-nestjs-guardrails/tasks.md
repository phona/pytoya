## 1. Spec + docs
- [ ] 1.1 Add `backend-standards` delta spec (guardrails requirements)
- [ ] 1.2 Add guardrails doc draft (for humans + agents)
- [ ] 1.3 Validate OpenSpec change (`openspec validate update-nestjs-guardrails --strict`)
- [ ] 1.4 Promote guardrails doc into `docs/` (living repo docs)
- [ ] 1.5 Link guardrails doc from `CLAUDE.md`

## 2. Strict global validation (backend)
- [ ] 2.1 Update `ValidationPipe` defaults to include `forbidNonWhitelisted: true`
- [ ] 2.2 Ensure DTOs are used for every `@Body()` input (no raw objects)

## 3. Config access cleanup (backend)
- [ ] 3.1 Remove runtime `process.env` reads from Nest request paths
- [ ] 3.2 WebSocket: use `ConfigService` for CORS origin + JWT secret
- [ ] 3.3 Remove insecure defaults (e.g. `'your-secret-key'`)
- [ ] 3.4 (Optional, no new deps) Validate env at startup using class-validator + `ConfigModule.forRoot({ validate })`

## 4. Error handling standardization (backend)
- [ ] 4.1 Replace `throw new Error()` in request-path services with Nest exceptions
- [ ] 4.2 Ensure errors map to correct status codes (400/401/403/404/500)

## 5. Response DTOs (backend)
- [ ] 5.1 Introduce response DTOs for auth/profile and other entity-returning endpoints
- [ ] 5.2 Ensure controllers return DTOs, not TypeORM entities

## 6. Tests + quality gates
- [ ] 6.1 Add/adjust unit tests for new behaviors (unknown fields rejected; WS secret required)
- [ ] 6.2 Run `npm run test`
- [ ] 6.3 Run `npm run lint`
- [ ] 6.4 Run `npm run type-check`
