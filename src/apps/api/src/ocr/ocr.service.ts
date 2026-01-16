import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

import { OCR_AXIOS_INSTANCE, OCR_ENDPOINT } from './ocr.constants';
import { OcrServiceException } from './exceptions/ocr-service.exception';
import { OcrTimeoutException } from './exceptions/ocr-timeout.exception';
import {
  ApiResponse,
  BlockContent,
  LayoutParsingRequest,
  LayoutParsingResponseData,
  OcrResponse,
} from './types/ocr.types';

const DEFAULT_BASE_URL = 'http://localhost:8080';
const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(OCR_AXIOS_INSTANCE)
    private readonly axiosInstance: AxiosInstance,
  ) {
    const baseUrl =
      this.configService.get<string>('paddleocr.baseUrl') ??
      DEFAULT_BASE_URL;
    this.baseUrl = this.normalizeBaseUrl(baseUrl);
    this.timeoutMs = this.getNumberConfig(
      'PADDLEOCR_TIMEOUT',
      DEFAULT_TIMEOUT_MS,
    );
    this.maxRetries = Math.max(
      1,
      this.getNumberConfig('OCR_MAX_RETRIES', DEFAULT_MAX_RETRIES),
    );
  }

  async processPdf(
    fileBuffer: Buffer,
    overrides?: {
      baseUrl?: string;
      apiKey?: string;
      timeoutMs?: number;
      maxRetries?: number;
    },
  ): Promise<OcrResponse> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new OcrServiceException('Empty PDF buffer provided');
    }

    const baseUrl = this.normalizeBaseUrl(
      overrides?.baseUrl ?? this.baseUrl,
    );
    const timeoutMs = overrides?.timeoutMs ?? this.timeoutMs;
    const maxRetries = overrides?.maxRetries ?? this.maxRetries;
    const apiKey = overrides?.apiKey;

    const base64 = fileBuffer.toString('base64');
    if (!base64) {
      throw new OcrServiceException('Failed to encode PDF buffer');
    }

    const payload: LayoutParsingRequest = {
      image: base64,
      fileType: 0,
      useDocOrientationClassify: true,
      useDocUnwarping: true,
      useLayoutDetection: true,
      prettifyMarkdown: true,
      showFormulaNumber: true,
    };

    this.logger.debug(
      `OCR request prepared (endpoint=${OCR_ENDPOINT}, bytes=${fileBuffer.length})`,
    );

    const result = await this.sendRequest(payload, {
      baseUrl,
      timeoutMs,
      maxRetries,
      apiKey,
    });
    return this.parseResponse(result);
  }

  private async sendRequest(
    payload: LayoutParsingRequest,
    options: {
      baseUrl: string;
      timeoutMs: number;
      maxRetries: number;
      apiKey?: string;
    },
  ): Promise<LayoutParsingResponseData> {
    let lastError: unknown;
    let attempts = 0;

    for (let attempt = 0; attempt < options.maxRetries; attempt += 1) {
      attempts = attempt + 1;
      try {
        this.logger.debug(
          `Sending OCR request (attempt ${attempts}/${options.maxRetries})`,
        );

        const response = await this.axiosInstance.post<ApiResponse>(
          OCR_ENDPOINT,
          payload,
          {
            baseURL: options.baseUrl,
            timeout: options.timeoutMs,
            headers: this.buildHeaders(options.apiKey),
          },
        );

        const data = response.data;
        if (!data || typeof data.errorCode !== 'number') {
          throw new OcrServiceException('Invalid OCR response format');
        }

        if (data.errorCode !== 0) {
          throw new OcrServiceException(
            `OCR API error: ${data.errorMsg ?? 'Unknown error'} ` +
              `(errorCode: ${data.errorCode})`,
          );
        }

        if (!data.result) {
          throw new OcrServiceException(
            'OCR API response missing result',
          );
        }

        const pages = data.result.layoutParsingResults?.length ?? 0;
        this.logger.debug(
          `OCR response received (attempt ${attempts}/${this.maxRetries}, ` +
            `logId=${data.logId ?? 'unknown'}, pages=${pages})`,
        );

        return data.result;
      } catch (error) {
        lastError = error;
        const errorMessage = this.formatError(error);
        const isTimeout = this.isTimeoutError(error);

        if (isTimeout) {
        this.logger.warn(
          `OCR request timed out (attempt ${attempts}/${options.maxRetries})`,
        );
      } else {
        this.logger.warn(
          `OCR request failed (attempt ${attempts}/${options.maxRetries}): ` +
              `${errorMessage}`,
        );
      }

      if (
          attempt >= options.maxRetries - 1 ||
          !this.shouldRetry(error)
        ) {
          break;
        }

        const delayMs = BASE_BACKOFF_MS * 2 ** attempt;
        this.logger.debug(`Retrying OCR request in ${delayMs}ms`);
        await this.sleep(delayMs);
      }
    }

    if (this.isTimeoutError(lastError)) {
      throw new OcrTimeoutException(
        `OCR request timed out after ${attempts} attempts`,
        lastError,
      );
    }

    throw new OcrServiceException(
      `OCR request failed after ${attempts} attempts: ` +
        `${this.formatError(lastError)}`,
      lastError,
    );
  }

  async testConnection(options?: {
    baseUrl?: string;
    apiKey?: string;
    timeoutMs?: number;
  }): Promise<{ ok: boolean; status?: number; error?: string }> {
    const baseUrl = this.normalizeBaseUrl(
      options?.baseUrl ?? this.baseUrl,
    );
    const timeoutMs = options?.timeoutMs ?? this.timeoutMs;
    try {
      const response = await this.axiosInstance.get('/', {
        baseURL: baseUrl,
        timeout: timeoutMs,
        headers: this.buildHeaders(options?.apiKey),
        validateStatus: () => true,
      });
      const ok = response.status < 500;
      return { ok, status: response.status };
    } catch (error) {
      return { ok: false, error: this.formatError(error) };
    }
  }

  private buildHeaders(apiKey?: string): Record<string, string> | undefined {
    if (!apiKey) {
      return undefined;
    }
    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }

  private parseResponse(result: LayoutParsingResponseData): OcrResponse {
    const layoutResults = result.layoutParsingResults;
    if (!Array.isArray(layoutResults) || layoutResults.length === 0) {
      throw new OcrServiceException(
        'No layout parsing results in OCR response',
      );
    }

    const allBlocks: BlockContent[] = [];
    const markdownTexts: string[] = [];

    for (const pageResult of layoutResults) {
      const parsingList =
        pageResult.prunedResult?.parsing_res_list ?? [];
      allBlocks.push(...parsingList);

      const markdownText = pageResult.markdown?.text ?? '';
      markdownTexts.push(markdownText);
    }

    const sortedBlocks = [...allBlocks].sort((a, b) => {
      const aOrder =
        typeof a.block_order === 'number'
          ? a.block_order
          : Number.MAX_SAFE_INTEGER;
      const bOrder =
        typeof b.block_order === 'number'
          ? b.block_order
          : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });

    const rawText = sortedBlocks
      .map((block) => block.block_content ?? '')
      .join('\n');

    const separator = '='.repeat(80);
    const fullMarkdown = markdownTexts
      .map((text, index) => {
        const pageHeader = `\n\n${separator}\nPAGE ${
          index + 1
        }\n${separator}\n\n`;
        return pageHeader + text;
      })
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

  private shouldRetry(error: unknown): boolean {
    if (this.isTimeoutError(error)) {
      return true;
    }

    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return true;
      }
      const status = error.response.status;
      return status >= 500 || status === 429;
    }

    return false;
  }

  private isTimeoutError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      return error.code === 'ECONNABORTED';
    }
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('timeout');
    }
    return false;
  }

  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const response = error.response;
      if (response) {
        const responseData = this.safeStringify(response.data);
        return `HTTP ${response.status} ${response.statusText}: ${responseData}`;
      }
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error ?? 'Unknown error');
  }

  private safeStringify(value: unknown): string {
    if (typeof value === 'string') {
      return this.truncate(value, 300);
    }

    try {
      return this.truncate(JSON.stringify(value), 300);
    } catch (error) {
      return 'Unserializable response';
    }
  }

  private truncate(value: string, limit: number): string {
    if (value.length <= limit) {
      return value;
    }
    return `${value.slice(0, limit)}...`;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getNumberConfig(key: string, defaultValue: number): number {
    const raw = this.configService.get<string | number>(key);
    if (raw === undefined || raw === null) {
      return defaultValue;
    }

    const value =
      typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0
      ? value
      : defaultValue;
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }
}
