# Design: Generic Adapter-Based Model System

## Overview

This document describes the technical design for replacing the rigid provider-based architecture with a flexible, adapter-based model system.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web UI Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ModelsPage.tsx                                                 │
│  ├── Dynamic ModelForm (renders based on adapter schema)        │
│  └── Model Selection (filtered by capability: ocr, llm)         │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ModelsController                                               │
│  ├── GET  /models              - List all models                │
│  ├── POST /models              - Create model (validated)       │
│  ├── GET  /models/:id          - Get model details              │
│  ├── PATCH /models/:id         - Update model                   │
│  ├── DELETE /models/:id        - Delete model                   │
│  ├── GET  /models/adapters     - List adapter schemas           │
│  └── POST /models/:id/test     - Test model connection          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ModelsService                                                  │
│  ├── CRUD operations                                            │
│  ├── Adapter validation                                         │
│  └── Connection testing                                         │
│                                                                 │
│  AdapterRegistry                                                │
│  ├── getAdapterSchema(type)                                    │
│  ├── validateParameters(type, params)                          │
│  └── listAdapters()                                            │
│                                                                 │
│  PaddleXAdapterService                                          │
│  └── execute(config, input) -> OCR result                      │
│                                                                 │
│  OpenAIAdapterService                                           │
│  └── execute(config, input) -> LLM completion                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  ModelEntity                                                    │
│  ├── id: UUID                                                   │
│  ├── name: string                                               │
│  ├── adapterType: string                                        │
│  ├── parameters: JSONB                                          │
│  ├── description: string | null                                 │
│  └── isActive: boolean                                          │
│                                                                 │
│  ProjectEntity                                                  │
│  ├── ocrModelId: UUID | null                             │
│  └── llmModelId: UUID | null                             │
└─────────────────────────────────────────────────────────────────┘
```

## Adapter Schema Format

Each adapter declares its schema using a standardized format:

```typescript
interface AdapterSchema {
  type: string;              // Unique identifier (e.g., 'paddlex', 'openai')
  name: string;              // Display name
  description: string;       // User-facing description
  category: 'ocr' | 'llm';   // Model category
  parameters: {
    [key: string]: ParameterDefinition;
  };
  capabilities: string[];    // ['ocr'], ['llm'], ['llm', 'vision']
}

interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'enum';
  required: boolean;
  default?: any;
  label: string;             // Display label
  placeholder?: string;
  secret?: boolean;          // Mask in UI (e.g., API keys)
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  helpText?: string;
}
```

## Adapter Implementations

### PaddleX Adapter

```typescript
// src/apps/api/src/models/adapters/paddlex.adapter.ts
export const PaddlexAdapterSchema: AdapterSchema = {
  type: 'paddlex',
  name: 'PaddleX OCR',
  description: 'PaddleOCR-VL for invoice OCR processing',
  category: 'ocr',
  parameters: {
    baseUrl: {
      type: 'string',
      required: true,
      label: 'Base URL',
      placeholder: 'http://localhost:8080',
      helpText: 'PaddleOCR-VL service endpoint',
    },
    apiKey: {
      type: 'string',
      required: false,
      label: 'API Key',
      secret: true,
      helpText: 'Optional API key if PaddleOCR requires authentication',
    },
    timeout: {
      type: 'number',
      required: false,
      default: 60000,
      label: 'Timeout (ms)',
      validation: { min: 1000, max: 300000 },
    },
    maxRetries: {
      type: 'number',
      required: false,
      default: 3,
      label: 'Max Retries',
      validation: { min: 0, max: 10 },
    },
  },
  capabilities: ['ocr'],
};

export class PaddlexAdapterService {
  async execute(parameters: Record<string, unknown>, input: OCRInput): Promise<OCRResult> {
    // Implementation for PaddleOCR-VL API call
  }
}
```

### OpenAI Adapter

```typescript
// src/apps/api/src/models/adapters/openai.adapter.ts
export const OpenaiAdapterSchema: AdapterSchema = {
  type: 'openai',
  name: 'OpenAI-Compatible',
  description: 'OpenAI API compatible LLMs (GPT-4, Claude, etc.)',
  category: 'llm',
  parameters: {
    baseUrl: {
      type: 'string',
      required: true,
      label: 'Base URL',
      placeholder: 'https://api.openai.com/v1',
      helpText: 'OpenAI-compatible API endpoint',
    },
    apiKey: {
      type: 'string',
      required: true,
      label: 'API Key',
      secret: true,
    },
    modelName: {
      type: 'string',
      required: true,
      label: 'Model Name',
      placeholder: 'gpt-4',
      helpText: 'Model to use for completions',
    },
    temperature: {
      type: 'number',
      required: false,
      default: 0.7,
      label: 'Temperature',
      validation: { min: 0, max: 2 },
    },
    maxTokens: {
      type: 'number',
      required: false,
      default: 4096,
      label: 'Max Tokens',
      validation: { min: 1, max: 128000 },
    },
    supportsVision: {
      type: 'boolean',
      required: false,
      default: false,
      label: 'Supports Vision',
      helpText: 'Can process images directly',
    },
    supportsStructuredOutput: {
      type: 'boolean',
      required: false,
      default: false,
      label: 'Structured Output',
      helpText: 'Enforces JSON schema compliance',
    },
  },
  capabilities: ['llm', 'vision'], // vision is conditional
};

