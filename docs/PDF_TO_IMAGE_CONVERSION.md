# PDF-to-Image Conversion Guide

This document describes the PDF-to-image conversion system used for vision-based extraction strategies.

## Overview

The PDF-to-image conversion system transforms PDF pages into high-quality PNG images for processing by vision-enabled LLMs. This is required for VISION_ONLY, VISION_FIRST, and TWO_STAGE extraction strategies when processing PDF files.

## Architecture

```
┌─────────────┐
│   PDF File   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  PdfToImageService      │
│  - convertPdfToImages() │
│  - getPageCount()       │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ PdfToImgConverterAdapter│
│  (pdf-to-img library)   │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│   ConvertedPage[]       │
│  - pageNumber           │
│  - buffer (PNG data)    │
│  - mimeType              │
└─────────────────────────┘
```

## Dependencies

### pdf-to-img Library

**Package**: `pdf-to-img@5.0.0`

**Description**: ESM-only library for converting PDFs to images using Poppler.

**Installation**:
```bash
cd /mnt/d/Projects/PyToYa/src/apps/api
npm install pdf-to-img@5.0.0
```

**Why pdf-to-img?**
- Pure JavaScript (no native dependencies)
- Supports high DPI rendering
- Maintains text quality
- Active development
- ESM module (requires dynamic import)

### System Requirements

**Node.js**: >= 16.x
**NPM**: >= 8.x
**Disk Space**: ~100MB per 10-page PDF at 144 DPI

## Configuration

### DPI/Scale Settings

The conversion quality is controlled by the `scale` parameter:

| Scale | DPI | Quality | File Size | Use Case |
|-------|-----|---------|-----------|----------|
| 1 | 72 | Low | Small | Drafts, simple docs |
| 2 | 144 | High | Medium | **Default**, recommended |
| 3 | 216 | Very High | Large | Complex layouts, small text |
| 4 | 288 | Ultra | Very Large | Edge cases, archival |

**Default Scale**: 2 (144 DPI)

**Configuration in Code**:
```typescript
const options: ConvertPdfToImagesOptions = { scale: 2 };
const pages = await pdfToImageService.convertPdfToImages(pdfPath, options);
```

### Output Format

- **Format**: PNG (lossless compression)
- **Color**: RGB (24-bit color)
- **Alpha Channel**: No alpha channel (opaque background)

## Service API

### PdfToImageService

```typescript
class PdfToImageService {
  /**
   * Convert entire PDF to images
   * @param pdfPath - Absolute path to PDF file
   * @param options - Conversion options (scale, etc.)
   * @returns Array of converted pages
   */
  async convertPdfToImages(
    pdfPath: string,
    options?: ConvertPdfToImagesOptions
  ): Promise<ConvertedPage[]>

  /**
   * Convert specific page to image
   * @param pdfPath - Absolute path to PDF file
   * @param pageNumber - Page number (1-indexed)
   * @param options - Conversion options
   * @returns Single converted page
   */
  async convertPdfPageToImage(
    pdfPath: string,
    pageNumber: number,
    options?: ConvertPdfToImagesOptions
  ): Promise<ConvertedPage>

  /**
   * Get number of pages in PDF
   * @param pdfPath - Absolute path to PDF file
   * @returns Page count
   */
  async getPageCount(pdfPath: string): Promise<number>

  /**
   * Convert pages to base64 data URLs
   * @param pages - Array of converted pages
   * @returns Array of data URLs
   */
  pagesToDataUrls(pages: ConvertedPage[]): string[]

  /**
   * Save pages to disk
   * @param pages - Array of converted pages
   * @param outputDir - Output directory
   * @param filenamePrefix - Prefix for filenames
   * @returns Array of saved file paths
   */
  async savePagesToDisk(
    pages: ConvertedPage[],
    outputDir: string,
    filenamePrefix?: string
  ): Promise<string[]>
}
```

### Data Structures

```typescript
interface ConvertPdfToImagesOptions {
  scale?: number;  // Default: 2 (144 DPI)
}

interface ConvertedPage {
  pageNumber: number;    // 1-indexed page number
  buffer: Buffer;        // PNG image data
  mimeType: string;      // "image/png"
}
```

## Usage Examples

### Basic Conversion

```typescript
import { PdfToImageService } from './pdf-to-image/pdf-to-image.service';

// Convert all pages
const pages = await pdfToImageService.convertPdfToImages('/path/to/document.pdf');

console.log(`Converted ${pages.length} pages`);
// Output: "Converted 5 pages"

pages.forEach(page => {
  console.log(`Page ${page.pageNumber}: ${page.buffer.length} bytes`);
});
```

### High-Quality Conversion

```typescript
// Use higher DPI for better quality
const pages = await pdfToImageService.convertPdfToImages('/path/to/document.pdf', {
  scale: 3,  // 216 DPI
});
```

