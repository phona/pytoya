export type LlmTokenUsage = {
  promptTokens: number;
  completionTokens: number;
};

export type LlmExtractResult = {
  extractedData: Record<string, unknown>;
  tokenUsage?: LlmTokenUsage;
  rawResponse?: unknown;
};

export interface LlmClientPort {
  extractStructuredData(options: {
    prompt: string;
    modelId?: string;
  }): Promise<LlmExtractResult>;
}
