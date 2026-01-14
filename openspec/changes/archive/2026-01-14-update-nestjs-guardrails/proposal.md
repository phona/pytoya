# Proposal: Tighten NestJS Backend Guardrails (validation, config, errors, response contracts)

## Why
The backend currently works, but several inconsistent patterns make it easy to ship bugs and security footguns:
- Request validation is permissive (unknown fields are silently accepted).
- Some runtime code reads `process.env` directly (and even falls back to an insecure JWT secret).
- Many request-path services throw raw `Error`, which typically becomes a 500 without a stable API contract.
- Controllers frequently return TypeORM entities directly, which leaks internal shape and makes change unsafe.

This proposal standardizes the NestJS backend rules so humans and coding agents generate fewer mistakes and the API is more predictable.

## What Changes
- Enforce strict global request validation (reject unknown fields).
- Centralize runtime config access via `ConfigService` (remove `process.env` reads and insecure fallbacks).
- Replace raw `Error` throws in request paths with Nest exceptions.
- Return explicit response DTOs from controllers instead of TypeORM entities.
- Document and link backend guardrails for humans and coding agents.

## Root Cause
No single documented + enforced “backend standards” reference, leading to drift:
- Global validation pipe lacks strict defaults (`forbidNonWhitelisted`) in `src/apps/api/src/main.ts`.
- WebSocket code bypasses `@nestjs/config` and uses `process.env` directly in `src/apps/api/src/websocket/*`.
- Services throw raw `Error` in request paths (e.g. `src/apps/api/src/pdf-to-image/*`, `src/apps/api/src/llm/*`).
- Response DTO conventions are not consistently applied (e.g. manual password stripping in `src/apps/api/src/auth/auth.controller.ts`).

## Goals
- Lock backend stack choices (Express + class-validator + @nestjs/config + Nest Logger + TypeORM).
- Enforce strict request validation globally (reject unknown fields).
- Remove runtime `process.env` usage from Nest request paths (use `ConfigService`).
- Replace raw `Error` throws with meaningful Nest exceptions on request paths.
- Introduce explicit response DTOs (avoid returning ORM entities from controllers).
- Document these guardrails for humans and coding agents.

## Non-Goals
- Switching HTTP platform to Fastify.
- Replacing TypeORM or adding a second DB layer.
- Large folder reshuffles (e.g. moving everything under `src/modules/*`) as part of this change.
- Adding new production dependencies without explicit approval.

## Architecture (after change)
```mermaid
flowchart LR
  Web[Next.js Web] -->|HTTP (Express)| API[NestJS API]
  Web -->|socket.io namespace| API
  API -->|ConfigService only| ENV[(env)]
  API --> DB[(Postgres via TypeORM)]
```

Layering rule:
```
Controller -> Service -> (Repository/TypeORM)
Controller -> (Response DTO mapping)
```

## Proposed Behavior Summary
### 1) Global request validation is strict
Pseudocode:
```text
useGlobalPipes(ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}))
```

Impact:
- Requests with unknown JSON keys fail fast with 400 (instead of silently dropping/accepting).

### 2) Config access is centralized
Rules:
- No `process.env` usage in runtime Nest request paths.
- Use `ConfigService` everywhere (including WebSocket gateway/guards).
- Remove insecure fallbacks like `JWT_SECRET || 'your-secret-key'`.

Pseudocode:
```text
secret = config.getOrThrow('JWT_SECRET')
webOrigin = config.get('WEB_URL', 'http://localhost:3000')
```

### 3) Error handling uses Nest exceptions (no raw `Error`)
Rules:
- No `throw new Error()` in controllers/services in the request path.
- Use `BadRequestException`, `NotFoundException`, `UnauthorizedException`, etc.
- Unexpected errors should remain 500, but with consistent messages and without leaking secrets.

### 4) Response contracts are explicit
Rules:
- Controllers return response DTOs (or explicit interfaces) instead of TypeORM entities.
- No manual in-controller shaping (e.g., password stripping) beyond mapping to a DTO.

## Documentation (part of this change)
Add a documented ruleset for the repo to keep humans and agents aligned:
- Draft doc lives in `openspec/changes/update-nestjs-guardrails/docs/nestjs-coding-agent-guardrails.md`
- After approval, it will be copied into `docs/` and referenced from `CLAUDE.md`

## Risks
- Stricter validation may break existing clients sending extra fields.
- Removing insecure env fallbacks may break dev if `.env` is missing required values (desired “fail fast” behavior).
- Converting `Error` → `HttpException` changes status codes (more accurate, but client-visible).

## Rollout / Migration
- Implement strict validation and config centralization first, then fix any failing clients/tests.
- Convert high-impact request-path services to `HttpException` next (LLM, PDF-to-image, extraction-related paths).
- Introduce response DTOs incrementally, starting with auth/profile and the most-used endpoints.

## Validation Plan (after implementation)
- `npm run test`
- `npm run lint`
- `npm run type-check`
- Smoke: login, list projects, upload manifest, receive WebSocket updates.