export class OpenaiAdapterService {
  async execute(parameters: Record<string, unknown>, input: LLMInput): Promise<LLMResult> {
    // Implementation for OpenAI-compatible API call
  }
}
```

## Database Schema

### Models Table

```sql
CREATE TABLE "models" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR NOT NULL,
  "adapter_type" VARCHAR NOT NULL,
  "parameters" JSONB NOT NULL DEFAULT '{}',
  "description" VARCHAR,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now(),
  CONSTRAINT "models_adapter_type_check" CHECK ("adapter_type" IN ('paddlex', 'openai', 'anthropic'))
);

CREATE INDEX "models_adapter_type_idx" ON "models"("adapter_type");
CREATE INDEX "models_is_active_idx" ON "models"("is_active");
CREATE INDEX "models_category_idx" ON "models"(
  (CASE
    WHEN "adapter_type" = 'paddlex' THEN 'ocr'
    WHEN "adapter_type" IN ('openai', 'anthropic') THEN 'llm'
    ELSE 'unknown'
  END)
);
```

### Projects Table Update

```sql
ALTER TABLE "projects"
DROP COLUMN IF EXISTS "default_provider_id",
ADD COLUMN "ocr_model_id" UUID REFERENCES "models"("id") ON DELETE SET NULL,
ADD COLUMN "llm_model_id" UUID REFERENCES "models"("id") ON DELETE SET NULL;
```

### Drop Old Tables

```sql
DROP TABLE IF EXISTS "providers" CASCADE;
DROP TABLE IF EXISTS "llm_providers" CASCADE;
DROP TYPE IF EXISTS "provider_type_enum";
DROP TYPE IF EXISTS "llm_provider_type_enum";
```

## API Contract

### List Models

```http
GET /api/models
```

Response:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "PaddleX Production",
      "adapterType": "paddlex",
      "description": "Production PaddleOCR service",
      "category": "ocr",
      "parameters": {
        "baseUrl": "http://paddlex:8080",
        "timeout": 60000,
        "maxRetries": 3
      },
      "isActive": true,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### Get Adapter Schemas

```http
GET /api/models/adapters
```

Response:
```json
{
  "data": [
    {
      "type": "paddlex",
      "name": "PaddleX OCR",
      "description": "PaddleOCR-VL for invoice OCR processing",
      "category": "ocr",
      "parameters": {
        "baseUrl": { "type": "string", "required": true, "label": "Base URL" },
        "apiKey": { "type": "string", "required": false, "label": "API Key", "secret": true },
        "timeout": { "type": "number", "required": false, "default": 60000 },
        "maxRetries": { "type": "number", "required": false, "default": 3 }
      },
      "capabilities": ["ocr"]
    },
    {
      "type": "openai",
      "name": "OpenAI-Compatible",
      "description": "OpenAI API compatible LLMs",
      "category": "llm",
      "parameters": {
        "baseUrl": { "type": "string", "required": true },
        "apiKey": { "type": "string", "required": true, "secret": true },
        "modelName": { "type": "string", "required": true },
        "temperature": { "type": "number", "required": false, "default": 0.7 },
        "maxTokens": { "type": "number", "required": false, "default": 4096 },
        "supportsVision": { "type": "boolean", "required": false, "default": false },
        "supportsStructuredOutput": { "type": "boolean", "required": false, "default": false }
      },
      "capabilities": ["llm", "vision"]
    }
  ]
}
```

### Create Model

```http
POST /api/models
Content-Type: application/json

{
  "name": "GPT-4 Production",
  "adapterType": "openai",
  "description": "OpenAI GPT-4 for production",
  "parameters": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "modelName": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 8192,
    "supportsVision": true,
    "supportsStructuredOutput": true
  }
}
```

## Frontend Components

### Dynamic Model Form

```typescript
// src/apps/web/src/shared/components/ModelForm.tsx
interface ModelFormProps {
  model?: Model;
  adapterType: string;
  onSubmit: (data: CreateModelDto | UpdateModelDto) => Promise<void>;
}

