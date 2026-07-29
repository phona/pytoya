import { ConfigService } from '@nestjs/config';

import { BaseTextExtractor } from '../base-text-extractor';
import { OcrServiceClient } from '../ocr-service.client';
import {
  ExtractorMetadata,
  TextExtractionInput,
  TextExtractionResult,
  TextExtractorConfig,
} from '../types/extractor.types';

export type InferenceOcrConfig = TextExtractorConfig & {
  confidenceThreshold?: number;
  serviceUrl?: string;
};

export class InferenceOcrExtractor extends BaseTextExtractor<InferenceOcrConfig> {
  static metadata: ExtractorMetadata = {
    id: 'inference-ocr',
    name: 'Inference OCR',
    description: 'HTTP-based OCR service for text extraction from images',
    version: '1.0.0',
    category: 'ocr',
    supportedFormats: ['image'],
    configSchema: {
      type: 'object',
      properties: {
        confidenceThreshold: {
          type: 'number',
          title: 'Confidence Threshold',
          default: 0.8,
          minimum: 0,
          maximum: 1,
        },
        serviceUrl: {
          type: 'string',
          title: 'Inference Service URL',
          default: 'http://localhost:8090',
        },
      },
      required: ['serviceUrl'],
    },
    paramsSchema: {},
    promptContribution: 'I provide individual text boxes with confidence scores and positions. Each box includes: text, confidence (0-1), bbox [x, y, w, h]. Boxes with confidence < 0.8 may be inaccurate.',
  };

  private readonly ocrServiceClient: OcrServiceClient;
  private readonly confidenceThreshold: number;

  constructor(config: InferenceOcrConfig, deps?: Record<string, unknown>) {
    super(config);
    const configService = deps?.configService as ConfigService | undefined;
    const storage = deps?.ocrServiceClient as OcrServiceClient | undefined;
    const serviceUrl = configService?.get<string>('ocrService.baseUrl')
      ?? config.serviceUrl
      ?? 'http://localhost:8090';
    this.ocrServiceClient = storage ?? new OcrServiceClient(serviceUrl);
    this.confidenceThreshold = config.confidenceThreshold ?? 0.8;
  }

  async extract(input: TextExtractionInput): Promise<TextExtractionResult> {
    if (!input.buffer || input.buffer.length === 0) {
      return { text: '', markdown: '', metadata: { extractorId: InferenceOcrExtractor.metadata.id, processingTimeMs: 0, textCost: 0 } };
    }

    const startTime = Date.now();
    const boxes = await this.ocrServiceClient.infer(input.buffer);
    const processingTimeMs = Date.now() - startTime;

    const threshold = this.confidenceThreshold ?? 0;
    const filteredBoxes = threshold > 0
      ? boxes.filter(b => b.confidence >= threshold)
      : boxes;

    const text = filteredBoxes.map((b) => b.text).join('\n');
    const boxLines = filteredBoxes.map(
      (b) => `text=${b.text}  conf=${b.confidence}  bbox=[${b.bbox.join(',')}]`,
    );
    const markdown = boxLines.join('\n');

    return {
      text,
      markdown,
      metadata: {
        extractorId: InferenceOcrExtractor.metadata.id,
        processingTimeMs,
        textCost: 0,
        ocrResult: {
          document: { type: 'unknown', language: [], pages: 1 },
          pages: [{
            pageNumber: 1,
            text,
            markdown,
            confidence: filteredBoxes.length > 0
              ? filteredBoxes.reduce((s, b) => s + b.confidence, 0) / filteredBoxes.length
              : 0,
            layout: {
              elements: filteredBoxes.map((b) => ({
                type: 'text',
                confidence: b.confidence,
                position: { x: b.bbox[0], y: b.bbox[1], width: b.bbox[2], height: b.bbox[3] },
              })),
              tables: [],
            },
          }],
          metadata: { processedAt: new Date().toISOString(), modelVersion: 'inference-ocr', processingTimeMs },
          rawResponse: { boxes: filteredBoxes },
        },
      },
    };
  }
}
