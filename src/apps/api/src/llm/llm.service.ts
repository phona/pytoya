import { Inject, Injectable, Logger } from '@nestjs/common';
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
  LlmChatMessage,
  LlmChatOptions,
  LlmProviderConfig,
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
  private readonly logVerbose: boolean;

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

    this.apiKey =
      this.configService.get<string>('LLM_API_KEY') ??
      this.configService.get<string>('OPENAI_API_KEY');
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

    const nodeEnv =
      this.configService.get<string>('NODE_ENV') ?? 'development';
    this.logVerbose = nodeEnv !== 'production';
  }

  async createChatCompletion(
    messages: LlmChatMessage[],
    options: LlmChatOptions = {},
    provider?: LlmProviderConfig,
  ): Promise<LlmChatCompletionResult> {
    if (!messages.length) {
      throw new Error('LLM chat completion requires at least one message');
    }

    const apiKey = options.apiKey ?? provider?.apiKey ?? this.apiKey;
    if (!apiKey) {
      throw new Error('LLM API key is missing');
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

    if (this.logVerbose) {
      this.logger.debug(
        `LLM request prepared (model=${model}, messages=${messages.length})`,
      );
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
        throw new Error('LLM response missing message content');
      }

      if (this.logVerbose) {
        this.logger.debug(
          `LLM response received (model=${data.model ?? model}, ` +
            `tokens=${data.usage?.total_tokens ?? 'unknown'})`,
        );
      }

      return {
        content,
        model: data.model ?? model,
        usage: data.usage,
        rawResponse: data,
      };
    } catch (error) {
      const errorMessage = this.formatError(error);
      this.logger.warn(`LLM request failed: ${errorMessage}`);
      throw new Error(`LLM request failed: ${errorMessage}`);
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
