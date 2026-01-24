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

PyToYa is an invoice processing system implemented as a TypeScript monorepo. It uses pluggable text extractors (PaddleOCR-VL, vision LLMs, etc.) to produce raw text and adapter-based LLM models (OpenAI-compatible endpoints) for structured data extraction from PDF invoices.

**Architecture**: Monorepo with npm workspaces (`src/apps/api` for NestJS backend, `src/apps/web` for Vite frontend).

**Key Technologies**: NestJS, Vite + React Router, PostgreSQL + TypeORM, BullMQ + Redis, WebSocket Gateway, PaddleOCR-VL, OpenAI-compatible LLMs.

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

### Kubernetes Dev Dependencies (Postgres + Redis)
```bash
# Deploy deps (PowerShell)
pwsh -File scripts/deploy-deps-nodeport.ps1 -PostgresPassword 123456

# Update src/apps/api/.env.local from NodePorts
pwsh -File scripts/setup-dev-k8s-deps.ps1 -SkipDeploy -Namespace pytoya-dev -ReleaseName pytoya-dev

# Override the env file path if needed
pwsh -File scripts/setup-dev-k8s-deps.ps1 -SkipDeploy -EnvPath "src/apps/api/.env.local"

# Skip DB user setup if you only need NodePorts
pwsh -File scripts/setup-dev-k8s-deps.ps1 -SkipDeploy -SkipDbUserSetup
```

### Backend-Specific (`src/apps/api/`)
```bash
npm run start:dev          # Development with watch
npm run start:debug        # Debug mode
npm run test               # Jest tests
npm run test:cov           # Coverage report
npm run migration:generate  # Generate TypeORM migration (ts-node/register)
npm run migration:run      # Run migrations (ts-node/register)
npm run migration:revert   # Revert last migration (ts-node/register)

npm run cli -- serve       # Start API via CLI entrypoint
npm run cli -- newadmin    # Seed default admin (create-only)
npm run cli -- newuser     # Create a non-admin user (create-only)
npm run cli -- audit-passwords # Flag users with common weak passwords
npm run cli:dev -- serve   # Dev CLI (ts-node)
```

### Frontend-Specific (`src/apps/web/`)
```bash
npm run dev                # Vite dev server
npm run build              # Production build
npm run lint               # ESLint
npm run type-check         # TypeScript check
npm run test               # Vitest tests
npm run test:coverage      # Coverage report
```

## Architecture

### Monorepo Structure
```
src/apps/
  api/                   # NestJS backend (port 3000)
  web/                   # Vite frontend (port 3001)
src/shared/              # Shared DTO types workspace (@pytoya/shared)
openspec/                # Spec-driven development
```

### Backend (NestJS API)
- **Entry Point**: `src/apps/api/src/main.ts`
- **Modules**: Feature-based organization (auth, projects, extraction, manifests, schemas, models, prompts, etc.)
- **Database**: TypeORM with PostgreSQL, entities in `src/entities/`, migrations in `src/database/migrations/`
- **Job Queue**: BullMQ with Redis for async extraction jobs
- **WebSocket**: Gateway at `src/websocket/websocket.gateway.ts` for real-time progress updates
- **Schemas**: Name/description derived from JSON Schema `title`/`description`; required fields derived from JSON Schema `required`; UI field order via `x-ui-order` on property schemas (Postgres `jsonb` reorders keys)
- **Text Extractor Development**: See `docs/TEXT_EXTRACTOR_DEVELOPMENT.md` for adding new extractors

### Backend Guardrails (NestJS)
- See `docs/nestjs-coding-agent-guardrails.md` for required patterns (validation, config, errors, DTOs)

### Frontend (Vite Web)
- **Framework**: Vite + React Router (`src/apps/web/src/routes`)
- **API Client**: Axios with centralized config in `src/apps/web/src/api/client.ts`
- **State Management**: Zustand stores in `src/apps/web/src/shared/stores` with hooks in `src/apps/web/src/shared/hooks`
- **Components**: Shared components in `src/apps/web/src/shared/components`
- **UI System**: shadcn/ui components in `src/apps/web/src/shared/components/ui`
- **Schema-Driven Audit UI**: `deriveSchemaAuditFields` / `deriveExtractionHintMap` support local `$ref` and basic `allOf`
- **Z-Index Scale**: Use `src/apps/web/src/styles/z-index.css` with `z-[var(--z-index-...)]`
- **Status Badges**: Use `src/apps/web/src/shared/styles/status-badges.ts` for manifest status colors
- **Empty States**: Use `src/apps/web/src/shared/components/EmptyState.tsx`
- **Theme**: Use `src/apps/web/src/shared/providers/ThemeProvider.tsx` and `ThemeToggle` for light/dark mode
- **Project Settings**: Settings dropdown + pages live under `src/apps/web/src/routes/dashboard` (basic/models/extractors/costs)
- **Project Creation**: Quick Create uses `ProjectWizard`; Guided Setup uses `GuidedSetupWizard` (select text extractor + LLM)
- **Routing & UX**: Route protection, error boundaries, and accessibility basics in `docs/WEB_APP.md`

