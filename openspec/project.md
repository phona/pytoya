# Project Context

## Purpose

**PyToYa** is an invoice processing system that automates data extraction from PDF documents using OCR and LLM technologies.

**Primary Goals**:
- Automate invoice data extraction from PDF documents with high accuracy
- Provide web-based UI for reviewing, editing, and managing extracted data
- Support project-level organization for multiple clients/jobs
- Enable real-time processing progress tracking
- Support multiple LLM providers with custom prompt engineering
- Maintain data integrity with proper database storage

## Tech Stack

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Job Queue**: BullMQ with Redis
- **Authentication**: JWT (Admin/User roles)
- **WebSockets**: Gateway for real-time updates
- **OCR**: PaddleOCR-VL remote service (TypeScript port)
- **LLM**: OpenAI-compatible API (OpenAI, SiliconFlow, custom endpoints)
- **Extraction Engine**: TypeScript port of LangGraph workflow

### Frontend
- **Framework**: Vite + React Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **WebSockets**: Native WebSocket API
- **Testing**: Vitest + React Testing Library + Playwright

### DevOps
- **Containerization**: Docker (local dev), Kubernetes (production)
- **Orchestration**: Docker Compose (local)
- **Storage**: Local filesystem with Kubernetes PVCs

## Project Conventions

### Code Style

#### Backend (NestJS)
- **Decorators**: Use class-validator decorators (IsString, IsOptional, IsEnum, etc.)
- **DTOs**: Use class-validator decorators for validation
- **Naming**: kebab-case for files, PascalCase for classes
- **Imports**: Organize alphabetically (external libs, internal modules)
- **Formatting**: Prettier with 2-space indent, single quotes

#### Frontend (Vite)
- **Components**: Functional components with hooks
- **Hooks**: Custom hooks prefix with `use` (e.g., useAuth, useProjects)
- **Naming**: PascalCase for components, camelCase for utilities
- **File Structure**: `index.tsx` for routes, `component.tsx` for components
- **Styling**: Tailwind utility classes, custom component variants
- **Type Safety**: Avoid `as any`, use proper TypeScript types

### Architecture Patterns

#### Monorepo Structure
- **Workspace**: npm workspaces with `src/apps/*` pattern
- **Shared Libraries**: Optional `src/libs/` for shared types and utilities
- **Module Organization**: Feature-based modules (auth, projects, extraction, etc.)
- **Dependency Injection**: Use NestJS providers for testability, avoid monkey patching

#### Layered Architecture
- **API Layer**: REST controllers → Services → Repositories
- **Job Queue Layer**: BullMQ processors separate from API layer
- **Database Layer**: TypeORM entities and repositories
- **WebSocket Layer**: Gateway decoupled from HTTP layer

### Testing Strategy

#### Backend Testing
- **Framework**: Jest with NestJS testing utilities
- **Mocking**: Use `Test.createTestingModule()` with `overrideProvider()` for DI mocking
- **Coverage Thresholds**: 70% (branches, functions, lines, statements)
- **Test Structure**: `*.spec.ts` co-located with source files
- **Anti-patterns**: Avoid global `jest.mock()`, avoid monkey patching

#### Frontend Testing
- **Framework**: Vitest + React Testing Library for unit tests
- **E2E Testing**: Playwright for end-to-end tests
- **Mocking**: MSW (Mock Service Worker) for API mocking in tests
- **Coverage Thresholds**: 60% (components, hooks, pages)
- **Test Structure**: `*.test.tsx` co-located, `*.e2e.spec.tsx` in e2e/ directory
- **Anti-patterns**: Avoid global mocks, prefer MSW handlers

### Git Workflow
- **Branching**: Feature branches from `main` (e.g., `feat/auth`, `refactor/extraction-engine`)
- **Commit Messages**: Conventional commits (feat:, fix:, refactor:, test:, docs:, chore:)
- **PR Process**: Draft PR → Self-review → Request review → Address feedback → Merge to `main`
- **Main Branch**: `main` for production-ready code

## Domain Context

### Invoice Processing Domain Knowledge

