import axios from 'axios';

import { PaddleOcrExtractor } from './paddle-ocr.extractor';
import { FileType } from '../../entities/manifest.entity';

describe('PaddleOcrExtractor', () => {
  it('calculates page-based cost from OCR response', async () => {
    const post = jest.fn().mockResolvedValue({
      data: {
        errorCode: 0,
        errorMsg: '',
        result: {
          layoutParsingResults: [
            {
              prunedResult: { parsing_res_list: [{ block_order: 1, block_content: 'Hello' }] },
              markdown: { text: 'Page 1' },
            },
            {
              prunedResult: { parsing_res_list: [{ block_order: 1, block_content: 'World' }] },
              markdown: { text: 'Page 2' },
            },
          ],
        },
      },
    });

    const createSpy = jest.spyOn(axios, 'create').mockReturnValue({ post } as any);

    const extractor = new PaddleOcrExtractor({
      baseUrl: 'http://localhost:8080',
      pricing: {
        mode: 'page',
        currency: 'USD',
        pricePerPage: 0.01,
      },
    });

    const result = await extractor.extract({
      buffer: Buffer.from('pdf'),
      fileType: FileType.PDF,
      filePath: '/tmp/test.pdf',
      mimeType: 'application/pdf',
      originalFilename: 'test.pdf',
    });

    expect(result.text).toContain('Hello');
    expect(result.metadata.pagesProcessed).toBe(2);
    expect(result.metadata.currency).toBe('USD');
    expect(result.metadata.textCost).toBeCloseTo(0.02, 8);

    createSpy.mockRestore();
  });
});