### Database Schema (12 Entities)
```
UserEntity → ProjectEntity → GroupEntity → ManifestEntity → ManifestItemEntity
                                  ↓
                              SchemaEntity (JSON schemas for extraction)
                                    ↓
                      ExtractionHistoryEntity (audit trail)

ModelEntity → ProjectEntity
ExtractorEntity → ProjectEntity → ManifestEntity
PromptEntity
 JobEntity (BullMQ jobs)
 ```

### Schema Prompt Rules (Markdown)
- `SchemaEntity.validationSettings.promptRulesMarkdown` stores a single Markdown block that is appended to the LLM system prompt during extraction (used for OCR corrections, extraction rules, cross verification, etc.).

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
- **Type**: Remote HTTP service (configured via PADDLEOCR_BASE_URL; PADDLEOCR_ENDPOINT optional)
- **Key Parameters**: useDocOrientationClassify, useLayoutDetection, prettifyMarkdown

### LLM Integration
- **Models**: Adapter-based LLM models using OpenAI-compatible endpoints (OpenAI, SiliconFlow, custom endpoints)
- **API Format**: chat.completions
- **Retry Logic**: Automatic retry with enhanced OCR on validation failure

### OCR Result Caching
- **Service**: `src/apps/api/src/ocr/ocr-cache.util.ts`
- **Storage**: OCR results are cached in `ManifestEntity.ocrResult` (JSONB column)
- **Quality Scoring**: `calculateOcrQualityScore()` computes 0-100 score based on:
  - Text coverage (30%): detected text vs expected text per page
  - Average confidence (40%): mean confidence of all detected elements
  - Layout detection (20%): whether layout elements/tables were detected
  - Language match (10%): whether expected language was detected
- **Quality Scores**:
  - 90+: Excellent (high confidence, good layout)
  - 70-89: Good (acceptable quality)
  - <70: Poor (may need manual review or re-processing)
- **Quality Scoring**: `calculateOcrQualityScore()` in `src/apps/api/src/ocr/ocr-cache.util.ts`
- **Re-processing**: Use `force=true` query parameter to re-run OCR for existing results

### Cost Tracking (Text + LLM)
- **Services**:
  - Text extractor pricing: `src/apps/api/src/text-extractor/`
  - LLM pricing: `src/apps/api/src/models/model-pricing.service.ts`
- **Precision**: Costs are calculated using nano-unit bigint helpers (1e-9) and converted back to `number` for storage/DTOs to avoid floating point drift.
- **Text Cost Calculation**:
  ```
  Text Cost = (Number of Pages) × Price Per Page
  If minimumCharge is set:
    Text Cost = max(calculated cost, minimumCharge)
  ```
- **LLM Cost Calculation**:
  ```
  Input Cost = (Input Tokens / 1,000,000) × Input Price
  Output Cost = (Output Tokens / 1,000,000) × Output Price
  LLM Cost = Input Cost + Output Cost
  If minimumCharge is set:
    LLM Cost = max(calculated cost, minimumCharge)
  ```
- **LLM Pricing Structure** (`ModelEntity.pricing.llm`):
  ```typescript
  {
    llm?: {
      inputPrice: number,         // Per 1M input tokens
      outputPrice: number,        // Per 1M output tokens
      currency: string,
      minimumCharge?: number
    }
  }
  ```
- **Extractor Pricing Structure** (`ExtractorEntity.config.pricing`):
  ```typescript
  {
    mode: 'token' | 'page' | 'fixed' | 'none',
    currency: string,
    inputPricePerMillionTokens?: number,
    outputPricePerMillionTokens?: number,
    pricePerPage?: number,
    fixedCost?: number,
    minimumCharge?: number
  }
  ```
