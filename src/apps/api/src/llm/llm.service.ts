import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';

import { ProviderType } from '../entities/provider.entity';
import {
  LLM_AXIOS_INSTANCE,
  LLM_CHAT_COMPLETIONS_ENDPOINT,
} from './llm.constants';
import {
  LlmChatCompletionRequest,
  LlmChatCompletionResult,
  LlmChatCompletionResponse,
  LlmChatMessage,
  LlmChatOptions,
  LlmProviderConfig,
  LlmContentImage,
  LlmContentText,
  LlmChatMessageContent,
} from './llm.types';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_TOKENS = 2000;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(LLM_AXIOS_INSTANCE)
    private readonly axiosInstance: AxiosInstance,
  ) {
    const baseUrl =
      this.configService.get<string>('LLM_BASE_URL') ??
      this.configService.get<string>('OPENAI_BASE_URL') ??
      DEFAULT_BASE_URL;
    this.baseUrl = this.normalizeBaseUrl(baseUrl);

    this.apiKey = this.configService.get<string>('llm.apiKey');
    this.timeoutMs = this.getNumberConfig(
      'LLM_TIMEOUT',
      DEFAULT_TIMEOUT_MS,
    );
    this.model =
      this.configService.get<string>('LLM_MODEL') ?? DEFAULT_MODEL;
    this.temperature = this.getNumberConfig(
      'LLM_TEMPERATURE',
      DEFAULT_TEMPERATURE,
    );
    this.maxTokens = this.getNumberConfig(
      'LLM_MAX_TOKENS',
      DEFAULT_MAX_TOKENS,
    );
  }

  async createChatCompletion(
    messages: LlmChatMessage[],
    options: LlmChatOptions = {},
    provider?: LlmProviderConfig,
  ): Promise<LlmChatCompletionResult> {
    if (!messages.length) {
      throw new BadRequestException(
        'LLM chat completion requires at least one message',
      );
    }

    const apiKey = options.apiKey ?? provider?.apiKey ?? this.apiKey;
    if (!apiKey) {
      throw new InternalServerErrorException('LLM API key is missing');
    }

    const baseUrl = this.normalizeBaseUrl(
      provider?.baseUrl ?? this.baseUrl,
    );
    const model = options.model ?? provider?.modelName ?? this.model;
    const temperature =
      options.temperature ??
      provider?.temperature ??
      this.temperature;
    const maxTokens =
      options.maxTokens ?? provider?.maxTokens ?? this.maxTokens;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;

    const payload: LlmChatCompletionRequest = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    // Add response_format if specified and provider supports it
    if (options.responseFormat) {
      const supportsStructuredOutput =
        provider?.supportsStructuredOutput ??
        this.providerSupportsStructuredOutput(provider?.type, model);
      if (supportsStructuredOutput) {
        payload.response_format = options.responseFormat;
      }
    }

    this.logger.debug(
      `LLM request prepared (model=${model}, messages=${messages.length}, ` +
      `response_format=${payload.response_format?.type ?? 'none'})`,
    );

    try {
      const response =
        await this.axiosInstance.post<LlmChatCompletionResponse>(
          LLM_CHAT_COMPLETIONS_ENDPOINT,
          payload,
          {
            baseURL: baseUrl,
            timeout: timeoutMs,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        );

      const data = response.data;
      const choice = data.choices?.[0];
      const content = choice?.message?.content ?? '';
      if (!content) {
        throw new InternalServerErrorException(
          'LLM response missing message content',
        );
      }

      this.logger.debug(
        `LLM response received (model=${data.model ?? model}, ` +
          `tokens=${data.usage?.total_tokens ?? 'unknown'})`,
      );

      return {
        content,
        model: data.model ?? model,
        usage: data.usage,
        rawResponse: data,
      };
    } catch (error) {
      const errorMessage = this.formatError(error);
      this.logger.warn(`LLM request failed: ${errorMessage}`);
      throw new InternalServerErrorException(
        `LLM request failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Check if a provider/model combination supports structured output.
   * OpenAI and compatible APIs support structured output for gpt-4o and later models.
   */
  providerSupportsStructuredOutput(
    providerType?: ProviderType,
    model?: string,
  ): boolean {
    // OPENAI provider supports structured output for gpt-4o and later
    if (providerType === ProviderType.OPENAI) {
      const modelName = model?.toLowerCase() ?? this.model.toLowerCase();
      return (
        modelName.startsWith('gpt-4o') ||
        modelName.startsWith('gpt-4.1') ||
        modelName.startsWith('o1')
      );
    }

    // PADDLEX and CUSTOM providers: assume support if explicitly configured
    // This can be enhanced with capability detection in the future
    return false;
  }

  /**
   * Check if a provider/model combination supports vision (image input).
   * OpenAI GPT-4o, GPT-4o-mini, GPT-4 Turbo, and Claude 3.5+ support vision.
   */
  providerSupportsVision(
    providerType?: ProviderType,
    model?: string,
  ): boolean {
    const modelName = model?.toLowerCase() ?? this.model.toLowerCase();

    // OPENAI provider: GPT-4o, GPT-4o-mini, GPT-4 Turbo with vision support
    if (providerType === ProviderType.OPENAI) {
      return (
        modelName.startsWith('gpt-4o') ||
        modelName.startsWith('gpt-4-turbo') ||
        modelName.includes('vision')
      );
    }

    // For PADDLEX and CUSTOM providers, check if vision is explicitly configured
    return false;
  }

  /**
   * Create a vision chat message with text and image content.
   * This is useful for sending images to vision-enabled LLMs.
   *
   * @param text - The text prompt/instruction
   * @param images - Array of image data URLs or file paths
   * @param detail - Detail level for vision API ('low', 'high', or 'auto')
   * @returns A chat message with mixed text and image content
   */
  createVisionMessage(
    text: string,
    images: string[],
    detail: 'low' | 'high' | 'auto' = 'auto',
  ): LlmChatMessage {
    const content: Array<LlmContentText | LlmContentImage> = [
      { type: 'text', text },
    ];

    for (const imagePath of images) {
      if (imagePath.startsWith('data:')) {
        // Already a data URL
        content.push({
          type: 'image_url',
          image_url: { url: imagePath, detail },
        });
      } else if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // Public URL
        content.push({
          type: 'image_url',
          image_url: { url: imagePath, detail },
        });
      } else {
        // File path - read and convert to base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64 = imageBuffer.toString('base64');
        const mimeType = this.getMimeType(imagePath);
        content.push({
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}`, detail },
        });
      }
    }

    return {
      role: 'user',
      content,
    };
  }

  /**
   * Create vision messages from PDF page images (buffers).
   *
   * @param text - The text prompt/instruction
   * @param imageBuffers - Array of page buffers with metadata
   * @param detail - Detail level for vision API
   * @returns A chat message with mixed text and image content
   */
  createVisionMessageFromBuffers(
    text: string,
    imageBuffers: Array<{ buffer: Buffer; mimeType: string }>,
    detail: 'low' | 'high' | 'auto' = 'auto',
  ): LlmChatMessage {
    const content: Array<LlmContentText | LlmContentImage> = [
      { type: 'text', text },
    ];

    for (const { buffer, mimeType } of imageBuffers) {
      const base64 = buffer.toString('base64');
      content.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64}`, detail },
      });
    }

    return {
      role: 'user',
      content,
    };
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'bmp':
        return 'image/bmp';
      default:
        return 'image/png';
    }
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

  private getNumberConfig(key: string, defaultValue: number): number {
    const raw = this.configService.get<string | number>(key);
    if (raw === undefined || raw === null) {
      return defaultValue;
    }

    const value =
      typeof raw === 'number' ? raw : Number.parseFloat(raw);
    return Number.isFinite(value) && value > 0
      ? value
      : defaultValue;
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }
}
