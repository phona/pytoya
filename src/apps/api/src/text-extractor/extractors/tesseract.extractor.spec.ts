import { TesseractExtractor } from './tesseract.extractor';
import { FileType } from '../../entities/manifest.entity';

describe('TesseractExtractor', () => {
  it('calculates page-based cost and returns text output', async () => {
    const extractor = new TesseractExtractor({
      pricing: {
        mode: 'page',
        currency: 'USD',
        pricePerPage: 0.005,
      },
    });

    (extractor as any).extractFromBuffer = async () => 'ok';

    const result = await extractor.extract({
      buffer: Buffer.from('image'),
      fileType: FileType.IMAGE,
      mimeType: 'image/png',
      pages: [
        { pageNumber: 1, buffer: Buffer.from('one'), mimeType: 'image/png' },
        { pageNumber: 2, buffer: Buffer.from('two'), mimeType: 'image/png' },
      ],
    });

    expect(result.text.toLowerCase()).toContain('ok');
    expect(result.metadata.pagesProcessed).toBe(2);
    expect(result.metadata.currency).toBe('USD');
    expect(result.metadata.textCost).toBeCloseTo(0.01, 8);
  });
});
