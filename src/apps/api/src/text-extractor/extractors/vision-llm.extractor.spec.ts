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

  it('extracts PDFs page-by-page and emits incremental markdown progress', async () => {
    const createChatCompletion = jest
      .fn()
      .mockResolvedValueOnce({
        content: 'page one',
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        rawResponse: {},
      })
      .mockResolvedValueOnce({
        content: 'page two',
        model: 'gpt-4o',
        usage: { prompt_tokens: 20, completion_tokens: 7, total_tokens: 27 },
        rawResponse: {},
      });

    const llmService = {
      createChatCompletion,
    };

    const onProgress = jest.fn();

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

    const pageOneBuffer = Buffer.from('one');
    const pageTwoBuffer = Buffer.from('two');

    const result = await extractor.extract({
      buffer: Buffer.from('test'),
      fileType: FileType.PDF,
      mimeType: 'application/pdf',
      pages: [
        { pageNumber: 1, buffer: pageOneBuffer, mimeType: 'image/png' },
        { pageNumber: 2, buffer: pageTwoBuffer, mimeType: 'image/png' },
      ],
      onProgress,
    });

    expect(createChatCompletion).toHaveBeenCalledTimes(2);

    const firstMessages = createChatCompletion.mock.calls[0]?.[0];
    const secondMessages = createChatCompletion.mock.calls[1]?.[0];

    const firstContent = firstMessages[0].content as any[];
    const secondContent = secondMessages[0].content as any[];

    expect(firstContent.filter((item) => item.type === 'image_url')).toHaveLength(1);
    expect(secondContent.filter((item) => item.type === 'image_url')).toHaveLength(1);

    expect(firstContent.find((item) => item.type === 'image_url').image_url.url).toContain(
      pageOneBuffer.toString('base64'),
    );
    expect(secondContent.find((item) => item.type === 'image_url').image_url.url).toContain(
      pageTwoBuffer.toString('base64'),
    );

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0]?.[0]).toMatchObject({
      pagesTotal: 2,
      pagesProcessed: 1,
    });
    expect(onProgress.mock.calls[1]?.[0]).toMatchObject({
      pagesTotal: 2,
      pagesProcessed: 2,
    });

    expect(result.metadata.pagesProcessed).toBe(2);
    expect(result.metadata.inputTokens).toBe(30);
    expect(result.metadata.outputTokens).toBe(12);
    expect(result.markdown).toContain('--- PAGE 1 ---');
    expect(result.markdown).toContain('page one');
    expect(result.markdown).toContain('--- PAGE 2 ---');
    expect(result.markdown).toContain('page two');
  });
});
