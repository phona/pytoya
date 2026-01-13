# Change: Provider & Prompt Management + Project Config

## Why
Users need to configure multiple LLM providers (PaddleX, OpenAI-compatible), manage custom prompt templates, and set project-level defaults for context engineering.

## What Changes
- Create provider CRUD APIs (PaddleX, OpenAI-compatible)
- Implement provider types and validation
- Add test connection functionality
- Create prompt CRUD APIs
- Implement prompt types (system, re_extract)
- Create prompt editor with variable suggestions
- Add project-provider association
- Add project-prompt configuration
- Build management UI (provider list, provider form, prompt editor)
- Add project settings UI for default provider/prompt
- Port existing Python prompts to TypeScript

## Impact
- Affected specs: New provider-management capability
- Affected code: New providers and prompts modules, frontend management pages
