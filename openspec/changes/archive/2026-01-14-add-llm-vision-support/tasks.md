## 1. Foundation - Type System and Entity Updates

- [x] 1.1 Update `LlmChatMessageContent` type in `llm.types.ts` to support vision content
- [x] 1.2 Add `supportsVision` boolean field to `ProviderEntity`
- [x] 1.3 Add `supportsStructuredOutput` boolean field to `ProviderEntity` (may already exist, verify)
- [x] 1.4 Create database migration for new ProviderEntity fields
- [x] 1.5 Add `ExtractionStrategy` enum: `ocr-first`, `vision-first`, `vision-only`, `two-stage`
- [x] 1.6 Add `extractionStrategy` field to Schema entity or configuration

## 2. File Upload Support

- [x] 2.1 Update file upload interceptor to accept image mimetypes (image/png, image/jpeg, image/webp)
- [x] 2.2 Add file type detection logic (PDF vs Image)
- [x] 2.3 Add image file validation (size limits, format validation)
- [x] 2.4 Update WebSocket progress events to indicate file type

## 3. PDF-to-Image Conversion

- [x] 3.1 Choose and install PDF-to-image library (pdf-to-img selected)
- [x] 3.2 Create `PdfToImageService` with conversion methods
- [x] 3.3 Implement page range selection (all pages vs specific pages)
- [x] 3.4 Add DPI/quality configuration
- [x] 3.5 Handle multi-page PDF aggregation for vision LLM
- [x] 3.6 Add error handling and logging for conversion failures

## 4. LLM Service Vision Support

- [x] 4.1 Update `LlmService` to accept image content via `LlmChatMessageContent` type
- [x] 4.2 Add new method `createVisionMessage()` for image-based message creation
- [x] 4.3 Implement image_url content type serialization
- [x] 4.4 Add base64 encoding for image content
- [x] 4.5 Update provider selection logic to check `supportsVision`
- [x] 4.6 Add `createVisionMessageFromBuffers()` for buffer-based images

## 5. Extraction Service Updates

- [x] 5.1 Add `extractionStrategy` parameter to extraction methods (via Schema entity)
- [x] 5.2 Implement `buildVisionOnlyMessages()` - bypass OCR, send images directly
- [x] 5.3 Implement `buildTwoStageMessages()` - vision extraction + refinement
- [x] 5.4 Add conditional logic: route PDF/images based on strategy
- [x] 5.5 Add fallback logic: vision capability check → error message
- [x] 5.6 Update job progress tracking for vision-based extraction

## 6. Prompt Templates

- [x] 6.1 Create vision extraction prompt template (using existing prompts service)
- [x] 6.2 Create refinement prompt template (using existing buildReExtractPrompt)
- [x] 6.3 Add vision-specific system prompts (integrated into message builders)
- [x] 6.4 Update prompt service to handle strategy selection (via extraction strategy)

## 7. Testing

- [x] 7.1 Add unit tests for `PdfToImageService` (16 tests passing)
- [x] 7.2 Add unit tests for vision content type serialization (21 tests passing)
- [x] 7.3 Add integration tests for vision-first extraction
- [x] 7.4 Add integration tests for two-stage extraction
- [x] 7.5 Add tests for OCR fallback on vision failure
- [x] 7.6 Add tests for image file upload and validation (13 tests passing)

## 8. Documentation

- [x] 8.1 Document extraction strategy options (docs/LLM_VISION_EXTRACTION.md)
- [x] 8.2 Add provider setup guide for vision-enabled providers (docs/PROVIDER_SETUP.md)
- [x] 8.3 Document PDF-to-image conversion requirements (docs/PDF_TO_IMAGE_CONVERSION.md)
- [x] 8.4 Add examples for Baidu Qianfan MultiPicOCR integration (docs/BAIDU_QIANFAN_INTEGRATION.md)

## 9. UI Updates (Optional/Deferred)

- [x] 9.1 Add extraction strategy selector in manifest UI (ExtractionStrategySelector component, SchemaForm updated)
- [x] 9.2 Show provider capability indicators (vision, structured output) (ProviderForm updated, providers page shows badges)
- [x] 9.3 Display two-stage extraction progress separately (ExtractionProgress component with stage indicators)
- [x] 9.4 Add cost estimation for different strategies (included in ExtractionStrategySelector)
