import { BaseTextExtractor } from '../base-text-extractor';
import { OcrServiceClient } from '../ocr-service.client';
import {
  CorrectionData,
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
    onCorrection: undefined as ((data: CorrectionData) => Promise<void>) | undefined,
    promptContribution: [
      'INSTRUCTION: I provide individual text boxes with confidence scores and positions.',
      'Each box includes: text, confidence (0-1), bbox [x, y, w, h].',
      'My confidence tags: [H] >= 0.95, [M] >= 0.8, [L] < 0.8.',
      '',
      'For fields where my confidence < {{confidenceThreshold}}, or when my text',
      'differs from other sources and my confidence is higher, include in _human_review:',
      '  "_human_review": [{',
      '    "field": "<json path>",',
      '    "reason": "low_confidence" | "ocr_correction",',
      '    "ocr_text": "<original text>",',
      '    "page": <int>,',
      '    "bbox": [x, y, w, h]',
      '  }]',
    ].join('\n'),
  };

  private readonly ocrServiceClient: OcrServiceClient;
  private readonly confidenceThreshold: number;

  constructor(config: InferenceOcrConfig, deps?: Record<string, unknown>) {
    super(config);
    const serviceUrl = config.serviceUrl ?? 'http://localhost:8090';
    this.ocrServiceClient = new OcrServiceClient(serviceUrl);
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
    const markdown = filteredBoxes.map((b) => {
      const tag = b.confidence >= 0.95 ? '[H]' : b.confidence >= 0.8 ? '[M]' : '[L]';
      return `${tag} ${b.text}  conf=${b.confidence}  bbox=[${b.bbox.join(',')}]`;
    }).join('\n');

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
