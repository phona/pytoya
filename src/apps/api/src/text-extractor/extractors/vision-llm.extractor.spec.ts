import { VisionLlmExtractor } from './vision-llm.extractor';
import { FileType } from '../../entities/manifest.entity';

describe('VisionLlmExtractor', () => {
  it('calculates token-based cost from usage', async () => {
    const llmService = {
      createChatCompletion: jest.fn().mockResolvedValue({
        content: 'extracted text',
        model: 'gpt-4o',
        usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
        rawResponse: {},
      }),
    };

    const extractor = new VisionLlmExtractor(
      {
        apiKey: 'sk-test',
        model: 'gpt-4o',
        pricing: {
          mode: 'token',
          currency: 'USD',
          inputPricePerMillionTokens: 2,
          outputPricePerMillionTokens: 4,
        },
      },
      { llmService: llmService as any },
    );

    const result = await extractor.extract({
      buffer: Buffer.from('test'),
      fileType: FileType.IMAGE,
      mimeType: 'image/png',
      pages: [
        { pageNumber: 1, buffer: Buffer.from('one'), mimeType: 'image/png' },
        { pageNumber: 2, buffer: Buffer.from('two'), mimeType: 'image/png' },
      ],
    });

    expect(result.text).toBe('extracted text');
    expect(result.metadata.inputTokens).toBe(1000);
    expect(result.metadata.outputTokens).toBe(500);
    expect(result.metadata.pagesProcessed).toBe(2);
    expect(result.metadata.currency).toBe('USD');
    expect(result.metadata.textCost).toBeCloseTo(0.004, 8);
  });
});
