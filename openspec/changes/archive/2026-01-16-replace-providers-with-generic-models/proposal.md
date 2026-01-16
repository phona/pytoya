# Proposal: Replace Providers with Generic Adapter-Based Model System

## Metadata

- **ID**: `replace-providers-with-generic-models`
- **Title**: Replace Providers with Generic Adapter-Based Model System
- **Status**: Draft
- **Created**: 2025-01-15
- **Author**: AI Assistant
- **Type**: Refactoring
- **Priority**: P1 (blocks proper model configuration in UI)

## Problem Statement

The current provider-based architecture has several issues:

1. **Rigid Schema**: Adding new provider types requires database schema changes
2. **Type Confusion**: Two separate entities (`ProviderEntity` and `LlmProviderEntity`) serve similar purposes
3. **Poor Separation**: Projects reference providers via string IDs that are converted to integers internally
4. **No Adapter Abstraction**: Each provider is tightly coupled to its implementation
5. **Limited Extensibility**: Adding new providers (e.g., Anthropic, Azure) requires significant code changes

### Current Architecture Issues

```
ProviderEntity (integer ID)
├── name: string
├── type: enum (PADDLEX, OPENAI, CUSTOM)
├── baseUrl: string
├── apiKey: string
├── modelName: string
├── temperature: number
└── supportsVision: boolean

LlmProviderEntity (UUID ID) - unused, duplicate
├── name: string
├── type: enum (paddlex, openai, anthropic)
├── api_key: string
├── base_url: string
└── config: JSONB

ProjectEntity
└── defaultProviderId: string (intended for UUID, used as integer)
```

This creates:
- Type mismatches (string vs integer IDs)
- Duplicate functionality
- No clear separation between OCR and LLM models
- Difficult to add new adapter types

## Proposed Solution

Replace the rigid provider system with a **generic adapter-based model architecture**:

1. **Single `ModelEntity`** with dynamic JSONB parameters
2. **Adapter Schema Registry** - each adapter declares its own parameters
3. **Capability-based Filtering** - models declare capabilities (ocr, llm, vision)
4. **Type-safe Validation** - server validates parameters against adapter schemas
5. **Dynamic UI Generation** - frontend renders forms based on adapter schemas

### New Architecture

```
ModelEntity (UUID ID)
├── id: UUID
├── name: string
├── adapterType: string (e.g., 'paddlex', 'openai', 'anthropic')
├── parameters: JSONB (dynamic per-adapter configuration)
├── description: string | null
└── isActive: boolean

Adapter Schema Registry
├── paddlex.adapter.ts
│   └── schema: { baseUrl, apiKey, timeout, maxRetries }
├── openai.adapter.ts
│   └── schema: { baseUrl, apiKey, modelName, temperature, maxTokens, supportsVision, supportsStructuredOutput }
└── anthropic.adapter.ts (future)
    └── schema: { apiKey, modelName, temperature, maxTokens, version }

ProjectEntity
├── ocrModelId: UUID (references Model with 'ocr' capability)
└── llmModelId: UUID (references Model with 'llm' capability)
```

## Benefits

1. **Extensibility**: Add new adapters by creating schema files, no schema changes
2. **Type Safety**: TypeScript types generated from schemas
3. **Self-Documenting**: `/models/adapters` endpoint returns all available schemas
4. **Validation**: Server validates parameters against adapter schema
5. **UI-Friendly**: Frontend dynamically renders forms based on schema
6. **Clear Separation**: OCR models vs LLM models with capability-based filtering
7. **Single Source of Truth**: One `ModelEntity` replaces two provider entities

## Impact on Existing Features

### Modified
- **provider-prompt-config spec**: Update to use models instead of providers
- **extraction service**: Use `ModelEntity` instead of `ProviderEntity`
- **projects module**: Update to use `ocrModelId` and `llmModelId`

### Removed
- **ProviderEntity**: Deleted with migration
- **LlmProviderEntity**: Deleted with migration
- **providers module**: Replaced by models module

### Added
- **ModelEntity**: New entity with JSONB parameters
- **models module**: CRUD for models with adapter validation
- **adapter registry**: Service for managing adapter schemas
- **/models/adapters endpoint**: Returns available adapter schemas

## Success Criteria

1. Users can configure PaddleX OCR models via web UI
2. Users can configure OpenAI-compatible LLM models via web UI
3. Projects can select default OCR and LLM models
4. Adding new adapter types requires only schema file, no schema changes
5. All existing provider functionality is preserved
6. Tests pass with new model system

## Dependencies

- **Database**: Requires migration to create `models` table and update `projects` table
- **Backend**: NestJS models module with adapter registry
- **Frontend**: Dynamic form component that renders based on adapter schemas

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss from dropping provider tables | Create migration to preserve existing configurations (optional) |
| Type safety issues with JSONB parameters | Validate against schemas at DTO level |
| Complex frontend form generation | Start with hardcoded forms for PaddleX/OpenAI, generalize later |
| Breaking changes to extraction service | Update service to use models module with fallback logic |

## Open Questions

1. **API Key Storage**: Should API keys be encrypted in the database? (Recommended for production)
2. **Migration Strategy**: Should existing provider configurations be migrated to models?
3. **Adapter Scope**: Should adapters handle both configuration AND execution, or just configuration?
4. **Default Models**: How should the system handle projects without configured models?

## Alternatives Considered

### Alternative 1: Separate OCR and LLM Model Tables
- **Pros**: Strong typing, clear separation
- **Cons**: Requires schema changes for new adapter types, less flexible
- **Decision**: Rejected in favor of JSONB approach

### Alternative 2: Keep Provider Entity, Add Dynamic Config
- **Pros**: Less breaking change
- **Cons**: Still rigid, doesn't solve type confusion
- **Decision**: Rejected, full replacement is cleaner

### Alternative 3: Use NoSQL for Model Configuration
- **Pros**: Fully flexible schema
- **Cons**: Adds another database technology, complexity
- **Decision**: Rejected, JSONB in PostgreSQL is sufficient

## References

- Current provider-prompt-config spec: `openspec/specs/provider-prompt-config/spec.md`
- Database spec: `openspec/specs/database/spec.md`
- Backend standards: `openspec/specs/backend-standards/spec.md`
