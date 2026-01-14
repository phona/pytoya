import { ProviderType } from '../entities/provider.entity';

export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LlmContentText {
  type: 'text';
  text: string;
}

export interface LlmContentImage {
  type: 'image_url';
  image_url: {
    url: string; // Can be base64 data URL or public URL
    detail?: 'low' | 'high' | 'auto'; // OpenAI vision API detail level
  };
}

export type LlmChatMessageContent = string | LlmContentText | LlmContentImage | Array<LlmContentText | LlmContentImage>;

export interface LlmChatMessage {
  role: LlmRole;
  content: LlmChatMessageContent;
}

export interface LlmStructuredOutputSchema {
  name: string;
  description?: string;
  strict?: boolean;
  schema: Record<string, unknown>;
}

export interface LlmJsonSchemaFormat {
  type: 'json_schema';
  json_schema: LlmStructuredOutputSchema;
}

export interface LlmResponseFormat {
  type: 'text' | 'json_object' | 'json_schema';
  json_schema?: LlmStructuredOutputSchema;
}

export interface LlmChatOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseFormat?: LlmResponseFormat;
  maxRetries?: number;
}

export interface LlmProviderConfig {
  type?: ProviderType;
  baseUrl?: string | null;
  apiKey?: string | null;
  modelName?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  supportsStructuredOutput?: boolean;
  supportsVision?: boolean;
}

export interface LlmChatCompletionRequest {
  model: string;
  messages: LlmChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: LlmResponseFormat;
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
