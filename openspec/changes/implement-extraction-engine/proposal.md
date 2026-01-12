# Change: TypeScript Extraction Engine + Job Queue

## Why
Current Python LangGraph workflow needs to be ported to TypeScript for integration with NestJS backend and BullMQ job queue.

## What Changes
- Port OCR client to TypeScript (`ocr-client.service.ts`)
- Port LLM client to TypeScript (`llm-client.service.ts`)
- Port prompts from Python to TypeScript templates
- Create workflow service (LangGraph equivalent in TS)
- Implement state management with retry logic
- Set up BullMQ queues and manifest extraction processor
- Implement job tracking in database
- Handle retry logic with exponential backoff

## Impact
- Affected specs: New extraction capability
- Affected code: Port Python workflow, OCR, LLM to TypeScript
