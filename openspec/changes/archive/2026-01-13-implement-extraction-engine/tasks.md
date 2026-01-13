## 1. Implementation

- [x] 6.1 Create extraction module structure
- [x] 6.2 Port PaddleOCR-VL client to TypeScript (ocr-client.service.ts, ocr.types.ts)
- [x] 6.3 Port OpenAI LLM client to TypeScript (llm-client.service.ts, llm.types.ts)
- [x] 6.4 Port Python prompts to TypeScript templates (prompts.service.ts)
- [x] 6.5 Create workflow service with state machine (workflow.service.ts)
- [x] 6.6 Implement workflow nodes (validate_input, ocr_processing, extraction, save_result)
- [x] 6.7 Implement retry logic with exponential backoff
- [x] 6.8 Create jobs module (jobs.module.ts, jobs.service.ts)
- [x] 6.9 Set up BullMQ queues and manifest processor
- [x] 6.10 Implement job tracking in database (Job entity)
- [x] 6.11 Create extraction trigger API endpoint
- [x] 6.12 Add re-extract field API endpoint
- [x] 6.13 Test extraction workflow end-to-end
