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
    paramsSchema: {
      serviceUrl: {
        type: 'string',
        required: false,
        label: 'Inference Service URL',
        default: 'http://localhost:8090',
      },
      confidenceThreshold: {
        type: 'number',
        required: false,
        label: 'Confidence Threshold',
        default: 0.8,
        validation: { min: 0, max: 1 },
      },
    },
    onCorrection: undefined as ((data: CorrectionData) => Promise<void>) | undefined,
    promptContribution: [
      'INSTRUCTION: I provide individual text boxes with confidence scores and positions.',
      'Each box includes: text, confidence (0-1), bbox [x, y, w, h].',
      'My confidence tags: [H] >= {{confidenceThreshold}} (reliable, adopt directly),',
      '                     [M] 0.8-{{confidenceThreshold}} (moderate, cross-check),',
      '                     [L] < 0.8 (low, needs review).',
      '',
      'Only fields appearing in my [L] or [M] boxes (confidence < {{confidenceThreshold}})',
      'should be included in _human_review. High-confidence [H] fields are adopted directly.',
      '',
      '  "_human_review": [{',
      '    "field": "<json path>",',
      '    "reason": "low_confidence" | "ocr_correction",',
      '    "ocr_text": "<original text>",',
      '    "page": <int>,',
      '    "bbox": [x, y, w, h]',
      '  }]',
      '',
      'IMPORTANT: bbox in _human_review must be copied verbatim from an inference-ocr',
      'box line (bbox=[x,y,w,h]). Never invent coordinates.',
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
    const pages = input.pages?.length
      ? input.pages
      : input.buffer && input.buffer.length > 0
        ? [{ pageNumber: 1, buffer: input.buffer, mimeType: 'image/png' }]
        : [];

    if (pages.length === 0) {
      return { text: '', markdown: '', metadata: { extractorId: InferenceOcrExtractor.metadata.id, processingTimeMs: 0, textCost: 0 } };
    }

    const startTime = Date.now();

    const allBoxes = [];
    for (const page of pages) {
      const boxes = await this.ocrServiceClient.infer(page.buffer);
      for (const b of boxes) {
        allBoxes.push({ ...b, page: page.pageNumber });
      }
    }
    const processingTimeMs = Date.now() - startTime;

    const text = allBoxes.map((b) => b.text).join('\n');
    const threshold = this.confidenceThreshold ?? 0.8;
    const markdown = allBoxes.map((b) => {
      const tag = b.confidence >= threshold ? '[H]' : b.confidence >= 0.8 ? '[M]' : '[L]';
      return `${tag} ${b.text}  conf=${b.confidence}  bbox=[${b.bbox.join(',')}]  page=${b.page}`;
    }).join('\n');

    return {
      text,
      markdown,
      metadata: {
        extractorId: InferenceOcrExtractor.metadata.id,
        processingTimeMs,
        textCost: 0,
        ocrResult: {
          document: { type: 'unknown', language: [], pages: allBoxes.length > 0 ? Math.max(...allBoxes.map(b => b.page)) : 1 },
          pages: [{
            pageNumber: 1,
            text,
            markdown,
            confidence: allBoxes.length > 0
              ? allBoxes.reduce((s, b) => s + b.confidence, 0) / allBoxes.length
              : 0,
            layout: {
              elements: allBoxes.map((b) => ({
                type: 'text',
                confidence: b.confidence,
                position: { x: b.bbox[0], y: b.bbox[1], width: b.bbox[2], height: b.bbox[3] },
              })),
              tables: [],
            },
          }],
          metadata: { processedAt: new Date().toISOString(), modelVersion: 'inference-ocr', processingTimeMs },
          rawResponse: { boxes: allBoxes },
        },
      },
    };
  }
}
