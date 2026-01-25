import { FixtureLlmClient } from './fixture-llm-client';
import { FixtureOcrClient } from './fixture-ocr-client';

describe('Fixture clients (test ports)', () => {
  it('returns fixture data for LLM extraction', async () => {
    const client = new FixtureLlmClient({
      extractedData: { invoice: { po_no: '0000009' } },
      tokenUsage: { promptTokens: 1, completionTokens: 2 },
    });

    await expect(
      client.extractStructuredData({ prompt: 'x', modelId: 'm' }),
    ).resolves.toMatchObject({
      extractedData: { invoice: { po_no: '0000009' } },
    });
  });

  it('returns fixture data for OCR text', async () => {
    const client = new FixtureOcrClient({ markdown: '# doc', pagesProcessed: 1 });

    await expect(
      client.extractText({ storagePath: '/tmp/a.pdf', extractorId: 'ocr' }),
    ).resolves.toMatchObject({ markdown: '# doc' });
  });
});

