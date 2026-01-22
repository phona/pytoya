import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

import {
  LLM_AXIOS_INSTANCE,
  LLM_CHAT_COMPLETIONS_ENDPOINT,
} from './llm.constants';
import {
  LlmChatCompletionRequest,
  LlmChatCompletionResult,
  LlmChatCompletionResponse,
  LlmChatCompletionStreamChunk,
  LlmChatMessage,
  LlmChatOptions,
  LlmProviderConfig,
} from './llm.types';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_TIMEOUT_MS = 180000;
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
  private readonly useStreamByDefault: boolean;

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

    this.useStreamByDefault = this.getBooleanConfig('LLM_STREAM', true);
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
    const useStream = options.useStream ?? this.useStreamByDefault;

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

    if (useStream) {
      let streamedModel: string | undefined;
      let streamedUsage: LlmChatCompletionResponse['usage'] | undefined;
      let content = '';

      for await (const delta of this.createChatCompletionStream(
        messages,
        {
          ...options,
          // The stream implementation needs the same output contract.
          responseFormat: payload.response_format,
        },
        provider,
        (chunk) => {
          streamedModel = chunk.model ?? streamedModel;
          streamedUsage = chunk.usage ?? streamedUsage;
        },
      )) {
        content += delta;
      }

      const finalContent = content.trimEnd();
      if (!finalContent) {
        throw new InternalServerErrorException(
          'LLM response missing message content',
        );
      }

      const finalModel = streamedModel ?? model;
      const rawResponse: LlmChatCompletionResponse = {
        model: finalModel,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: finalContent,
            },
            finish_reason: 'stop',
          },
        ],
        usage: streamedUsage,
      };

      return {
        content: finalContent,
        model: finalModel,
        usage: streamedUsage,
        rawResponse,
      };
    }

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

  async *createChatCompletionStream(
    messages: LlmChatMessage[],
    options: LlmChatOptions = {},
    provider?: LlmProviderConfig,
    onChunk?: (chunk: LlmChatCompletionStreamChunk) => void,
  ): AsyncGenerator<string, void, void> {
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
      stream: true,
    };

    if (options.responseFormat) {
      const supportsStructuredOutput =
        provider?.supportsStructuredOutput ??
        this.providerSupportsStructuredOutput(provider?.type, model);
      if (supportsStructuredOutput) {
        payload.response_format = options.responseFormat;
      }
    }

    if (provider?.type?.toLowerCase() === 'openai') {
      payload.stream_options = { include_usage: true };
    }

    this.logger.debug(
      `LLM stream request prepared (model=${model}, messages=${messages.length})`,
    );

    let upstream: NodeJS.ReadableStream | null = null;
    try {
      const response =
        await this.axiosInstance.post<NodeJS.ReadableStream>(
          LLM_CHAT_COMPLETIONS_ENDPOINT,
          payload,
          {
            baseURL: baseUrl,
            timeout: timeoutMs,
            responseType: 'stream',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        );

      upstream = response.data;

      let buffer = '';
      for await (const chunk of upstream) {
        buffer += chunk.toString();

        while (true) {
          const sepIndex = buffer.indexOf('\n\n');
          if (sepIndex === -1) {
            break;
          }

          const eventBlock = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);

          const dataLines = eventBlock
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice('data:'.length).trim());

          for (const dataLine of dataLines) {
            if (!dataLine) continue;
            if (dataLine === '[DONE]') {
              return;
            }

            let parsed: LlmChatCompletionStreamChunk | null = null;
            try {
              parsed = JSON.parse(dataLine) as LlmChatCompletionStreamChunk;
            } catch {
              // Ignore malformed chunks (some providers may send keep-alives)
              continue;
            }

            onChunk?.(parsed);

            const delta = parsed.choices?.[0]?.delta?.content ?? null;
            if (typeof delta === 'string' && delta.length > 0) {
              yield delta;
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = this.formatError(error);
      this.logger.warn(`LLM stream request failed: ${errorMessage}`);
      throw new InternalServerErrorException(
        `LLM request failed: ${errorMessage}`,
      );
    } finally {
      if (upstream && typeof (upstream as any).destroy === 'function') {
        (upstream as any).destroy();
      }
    }
  }

  /**
   * Check if a provider/model combination supports structured output.
   * OpenAI and compatible APIs support structured output for gpt-4o and later models.
   */
  providerSupportsStructuredOutput(
    providerType?: string,
    model?: string,
  ): boolean {
    const normalizedType = providerType?.toLowerCase();
    // OpenAI-compatible providers support structured output for gpt-4o and later
    if (normalizedType === 'openai') {
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
    providerType?: string,
    model?: string,
  ): boolean {
    const modelName = model?.toLowerCase() ?? this.model.toLowerCase();

    // OPENAI provider: GPT-4o, GPT-4o-mini, GPT-4 Turbo with vision support
    if (providerType?.toLowerCase() === 'openai') {
      return (
        modelName.startsWith('gpt-4o') ||
        modelName.startsWith('gpt-4-turbo') ||
        modelName.includes('vision')
      );
    }

    // For PADDLEX and CUSTOM providers, check if vision is explicitly configured
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

  private getBooleanConfig(key: string, defaultValue: boolean): boolean {
    const raw = this.configService.get<string | boolean>(key);
    if (raw === undefined || raw === null) {
      return defaultValue;
    }

    if (typeof raw === 'boolean') {
      return raw;
    }

    const normalized = raw.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }

    return defaultValue;
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }
}