#### Document Types (PDF Invoices)
- **Standard Fields**: 
  - PO Number: 7-digit numeric ID (padded with zeros)
  - Invoice Date: YYYY-MM-DD format
  - Department Code: 4-5 digit code
  - Items: Material list with quantity, unit prices, totals
  - Summary: Subtotal, tax amount, grand total
  - Currency: CNY (Chinese Yuan)

#### PaddleOCR-VL OCR API
- **Purpose**: Remote service for document layout parsing and text extraction
- **Endpoint**: POST /layout-parsing
- **Input**: Base64-encoded PDF file
- **Output**: Structured layout + Markdown text with page segmentation
- **Key Parameters**: 
  - `useDocOrientationClassify`: Document orientation classification
  - `useDocUnwarping`: Document image unwarping
  - `useLayoutDetection`: Layout detection (tables, paragraphs)
  - `prettifyMarkdown`: Beautify Markdown output
  - `showFormulaNumber`: Include formula numbers in Markdown
- **Documentation**: https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/PaddleOCR-VL.html

#### LangGraph Workflow
- **State Machine**: Tracks processing state (PENDING → VALIDATING → OCR_PROCESSING → EXTRACTING → SAVING)
- **Nodes**: validate_input, ocr_processing, extraction, save_result, mark_failed
- **Conditional Routing**: Retry on failure with exponential backoff
- **State Persistence**: Maintains OCR results, extraction results, retry counts
- **Error Recovery**: Graceful degradation (failed files logged, batch continues)

#### LLM Extraction
- **Providers**: 
  - Primary: OpenAI (GPT-4, GPT-4o)
  - Compatible: SiliconFlow, Azure OpenAI, custom OpenAI-compatible endpoints
  - Configuration: API key, base URL, model name, temperature, max_tokens
- **Prompts**: System prompts for initial extraction, re-extraction prompts for corrections
- **Validation**: Required fields validation (department.code, invoice.po_no, items)
- **Re-extraction Logic**: On validation failure, provide previous result and missing fields to LLM
- **Retry Strategy**: Automatic retry with enhanced OCR parameters on second attempt

#### Mechanical Industry OCR Correction Patterns
Critical domain knowledge for accurate extraction from Chinese invoices:

- **Character Confusion (Common OCR Errors)**:
  - 0 ↔ O, 1 ↔ l, 5 ↔ S, 8 ↔ B
  - Example: "6OZZ" → "60ZZ", "PO-2023-0O1l5" → "PO-2023-00115"

- **Bearing Model Formats (Standard Patterns)**:
  - 深沟球轴承: 60XZZ, 62XZZ, 63XZZ (X is digit)
  - 角接触球轴承: 7XXXAC, 72XXX, 73XXX
  - 圆锥滚子轴承: 3XXX, 32XXX

- **Unit Standardization (强制标准化)**:
  - 公斤 → KG
  - 米 → M
  - 其他所有文字 → EA (piece, set, unit, case, box, jar, bottle, etc.)

- **Mechanical Equipment Terminology (Common OCR Errors)**:
  - 理弧焊机 → 埋弧焊机 ("理" is OCR error for "埋")
  - 理弧火罩用 → 埋弧焊罩用 ("理" → "埋", "火" → "焊")
  - 埋孤焊 → 埋弧焊 ("孤" is OCR error for "弧")
  - 埋孤焊机 → 埋弧焊机 ("孤" → "弧", "悍" → "焊")
  - 又车 → 叉车 ("又" is OCR error for "叉")
  - 车间配电柜 → 车间配电柜 ("和" is OCR error for "配")
  - 车间电柜 → 车间配电柜 (missing "配")

- **Common OCR Misinterpretations**:
  - "2个" → 27 (OCR often misreads "个" as number)
  - "5个" → 5S
  - "10个" → "1O个"
  - "20个" → "2O个"
  - Quantity in unit column when it's actually "单位" column value

#### Data Validation Rules
- **Unit Validation**: Unit must be one of KG, EA, or M (enforced by system)
- **PO Number**: Exactly 7 digits, padded with leading zeros if needed
- **Cross-Validation**: Compare purchase order data with delivery list for accuracy
- **Item Integrity**: Quantity × Unit Price ≈ Total Amount
- **Missing Fields**: Department code and PO number are required; Items list is required

