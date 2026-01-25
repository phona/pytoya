import type { LlmClientPort, LlmExtractResult } from '../../ports/llm-client.port';

export class FixtureLlmClient implements LlmClientPort {
  constructor(private readonly result: LlmExtractResult) {}

  async extractStructuredData(
    _options: Parameters<LlmClientPort['extractStructuredData']>[0],
  ): Promise<LlmExtractResult> {
    return this.result;
  }
}
