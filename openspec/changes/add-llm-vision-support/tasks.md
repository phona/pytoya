## 1. Foundation - Type System and Entity Updates

- [ ] 1.1 Update `LlmChatMessageContent` type in `llm.types.ts` to support vision content
- [ ] 1.2 Add `supportsVision` boolean field to `ProviderEntity`
- [ ] 1.3 Add `supportsStructuredOutput` boolean field to `ProviderEntity` (may already exist, verify)
- [ ] 1.4 Create database migration for new ProviderEntity fields
- [ ] 1.5 Add `ExtractionStrategy` enum: `ocr-first`, `vision-first`, `vision-only`, `two-stage`
- [ ] 1.6 Add `extractionStrategy` field to Schema entity or configuration

## 2. File Upload Support

- [ ] 2.1 Update file upload interceptor to accept image mimetypes (image/png, image/jpeg, image/webp)
- [ ] 2.2 Add file type detection logic (PDF vs Image)
- [ ] 2.3 Add image file validation (size limits, format validation)
- [ ] 2.4 Update WebSocket progress events to indicate file type

## 3. PDF-to-Image Conversion

- [ ] 3.1 Choose and install PDF-to-image library (pdf-poppler or pdf2pic)
- [ ] 3.2 Create `PdfToImageService` with conversion methods
- [ ] 3.3 Implement page range selection (all pages vs specific pages)
- [ ] 3.4 Add DPI/quality configuration
- [ ] 3.5 Handle multi-page PDF aggregation for vision LLM
- [ ] 3.6 Add error handling and logging for conversion failures

## 4. LLM Service Vision Support

- [ ] 4.1 Update `LlmService.extractStructuredData()` to accept image content
- [ ] 4.2 Add new method `extractFromVision()` for image-based extraction
- [ ] 4.3 Implement image_url content type serialization
- [ ] 4.4 Add base64 encoding for image content
- [ ] 4.5 Update provider selection logic to check `supportsVision`
- [ ] 4.6 Add two-stage extraction method `extractWithRefinement()`

## 5. Extraction Service Updates

- [ ] 5.1 Add `extractionStrategy` parameter to extraction methods
- [ ] 5.2 Implement `executeVisionExtraction()` - bypass OCR, send images directly
- [ ] 5.3 Implement `executeTwoStageExtraction()` - vision extraction + refinement
- [ ] 5.4 Add conditional logic: route PDF/images based on strategy
- [ ] 5.5 Add fallback logic: vision failure → OCR
- [ ] 5.6 Update job progress tracking for vision-based extraction

## 6. Prompt Templates

- [ ] 6.1 Create vision extraction prompt template (raw data extraction)
- [ ] 6.2 Create refinement prompt template (raw → structured JSON)
- [ ] 6.3 Add vision-specific system prompts
- [ ] 6.4 Update prompt service to handle strategy selection

## 7. Testing

- [ ] 7.1 Add unit tests for `PdfToImageService`
- [ ] 7.2 Add unit tests for vision content type serialization
- [ ] 7.3 Add integration tests for vision-first extraction
- [ ] 7.4 Add integration tests for two-stage extraction
- [ ] 7.5 Add tests for OCR fallback on vision failure
- [ ] 7.6 Add tests for image file upload and validation

## 8. Documentation

- [ ] 8.1 Document extraction strategy options
- [ ] 8.2 Add provider setup guide for vision-enabled providers (OpenAI, Baidu Qianfan)
- [ ] 8.3 Document PDF-to-image conversion requirements
- [ ] 8.4 Add examples for Baidu Qianfan MultiPicOCR integration

## 9. UI Updates (Optional/Deferred)

- [ ] 9.1 Add extraction strategy selector in manifest UI
- [ ] 9.2 Show provider capability indicators (vision, structured output)
- [ ] 9.3 Display two-stage extraction progress separately
- [ ] 9.4 Add cost estimation for different strategies