### Single Page Conversion

```typescript
// Convert only page 1
const page = await pdfToImageService.convertPdfPageToImage(
  '/path/to/document.pdf',
  1,
  { scale: 2 }
);

console.log(`Page 1: ${page.buffer.length} bytes`);
```

### Get Page Count

```typescript
const pageCount = await pdfToImageService.getPageCount('/path/to/document.pdf');
console.log(`Document has ${pageCount} pages`);
```

### Convert to Data URLs

```typescript
const pages = await pdfToImageService.convertPdfToImages('/path/to/document.pdf');
const dataUrls = pdfToImageService.pagesToDataUrls(pages);

console.log(dataUrls[0]);
// Output: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
```

### Save to Disk

```typescript
const pages = await pdfToImageService.convertPdfToImages('/path/to/document.pdf');
const savedPaths = await pdfToImageService.savePagesToDisk(
  pages,
  '/output/directory',
  'invoice-'  // Results in: invoice-1.png, invoice-2.png, etc.
);

console.log(`Saved ${savedPaths.length} pages`);
```

## Integration with Extraction Service

### Workflow

```typescript
// In ExtractionService.runExtraction()

if (this.requiresPdfToImageConversion(state.strategy, manifest.fileType)) {
  // Convert PDF to images for vision-based strategies
  state.convertedPages = await this.convertPdfToImages(manifest.storagePath);
  this.logger.log(
    `Converted ${state.convertedPages.length} pages for ${state.strategy} extraction`
  );
}
```

### Strategy-Based Conversion

```typescript
private requiresPdfToImageConversion(
  strategy: ExtractionStrategy,
  fileType: FileType,
): boolean {
  return (
    fileType === FileType.PDF &&
    (strategy === ExtractionStrategy.VISION_FIRST ||
      strategy === ExtractionStrategy.VISION_ONLY ||
      strategy === ExtractionStrategy.TWO_STAGE)
  );
}
```

## Performance Characteristics

### Processing Time

| Pages | Scale 1 | Scale 2 | Scale 3 |
|-------|---------|---------|---------|
| 1 | 0.5s | 1s | 2s |
| 5 | 2s | 5s | 10s |
| 10 | 4s | 10s | 20s |
| 50 | 20s | 50s | 100s |

*Times are approximate and depend on hardware.*

### Memory Usage

| Pages | Scale 1 | Scale 2 | Scale 3 |
|-------|---------|---------|---------|
| 1 | 1MB | 2MB | 4MB |
| 5 | 5MB | 10MB | 20MB |
| 10 | 10MB | 20MB | 40MB |
| 50 | 50MB | 100MB | 200MB |

*Memory usage is peak during conversion.*

### Disk Space

| Pages | Scale 1 | Scale 2 | Scale 3 |
|-------|---------|---------|---------|
| 1 | 0.5MB | 1MB | 2MB |
| 5 | 2.5MB | 5MB | 10MB |
| 10 | 5MB | 10MB | 20MB |
| 50 | 25MB | 50MB | 100MB |

*Disk space for saved images.*

## Troubleshooting

### Common Errors

**"PDF file not found"**

**Cause**: PDF path is incorrect or file doesn't exist

**Solution**:
```typescript
// Verify file exists first
import * as fs from 'fs';

if (!fs.existsSync(pdfPath)) {
  throw new Error(`PDF file not found: ${pdfPath}`);
}
```

**"Failed to convert PDF to images"**

**Cause**: PDF is corrupted, password-protected, or invalid

**Solution**:
1. Verify PDF is valid (open in PDF viewer)
2. Remove password protection
3. Re-save PDF from source

**"Out of memory"**

**Cause**: PDF is too large or system has insufficient memory

**Solution**:
1. Convert pages individually instead of all at once
2. Reduce scale (DPI) setting
3. Process PDF in batches (pages 1-10, then 11-20, etc.)

```typescript
// Process in batches
const totalPages = await pdfToImageService.getPageCount(pdfPath);
const batchSize = 10;
const allPages: ConvertedPage[] = [];

for (let start = 1; start <= totalPages; start += batchSize) {
  const end = Math.min(start + batchSize - 1, totalPages);

  for (let page = start; page <= end; page++) {
    const pageData = await pdfToImageService.convertPdfPageToImage(pdfPath, page);
    allPages.push(pageData);
  }

  // Clear memory
  if (global.gc) global.gc();
}
```

## Best Practices

### 1. Choose Appropriate DPI

```typescript
// For simple documents (invoices, receipts)
const simpleOptions = { scale: 1 };  // 72 DPI

// For most documents (default)
const standardOptions = { scale: 2 };  // 144 DPI

// For complex documents (tables, forms, small text)
const highQualityOptions = { scale: 3 };  // 216 DPI
```

