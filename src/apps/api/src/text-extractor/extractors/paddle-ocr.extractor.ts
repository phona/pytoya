import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

import { buildCachedOcrResult } from '../../ocr/ocr-cache.util';
import { OCR_ENDPOINT } from '../../ocr/ocr.constants';
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
const FALLBACK_ENDPOINTS_ABSOLUTE = [OCR_ENDPOINT, '/layout_parsing'];
const FALLBACK_ENDPOINTS_RELATIVE = [
  OCR_ENDPOINT.replace(/^\/+/, ''),
  'layout_parsing',
];

export type PaddleOcrConfig = TextExtractorConfig & {
  baseUrl?: string;
  endpoint?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
  useDocOrientationClassify?: boolean;
  useDocUnwarping?: boolean;
  useLayoutDetection?: boolean;
  useChartRecognition?: boolean;
  layoutNms?: boolean;
  repetitionPenalty?: number;
  temperature?: number;
  topP?: number;
  minPixels?: number;
  maxPixels?: number;
  visualize?: boolean;
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
      endpoint: {
        type: 'string',
        required: false,
        label: 'Endpoint',
        placeholder: OCR_ENDPOINT,
      },
      apiKey: {
        type: 'string',
        required: false,
        label: 'API Key',
        secret: true,
      },
      model: {
        type: 'string',
        required: false,
        label: 'Model',
        placeholder: 'paddleocr-vl-0.9b',
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
      useChartRecognition: {
        type: 'boolean',
        required: false,
        default: false,
        label: 'Chart Recognition',
      },
      layoutNms: {
        type: 'boolean',
        required: false,
        default: true,
        label: 'Layout NMS',
      },
      repetitionPenalty: {
        type: 'number',
        required: false,
        default: 1,
        label: 'Repetition Penalty',
        validation: { min: 0, max: 10 },
      },
      temperature: {
        type: 'number',
        required: false,
        default: 0,
        label: 'Temperature',
        validation: { min: 0, max: 2 },
      },
      topP: {
        type: 'number',
        required: false,
        default: 1,
        label: 'Top P',
        validation: { min: 0, max: 1 },
      },
      minPixels: {
        type: 'number',
        required: false,
        label: 'Min Pixels',
        validation: { min: 1, max: 100000000 },
      },
      maxPixels: {
        type: 'number',
        required: false,
        label: 'Max Pixels',
        validation: { min: 1, max: 100000000 },
      },
      visualize: {
        type: 'boolean',
        required: false,
        default: false,
        label: 'Visualize',
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
  private readonly endpoint: string;
  private readonly baseUrlHasPath: boolean;
  private readonly model: string | undefined;
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
    this.baseUrlHasPath = this.detectBaseUrlHasPath(this.baseUrl);

    const endpoint =
      (config.endpoint as string | undefined) ??
      configService?.get<string>('paddleocr.endpoint') ??
      '';
    this.endpoint = this.normalizeEndpoint(endpoint);

    const modelFromConfig =
      (config.model as string | undefined) ??
      configService?.get<string>('paddleocr.model') ??
      undefined;
    this.model = modelFromConfig ?? (this.isQianfanBaseUrl(this.baseUrl) ? 'paddleocr-vl-0.9b' : undefined);

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

    const isQianfan = this.isQianfan();
    const payload: LayoutParsingRequest & { model?: string; file?: string } = isQianfan
      ? {
          model: this.model,
          file: base64,
        }
      : {
          image: base64,
        };

    Object.assign(payload, {
      fileType: fileType === 'image' ? 1 : 0,
      useDocOrientationClassify: this.config.useDocOrientationClassify ?? true,
      useDocUnwarping: this.config.useDocUnwarping ?? true,
      useLayoutDetection: this.config.useLayoutDetection ?? true,
      useChartRecognition: this.config.useChartRecognition ?? false,
      layoutNms: this.config.layoutNms ?? true,
      repetitionPenalty: this.config.repetitionPenalty ?? 1,
      temperature: this.config.temperature ?? 0,
      topP: this.config.topP ?? 1,
      minPixels: this.config.minPixels,
      maxPixels: this.config.maxPixels,
      visualize: this.config.visualize ?? false,
      prettifyMarkdown: this.config.prettifyMarkdown ?? true,
      showFormulaNumber: this.config.showFormulaNumber ?? true,
    });

    const result = await this.sendRequest(payload);
    return this.parseResponse(result);
  }

  private async sendRequest(payload: LayoutParsingRequest): Promise<LayoutParsingResponseData> {
    let lastError: unknown;
    const endpointsToTry = this.getEndpointsToTry();
    for (let attempt = 0; attempt < this.maxRetries; attempt += 1) {
      try {
        for (const endpoint of endpointsToTry) {
          try {
            const response = await this.axiosInstance.post<ApiResponse>(endpoint, payload, {
              baseURL: this.baseUrl,
              timeout: this.timeoutMs,
              headers: this.buildHeaders(this.config.apiKey),
            });

            const data = response.data as unknown as any;

            // Classic PaddleOCR-VL service response shape
            if (data && typeof data.errorCode === 'number') {
              if (data.errorCode !== 0) {
                throw new Error(`OCR API error: ${data.errorMsg ?? 'Unknown error'}`);
              }
              if (!data.result) {
                throw new Error('OCR API response missing result');
              }
              return data.result as LayoutParsingResponseData;
            }

            // Qianfan response shape: { id, result: { layoutParsingResults, dataInfo } }
            if (data && data.result && Array.isArray(data.result.layoutParsingResults)) {
              return data.result as LayoutParsingResponseData;
            }

            // Some services may respond with the result directly
            if (data && Array.isArray(data.layoutParsingResults)) {
              return data as LayoutParsingResponseData;
            }

            throw new Error('Invalid OCR response format');
          } catch (error) {
            lastError = error;
            if (this.shouldTryNextEndpoint(error)) {
              continue;
            }
            throw error;
          }
        }
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

    const endpointsSummary =
      endpointsToTry.length > 0
        ? ` (endpoints tried: ${endpointsToTry.map((e) => (e ? e : '(baseUrl)')).join(', ')})`
        : '';
    throw new Error(
      `OCR request failed: ${this.formatError(lastError)} (baseUrl: ${this.baseUrl})${endpointsSummary}`,
    );
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
        const method = error.config?.method?.toUpperCase();
        const endpoint = typeof error.config?.url === 'string' ? error.config.url : undefined;
        const target = method && endpoint ? ` (${method} ${endpoint})` : '';
        const detail = this.formatResponseDetail(response.data);
        return `HTTP ${response.status} ${response.statusText}${target}${detail ? ` - ${detail}` : ''}`;
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

  private normalizeEndpoint(endpoint: string): string {
    const trimmed = endpoint.trim();
    if (!trimmed) return '';
    return trimmed;
  }

  private getEndpointsToTry(): string[] {
    const endpoints = new Set<string>();
    endpoints.add(this.endpoint);
    const fallbacks = this.baseUrlHasPath ? FALLBACK_ENDPOINTS_RELATIVE : FALLBACK_ENDPOINTS_ABSOLUTE;
    for (const fallback of fallbacks) {
      endpoints.add(this.normalizeEndpoint(fallback));
    }
    return Array.from(endpoints);
  }

  private shouldTryNextEndpoint(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      return false;
    }
    return error.response?.status === 404;
  }

  private detectBaseUrlHasPath(baseUrl: string): boolean {
    try {
      const url = new URL(baseUrl);
      const pathname = url.pathname ?? '';
      return pathname !== '' && pathname !== '/';
    } catch {
      return false;
    }
  }

  private isQianfan(): boolean {
    return this.isQianfanBaseUrl(this.baseUrl);
  }

  private isQianfanBaseUrl(baseUrl: string): boolean {
    try {
      const url = new URL(baseUrl);
      return url.hostname === 'qianfan.baidubce.com';
    } catch {
      return false;
    }
  }

  private formatResponseDetail(data: unknown): string | null {
    if (data === null || data === undefined) return null;
    if (typeof data === 'string') return data.slice(0, 400);

    if (typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const candidates = [
        obj.message,
        obj.error,
        obj.errorMsg,
        obj.error_message,
        obj.msg,
        obj.detail,
      ]
        .map((v) => (typeof v === 'string' ? v : null))
        .filter((v): v is string => Boolean(v));

      if (candidates.length > 0) {
        return candidates[0].slice(0, 400);
      }

      try {
        return JSON.stringify(obj).slice(0, 400);
      } catch {
        return null;
      }
    }

    return String(data).slice(0, 400);
  }
}