- **Pricing History**: All pricing changes are archived in `ModelEntity.pricingHistory` with effectiveDate/endDate
- **Currency**: Currency is taken from pricing/metadata (no default USD fallback); when costs span multiple currencies, total cost is represented as `null` and callers should display per-currency totals.
- **Cost Tracking**: Extractions record costs in `JobEntity` (estimated/actual + `costCurrency`) and in `ManifestEntity` (`textCost`, `llmCost`, `extractionCost`, `extractionCostCurrency`).
- **WebSocket Events**: `job-update` and `manifest-update` include `costBreakdown` with `text`, `llm`, `total` (nullable when mixed currencies), and `currency` (nullable).
- **Cost Dashboard Metrics**: `GET /api/metrics/cost-dashboard` returns currency-grouped totals + LLM/token and text/page breakdowns for embedded dashboard widgets.
- **Frontend State**: `src/apps/web/src/shared/stores/extraction.ts` tracks accumulated costs with `addCost(amount, type)` where type is `'text'`, `'llm'`, or `'total'`
- **Global Jobs Panel**: `src/apps/web/src/shared/components/JobsPanel.tsx` + `src/apps/web/src/shared/stores/jobs.ts` track in-progress jobs across navigation and subscribe to manifest updates via `useWebSocket`
- **Cached OCR**: When OCR is reused from `ManifestEntity.ocrResult`, `TextExtractionMetadata.estimated` is set and `costBreakdown.text` is treated as `0` (no new text extraction usage for that job).

## Configuration

### API Configuration
The API uses `src/apps/api/config.yaml` as its single source of truth for runtime configuration. The file is parsed as a Handlebars template and validated against the schema defined in `src/apps/api/src/config/env.validation.ts`.

**Required environment variables** (used by template placeholders):
- `DB_PASSWORD`
- `JWT_SECRET`
- `LLM_API_KEY`

**Override config path**: Set the `CONFIG_PATH` environment variable to use a different config file location.

**Local env file (dev)**: `src/apps/api/.env.local` is intended for local development and can be generated with `scripts/setup-dev-k8s-deps.ps1`. `npm run dev:api` loads it automatically.

Key configuration sections:
- `server`: port, logLevel
- `database`: host, port, username, password, database
  - `redis`: host, port
  - `jwt`: secret, expiration
  - `paddleocr`: baseUrl (endpoint optional)
  - `llm`: apiKey
  - `security`: cors, rateLimit, accountLockout, passwordPolicy, usernamePolicy
  - `admin`: username, password (optional)

### Security Notes
- `/uploads` is protected by JWT and file ownership checks (admins bypass ownership).
- Password policy enforces length, uppercase/lowercase, number, and special character requirements.
- Username policy enforces length and pattern (starts with a letter, alphanumeric, `_` or `-`).
- Accounts lock after repeated failed logins (configurable thresholds).
- Responses include `X-Request-ID` for tracing and error correlation.

See `docs/SECURITY.md` for config defaults and environment overrides.

### Required for Web (.env.local)
```
VITE_API_URL
VITE_WS_URL
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

### Web Data Fetching
- Use React Query (`@tanstack/react-query`) for server state
- Use Zustand for client state (auth, UI state)
- API client modules in `src/apps/web/src/api` (e.g., `projects.ts`, `schemas.ts`)

### Web Forms and Validation
- Use React Hook Form with Zod schemas in `src/apps/web/src/shared/schemas`
- Prefer shadcn/ui form primitives for inputs, labels, and errors

### Web Internationalization (i18n)
- Prefer `t(key, vars?)` for all user-facing UI strings
- Add/modify translations in `docs/I18N.md` and the locale catalogs under `src/apps/web/src/shared/i18n`
- Use stable keys like `nav.projects` and `errors.PROJECT_NOT_FOUND` (avoid English-as-key)

### Manifests List Filtering
- `GET /api/groups/:groupId/manifests` supports server-side filtering, sorting, and pagination.
- Query params: `filter[fieldPath]=value`, `sortBy=fieldPath`, `order=asc|desc`, `page`, `pageSize`.
- Additional filters: `status`, `poNo`, `department`, `dateFrom`, `dateTo`, `humanVerified`, `confidenceMin`, `confidenceMax`.
- When any filter/sort/pagination params are present, responses are `{ data, meta }` with `meta: { total, page, pageSize, totalPages }`. Without params, the endpoint returns a plain array for backward compatibility.
- Field paths use dot-notation and are validated (letters/numbers/underscore only, no array indexing).

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