### 2. Handle Large PDFs

```typescript
// Get page count first to estimate processing time
const pageCount = await pdfToImageService.getPageCount(pdfPath);

if (pageCount > 50) {
  console.warn(`Large PDF detected (${pageCount} pages), consider processing in batches`);
}
```

### 3. Clean Up Temp Files

```typescript
// After sending images to LLM, clean up to save disk space
const pages = await pdfToImageService.convertPdfToImages(pdfPath);

try {
  // Use pages for extraction
  await this.extractFromPages(pages);
} finally {
  // Don't keep pages in memory
  pages.forEach(page => page.buffer = null);
}
```

### 4. Cache When Appropriate

```typescript
// Cache converted pages if re-processing same document
const cacheKey = `pdf:${pdfPath}:scale:${scale}`;

let pages = await cache.get(cacheKey);

if (!pages) {
  pages = await pdfToImageService.convertPdfToImages(pdfPath, { scale });
  await cache.set(cacheKey, pages, 3600); // Cache for 1 hour
}
```

## Testing

### Unit Tests

```typescript
describe('PdfToImageService', () => {
  it('should convert PDF to images', async () => {
    const pages = await service.convertPdfToImages('/test/document.pdf');
    expect(pages).toHaveLength(5);
    expect(pages[0].mimeType).toBe('image/png');
  });

  it('should handle multi-page PDFs', async () => {
    const count = await service.getPageCount('/test/multi-page.pdf');
    expect(count).toBeGreaterThan(10);
  });
});
```

### Integration Tests

```typescript
describe('Extraction with PDF-to-Image', () => {
  it('should convert PDF and extract with vision', async () => {
    const manifest = await uploadTestDocument('invoice.pdf');
    const result = await extractionService.runExtraction(manifest.id, {
      llmModel: visionModel,
    });

    expect(result.convertedPages).toBeDefined();
    expect(result.convertedPages.length).toBeGreaterThan(0);
  });
});
```

## Migration from Old System

### Before (fs-based)

```typescript
// Old implementation - tightly coupled to fs
import * as fs from 'fs';
import { fromPdf } from 'pdf-to-img';

if (!fs.existsSync(pdfPath)) {
  throw new Error('File not found');
}

const doc = await fromPdf(pdfPath, { scale: 2 });
const pages = [];
for await (const buffer of doc) {
  pages.push({ buffer, mimeType: 'image/png' });
}
```

### After (interface-based)

```typescript
// New implementation - loosely coupled
class MyService {
  constructor(
    private readonly pdfAdapter: IPdfConverterAdapter,
    private readonly fileSystem: IFileAccessService,
  ) {}

  async convertPdf(pdfPath: string): Promise<ConvertedPage[]> {
    if (!this.fileSystem.fileExists(pdfPath)) {
      throw new Error('File not found');
    }

    const doc = await this.pdfAdapter.convert(pdfPath, { scale: 2 });
    const pages = [];
    for await (const buffer of doc) {
      pages.push({ pageNumber: pages.length + 1, buffer, mimeType: 'image/png' });
    }
    return pages;
  }
}
```

**Benefits**:
- ✅ Testable without real files
- ✅ Swappable implementations
- ✅ Follows SOLID principles
- ✅ No global `jest.mock()` needed

## API Reference

### Convert PDF to Images

```http
POST /api/pdf/convert HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "pdfPath": "/path/to/document.pdf",
  "options": {
    "scale": 2
  }
}

Response:
{
  "pages": [
    {
      "pageNumber": 1,
      "mimeType": "image/png",
      "size": 1024000
    }
  ],
  "totalPages": 5
}
```

### Get Page Count

```http
POST /api/pdf/page-count HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "pdfPath": "/path/to/document.pdf"
}

Response:
{
  "pageCount": 5
}
```

## Future Enhancements

### Planned Features

- [ ] **Parallel Processing**: Convert multiple pages concurrently
- [ ] **Format Options**: Support JPEG, WebP output formats
- [ ] **Region Selection**: Convert specific regions of pages
- [ ] **OCR Overlay**: Overlay OCR text on images
- [ ] **Compression**: Configurable PNG compression levels
- [ ] **Caching**: Built-in caching for recently converted PDFs

### Performance Roadmap

| Feature | Target | Status |
|---------|--------|--------|
| Parallel conversion | 2x faster | Planned |
| JPEG output | 50% smaller files | Planned |
| Caching layer | Instant re-conversion | Planned |
| Streaming | Lower memory usage | Under consideration |

## References

- [pdf-to-img Documentation](https://www.npmjs.com/package/pdf-to-img)
- [Poppler Documentation](https://poppler.freedesktop.org/)
- [NestJS Testing Guide](../TESTING.md)
- [Extraction Strategies Guide](./LLM_VISION_EXTRACTION.md)