#### Extraction Quality Metrics
- **Confidence Scoring**: 0.0-1.0 based on validation and cross-check results
- **Extraction Info**: Records OCR issues, uncertain fields, suggestions, improvement notes
- **Retry Reasons**: Track why re-extraction was triggered

## Important Constraints

### Technical Constraints
- **Single User Focus**: System designed for single-user deployment (Admin/User roles only)
- **Local Filesystem**: Uses Kubernetes PVCs for file storage (not cloud storage)
- **PaddleOCR-VL Dependency**: Requires remote PaddleOCR-VL service for OCR (external dependency)
- **OpenAI API Compatibility**: LLM providers must support chat.completions API format
- **Job Queue**: BullMQ requires Redis for queue management
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

### Business Constraints
- **Invoice Format**: Primarily Chinese-language invoices with specific field requirements
- **PO Number Format**: 7-digit numeric ID with zero-padding
- **Unit Requirements**: Must be KG/EA/M (三种之一)
- **Department Codes**: 4-5 digit codes matching organizational structure
- **Extraction Accuracy**: Critical for business operations, requires human verification

### Language Constraints
- **UI Language**: Application UI in English but domain concepts use Chinese terminology
- **Database Encoding**: UTF-8 support for Chinese characters
- **LLM Prompts**: System prompts use Chinese for examples and field descriptions

## External Dependencies

### PaddleOCR-VL Service
- **Purpose**: Remote OCR service for document layout parsing and text extraction
- **Type**: HTTP API (POST /layout-parsing)
- **Documentation**: https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/PaddleOCR-VL.html
- **Deployment**: Docker Compose (recommended) or pip install
- **Response**: Returns structured layout + Markdown text with page segmentation
- **Key Features**: Document orientation classification, image unwarping, layout detection, formula recognition

### OpenAI-Compatible LLM Providers
- **Primary**: OpenAI (GPT-4, GPT-4o)
- **Compatible Alternatives**: SiliconFlow, Azure OpenAI, self-hosted vLLM
- **Requirement**: Must support chat.completions API format
- **Configuration**: API key, base URL, model name, temperature, max_tokens
- **API Reference**: https://platform.openai.com/docs

### Kubernetes Resources
- **PostgreSQL**: ACID-compliant database with JSONB support for flexible data storage
- **Redis**: In-memory data store for job queue management and caching
- **Storage**: Persistent Volume Claims (PVCs) for database and file storage

### DevOps Tools
- **Containerization**: Docker for local development, Kubernetes for production
- **Orchestration**: Docker Compose for multi-service coordination
- **Secret Management**: Kubernetes Secrets for sensitive data (API keys, passwords)
- **ConfigMaps**: Environment variable configuration for non-sensitive settings

## OpenSpec Changes

The project is undergoing a major refactoring from CLI to web application. See `openspec/changes/` for detailed change proposals organized by capability.

### Active Proposals
- **P1**: setup-monorepo - Monorepo restructuring (NestJS + Next.js)
- **P2**: setup-database-orm - Database schema and TypeORM
- **P3**: setup-auth - Authentication and authorization (JWT, Admin/User roles)
- **P4**: implement-projects-groups - Projects and groups management
- **P5**: implement-manifest-upload - Manifest upload and storage (local filesystem)
- **P6**: implement-extraction-engine - TypeScript extraction engine + BullMQ job queue
- **P7**: implement-manifests-ui - Manifests list page + audit panel (with re-extract buttons)
- **P8**: implement-provider-prompt-management - Provider & prompt management + project-level config
- **P9**: implement-websocket-updates - Real-time updates via WebSocket
- **P10**: define-testing-standards - Testing standards (DI over monkey patching, structured test files)
- **P11**: deploy-kubernetes - Kubernetes deployment (PostgreSQL, Redis, API, Web, PVCs)
- **P12**: implement-csv-export - CSV export functionality (from database, not YAML)

### Completed Proposals
(No completed proposals yet - all active)