// Renders fields dynamically based on adapter schema:
// - Input fields for string parameters
// - Number inputs for numeric parameters (with min/max validation)
// - Checkboxes for boolean parameters
// - Select dropdowns for enum parameters
// - Password fields for secret parameters
// - Help text for each parameter
```

### Models Page

```typescript
// src/apps/web/src/routes/dashboard/ModelsPage.tsx
// - Tabbed interface: OCR Models | LLM Models
// - List of models with adapter type badge
// - Create/Edit/Delete buttons
// - Test connection button
// - Active/Inactive toggle
```

## Validation Strategy

### Backend Validation (DTO)

```typescript
// src/apps/api/src/models/dto/create-model.dto.ts
export class CreateModelDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsEnum(['paddlex', 'openai', 'anthropic'])
  adapterType!: string;

  @IsObject()
  @ValidateNested()
  parameters!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  description?: string;
}

// Custom validator to check parameters against adapter schema
export class ValidateParametersConstraint implements ValidatorConstraintInterface {
  validate(parameters: unknown, args: ValidationArguments) {
    const adapterType = (args.object as any).adapterType;
    const schema = adapterRegistry.getSchema(adapterType);
    return schema.validate(parameters);
  }
}
```

### Frontend Validation

```typescript
// Dynamic validation based on adapter schema
// - Required field validation
// - Type validation (string, number, boolean)
// - Min/max validation for numbers
// - Pattern validation for strings
```

## Migration Strategy

### Phase 1: Create New Tables (Non-Breaking)

1. Create `models` table
2. Add `ocr_model_id` and `llm_model_id` to `projects`
3. Keep old `providers` and `llm_providers` tables

### Phase 2: Implement New Module

1. Create models module alongside providers module
2. Update extraction service to support both old and new
3. Create frontend UI for models

### Phase 3: Migrate Data (Optional)

1. Create migration script to convert providers to models
2. Run data migration
3. Verify data integrity

### Phase 4: Remove Old Module

1. Drop old provider tables
2. Remove providers module
3. Update all references

## Security Considerations

### API Key Storage

**Recommendation**: Use PostgreSQL pgcrypto for encryption at rest

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt API keys before storing
INSERT INTO models (name, adapter_type, parameters)
VALUES (
  'OpenAI Production',
  'openai',
  jsonb_set(
    '{"baseUrl": "https://api.openai.com/v1", "modelName": "gpt-4"}'::jsonb,
    '{apiKey}',
    pgp_sym_encrypt('sk-...', 'encryption_key')
  )::jsonb
);

-- Decrypt when reading
SELECT pgp_sym_decrypt(parameters->>'apiKey'::bytea, 'encryption_key') AS api_key
FROM models WHERE adapter_type = 'openai';
```

### Access Control

- Only authenticated users can manage models
- Admins can view/edit all models
- Regular users can only view models (or based on project ownership)

## Testing Strategy

### Unit Tests

1. **Adapter Registry**
   - Schema retrieval by type
   - Parameter validation
   - Capability filtering

2. **Models Service**
   - CRUD operations
   - Adapter validation
   - Connection testing

3. **Adapter Services**
   - PaddleX execution
   - OpenAI execution
   - Error handling

### Integration Tests

1. **API Endpoints**
   - Create model with valid parameters
   - Reject model with invalid parameters
   - Test connection to real services

2. **Extraction Service**
   - Use models instead of providers
   - Fallback to config.yaml if no model configured

### E2E Tests

1. **Models Page**
   - Create model via UI
   - Edit model via UI
   - Delete model via UI
   - Test connection button

2. **Projects Page**
   - Select OCR model for project
   - Select LLM model for project
   - Verify models are used in extraction

## Future Extensibility

### Adding New Adapters

To add a new adapter (e.g., Anthropic):

1. Create schema file:
   ```typescript
   // src/apps/api/src/models/adapters/anthropic.adapter.ts
   export const AnthropicAdapterSchema: AdapterSchema = {
     type: 'anthropic',
     name: 'Anthropic',
     description: 'Anthropic Claude API',
     category: 'llm',
     parameters: { /* ... */ },
     capabilities: ['llm'],
   };
   ```

2. Register in adapter registry

3. Create adapter service:
   ```typescript
   export class AnthropicAdapterService {
     async execute(parameters, input): Promise<LLMResult> { /* ... */ }
   }
   ```

4. Update database constraint (if needed):
   ```sql
   ALTER TABLE "models" DROP CONSTRAINT "models_adapter_type_check";
   ALTER TABLE "models" ADD CONSTRAINT "models_adapter_type_check"
     CHECK ("adapter_type" IN ('paddlex', 'openai', 'anthropic'));
   ```

No schema changes required for new parameters!

### Conditional Capabilities

Adapters can declare conditional capabilities:

```typescript
capabilities: ['llm', 'vision'] // vision only if supportsVision = true
```

The system filters models based on actual parameter values.
