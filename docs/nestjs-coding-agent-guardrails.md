# NestJS Backend Coding Agent Guardrails (PyToYa)

This is the repo’s “do not surprise me” ruleset for working in `src/apps/api` (NestJS backend).
It is written to keep both humans and coding agents consistent.

## Locked stack (do not mix)
- HTTP platform: Express only (`@nestjs/platform-express`)
- Validation: `class-validator` + `class-transformer` only
- Config: `@nestjs/config` only (`ConfigService` access)
- Logging: Nest `Logger` only
- DB: TypeORM only

## Project structure (current repo shape)
Domains are feature folders under:
```
src/apps/api/src/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  dto/
  exceptions/ (optional)
  processors/ or interceptors/ (optional)
```

Shared-ish code lives outside domains (examples):
```
src/apps/api/src/entities/
src/apps/api/src/config/
src/apps/api/src/database/
src/apps/api/src/file-access/
```

## Import boundaries
Rules:
- A domain SHOULD import its own files and shared folders (entities/config/database/file-access).
- Domain-to-domain calls MUST happen through exported providers from the other module.
- Avoid circular dependencies; do not introduce `forwardRef()` unless explicitly approved.

ASCII diagram (imports):
```
groups/*  --->  projects/* (via exported ProjectsService)
   |                 |
   v                 v
entities/*        database/*
```

## Dependency injection rules
- Constructor injection only (no property injection).
- No `new SomeService()` inside Nest-managed code.
- Every injectable MUST be registered in its module `providers`.
- Only what’s in `exports` is allowed to be used by other modules.

## Controllers are thin
Controllers only:
- parse params/body/query (DTOs for body)
- call service
- return response DTO

Controllers MUST NOT:
- call TypeORM repositories directly
- implement business rules

## Services own business logic
Services:
- validate domain invariants (beyond DTO validation)
- orchestrate repository/service calls
- throw meaningful Nest exceptions

## DTO + global validation (mandatory)
- Every `@Body()` uses a DTO class (no raw objects).
- Global `ValidationPipe` MUST be enabled with:
  - `transform: true`
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
- Do not disable these in endpoints.

Pseudocode:
```text
useGlobalPipes(ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}))
```

## Config rules (no `process.env` in runtime)
- Runtime code MUST NOT read `process.env` directly.
- Use `ConfigService` for everything (HTTP + WebSocket).
- Secrets MUST NOT have insecure fallbacks like `'your-secret-key'`.
- Env vars SHOULD be validated at startup via `ConfigModule.forRoot({ validate })`.

## Error handling rules
- No `throw new Error()` in request paths.
- Use Nest exceptions: `BadRequestException`, `NotFoundException`, `ForbiddenException`, etc.

## Response contract rules
- Controllers return response DTOs / explicit interfaces.
- Do not return TypeORM entities directly.
- Never leak secrets (password hashes, API keys).

## Testing rules (keeps the agent honest)
- New service methods SHOULD get unit tests (mock deps via DI).
- Mocks must be typed; avoid `as any` unless last resort.
- Add DI smoke tests for critical module graphs using `src/apps/api/src/test/di-smoke/di-smoke.util.ts` and co-located `*.module.di.spec.ts` files; run quickly with `npm run test:di --workspace=@pytoya/api`.
