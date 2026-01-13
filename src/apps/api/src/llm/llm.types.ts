import { ProviderType } from '../entities/provider.entity';

export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LlmChatMessage {
  role: LlmRole;
  content: string;
}

export interface LlmChatOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LlmProviderConfig {
  type?: ProviderType;
  baseUrl?: string | null;
  apiKey?: string | null;
  modelName?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
}

export interface LlmChatCompletionRequest {
  model: string;
  messages: LlmChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface LlmChatCompletionChoice {
  index: number;
  message?: {
    role: LlmRole;
    content?: string | null;
  };
  finish_reason?: string | null;
}

export interface LlmChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: LlmChatCompletionChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface LlmChatCompletionResult {
  content: string;
  model: string;
  usage?: LlmChatCompletionResponse['usage'];
  rawResponse: LlmChatCompletionResponse;
}
