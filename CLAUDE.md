# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Project Overview

PyToYa is a hybrid invoice processing system combining a Python CLI tool (legacy) with a modern TypeScript web application. The system uses PaddleOCR-VL for OCR and LLM providers (OpenAI-compatible) for structured data extraction from PDF invoices.

**Architecture**: Monorepo with npm workspaces (`src/apps/api` for NestJS backend, `src/apps/web` for Next.js frontend).

**Key Technologies**: NestJS, Next.js 14 (App Router), PostgreSQL + TypeORM, BullMQ + Redis, WebSocket Gateway, PaddleOCR-VL, OpenAI-compatible LLMs.

## Common Commands

### Development (All Services)
```bash
npm run dev                 # Start both API and web with concurrency
npm run dev:api            # Start API only
npm run dev:web            # Start web only
```

### Building
```bash
npm run build              # Build all workspaces
```

### Testing
```bash
npm test                   # Run all tests
npm run test:watch         # Watch mode
```

### Docker Services (PostgreSQL, Redis)
```bash
npm run docker:up          # Start docker-compose services
npm run docker:down        # Stop services
npm run docker:logs        # View logs
npm run docker:ps          # Check status
```

### Backend-Specific (`src/apps/api/`)
```bash
npm run start:dev          # Development with watch
npm run start:debug        # Debug mode
npm run test               # Jest tests
npm run test:cov           # Coverage report
npm run migration:generate  # Generate TypeORM migration
npm run migration:run      # Run migrations
npm run migration:revert   # Revert last migration
```

### Frontend-Specific (`src/apps/web/`)
```bash
npm run dev                # Next.js dev server
npm run build              # Production build
npm run lint               # ESLint
npm run type-check         # TypeScript check
npm run test               # Jest tests
npm run test:coverage      # Coverage report
```

## Architecture

### Monorepo Structure
```
src/apps/
├── api/                   # NestJS backend (port 3000)
└── web/                   # Next.js frontend (port 3001)
src/                       # Python CLI (legacy)
openspec/                  # Spec-driven development
```

### Backend (NestJS API)
- **Entry Point**: `src/apps/api/src/main.ts`
- **Modules**: Feature-based organization (auth, projects, extraction, manifests, schemas, providers, prompts, etc.)
- **Database**: TypeORM with PostgreSQL, entities in `src/entities/`, migrations in `src/database/migrations/`
- **Job Queue**: BullMQ with Redis for async extraction jobs
- **WebSocket**: Gateway at `src/websocket/websocket.gateway.ts` for real-time progress updates

### Frontend (Next.js Web)
- **Framework**: App Router (`src/apps/web/app/`)
- **API Client**: Axios with centralized config in `lib/api-client.ts`
- **State Management**: Zustand stores in `hooks/` (e.g., `auth-store.ts`)
- **Components**: Co-located with pages, shared components in `components/`

### Database Schema (11 Entities)
```
UserEntity → ProjectEntity → GroupEntity → ManifestEntity → ManifestItemEntity
                                  ↓
                            SchemaEntity (JSON schemas for extraction)
                                  ↓
                    ExtractionHistoryEntity (audit trail)

LlmProviderEntity → ProviderEntity → PromptEntity
                                  ↓
                            JobEntity (BullMQ jobs)
```

## Testing Philosophy

### Backend (NestJS)
- **Framework**: Jest with NestJS testing utilities
- **Key Principle**: Use dependency injection via `Test.createTestingModule()` with `overrideProvider()` instead of monkey patching
- **Anti-patterns**: Avoid global `jest.mock()`, avoid patching require() or module exports
- **Test Utilities**: `src/apps/api/test/helpers.ts` and `test/mocks/factories.ts`
- **Coverage**: 70% threshold

### Frontend (Next.js)
- **Framework**: Jest + React Testing Library + MSW
- **Key Principle**: Mock HTTP requests with MSW handlers, not service modules
- **Test Utilities**: `src/apps/web/test/utils.tsx` for renderWithProviders
- **MSW Setup**: Handlers in `test/mocks/handlers.ts`, server in `test/mocks/server.ts`
- **Coverage**: 60% threshold

## Domain Knowledge

### Invoice Processing
- **PO Number Format**: 7 digits, zero-padded (e.g., "0000009")
- **Units**: Must be KG, EA, or M (enforced validation)
- **Language**: Chinese invoices with specific field requirements
- **Extraction**: Two modes - prompt-based (invoice/contract/receipt) and JSON schema-based

### OCR Correction Patterns
Critical for mechanical industry invoices (Chinese):
- Character confusion: 0↔O, 1↔l, 5↔S, 8↔B
- Common OCR errors: 理弧焊→埋弧焊, 又车→叉车, 个→7/5S
- Bearing models: 60XZZ, 62XZZ, 63XZZ, 7XXXAC

### PaddleOCR-VL Integration
- **Endpoint**: POST /layout-parsing
- **Type**: Remote HTTP service (configured via PADDLEOCR_BASE_URL)
- **Key Parameters**: useDocOrientationClassify, useLayoutDetection, prettifyMarkdown

### LLM Integration
- **Providers**: OpenAI-compatible (OpenAI, SiliconFlow, custom endpoints)
- **API Format**: chat.completions
- **Retry Logic**: Automatic retry with enhanced OCR on validation failure

## Environment Variables

### Required for API (.env)
```
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
REDIS_HOST, REDIS_PORT
JWT_SECRET
OPENAI_API_KEY (or equivalent for configured provider)
PADDLEOCR_BASE_URL
```

### Required for Web (.env.local)
```
NEXT_PUBLIC_API_URL
```

## Important Patterns

### NestJS Dependency Injection
```typescript
// Preferred: Use overrideProvider() for testing
Test.createTestingModule({
  providers: [ExtractionService],
})
.overrideProvider(LlmService).useValue(mockLlmService)
.compile();

// Avoid: jest.mock() or manual patching
```

### Next.js Data Fetching
- Use React Query (`@tanstack/react-query`) for server state
- Use Zustand for client state (auth, UI state)
- API client modules in `lib/api/` (e.g., `projects.ts`, `schemas.ts`)

### File Naming
- Backend: kebab-case for files (e.g., `extraction.service.ts`), PascalCase for classes
- Frontend: PascalCase for components (e.g., `ProjectCard.tsx`), camelCase for utilities
- Tests: Co-located `*.spec.ts` (backend) or `*.test.tsx` (frontend)

## Service URLs (Development)

- API: http://localhost:3000
- Web: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- PaddleOCR-VL: http://localhost:8080 (external dependency, must be started separately)

## Code Conventions

- **Formatting**: Prettier with 2-space indent, single quotes
- **TypeScript**: Strict mode enabled, avoid `as any`
- **Imports**: Organize alphabetically (external libs, internal modules)
- **Git**: Conventional commits (feat:, fix:, refactor:, test:, docs:, chore:)
- **Branching**: Feature branches from `main` (e.g., `feat/auth`, `refactor/extraction`)
