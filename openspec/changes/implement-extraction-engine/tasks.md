## 1. Implementation

- [ ] 6.1 Create extraction module structure
- [ ] 6.2 Port PaddleOCR-VL client to TypeScript (ocr-client.service.ts, ocr.types.ts)
- [ ] 6.3 Port OpenAI LLM client to TypeScript (llm-client.service.ts, llm.types.ts)
- [ ] 6.4 Port Python prompts to TypeScript templates (prompts.service.ts)
- [ ] 6.5 Create workflow service with state machine (workflow.service.ts)
)
- [ ] 6.6 Implement workflow nodes (validate_input, ocr_processing, extraction, save_result)
- [ ] 6.7 Implement retry logic with exponential backoff
- [ ] 6.8 Create jobs module (jobs.module.ts, jobs.service.ts)
- [ ] 6.9 Set up BullMQ queues and manifest processor
- [ ] 6.10 Implement job tracking in database (Job entity)
- [ ] 6.11 Create extraction trigger API endpoint
- [ ] 6.12 Add re-extract field API endpoint
- [ ] 6.13 Test extraction workflow end-to-end
