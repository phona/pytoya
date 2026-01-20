import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

import { buildCachedOcrResult } from '../../ocr/ocr-cache.util';
import {
  ApiResponse,
  LayoutParsingRequest,
  LayoutParsingResponseData,
  OcrResponse,
} from '../../ocr/types/ocr.types';
import { BaseTextExtractor } from '../base-text-extractor';
import {
  ExtractorMetadata,
  TextExtractionInput,
  TextExtractionResult,
  TextExtractorConfig,
} from '../types/extractor.types';
import { PRICING_SCHEMA } from '../types/pricing-schema';

const DEFAULT_BASE_URL = 'http://localhost:8080';
const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

export type PaddleOcrConfig = TextExtractorConfig & {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  useDocOrientationClassify?: boolean;
  useDocUnwarping?: boolean;
  useLayoutDetection?: boolean;
  prettifyMarkdown?: boolean;
  showFormulaNumber?: boolean;
};

export class PaddleOcrExtractor extends BaseTextExtractor<PaddleOcrConfig> {
  static metadata: ExtractorMetadata = {
    id: 'paddleocr',
    name: 'PaddleOCR VL',
    description: 'Layout-aware OCR optimized for Chinese documents',
    version: '1.0.0',
    category: 'ocr',
    supportedFormats: ['pdf', 'image'],
    pricingSchema: PRICING_SCHEMA,
    paramsSchema: {
      baseUrl: {
        type: 'string',
        required: false,
        label: 'Base URL',
        placeholder: 'http://localhost:8080',
      },
      apiKey: {
        type: 'string',
        required: false,
        label: 'API Key',
        secret: true,
      },
      timeoutMs: {
        type: 'number',
        required: false,
        default: DEFAULT_TIMEOUT_MS,
        label: 'Timeout (ms)',
        validation: { min: 1000, max: 300000 },
      },
      maxRetries: {
        type: 'number',
        required: false,
        default: DEFAULT_MAX_RETRIES,
        label: 'Max Retries',
        validation: { min: 1, max: 10 },
      },
      useDocOrientationClassify: {
        type: 'boolean',
        required: false,
        default: true,
        label: 'Orientation Detection',
      },
      useDocUnwarping: {
        type: 'boolean',
        required: false,
        default: true,
        label: 'Document Unwarping',
      },
      useLayoutDetection: {
        type: 'boolean',
        required: false,
        default: true,
        label: 'Layout Detection',
      },
      prettifyMarkdown: {
        type: 'boolean',
        required: false,
        default: true,
        label: 'Prettify Markdown',
      },
      showFormulaNumber: {
        type: 'boolean',
        required: false,
        default: true,
        label: 'Show Formula Number',
      },
    },
  };

  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: PaddleOcrConfig, deps?: { configService?: ConfigService }) {
    super(config);
    const configService = deps?.configService;
    const baseUrl =
      (config.baseUrl as string | undefined) ??
      configService?.get<string>('paddleocr.baseUrl') ??
      DEFAULT_BASE_URL;
    this.baseUrl = this.normalizeBaseUrl(baseUrl);
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = Math.max(1, config.maxRetries ?? DEFAULT_MAX_RETRIES);
    this.axiosInstance = axios.create();
  }

  async extract(input: TextExtractionInput): Promise<TextExtractionResult> {
    const start = Date.now();
    const response = await this.processBuffer(input.buffer, input.fileType);
    const processingTimeMs = Date.now() - start;
    const cachedResult = buildCachedOcrResult(response, processingTimeMs);
    const pagesProcessed = response.layout?.num_pages ?? cachedResult.document.pages ?? 1;
    const textCost = this.calculatePageCost(pagesProcessed) || this.calculateFixedCost();

    return {
      text: response.raw_text,
      markdown: response.markdown,
      metadata: {
        extractorId: PaddleOcrExtractor.metadata.id,
        processingTimeMs,
        textCost,
        currency: this.getPricing().currency,
        pagesProcessed,
        ocrResult: cachedResult,
      },
    };
  }

  private async processBuffer(buffer: Buffer, fileType: TextExtractionInput['fileType']): Promise<OcrResponse> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty buffer provided to OCR extractor');
    }

    const base64 = buffer.toString('base64');
    const payload: LayoutParsingRequest = {
      image: base64,
      fileType: fileType === 'image' ? 1 : 0,
      useDocOrientationClassify: this.config.useDocOrientationClassify ?? true,
      useDocUnwarping: this.config.useDocUnwarping ?? true,
      useLayoutDetection: this.config.useLayoutDetection ?? true,
      prettifyMarkdown: this.config.prettifyMarkdown ?? true,
      showFormulaNumber: this.config.showFormulaNumber ?? true,
    };

    const result = await this.sendRequest(payload);
    return this.parseResponse(result);
  }

  private async sendRequest(payload: LayoutParsingRequest): Promise<LayoutParsingResponseData> {
    let lastError: unknown;
    for (let attempt = 0; attempt < this.maxRetries; attempt += 1) {
      try {
        const response = await this.axiosInstance.post<ApiResponse>('/layout-parsing', payload, {
          baseURL: this.baseUrl,
          timeout: this.timeoutMs,
          headers: this.buildHeaders(this.config.apiKey),
        });

        const data = response.data;
        if (!data || typeof data.errorCode !== 'number') {
          throw new Error('Invalid OCR response format');
        }
        if (data.errorCode !== 0) {
          throw new Error(`OCR API error: ${data.errorMsg ?? 'Unknown error'}`);
        }
        if (!data.result) {
          throw new Error('OCR API response missing result');
        }

        return data.result;
      } catch (error) {
        lastError = error;
        const isLast = attempt >= this.maxRetries - 1;
        if (isLast || !this.shouldRetry(error)) {
          break;
        }
        const delayMs = BASE_BACKOFF_MS * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new Error(`OCR request failed: ${this.formatError(lastError)}`);
  }

  private parseResponse(result: LayoutParsingResponseData): OcrResponse {
    const layoutResults = result.layoutParsingResults;
    if (!Array.isArray(layoutResults) || layoutResults.length === 0) {
      throw new Error('No layout parsing results in OCR response');
    }

    const allBlocks: Array<{ block_order?: number | null; block_content?: string }> = [];
    const markdownTexts: string[] = [];

    for (const pageResult of layoutResults) {
      const parsingList = pageResult.prunedResult?.parsing_res_list ?? [];
      allBlocks.push(...parsingList);
      markdownTexts.push(pageResult.markdown?.text ?? '');
    }

    const sortedBlocks = [...allBlocks].sort((a, b) => {
      const aOrder = typeof a.block_order === 'number' ? a.block_order : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.block_order === 'number' ? b.block_order : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });

    const rawText = sortedBlocks.map((block) => block.block_content ?? '').join('\n');
    const separator = '='.repeat(80);
    const fullMarkdown = markdownTexts
      .map((text, index) => `\n\n${separator}\nPAGE ${index + 1}\n${separator}\n\n${text}`)
      .join('');

    return {
      raw_text: rawText,
      markdown: fullMarkdown,
      layout: {
        num_pages: layoutResults.length,
        num_blocks: allBlocks.length,
        blocks: allBlocks,
      },
      ocr_result: result,
    };
  }

  private buildHeaders(apiKey?: string): Record<string, string> | undefined {
    if (!apiKey) {
      return undefined;
    }
    return { Authorization: `Bearer ${apiKey}` };
  }

  private shouldRetry(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return true;
      }
      const status = error.response.status;
      return status >= 500 || status === 429;
    }
    return false;
  }

  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const response = error.response;
      if (response) {
        return `HTTP ${response.status} ${response.statusText}`;
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error ?? 'Unknown error');
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }
}
