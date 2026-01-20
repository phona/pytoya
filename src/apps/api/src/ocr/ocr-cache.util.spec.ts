import {
  buildCachedOcrResult,
  calculateOcrQualityScore,
} from './ocr-cache.util';
import { OcrResultDto } from '../manifests/dto/ocr-result.dto';
import { ModelEntity } from '../entities/model.entity';

describe('OCR Cache Util', () => {
  describe('calculateOcrQualityScore', () => {
    const createMockOcrResult = (overrides?: Partial<OcrResultDto>): OcrResultDto => ({
      document: {
        type: 'invoice',
        language: ['zh'],
        pages: 1,
      },
      pages: [
        {
          pageNumber: 1,
          text: 'Sample text content',
          markdown: '# Sample',
          confidence: 0.9,
          layout: {
            elements: [
              { type: 'paragraph', confidence: 0.95, position: { x: 0, y: 0, width: 100, height: 20 }, content: 'Sample' },
            ],
            tables: [],
          },
        },
      ],
      metadata: {
        processedAt: new Date().toISOString(),
        modelVersion: 'PaddleOCR-VL',
        processingTimeMs: 1000,
      },
      ...overrides,
    });

    it('calculates score for excellent quality OCR', () => {
      const result = createMockOcrResult({
        pages: [
          {
            pageNumber: 1,
            text: 'a'.repeat(1000), // Good text coverage
            markdown: '# Test',
            confidence: 0.95,
            layout: {
              elements: [
                { type: 'paragraph', confidence: 0.98, position: { x: 0, y: 0, width: 100, height: 20 }, content: 'Text' },
                { type: 'paragraph', confidence: 0.97, position: { x: 0, y: 25, width: 100, height: 20 }, content: 'More' },
              ],
              tables: [{ rows: 2, columns: 3, headers: [], data: [], confidence: 0.95 }],
            },
          },
        ],
      });

      const score = calculateOcrQualityScore(result);
      expect(score).toBeGreaterThanOrEqual(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('calculates score for good quality OCR', () => {
      const result = createMockOcrResult({
        pages: [
          {
            pageNumber: 1,
            text: 'a'.repeat(600),
            markdown: '# Test',
            confidence: 0.85,
            layout: {
              elements: [
                { type: 'paragraph', confidence: 0.88, position: { x: 0, y: 0, width: 100, height: 20 }, content: 'Text' },
              ],
              tables: [],
            },
          },
        ],
      });

      const score = calculateOcrQualityScore(result);
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThan(90);
    });

    it('calculates score for poor quality OCR', () => {
      const result = createMockOcrResult({
        pages: [
          {
            pageNumber: 1,
            text: 'a'.repeat(100), // Low text coverage
            markdown: '# Test',
            confidence: 0.5,
            layout: {
              elements: [
                { type: 'paragraph', confidence: 0.6, position: { x: 0, y: 0, width: 100, height: 20 }, content: 'Text' },
              ],
              tables: [],
            },
          },
        ],
      });

      const score = calculateOcrQualityScore(result);
      expect(score).toBeLessThan(70);
    });

    it('returns baseline score for OCR result with no pages', () => {
      const result: OcrResultDto = {
        document: {
          type: 'invoice',
          language: [],
          pages: 0,
        },
        pages: [],
        metadata: {
          processedAt: new Date().toISOString(),
          modelVersion: 'PaddleOCR-VL',
          processingTimeMs: 1000,
        },
      };

      const score = calculateOcrQualityScore(result);
      expect(score).toBe(6);
    });

    it('handles missing layout elements', () => {
      const result = createMockOcrResult({
        pages: [
          {
            pageNumber: 1,
            text: 'a'.repeat(800),
            markdown: '# Test',
            confidence: 0.9,
            layout: undefined as any,
          },
        ],
      });

      const score = calculateOcrQualityScore(result);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('penalizes missing language detection', () => {
      const result = createMockOcrResult({
        document: {
          type: 'invoice',
          language: [],
          pages: 1,
        },
        pages: [
          {
            pageNumber: 1,
            text: 'a'.repeat(800),
            markdown: '# Test',
            confidence: 0.9,
            layout: {
              elements: [
                { type: 'paragraph', confidence: 0.95, position: { x: 0, y: 0, width: 100, height: 20 }, content: 'Text' },
              ],
              tables: [],
            },
          },
        ],
      });

      const score = calculateOcrQualityScore(result);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('handles multiple pages', () => {
      const result = createMockOcrResult({
        document: {
          type: 'invoice',
          language: ['zh'],
          pages: 3,
        },
        pages: [
          {
            pageNumber: 1,
            text: 'a'.repeat(800),
            markdown: '# Page 1',
            confidence: 0.9,
            layout: {
              elements: [
                { type: 'paragraph', confidence: 0.9, position: { x: 0, y: 0, width: 100, height: 20 }, content: 'Text' },
              ],
              tables: [],
            },
          },
          {
            pageNumber: 2,
            text: 'a'.repeat(900),
            markdown: '# Page 2',
            confidence: 0.92,
            layout: {
              elements: [
                { type: 'paragraph', confidence: 0.92, position: { x: 0, y: 0, width: 100, height: 20 }, content: 'Text' },
              ],
              tables: [],
            },
          },
          {
            pageNumber: 3,
            text: 'a'.repeat(850),
            markdown: '# Page 3',
            confidence: 0.88,
            layout: {
              elements: [
                { type: 'paragraph', confidence: 0.88, position: { x: 0, y: 0, width: 100, height: 20 }, content: 'Text' },
              ],
              tables: [],
            },
          },
        ],
      });

      const score = calculateOcrQualityScore(result);
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('caps score at 100', () => {
      const result = createMockOcrResult({
        pages: [
          {
            pageNumber: 1,
            text: 'a'.repeat(5000), // Very high text coverage
            markdown: '# Test',
            confidence: 1.0,
            layout: {
              elements: Array(20).fill({
                type: 'paragraph',
                confidence: 1.0,
                position: { x: 0, y: 0, width: 100, height: 20 },
                content: 'Perfect',
              }),
              tables: [{ rows: 5, columns: 5, headers: [], data: [], confidence: 1.0 }],
            },
          },
        ],
      });

      const score = calculateOcrQualityScore(result);
      expect(score).toBe(100);
    });

    it('never returns negative score', () => {
      const result: OcrResultDto = {
        document: {
          type: 'invoice',
          language: [],
          pages: 1,
        },
        pages: [
          {
            pageNumber: 1,
            text: '',
            markdown: '',
            confidence: 0,
            layout: {
              elements: [],
              tables: [],
            },
          },
        ],
        metadata: {
          processedAt: new Date().toISOString(),
          modelVersion: 'PaddleOCR-VL',
          processingTimeMs: 1000,
        },
      };

      const score = calculateOcrQualityScore(result);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('buildCachedOcrResult', () => {
    const mockModel: ModelEntity = {
      id: 'model-1',
      name: 'PaddleOCR-VL',
      adapterType: 'paddlex',
      parameters: { baseUrl: 'http://localhost:8080' },
      pricing: { effectiveDate: new Date().toISOString() },
      pricingHistory: [],
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createMockOcrResponse = () => ({
      layout: {
        num_pages: 2,
      },
      ocr_result: {
        layoutParsingResults: [
          {
            markdown: { text: '# Page 1\nSample text' },
            prunedResult: {
              parsing_res_list: [
                {
                  block_label: 'text',
                  block_content: 'Sample text',
                  block_bbox: [0, 0, 100, 20],
                },
              ],
            },
          },
          {
            markdown: { text: '# Page 2\nMore text' },
            prunedResult: {
              parsing_res_list: [
                {
                  block_label: 'text',
                  block_content: 'More text',
                  block_bbox: [0, 20, 100, 40],
                },
              ],
            },
          },
        ],
      },
    });

    it('builds OCR result from response', () => {
      const mockResponse = createMockOcrResponse() as any;
      const result = buildCachedOcrResult(mockResponse, 1500, mockModel);

      expect(result.document?.type).toBe('invoice');
      expect(result.document?.pages).toBe(2);
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[1].pageNumber).toBe(2);
    });

    it('detects Chinese language', () => {
      const mockResponse = {
        layout: { num_pages: 1 },
        ocr_result: {
          layoutParsingResults: [
            {
              markdown: { text: '# 中文测试' },
              prunedResult: {
                parsing_res_list: [
                  {
                    block_label: 'text',
                    block_content: '中文内容',
                    block_bbox: [0, 0, 100, 20],
                  },
                ],
              },
            },
          ],
        },
      } as any;

      const result = buildCachedOcrResult(mockResponse, 1000, mockModel);
      expect(result.document?.language).toContain('zh');
    });

    it('detects English language', () => {
      const mockResponse = {
        layout: { num_pages: 1 },
        ocr_result: {
          layoutParsingResults: [
            {
              markdown: { text: '# English Test' },
              prunedResult: {
                parsing_res_list: [
                  {
                    block_label: 'text',
                    block_content: 'English content',
                    block_bbox: [0, 0, 100, 20],
                  },
                ],
              },
            },
          ],
        },
      } as any;

      const result = buildCachedOcrResult(mockResponse, 1000, mockModel);
      expect(result.document?.language).toContain('en');
    });

    it('includes metadata', () => {
      const mockResponse = createMockOcrResponse() as any;
      const processingTime = 1234;
      const result = buildCachedOcrResult(mockResponse, processingTime, mockModel);

      expect(result.metadata?.modelVersion).toBe('PaddleOCR-VL');
      expect(result.metadata?.processingTimeMs).toBe(processingTime);
      expect(result.metadata?.processedAt).toBeDefined();
    });

    it('handles empty response', () => {
      const mockResponse = {
        layout: { num_pages: 0 },
        ocr_result: {
          layoutParsingResults: [],
        },
      } as any;

      const result = buildCachedOcrResult(mockResponse, 0, mockModel);
      expect(result.pages).toEqual([]);
      expect(result.document?.pages).toBe(0);
    });
  });
});
